/**
 * TechPulse dashboard.
 *
 * Reads the two JSON files the daily job writes (data/feed.json,
 * data/status.json) and renders everything client-side. No framework, no build
 * step — the page is served as static files, so the only runtime dependency is
 * the browser.
 *
 * All feed content is untrusted third-party text, so every value reaches the
 * DOM through textContent or the escaping helper below — never innerHTML with
 * interpolated data.
 */

import { renderMarkdown } from './markdown.js';

const state = {
  data: null,
  status: null,
  view: 'feed',
  category: 'all',
  repoBucket: 'all',
  query: '',
  windowDays: 7,
  sort: 'newest',
};

const el = {
  freshness: document.getElementById('freshness'),
  stats: document.getElementById('stats'),
  feed: document.getElementById('feed'),
  resultCount: document.getElementById('result-count'),
  categoryChips: document.getElementById('category-chips'),
  repoChips: document.getElementById('repo-chips'),
  repos: document.getElementById('repos'),
  legend: document.getElementById('licence-legend'),
  sourceTable: document.getElementById('source-table'),
  search: document.getElementById('search'),
  searchClear: document.getElementById('search-clear'),
  windowSelect: document.getElementById('window'),
  sortSelect: document.getElementById('sort'),
  themeToggle: document.getElementById('theme-toggle'),
  footerMeta: document.getElementById('footer-meta'),
  researchGrid: document.getElementById('research-grid'),
  reader: document.getElementById('reader'),
  readerBody: document.getElementById('reader-body'),
  readerBack: document.getElementById('reader-back'),
  readerRaw: document.getElementById('reader-raw'),
};

/* ------------------------------------------------------------------- helpers */

const escapeHtml = (value) =>
  String(value ?? '').replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);

/** Highlight query matches without ever injecting raw source text. */
function highlight(text, query) {
  const safe = escapeHtml(text);
  if (!query) return safe;
  const needle = query.trim();
  if (needle.length < 2) return safe;
  const pattern = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return safe.replace(new RegExp(pattern, 'gi'), (match) => `<mark>${match}</mark>`);
}

function relativeTime(iso) {
  const stamp = Date.parse(iso ?? '');
  if (!Number.isFinite(stamp)) return 'undated';
  // Publishers sometimes use the event date as the publish date, so a stamp can
  // legitimately be in the future. "in 2 weeks" is the truthful rendering;
  // treating it as elapsed time would print "just now".
  if (stamp > Date.now() + 60_000) {
    const days = Math.round((stamp - Date.now()) / 86_400_000);
    if (days < 1) return 'later today';
    return `in ${days}d`;
  }
  const minutes = Math.round((Date.now() - stamp) / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(stamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

const formatNumber = (value) =>
  value >= 1000 ? `${(value / 1000).toFixed(value >= 10_000 ? 0 : 1)}k` : String(value ?? 0);

/**
 * Time to rank/filter an item by. Mirrors rankTime() in scripts/fetch-news.mjs:
 * a future `published` (an event date used as a publish date) ranks by when we
 * first saw the item, so it doesn't sit at the top of the feed indefinitely.
 */
function itemTime(item) {
  const published = Date.parse(item.published ?? '');
  const firstSeen = Date.parse(item.firstSeen ?? '');
  if (Number.isFinite(published) && published <= Date.now()) return published;
  if (Number.isFinite(firstSeen)) return firstSeen;
  return Number.isFinite(published) ? published : 0;
}

/* --------------------------------------------------------------------- theme */

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  el.themeToggle.textContent = theme === 'dark' ? '◐' : '◑';
  el.themeToggle.title = `Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`;
  try {
    localStorage.setItem('techpulse:theme', theme);
  } catch {
    /* Private browsing — the theme simply won't persist. */
  }
}

/* ----------------------------------------------------------------- rendering */

function renderHeader() {
  const { generatedAt, stats } = state.data;
  const ageHours = (Date.now() - Date.parse(generatedAt)) / 3_600_000;
  // The job runs every ~2 hours. GitHub's scheduler is best-effort and can
  // delay or skip runs, so allow roughly three missed windows before saying
  // anything — but not the 36h this used to be, which would have hidden a
  // whole day of failed runs behind a confident-looking timestamp.
  const stale = ageHours > 6;

  el.freshness.dataset.stale = String(stale);
  el.freshness.textContent = `updated ${relativeTime(generatedAt)}${stale ? ' · update may have failed' : ''}`;

  const failing = stats.sourcesTotal - stats.sourcesOk;
  const cards = [
    { label: 'Stories kept', value: formatNumber(stats.totalItems), note: `${state.data.retainDays}d window` },
    { label: 'Last 24 hours', value: formatNumber(stats.last24h) },
    { label: 'Sources live', value: `${stats.sourcesOk}/${stats.sourcesTotal}`, tone: failing > 3 ? 'warn' : null },
    { label: 'Repos tracked', value: formatNumber(stats.repos) },
    {
      label: 'Repos to avoid',
      value: formatNumber(stats.unlicensedRepos + stats.restrictedRepos),
      note: 'no / restricted licence',
      tone: stats.unlicensedRepos + stats.restrictedRepos > 0 ? 'warn' : null,
    },
  ];

  el.stats.replaceChildren(
    ...cards.map((card) => {
      const wrap = document.createElement('div');
      wrap.className = 'stat';
      if (card.tone) wrap.dataset.tone = card.tone;
      const dt = document.createElement('dt');
      dt.textContent = card.label;
      const dd = document.createElement('dd');
      dd.textContent = card.value;
      if (card.note) {
        const small = document.createElement('small');
        small.textContent = card.note;
        dd.append(small);
      }
      wrap.append(dt, dd);
      return wrap;
    })
  );

  el.footerMeta.textContent = `feed generated ${new Date(generatedAt).toLocaleString()} · ${stats.totalItems} items from ${stats.sourcesOk} live sources`;
}

function renderCategoryChips() {
  const counts = state.data.stats.byCategory ?? {};
  const options = [
    { id: 'all', label: 'Everything', count: state.data.items.length },
    ...state.data.categories.map((category) => ({
      id: category.id,
      label: category.label,
      count: counts[category.id] ?? 0,
      title: category.blurb,
    })),
  ];

  el.categoryChips.replaceChildren(
    ...options.map((option) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `chip${state.category === option.id ? ' is-active' : ''}`;
      button.dataset.category = option.id;
      if (option.title) button.title = option.title;
      button.setAttribute('aria-pressed', String(state.category === option.id));

      const label = document.createElement('span');
      label.textContent = option.label;
      const count = document.createElement('span');
      count.className = 'chip__count';
      count.textContent = option.count;
      button.append(label, count);
      return button;
    })
  );
}

function visibleItems() {
  const cutoff = state.windowDays
    ? Date.now() - state.windowDays * 86_400_000
    : Number.NEGATIVE_INFINITY;
  const query = state.query.trim().toLowerCase();

  const filtered = state.data.items.filter((item) => {
    if (state.category !== 'all' && item.category !== state.category) return false;
    if (itemTime(item) < cutoff) return false;
    if (!query) return true;
    return (
      item.title.toLowerCase().includes(query) ||
      item.source.toLowerCase().includes(query) ||
      (item.summary ?? '').toLowerCase().includes(query)
    );
  });

  return state.sort === 'source'
    ? filtered.sort(
        (a, b) => a.source.localeCompare(b.source) || itemTime(b) - itemTime(a)
      )
    : filtered.sort((a, b) => itemTime(b) - itemTime(a));
}

function buildItemCard(item) {
  const card = document.createElement('a');
  card.className = 'item';
  card.href = item.url;
  card.target = '_blank';
  // noopener/noreferrer because we link to arbitrary third-party pages.
  card.rel = 'noopener noreferrer';

  const meta = document.createElement('div');
  meta.className = 'item__meta';

  const source = document.createElement('span');
  source.className = 'item__source';
  source.textContent = item.source;

  const category = document.createElement('span');
  category.className = 'item__cat';
  category.textContent =
    state.data.categories.find((c) => c.id === item.category)?.label ?? item.category;

  const time = document.createElement('span');
  time.textContent = relativeTime(item.published ?? item.firstSeen);

  meta.append(source, category, time);

  if (itemTime(item) > Date.now() - 86_400_000) {
    const badge = document.createElement('span');
    badge.className = 'item__new';
    badge.textContent = 'new';
    meta.append(badge);
  }

  if (typeof item.score === 'number' && item.score > 0) {
    const score = document.createElement('span');
    score.textContent = `▲ ${item.score}`;
    meta.append(score);
  }

  const title = document.createElement('h3');
  title.className = 'item__title';
  title.innerHTML = highlight(item.title, state.query);

  card.append(meta, title);

  // Several feeds (Node.js, Google Cloud, Next.js) ship empty descriptions, so
  // the summary line is optional rather than an empty gap.
  if (item.summary) {
    const summary = document.createElement('p');
    summary.className = 'item__summary';
    summary.innerHTML = highlight(item.summary, state.query);
    card.append(summary);
  }

  return card;
}

function renderFeed() {
  const items = visibleItems();
  const windowLabel =
    el.windowSelect.options[el.windowSelect.selectedIndex]?.text.toLowerCase() ?? '';
  el.resultCount.textContent = `${items.length} ${items.length === 1 ? 'story' : 'stories'} · ${windowLabel}${state.query ? ` · matching “${state.query}”` : ''}`;

  if (!items.length) {
    const empty = document.createElement('div');
    empty.className = 'empty';
    empty.innerHTML =
      '<strong>Nothing matches.</strong><br />Try a wider time window, or clear the search.';
    el.feed.replaceChildren(empty);
    return;
  }

  const nodes = [];
  if (state.sort === 'source') {
    let current = null;
    for (const item of items) {
      if (item.source !== current) {
        current = item.source;
        const heading = document.createElement('h2');
        heading.className = 'group-heading';
        heading.textContent = current;
        nodes.push(heading);
      }
      nodes.push(buildItemCard(item));
    }
  } else {
    nodes.push(...items.map(buildItemCard));
  }
  el.feed.replaceChildren(...nodes);
}

function renderRepoChips() {
  const buckets = [...new Set(state.data.repos.map((repo) => repo.bucket))];
  const labelFor = (bucket) =>
    state.data.repos.find((repo) => repo.bucket === bucket)?.bucketLabel ?? bucket;

  const options = [
    { id: 'all', label: 'All', count: state.data.repos.length },
    ...buckets.map((bucket) => ({
      id: bucket,
      label: labelFor(bucket),
      count: state.data.repos.filter((repo) => repo.bucket === bucket).length,
    })),
  ];

  el.repoChips.replaceChildren(
    ...options.map((option) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `chip${state.repoBucket === option.id ? ' is-active' : ''}`;
      button.dataset.bucket = option.id;
      button.setAttribute('aria-pressed', String(state.repoBucket === option.id));
      const label = document.createElement('span');
      label.textContent = option.label;
      const count = document.createElement('span');
      count.className = 'chip__count';
      count.textContent = option.count;
      button.append(label, count);
      return button;
    })
  );

  el.legend.replaceChildren(
    ...[
      ['permissive', 'MIT / Apache / BSD — reuse freely'],
      ['copyleft', 'GPL / AGPL / MPL — derivatives inherit'],
      ['restricted', 'BSL / SSPL / Elastic — source-available, not OSS'],
      ['none', 'No licence or unrecognised — verify before any reuse'],
    ].map(([className, text]) => {
      const span = document.createElement('span');
      const dot = document.createElement('i');
      dot.style.background = `var(--${className === 'permissive' ? 'ok' : className === 'copyleft' ? 'copyleft' : className === 'restricted' ? 'warn' : 'danger'})`;
      const label = document.createElement('span');
      label.textContent = text;
      span.append(dot, label);
      return span;
    })
  );
}

function renderRepos() {
  const repos =
    state.repoBucket === 'all'
      ? state.data.repos
      : state.data.repos.filter((repo) => repo.bucket === state.repoBucket);

  if (!repos.length) {
    const empty = document.createElement('div');
    empty.className = 'empty';
    empty.innerHTML =
      '<strong>No repositories in this run.</strong><br />The GitHub query may have been rate-limited — check the Sources tab.';
    el.repos.replaceChildren(empty);
    return;
  }

  el.repos.replaceChildren(
    ...repos.map((repo) => {
      const card = document.createElement('article');
      card.className = 'repo';
      card.dataset.licence = repo.license.class;

      const top = document.createElement('div');
      top.className = 'repo__top';

      const name = document.createElement('h3');
      name.className = 'repo__name';
      const link = document.createElement('a');
      link.href = repo.url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = repo.name;
      name.append(link);

      const stars = document.createElement('span');
      stars.className = 'repo__stars';
      stars.textContent = `★ ${formatNumber(repo.stars)}`;
      top.append(name, stars);

      const desc = document.createElement('p');
      desc.className = 'repo__desc';
      desc.textContent = repo.description || 'No description provided.';

      const foot = document.createElement('div');
      foot.className = 'repo__foot';

      const licence = document.createElement('span');
      licence.className = 'licence';
      licence.dataset.class = repo.license.class;
      licence.textContent = repo.license.spdx ?? 'NO LICENCE';
      foot.append(licence);

      const language = document.createElement('span');
      language.textContent = repo.language;
      foot.append(language);

      const pushed = document.createElement('span');
      pushed.textContent = `pushed ${relativeTime(repo.pushedAt)}`;
      foot.append(pushed);

      if (repo.archived) {
        const archived = document.createElement('span');
        archived.className = 'repo__archived';
        archived.textContent = 'ARCHIVED';
        foot.append(archived);
      }

      const note = document.createElement('p');
      note.className = 'repo__note';
      note.textContent = repo.license.note;

      card.append(top, desc, foot, note);
      return card;
    })
  );
}

function renderSources() {
  const sources = state.status?.sources ?? [];
  if (!sources.length) {
    el.sourceTable.replaceChildren(
      Object.assign(document.createElement('div'), {
        className: 'empty',
        textContent: 'No status file yet. Run `npm run update` to generate one.',
      })
    );
    return;
  }

  const table = document.createElement('table');
  const head = document.createElement('thead');
  head.innerHTML =
    '<tr><th>Status</th><th>Source</th><th>Category</th><th class="num">Items</th><th>Detail</th></tr>';

  const body = document.createElement('tbody');
  for (const source of sources) {
    const row = document.createElement('tr');

    const statusCell = document.createElement('td');
    const pill = document.createElement('span');
    pill.className = 'pill';
    pill.dataset.ok = String(Boolean(source.ok));
    pill.textContent = source.ok ? 'live' : 'failing';
    statusCell.append(pill);

    const nameCell = document.createElement('td');
    const link = document.createElement('a');
    link.href = source.url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = source.name;
    nameCell.append(link);

    const categoryCell = document.createElement('td');
    categoryCell.textContent = source.category;

    const itemsCell = document.createElement('td');
    itemsCell.className = 'num';
    itemsCell.textContent = source.items;

    const detailCell = document.createElement('td');
    detailCell.textContent = source.error ?? (source.ms ? `${source.ms}ms` : '');

    row.append(statusCell, nameCell, categoryCell, itemsCell, detailCell);
    body.append(row);
  }

  table.append(head, body);
  el.sourceTable.replaceChildren(table);
}

/* ------------------------------------------------------------ brief reader */

/**
 * Render a research brief inside the page.
 *
 * The briefs live as .md files so they stay readable in the repo, but GitHub
 * Pages serves `text/markdown` as a download — following the link would hand
 * the reader a file instead of an article. So we fetch and render it here.
 */
async function openBrief(path) {
  el.researchGrid.hidden = true;
  el.reader.hidden = false;
  el.readerRaw.href = path;
  el.readerBody.innerHTML = '<p class="reader__loading">Loading brief…</p>';
  window.scrollTo({ top: 0, behavior: 'auto' });

  try {
    const response = await fetch(path, { cache: 'no-cache' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const { html } = renderMarkdown(await response.text());
    // Safe: renderMarkdown escapes the source before generating any markup.
    el.readerBody.innerHTML = html;
  } catch (error) {
    el.readerBody.replaceChildren(
      Object.assign(document.createElement('div'), {
        className: 'empty',
        textContent: `Could not load ${path} (${error.message}). The file is still readable in the repo.`,
      })
    );
  }
}

function closeBrief() {
  el.reader.hidden = true;
  el.researchGrid.hidden = false;
  el.readerBody.replaceChildren();
}

function setView(view) {
  state.view = view;
  for (const tab of document.querySelectorAll('.tab')) {
    const active = tab.dataset.view === view;
    tab.classList.toggle('is-active', active);
    if (active) tab.setAttribute('aria-current', 'page');
    else tab.removeAttribute('aria-current');
  }
  for (const section of document.querySelectorAll('.view')) {
    section.classList.toggle('is-active', section.dataset.view === view);
  }
  if (location.hash.slice(1) !== view) history.replaceState(null, '', `#${view}`);
}

/* ------------------------------------------------------------------- wiring */

function attachEvents() {
  for (const tab of document.querySelectorAll('.tab')) {
    tab.addEventListener('click', () => {
      if (tab.dataset.view === 'research') closeBrief();
      setView(tab.dataset.view);
    });
  }

  el.researchGrid.addEventListener('click', (event) => {
    const card = event.target.closest('.research-card');
    if (!card) return;
    // Ctrl/Cmd-click and middle-click should still open the raw file.
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
    event.preventDefault();
    openBrief(card.getAttribute('href'));
  });

  el.readerBack.addEventListener('click', closeBrief);

  el.categoryChips.addEventListener('click', (event) => {
    const chip = event.target.closest('[data-category]');
    if (!chip) return;
    state.category = chip.dataset.category;
    renderCategoryChips();
    renderFeed();
  });

  el.repoChips.addEventListener('click', (event) => {
    const chip = event.target.closest('[data-bucket]');
    if (!chip) return;
    state.repoBucket = chip.dataset.bucket;
    renderRepoChips();
    renderRepos();
  });

  let debounce;
  el.search.addEventListener('input', () => {
    el.searchClear.hidden = !el.search.value;
    clearTimeout(debounce);
    debounce = setTimeout(() => {
      state.query = el.search.value;
      renderFeed();
    }, 120);
  });

  el.searchClear.addEventListener('click', () => {
    el.search.value = '';
    el.searchClear.hidden = true;
    state.query = '';
    renderFeed();
    el.search.focus();
  });

  el.windowSelect.addEventListener('change', () => {
    state.windowDays = Number(el.windowSelect.value);
    renderFeed();
  });

  el.sortSelect.addEventListener('change', () => {
    state.sort = el.sortSelect.value;
    renderFeed();
  });

  el.themeToggle.addEventListener('click', () => {
    applyTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === '/' && document.activeElement !== el.search) {
      event.preventDefault();
      setView('feed');
      el.search.focus();
      el.search.select();
    }
    if (event.key === 'Escape' && document.activeElement === el.search) {
      el.search.blur();
    }
  });

  window.addEventListener('hashchange', () => {
    const view = location.hash.slice(1);
    if (document.querySelector(`.view[data-view="${view}"]`)) setView(view);
  });
}

/* --------------------------------------------------------------------- boot */

function fatal(message, detail) {
  el.freshness.textContent = 'failed to load';
  el.feed.replaceChildren(
    Object.assign(document.createElement('div'), {
      className: 'empty',
      innerHTML: `<strong>${escapeHtml(message)}</strong><br />${escapeHtml(detail)}`,
    })
  );
}

async function boot() {
  try {
    applyTheme(localStorage.getItem('techpulse:theme') ?? 'dark');
  } catch {
    applyTheme('dark');
  }

  attachEvents();

  // status.json is diagnostic — a missing one must not stop the dashboard.
  const [feedResult, statusResult] = await Promise.allSettled([
    fetch('data/feed.json', { cache: 'no-cache' }).then((r) =>
      r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))
    ),
    fetch('data/status.json', { cache: 'no-cache' }).then((r) => (r.ok ? r.json() : null)),
  ]);

  if (feedResult.status === 'rejected') {
    fatal(
      'Could not load data/feed.json.',
      'Run `npm run update` to generate it, and serve the folder over http (`npm run serve`) — fetch() is blocked on file:// URLs.'
    );
    return;
  }

  state.data = feedResult.value;
  state.status = statusResult.status === 'fulfilled' ? statusResult.value : null;

  el.windowSelect.value = String(state.windowDays);
  el.sortSelect.value = state.sort;

  renderHeader();
  renderCategoryChips();
  renderFeed();
  renderRepoChips();
  renderRepos();
  renderSources();

  const initialView = location.hash.slice(1);
  if (document.querySelector(`.view[data-view="${initialView}"]`)) setView(initialView);
}

boot();
