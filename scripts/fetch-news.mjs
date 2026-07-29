#!/usr/bin/env node
/**
 * TechPulse aggregator.
 *
 * Fetches every source in sources.json, merges the result with the previously
 * committed feed so history survives a source going dark, and writes:
 *   data/feed.json    the payload the dashboard reads
 *   data/status.json  per-source health, for debugging a stale dashboard
 *
 * Design rules:
 *  - Never throw on one bad source. A partial feed beats a failed build.
 *  - Exit non-zero only if the run is so degraded it would publish a worse
 *    dashboard than the one already committed.
 *  - No dependencies. Node >=20 built-ins only.
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { parseFeed, toPlainText } from './lib/parse-feed.mjs';
import { fetchText, agentFor, validateFeedResponse } from './lib/http.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SOURCES_PATH = path.join(ROOT, 'scripts', 'sources.json');
const DATA_DIR = path.join(ROOT, 'data');
const FEED_PATH = path.join(DATA_DIR, 'feed.json');
const STATUS_PATH = path.join(DATA_DIR, 'status.json');

const VERBOSE = process.argv.includes('--verbose');
const RETAIN_DAYS = 45; // How much history the dashboard keeps.
const MAX_ITEMS = 1400; // Keeps feed.json comfortably under a couple of MB.
const MAX_PER_SOURCE = 25;
const CONCURRENCY = 8;

const log = (...args) => console.log(...args);
const debug = (...args) => VERBOSE && console.log('  ·', ...args);

/* ------------------------------------------------------------------ utils */

/** Resolve {{since:30d}} style placeholders in GitHub query strings. */
function resolvePlaceholders(text, now) {
  return text.replace(/\{\{since:(\d+)d\}\}/g, (_, days) => {
    const date = new Date(now.getTime() - Number(days) * 86_400_000);
    return date.toISOString().slice(0, 10);
  });
}

/** Canonical URL for dedupe: drop tracking params, fragments, trailing slash. */
function canonicalUrl(rawUrl) {
  try {
    const url = new URL(rawUrl);
    url.hash = '';
    for (const key of [...url.searchParams.keys()]) {
      if (/^(utm_|ref|ref_src|source|mc_cid|mc_eid|fbclid|gclid|__hs)/i.test(key)) {
        url.searchParams.delete(key);
      }
    }
    url.hostname = url.hostname.replace(/^www\./, '').toLowerCase();
    if (url.pathname.length > 1) url.pathname = url.pathname.replace(/\/+$/, '');
    return url.toString();
  } catch {
    return String(rawUrl || '').trim();
  }
}

/**
 * Time to rank an item by.
 *
 * Some publishers use the *event* date as pubDate — BizBash announces an August
 * webinar with an August timestamp — so `published` can be in the future. Such
 * an item is genuinely new (we just discovered it) but must not sort ahead of
 * today's news forever, so rank it by when we first saw it instead.
 */
function rankTime(item, nowMs = Date.now()) {
  const published = Date.parse(item.published ?? '');
  const firstSeen = Date.parse(item.firstSeen ?? '');
  if (Number.isFinite(published) && published <= nowMs) return published;
  if (Number.isFinite(firstSeen)) return firstSeen;
  return Number.isFinite(published) ? published : 0;
}

/** Stable id so an item keeps identity across runs. */
function itemId(url, title) {
  const basis = `${canonicalUrl(url)}::${title.toLowerCase().replace(/\s+/g, ' ').trim()}`;
  // FNV-1a — short, deterministic, and we only need collision-resistance
  // across ~1400 items, not cryptographic strength.
  let hash = 0x811c9dc5;
  for (let i = 0; i < basis.length; i++) {
    hash ^= basis.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(36);
}

/** Fetch a URL and return its body as text. Thin wrapper for JSON endpoints. */
async function fetchBody(url, options) {
  const { body } = await fetchText(url, options);
  return body;
}

/** Run `worker` over `items` with a fixed concurrency ceiling. */
async function mapLimit(items, limit, worker) {
  const results = new Array(items.length);
  let cursor = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await worker(items[index], index);
    }
  });
  await Promise.all(runners);
  return results;
}

/* ----------------------------------------------------------------- feeds */

async function collectFeed(feed) {
  const started = Date.now();
  try {
    const { body, contentType } = await fetchText(feed.url, { userAgent: agentFor(feed) });

    // A 200 is not proof this is a feed — see lib/http.mjs for the two real
    // cases (favicon body, repurposed domain) that motivated this check.
    const valid = validateFeedResponse({ body, contentType });
    if (!valid.ok) {
      return {
        status: { name: feed.name, category: feed.category, url: feed.url, ok: false, items: 0, error: valid.reason },
        items: [],
      };
    }

    const { items } = parseFeed(body);
    if (!items.length) {
      return {
        status: { name: feed.name, category: feed.category, url: feed.url, ok: false, items: 0, error: 'parsed 0 items' },
        items: [],
      };
    }
    // Several project blogs (Node, Deno, Astro, Hugging Face) publish their
    // whole archive in one feed, and not all of them put newest first — sort
    // before capping or we would keep 25 items from 2019 and drop them all at
    // the retention filter.
    const ordered = [...items].sort(
      (a, b) => (Date.parse(b.published ?? 0) || 0) - (Date.parse(a.published ?? 0) || 0)
    );
    const normalised = ordered.slice(0, MAX_PER_SOURCE).map((item) => ({
      id: itemId(item.link, item.title),
      title: item.title,
      url: item.link,
      source: feed.name,
      category: feed.category,
      published: item.published,
      summary: item.summary,
      author: item.author,
      tags: item.tags,
      priority: feed.priority ?? 2,
    }));
    debug(`${feed.name}: ${normalised.length} items in ${Date.now() - started}ms`);
    return {
      status: { name: feed.name, category: feed.category, url: feed.url, ok: true, items: normalised.length, ms: Date.now() - started },
      items: normalised,
    };
  } catch (error) {
    debug(`${feed.name}: FAILED ${error.message}`);
    return {
      status: { name: feed.name, category: feed.category, url: feed.url, ok: false, items: 0, error: error.message },
      items: [],
    };
  }
}

/* ------------------------------------------------------------ hacker news */

async function collectHackerNews(config) {
  if (!config?.enabled) return { status: null, items: [] };
  const url = new URL(config.endpoint);
  // `front_page`, not `story`: with no `query` param this endpoint ranks by
  // all-time popularity, so `tags=story` returns years-old classics with a
  // perfectly healthy HTTP 200. See "$trap" in sources.json.
  url.searchParams.set('tags', config.tags ?? 'front_page');
  if (config.minPoints > 0) {
    url.searchParams.set('numericFilters', `points>${config.minPoints}`);
  }
  url.searchParams.set('hitsPerPage', String(config.limit ?? 30));
  try {
    const payload = JSON.parse(await fetchBody(url.toString()));
    const items = (payload.hits || [])
      .filter((hit) => hit.title)
      .map((hit) => {
        const discussion = `https://news.ycombinator.com/item?id=${hit.objectID}`;
        const target = hit.url || discussion;
        return {
          id: itemId(target, hit.title),
          title: toPlainText(hit.title, 200),
          url: target,
          source: 'Hacker News',
          category: 'community',
          published: hit.created_at ?? null,
          summary: `${hit.points ?? 0} points · ${hit.num_comments ?? 0} comments`,
          author: hit.author ? `@${hit.author}` : '',
          tags: [],
          score: hit.points ?? 0,
          discussion,
          priority: 1,
        };
      });
    return {
      status: { name: 'Hacker News', category: 'community', url: config.endpoint, ok: true, items: items.length },
      items,
    };
  } catch (error) {
    return {
      status: { name: 'Hacker News', category: 'community', url: config.endpoint, ok: false, items: 0, error: error.message },
      items: [],
    };
  }
}

/* ----------------------------------------------------------------- dev.to */

async function collectDevTo(config) {
  if (!config?.enabled) return { statuses: [], items: [] };
  const statuses = [];
  const collected = [];
  for (const topic of config.tags ?? []) {
    const url = new URL(config.endpoint);
    url.searchParams.set('tag', topic);
    url.searchParams.set('per_page', String(config.perTag ?? 6));
    url.searchParams.set('top', '7'); // Top of the last week.
    try {
      const articles = JSON.parse(await fetchBody(url.toString()));
      const mapped = (Array.isArray(articles) ? articles : [])
        .filter((a) => (a.public_reactions_count ?? 0) >= (config.minReactions ?? 0))
        .map((a) => ({
          id: itemId(a.url, a.title),
          title: toPlainText(a.title, 200),
          url: a.url,
          source: 'DEV Community',
          category: topic === 'aws' ? 'cloud' : topic === 'kubernetes' ? 'devops' : topic,
          published: a.published_at ?? null,
          summary: toPlainText(a.description ?? '', 260),
          author: a.user?.name ? toPlainText(a.user.name, 60) : '',
          tags: (a.tag_list ?? []).slice(0, 4),
          score: a.public_reactions_count ?? 0,
          priority: 3,
        }));
      collected.push(...mapped);
      statuses.push({ name: `DEV / ${topic}`, category: 'community', url: url.toString(), ok: true, items: mapped.length });
    } catch (error) {
      statuses.push({ name: `DEV / ${topic}`, category: 'community', url: url.toString(), ok: false, items: 0, error: error.message });
    }
  }
  return { statuses, items: collected };
}

/* ----------------------------------------------------------------- github */

/**
 * SPDX ids that are NOT OSI-approved open source, plus the null case.
 * Surfaced in the UI because "no license" means all rights reserved — you
 * cannot legally reuse the code even though you can read it.
 */
const NON_OSS_LICENSES = new Set([
  'BUSL-1.1',
  'SSPL-1.0',
  'Elastic-2.0',
  'CC-BY-NC-4.0',
  'CC-BY-NC-SA-4.0',
  'PolyForm-Noncommercial-1.0.0',
  'PolyForm-Shield-1.0.0',
  'NOASSERTION',
]);

function classifyLicense(license) {
  const spdx = license?.spdx_id ?? null;
  if (!spdx || spdx === 'NOASSERTION') {
    return {
      spdx: spdx === 'NOASSERTION' ? 'NOASSERTION' : null,
      name: license?.name ?? 'No license file',
      class: 'none',
      note:
        spdx === 'NOASSERTION'
          ? 'Custom or unrecognised license — read it before reuse.'
          : 'No license = all rights reserved. Readable, but not legally reusable.',
    };
  }
  if (NON_OSS_LICENSES.has(spdx)) {
    return {
      spdx,
      name: license.name,
      class: 'restricted',
      note: 'Source-available, not OSI open source. Commercial use is restricted.',
    };
  }
  if (/^(AGPL|GPL|LGPL|MPL|EPL|OSL|CDDL)/i.test(spdx)) {
    return {
      spdx,
      name: license.name,
      class: 'copyleft',
      note: 'Copyleft — derivative works inherit the license. Fine to run, care needed to embed.',
    };
  }
  return {
    spdx,
    name: license.name,
    class: 'permissive',
    note: 'Permissive — safe to reuse with attribution.',
  };
}

async function collectGithub(config, now) {
  if (!config?.enabled) return { statuses: [], repos: [] };
  const token = process.env.GITHUB_TOKEN?.trim();
  const headers = {
    accept: 'application/vnd.github+json',
    'x-github-api-version': '2022-11-28',
    ...(token ? { authorization: `Bearer ${token}` } : {}),
  };
  if (!token) {
    log('  note: no GITHUB_TOKEN — using the 10 req/min unauthenticated limit.');
  }

  const statuses = [];
  const repos = [];
  const queries = config.queries ?? [];

  for (const [index, query] of queries.entries()) {
    // Serial with spacing: the search API limit is per-minute, and tripping it
    // returns 403 for every remaining query.
    if (index > 0) await new Promise((resolve) => setTimeout(resolve, token ? 1200 : 7000));
    const url = new URL('https://api.github.com/search/repositories');
    url.searchParams.set('q', resolvePlaceholders(query.q, now));
    url.searchParams.set('sort', query.sort ?? 'stars');
    url.searchParams.set('order', 'desc');
    url.searchParams.set('per_page', String(query.limit ?? 10));
    try {
      const payload = JSON.parse(await fetchBody(url.toString(), { headers }));
      const mapped = (payload.items ?? []).map((repo) => ({
        id: `gh-${repo.id}`,
        name: repo.full_name,
        url: repo.html_url,
        description: toPlainText(repo.description ?? '', 220),
        stars: repo.stargazers_count,
        forks: repo.forks_count,
        language: repo.language ?? '—',
        topics: (repo.topics ?? []).slice(0, 6),
        pushedAt: repo.pushed_at,
        createdAt: repo.created_at,
        archived: Boolean(repo.archived),
        license: classifyLicense(repo.license),
        bucket: query.topic,
        bucketLabel: query.label,
      }));
      repos.push(...mapped);
      statuses.push({ name: `GitHub / ${query.label}`, category: 'github', url: url.toString(), ok: true, items: mapped.length });
      debug(`GitHub "${query.label}": ${mapped.length} repos`);
    } catch (error) {
      statuses.push({ name: `GitHub / ${query.label}`, category: 'github', url: url.toString(), ok: false, items: 0, error: error.message });
      debug(`GitHub "${query.label}": FAILED ${error.message}`);
    }
  }
  return { statuses, repos };
}

/* ------------------------------------------------------------------- main */

async function readPrevious() {
  try {
    return JSON.parse(await readFile(FEED_PATH, 'utf8'));
  } catch {
    return null;
  }
}

function mergeItems(fresh, previous, now) {
  const cutoff = now.getTime() - RETAIN_DAYS * 86_400_000;
  const byId = new Map();

  // Previous first so fresh metadata (scores, summaries) wins on collision.
  for (const item of previous?.items ?? []) byId.set(item.id, item);
  for (const item of fresh) {
    const existing = byId.get(item.id);
    byId.set(item.id, existing ? { ...existing, ...item, firstSeen: existing.firstSeen } : { ...item, firstSeen: now.toISOString() });
  }

  // Second dedupe pass on canonical URL — the same story often appears in a
  // vendor blog and an aggregator under slightly different titles.
  const byUrl = new Map();
  for (const item of byId.values()) {
    const key = canonicalUrl(item.url);
    const rival = byUrl.get(key);
    if (!rival || (item.priority ?? 3) < (rival.priority ?? 3)) byUrl.set(key, item);
  }

  // Third pass: some publishers emit one article under two paths (BizBash files
  // the same piece under /events/ and /event-production-planning/). The URLs
  // differ, so only title matches them.
  //
  // The timestamp MUST be part of the key. Chrome Releases legitimately posts
  // many distinct entries titled "Chrome for Android Update", and PCMA runs a
  // weekly "People on the Move" column — keying on title alone would silently
  // delete real stories. Identical title AND identical publish instant from one
  // source is a genuine duplicate; same title on a different date is not.
  const byTitle = new Map();
  for (const item of byUrl.values()) {
    const key = `${item.source}|${item.title.toLowerCase().replace(/\s+/g, ' ').trim()}|${item.published ?? item.id}`;
    const rival = byTitle.get(key);
    // Prefer the copy that actually carries a summary.
    const better =
      !rival ||
      (item.summary?.length ?? 0) > (rival.summary?.length ?? 0) ||
      (item.priority ?? 3) < (rival.priority ?? 3);
    if (better) byTitle.set(key, item);
  }

  const nowMs = now.getTime();
  return [...byTitle.values()]
    .filter((item) => rankTime(item, nowMs) >= cutoff)
    .sort((a, b) => rankTime(b, nowMs) - rankTime(a, nowMs))
    .slice(0, MAX_ITEMS);
}

async function main() {
  const now = new Date();
  const config = JSON.parse(await readFile(SOURCES_PATH, 'utf8'));
  const previous = await readPrevious();

  log(`TechPulse update — ${now.toISOString()}`);
  log(`Fetching ${config.feeds.length} feeds…`);

  const [feedResults, hn, devTo, github] = await Promise.all([
    mapLimit(config.feeds, CONCURRENCY, collectFeed),
    collectHackerNews(config.hackerNews),
    collectDevTo(config.devTo),
    collectGithub(config.github, now),
  ]);

  const statuses = [
    ...feedResults.map((r) => r.status),
    ...(hn.status ? [hn.status] : []),
    ...devTo.statuses,
    ...github.statuses,
  ];

  const freshItems = [
    ...feedResults.flatMap((r) => r.items),
    ...hn.items,
    ...devTo.items,
  ];

  const items = mergeItems(freshItems, previous, now);

  // Repos are a point-in-time snapshot, not history: a stale trending list is
  // misleading. Keep the previous snapshot only if every query failed.
  const repos = github.repos.length
    ? github.repos
        .filter((repo, index, all) => all.findIndex((r) => r.id === repo.id) === index)
        .sort((a, b) => b.stars - a.stars)
    : previous?.repos ?? [];

  // A source can fetch cleanly and still contribute nothing — every item too
  // old, or all of them deduped away. That looks identical to "healthy" in the
  // status file unless we compare fetched against retained, so record both.
  const retainedBySource = new Map();
  for (const item of items) {
    retainedBySource.set(item.source, (retainedBySource.get(item.source) ?? 0) + 1);
  }
  for (const source of statuses) {
    if (source.category === 'github') continue; // Repos are not merged into items.
    source.retained = retainedBySource.get(source.name.replace(/^DEV \/ .*/, 'DEV Community')) ?? 0;
    if (source.ok && source.items > 0 && source.retained === 0) {
      source.warning = 'fetched items but none were retained (too old, or all duplicates)';
    }
  }

  const feedsOk = feedResults.filter((r) => r.status.ok).length;
  const counts = {};
  for (const category of config.categories) {
    counts[category.id] = items.filter((item) => item.category === category.id).length;
  }

  const payload = {
    generatedAt: now.toISOString(),
    retainDays: RETAIN_DAYS,
    categories: config.categories,
    stats: {
      totalItems: items.length,
      newThisRun: items.filter((item) => item.firstSeen === now.toISOString()).length,
      last24h: items.filter((item) => rankTime(item, now.getTime()) > now.getTime() - 86_400_000).length,
      sourcesOk: statuses.filter((s) => s.ok).length,
      sourcesTotal: statuses.length,
      repos: repos.length,
      unlicensedRepos: repos.filter((r) => r.license.class === 'none').length,
      restrictedRepos: repos.filter((r) => r.license.class === 'restricted').length,
      byCategory: counts,
    },
    items,
    repos,
  };

  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(FEED_PATH, `${JSON.stringify(payload, null, 1)}\n`);
  await writeFile(
    STATUS_PATH,
    `${JSON.stringify({ checkedAt: now.toISOString(), sources: statuses.sort((a, b) => Number(a.ok) - Number(b.ok)) }, null, 2)}\n`
  );

  const failed = statuses.filter((s) => !s.ok);
  log('');
  log(`  items:   ${items.length} (${payload.stats.last24h} from the last 24h)`);
  log(`  repos:   ${repos.length} (${payload.stats.unlicensedRepos} unlicensed, ${payload.stats.restrictedRepos} restricted)`);
  log(`  sources: ${payload.stats.sourcesOk}/${statuses.length} ok`);
  if (failed.length) {
    log('');
    log('  failing sources:');
    for (const source of failed) log(`    ✗ ${source.name} — ${source.error}`);
  }

  const silent = statuses.filter((source) => source.warning);
  if (silent.length) {
    log('');
    log('  sources that fetched but contributed nothing:');
    for (const source of silent) log(`    ! ${source.name} — ${source.warning}`);
  }

  // Guard against publishing a gutted dashboard when the network or a runner
  // is broken. Half the feeds down is a real problem worth a red build.
  if (feedsOk < Math.ceil(config.feeds.length * 0.5)) {
    console.error(`\nFATAL: only ${feedsOk}/${config.feeds.length} feeds succeeded — refusing to treat this as a good run.`);
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error('Unrecoverable error:', error);
  process.exitCode = 1;
});
