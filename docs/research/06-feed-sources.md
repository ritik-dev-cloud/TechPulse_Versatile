# How This Dashboard Gets Its Data

> Source verification log · compiled 2026-07-29. Every URL below was fetched and inspected, not assumed.
> This is the methodology document for the aggregator: what we pull, what we rejected, and the failure modes that a naive "did it return 200?" check would have accepted.

## The three findings that changed the build

1. **An Azure CDN feed URL returns HTTP 200 with a favicon.** `https://azurecomcdn.azureedge.net/en-us/updates/feed/` responds 200 with `content-type: image/vnd.microsoft.icon`. A status-code check passes it; a parser gets zero items and reports the source as "reachable but empty."
2. **The historically best event-tech feed is now spam.** `eventmanagerblog.com/feed` (EventMB) still serves *valid RSS* — but the channel title is now "Crypto Casinos." The domain was repurposed. Valid XML is not evidence of relevant content.
3. **The Hacker News search API silently returns years-old stories.** With no `query` parameter, `hn.algolia.com/api/v1/search?tags=story` ranks by all-time popularity, so it returned "Stephen Hawking has died" (2018), "A Message to Our Customers" (2016), and the xz backdoor (2024). The collector reported a healthy 25 items; every one was then dropped by the 45-day retention filter, and the dashboard showed zero. **Use `tags=front_page`.**

Consequently the ingest asserts three things, not one: HTTP 200, a plausible `content-type`, **and** an `<rss>`/`<feed>` root element. `npm run check-sources` additionally prints the feed title it actually found, so a repurposed domain is visible at a glance, and flags any source whose newest item is over 120 days old.

A fourth guard came out of the HN bug: the run now compares **items fetched** against **items retained** per source and warns when a source fetches successfully but contributes nothing. That is the failure mode that looks identical to health.

## Deliberately excluded

These were reachable, and are still not used:

| Source | Why excluded |
|---|---|
| **Lobsters** (`lobste.rs/rss`) | `robots.txt` is `User-agent: * / Disallow: /` with only named search engines allowed, and the site emits `Content-Signal: ai-input=no, ai-train=no`. The feed returns 200, but fetching it with a custom bot goes against the operator's clearly stated wishes. |
| **Reddit** (`/r/*/.rss`) | 403 without a browser User-Agent, and intermittent 429 even with one — only 2 of 5 subreddit fetches succeeded at 4-second spacing. `robots.txt` itself returned a network-policy block page. Reddit's Public Content Policy directs automated consumers to registered OAuth API access, which would mean holding a credential for a news panel. Not worth it, and it would fail from CI anyway. |
| **EventMB** | Domain repurposed to casino spam (see above). |
| **Azure `azureedge.net` updates feed** | Returns a favicon (see above). Replaced with `microsoft.com/releasecommunications/api/v2/azure/rss`. |

## Sources with caveats worth knowing

**Feeds that ship an empty description** — these render as title + link only, which is why the dashboard treats the summary line as optional rather than reserving space for it:
`nodejs.org/en/feed/blog.xml` (0 chars), both `cloudblog.withgoogle.com` feeds (~10 chars), `nextjs.org/feed.xml` (~12 chars).

**Feeds needing a browser User-Agent** — `eventindustrynews.com/feed` (hard 403 otherwise) and `bizbash.com/rss.xml`. The source config carries a per-feed `"userAgent": "browser"` flag for exactly these.

**Feeds that are reachable but genuinely dormant** — kept in the config in case they resume, and surfaced by the staleness check rather than silently trusted: V8 Dev Blog (newest post ~359 days old), React Blog (~155 days), Vue.js Blog (~696 days). These are the sources the "fetched but contributed nothing" warning fires on, correctly.

**Very large feeds** — Thoughtworks Insights (~2,710 items), Vercel (~1,389), Node.js (~1,044), OpenAI (~1,052), Hugging Face (~833), Deno (~249). All are capped at 25 items per source on ingest. Because not every one of them sorts newest-first, items are **sorted by date before the cap is applied** — slicing first would have kept 25 posts from 2019 and then dropped all of them at the retention filter.

**CDATA-wrapped links** — TSNN (Drupal-based) wraps the `<link>` URL in `<![CDATA[...]]>`, which the parser initially rejected as "not a text node" and produced 0 items from 50 valid entries. The parser now unwraps CDATA before deciding.

**Titles that repeat legitimately** — Chrome Releases posts many distinct entries titled "Chrome for Android Update"; PCMA runs a weekly "People on the Move" column. Deduplicating by title alone would delete real stories, so the dedupe key is `source + title + exact publish timestamp`. BizBash, by contrast, files the same article under two URL paths (`/events/…` and `/event-production-planning/…`) with identical timestamps — a genuine duplicate that only a title comparison catches. Both cases are handled; 28 true duplicates were removed on the first run with this rule, while all 25 distinct Chrome Releases posts were retained.

**Publish dates in the future** — BizBash uses the *event* date as `pubDate`, so a webinar announcement carries an August timestamp in July. Naive relative-time formatting rendered these as "just now," and naive sorting pinned them to the top of the feed indefinitely. Items with a future publish date are now **ranked by when we first saw them** and **displayed** with their real future date ("in 15d").

**Medium-hosted feeds** — `netflixtechblog.com/feed` works from a laptop, but a sibling Medium feed returned a TCP reset, indicating IP-reputation blocking. Flagged as a **medium risk from CI runners** (**UNVERIFIED** — not tested from an Actions runner).

## GitHub API: rate limits, measured

Verified live, unauthenticated, from a shared/NAT address:

- `x-ratelimit-resource: search`, **`x-ratelimit-limit: 10`** → **10 search requests per minute**
- `/rate_limit` confirmed: `core: 60/hour`, `search: 10/minute`, `code_search: 60`, `graphql: 0` (GraphQL requires auth)
- **The unauthenticated `core` bucket was already exhausted** during verification, because the limit is per-IP and the address is shared. A direct `/repos/{owner}/{repo}` call returned "API rate limit exceeded."

Two consequences baked into the fetcher: it uses **only the `search` bucket** (which embeds the `license` object per repo, so licence data is free and needs no `core` call), and the CI workflow passes the built-in `GITHUB_TOKEN`, raising search to **30 requests/minute** and core to 5,000/hour.

Also: **the REST search API does not support boolean `OR` between qualifiers.** `q=topic:devops+OR+topic:kubernetes+…` returns **HTTP 422 Validation Failed**. Each topic needs its own query, spaced 7 seconds apart to stay under the per-minute limit.

### Reading `license.spdx_id` — what the values mean

| Value | Meaning |
|---|---|
| `null` (whole `license` object is null) | No detectable LICENSE file. **Legally all rights reserved — not open source.** |
| `"NOASSERTION"` | A licence file exists but GitHub could not match it to a known SPDX ID (custom, modified, or dual). **Must be reviewed manually; do not assume OSS.** |
| `"none"` | GitHub's explicit "no licence" key. |
| `BUSL-1.1`, `SSPL-1.0`, `Elastic-2.0`, `CC-BY-NC-*`, `PolyForm-*` | Valid SPDX but **not OSI-approved open source** — source-available with commercial restrictions. |
| `MIT`, `Apache-2.0`, `BSD-*`, `ISC`, `Unlicense` | Permissive; safe to reuse with attribution. |
| `AGPL-*`, `GPL-*`, `LGPL-*`, `MPL-*` | Copyleft — legally OSS, but derivative works inherit the licence. AGPL adds a network clause. |

The dashboard colour-codes repositories on exactly this classification, because "public on GitHub" and "legally reusable" are different claims.

## Full source list

The live registry is [`scripts/sources.json`](../../scripts/sources.json) — 64 feeds plus the Hacker News, dev.to and GitHub collectors, 77 checks in total. Run `npm run check-sources` for current health; the last full run was 64/64 feeds healthy.

Categories and representative sources:

- **cloud** — AWS What's New, AWS News Blog, Cloudflare, Azure Service Updates, Azure Blog, Google Cloud (×2)
- **devops** — Kubernetes Blog, CNCF, GitHub Changelog, GitHub Blog, GitLab, Docker, HashiCorp, Grafana, Prometheus, AWS DevOps, plus release feeds for OpenTofu, Argo CD, Flux and Kubernetes
- **webdev** — web.dev, Chrome for Developers, Chrome Releases, Mozilla Hacks, V8, React, Next.js, Vercel, Astro, Svelte, Vue, Node.js (blog + releases), Deno, Bun, TypeScript DevBlog, Rust, Smashing Magazine, JetBrains, Google Developers
- **architecture** — Martin Fowler, Thoughtworks Insights, InfoQ (Architecture + News), AWS Architecture, Netflix, Meta, Slack, Dropbox, Stripe, Spotify, Discord, Stack Overflow Engineering, The Pragmatic Engineer
- **ai** — OpenAI, Hugging Face, Simon Willison
- **eventtech** — Skift Meetings, Event Industry News, PCMA, BizBash, TSNN, Event Marketer
- **community** — Hacker News front page (Algolia API), dev.to top-of-week across 5 tags

**Honest assessment on event tech:** this category is genuinely thin. Six usable feeds, two of which need a browser User-Agent, and the historically best source is now spam. Skift Meetings is the only one with both daily cadence and clean XML. Expect that panel to update every few days, not hourly.

## Attribution and fair use

The dashboard stores a headline, a short excerpt (≤320 characters), the source name and the canonical link — then links straight back to the publisher. It does not mirror full articles, and it does not process feed content through a model. Every source is a feed its publisher chose to make available for syndication, fetched once a day with an identifying User-Agent.
