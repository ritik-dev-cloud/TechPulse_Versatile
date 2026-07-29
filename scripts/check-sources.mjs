#!/usr/bin/env node
/**
 * Source health check. Run after editing sources.json, or when the dashboard
 * looks thin, to see exactly which sources are reachable and parseable.
 *
 *   npm run check-sources
 *   npm run check-sources -- --fix   # rewrite sources.json without dead feeds
 *
 * Unlike fetch-news.mjs this reports every source individually, prints the feed
 * title it actually found (so a repurposed domain is visible), and never
 * touches data/.
 */

import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { parseFeed } from './lib/parse-feed.mjs';
import { fetchText, agentFor, validateFeedResponse } from './lib/http.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SOURCES_PATH = path.join(ROOT, 'scripts', 'sources.json');
const FIX = process.argv.includes('--fix');

const config = JSON.parse(await readFile(SOURCES_PATH, 'utf8'));

/**
 * Bounded concurrency. Firing all ~86 feeds at once exhausted the socket pool
 * and left the top-level await unsettled, so the checker exited mid-run.
 */
async function mapLimit(items, limit, worker) {
  const results = new Array(items.length);
  let cursor = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (cursor < items.length) {
        const index = cursor++;
        results[index] = await worker(items[index]);
      }
    })
  );
  return results;
}

const results = await mapLimit(config.feeds, 8, async (feed) => {
  const started = Date.now();
  {
    try {
      const { body, status, contentType } = await fetchText(feed.url, {
        userAgent: agentFor(feed),
      });
      const valid = validateFeedResponse({ body, contentType });
      if (!valid.ok) {
        return { feed, status, ok: false, items: 0, title: '', ms: Date.now() - started, contentType, note: valid.reason };
      }
      const { feedTitle, items } = parseFeed(body);
      const newest = items
        .map((item) => Date.parse(item.published ?? ''))
        .filter(Number.isFinite)
        .sort((a, b) => b - a)[0];
      const ageDays = newest ? Math.floor((Date.now() - newest) / 86_400_000) : null;
      return {
        feed,
        status,
        ok: items.length > 0,
        items: items.length,
        title: feedTitle,
        ms: Date.now() - started,
        contentType,
        note:
          items.length === 0
            ? 'reachable but parsed 0 items'
            : ageDays !== null && ageDays > 120
              ? `stale: newest item is ${ageDays}d old`
              : '',
      };
    } catch (error) {
      return { feed, status: error.status ?? 0, ok: false, items: 0, title: '', ms: Date.now() - started, contentType: '', note: error.message };
    }
  }
});

const pad = (text, width) => String(text ?? '').padEnd(width).slice(0, width);
const healthy = results.filter((r) => r.ok);
const broken = results.filter((r) => !r.ok);

console.log(`\n${pad('SOURCE', 26)} ${pad('CAT', 13)} ${pad('HTTP', 5)} ${pad('ITEMS', 6)} ${pad('FEED TITLE', 22)} NOTE`);
console.log('-'.repeat(104));
for (const result of [...healthy, ...broken].sort((a, b) => Number(a.ok) - Number(b.ok))) {
  console.log(
    `${result.ok ? '✓' : '✗'} ${pad(result.feed.name, 24)} ${pad(result.feed.category, 13)} ${pad(result.status || '—', 5)} ${pad(result.items, 6)} ${pad(result.title, 22)} ${result.note}`
  );
}
console.log('-'.repeat(104));
console.log(`${healthy.length}/${results.length} healthy`);

const stale = healthy.filter((r) => r.note.startsWith('stale'));
if (stale.length) {
  console.log(`\n${stale.length} source(s) reachable but stale — fine to keep, just don't expect fresh items:`);
  for (const result of stale) console.log(`  · ${result.feed.name} — ${result.note}`);
}

if (broken.length) {
  console.log('\nBroken source URLs:');
  for (const result of broken) console.log(`  ${result.feed.url}  (${result.note})`);
}
console.log('');

if (FIX && broken.length) {
  const brokenUrls = new Set(broken.map((r) => r.feed.url));
  config.feeds = config.feeds.filter((feed) => !brokenUrls.has(feed.url));
  await writeFile(SOURCES_PATH, `${JSON.stringify(config, null, 2)}\n`);
  console.log(`Removed ${brokenUrls.size} dead feed(s) from sources.json.\n`);
}

process.exitCode = broken.length && !FIX ? 1 : 0;
