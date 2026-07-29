# TechPulse

One page for what's happening in cloud, DevOps, web development, software architecture and event technology — refreshed automatically every day, plus a set of sourced research briefs on each of those areas.

Built as a personal learning project. Zero runtime dependencies, no build step, no server.

```
index.html            the dashboard (vanilla JS, no framework)
assets/               styles.css + app.js
data/feed.json        generated payload the page reads
data/status.json      per-source health, written every run
scripts/              the aggregator
docs/research/        six research briefs, every claim sourced
```

## Quick start

```bash
npm run update && npm run serve
```

Then open <http://localhost:4321>. The dev server exists because the page `fetch()`es `data/feed.json`, which browsers block on `file://` URLs.

## Commands

| Command | What it does |
|---|---|
| `npm run update` | Fetch every source and rewrite `data/feed.json` + `data/status.json` |
| `npm run update:verbose` | Same, with per-source timing |
| `npm run check-sources` | Health-check every feed: HTTP status, item count, feed title, staleness |
| `npm run check-sources -- --fix` | Remove dead feeds from `scripts/sources.json` |
| `npm run serve` | Static server on :4321 |
| `npm test` | 31 parser/renderer regression tests (`node --test`, no framework) |

`GITHUB_TOKEN` is optional. Without it the GitHub Search API allows 10 requests/minute per IP; with it, 30. A classic token with **no scopes** is enough — this project only reads public data. See `.env.example`.

## How the daily update works

A GitHub Actions workflow (`.github/workflows/update.yml`) runs at **02:15 UTC / 07:45 IST**, commits the refreshed `data/` files, and deploys the site to GitHub Pages. It also runs on `workflow_dispatch` (manual trigger from the Actions tab) and on pushes that touch `scripts/`.

To enable it on a fresh repo: push to `main`, then set **Settings → Pages → Source** to **GitHub Actions**. Nothing else to configure — no secrets, no lockfile, no `npm ci`.

The workflow deploys even if the fetch job reports failure, because a partially-refreshed feed still beats a stale one. The fetch job only fails hard when fewer than half the feeds succeeded, which means something systemic is wrong rather than one publisher being down.

## Adding a source

Append to `feeds` in [`scripts/sources.json`](scripts/sources.json) and run `npm run check-sources`. No code change needed.

```json
{ "name": "Example Blog", "category": "devops", "url": "https://example.com/feed", "priority": 1 }
```

`category` must match an id in the same file's `categories` array. `priority: 1` wins tie-breaks when the same story arrives from two sources. Add `"userAgent": "browser"` for publishers that 403 unrecognised agents.

## Design notes

A few decisions that aren't obvious from the code:

**Zero dependencies, on purpose.** This runs unattended in CI against ~100 remote endpoints. Every npm package would be supply-chain surface for no real gain, so the RSS/Atom parser is ~200 lines in `scripts/lib/parse-feed.mjs`. A malformed feed degrades to "skipped," never a crash.

**HTTP 200 is not proof of a feed.** Two real sources taught this: an Azure CDN feed URL returns 200 with a *favicon* body, and a retired event-industry blog still serves valid RSS after its domain was repurposed into casino spam. Ingest asserts status, content-type **and** an `<rss>`/`<feed>` root; `check-sources` prints the feed title it actually found.

**"Fetched successfully" is not proof of contribution.** A source can return 25 healthy items that are all too old or all duplicates, which looks identical to health in a status file. Each run compares items fetched against items retained. This caught a real bug: the Hacker News search API, queried without a `query` parameter, ranks by all-time popularity and was returning stories from 2016–2024.

**But "contributed nothing" has two causes, and conflating them buries the one that matters.** A *dormant* publisher simply hasn't posted inside the retention window — true of React (155 days), Vue (696), V8, web.dev and Project Zero, and needing no action. An *anomaly* is a source that published recently and still lost everything, which means a parser or dedupe bug. The run reports these separately; only the second is a warning.

**Deduplication needs the timestamp.** Chrome Releases legitimately publishes many posts titled "Chrome for Android Update"; PCMA runs a weekly "People on the Move" column. BizBash, by contrast, files one article under two URL paths. So the key is `source + title + exact publish instant` — title alone would delete real stories.

**Future publish dates are real.** BizBash uses the event date as `pubDate`, so a webinar announcement carries next month's timestamp. Those items rank by when we first saw them (so they don't pin to the top forever) but display their actual date.

**Every test is a regression test.** `tests/` covers cases that actually broke against live sources — CDATA-wrapped links, a favicon served as a feed, double-escaped entities, and the blockquote bug caused by escaping HTML before parsing blocks. No speculative coverage.

**Licence classification is a first-class feature.** A repository with no LICENSE file is not open source — default copyright applies and all rights are reserved, however public the code is. The dashboard colour-codes every repo as permissive / copyleft / source-available / none, because "on GitHub" and "legally reusable" are different claims.

Full detail in [docs/research/06-feed-sources.md](docs/research/06-feed-sources.md).

## Research briefs

Point-in-time deep dives with inline sources. Claims that couldn't be traced to a primary source are marked `UNVERIFIED` rather than repeated as fact — several widely-circulated statistics in this space turned out to originate from AI-generated SEO blogs citing each other.

Briefs 07–12 were each written by one research agent and then independently fact-checked by a second adversarial agent that re-verified every GitHub licence claim against the API and edited the file in place. **That pass applied 97 corrections**, including three repos filed under the wrong licence class and a statutory commencement date that was a day out. Where a verifier could not confirm something, it marked it `UNVERIFIED` rather than leaving the assertion standing.

| | Brief |
|---|---|
| 01 | [AWS & cloud platform landscape](docs/research/01-cloud-and-aws.md) |
| 02 | [DevOps & platform engineering tooling](docs/research/02-devops-and-platform.md) |
| 03 | [Web development & developer tooling](docs/research/03-web-development.md) |
| 04 | [Microservices, monoliths & event-driven architecture](docs/research/04-architecture.md) |
| 05 | [Smart events: technology & AI](docs/research/05-event-technology.md) |
| 06 | [How this dashboard gets its data](docs/research/06-feed-sources.md) |
| 07 | [Event tech &amp; research worldwide](docs/research/07-global-event-tech.md) — India, China, Japan, Hong Kong, Germany, UAE |
| 08 | [Building smart engagement software](docs/research/08-smart-engagement-build.md) |
| 09 | [AWS + DevOps enterprise reference project](docs/research/09-aws-devops-enterprise.md) |
| 10 | [How AI builds software &amp; token economics](docs/research/10-ai-building-software.md) |
| 11 | [Offensive &amp; defensive security](docs/research/11-cybersecurity.md) |
| 12 | [Docker, Linux, Kali, Ansible, Java](docs/research/12-platform-tooling.md) |

## Attribution

Headlines, excerpts and links belong to their publishers. This project stores a headline, an excerpt of at most 320 characters, the source name and the canonical URL, then links back to the source. It does not mirror full articles.

Two sources were deliberately excluded despite working: **Lobsters**, whose `robots.txt` disallows all non-search-engine crawlers and which emits `Content-Signal: ai-input=no`, and **Reddit**, which rate-limits aggressively and directs automated consumers to registered API access.

## Licence

MIT — see [LICENSE](LICENSE). Applies to this project's own code, not to the content it aggregates.
