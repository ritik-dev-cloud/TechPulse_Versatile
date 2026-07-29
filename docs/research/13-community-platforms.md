# 13 · Community & Senior-Engineering Content Platforms

> Research brief · compiled 2026-07-29

Every URL below was fetched from this machine with `curl -A 'TechPulse/1.0 (+https://github.com/techpulse)' --max-time 18`. Status codes and item counts are observed, not assumed. Unverifiable claims are marked **UNVERIFIED**.

**Three sources returned HTTP 200 with a useless body**, which is why status-only checks are worthless: `engineering.zalando.com/feed.xml` (200, `text/html`, feed title *"Oooops, something went wrong."*, 0 items), `hashnode.com/rss` (200, `text/html`, 0 items), and `blog.hashnode.dev/rss.xml` (200, valid XML, title *"Test Blog"*, **0 items**).

---

## 1. Medium: feed shapes, the paywall, and silent IP throttling

All four shapes resolve, all capped at **10 items**: publication (`medium.com/feed/netflix-techblog`), tag (`medium.com/feed/tag/software-architecture`), user (`medium.com/feed/@swiggybytes`), custom domain (`eng.lyft.com/feed`, `blog.flipkart.tech/feed`). `swiggybytes.medium.com/feed` returned byte-identical output to the `/@user` form (both 86,824 bytes). Wrong slugs 404 with a 22,615-byte *"Not Found – Medium"* page — `level-up-coding`, `@AgodaEng`, `@phonepe.engineering` are all wrong; the real slugs are `gitconnected`, `agoda-engineering`, `phonepe`.

### Paywall truncation is total, not partial

Measured over each feed's current 10-item window; "full" means the item carries `<content:encoded>`:

| Feed | full / 10 | % paywalled |
|---|---|---|
| netflix-techblog, airbnb-engineering, pinterest-engineering, eng.lyft.com, expedia-group-tech, agoda-engineering, blog.flipkart.tech, phonepe | 10 / 10 | **0%** |
| itnext | 7 / 10 | 30% |
| gitconnected (Level Up Coding) | 4 / 10 | 60% |
| swlh (The Startup) | 4 / 10 | 60% |
| javascript-in-plain-english | 1 / 10 | **90%** |
| tag/software-architecture | 0 / 10 | **100%** |

The mechanism: a free story carries `<content:encoded>` with 12–46 KB of article HTML and an empty `<description>`. A member-only story carries **no `<content:encoded>` element at all** plus a 363–760 byte `<description>` holding a cover image and one sentence — literally `<p class="medium-feed-snippet">Most businesses collect data.</p>` then *"Continue reading on Medium »"*. Title, link, one sentence. Medium's help centre matches: non-members read only "the opening section" ([help.medium.com](https://help.medium.com/hc/en-us/articles/360017581433-About-the-paywall)). Widely-repeated advice that Medium RSS "bypasses paywall logic entirely" ([wprssaggregator](https://finder.wprssaggregator.com/rss-feeds/platform/medium)) is measurably false.

Tag feeds are worse than paywalled — they are *structurally* content-free, `<description>`-only for every item regardless of the story's paywall state.

### Medium throttles by IP, silently, and it will hurt in CI

- 25 back-to-back requests to a known-good feed: **6 × HTTP 200, 19 × `curl: (35) Recv failure: Connection reset by peer`** — 76% loss. Medium drops the TCP connection instead of returning a status.
- Spaced **8 s apart**: 5/8 succeeded. Still 37% loss.
- After ~50 cumulative requests, Medium escalated to explicit **HTTP 429**.
- `medium.com/robots.txt` was itself reset, so Medium's stated crawler policy is **UNVERIFIED**.

The resets are **not per-slug and not deterministic**. `better-programming`, `lyft-engineering`, `agoda-engineering` and `@kelseyhightower` each reset 2–4 consecutive times then returned 200 later in the session. Anyone probing slugs in a loop will wrongly blacklist working publications. `walmartglobaltech`, `walmart-global-tech-blog` and `wise-engineering` reset on every attempt and remain **UNVERIFIED**.

From a shared IP the loss rate is already 37–76%; a GitHub Actions runner shares egress with a large pool, so expect the same or worse. Cap Medium at ~8 feeds, ≥10 s apart, 3 retries with backoff, treat a reset as "skip this cycle, keep last good items", never fail the build on it.

Custom domains are not an escape hatch: `netflixtechblog.com/feed` returned **429 with a Cloudflare interstitial** (*"Just a moment..."*) in the same window that `medium.com/feed/netflix-techblog` returned 200. Custom-domain Medium blogs sit behind Cloudflare bot management, which is harder to survive. `eng.lyft.com` and `blog.flipkart.tech` did work — test per-domain.

### Verdict

Add corporate engineering publications only — 0% paywalled, full text, edited. **Do not add** generalist programming publications or any tag feed. Beyond the paywall ratios: the current `tag/software-architecture` window includes *"Macropay-Solutions PHP Framework's Docs are Out"*, a Portuguese-language post, and *"Tumanomir: What Actually Got Built After 'Source of the Unknown'"*. At 90% paywalled, JavaScript in Plain English delivers nine headlines and a dead-end link per fetch. `swlh` is not even a programming publication — top item *"The Simple Math You Need to Manage Unpredictable Income"*.

---

## 2. Engineering-org publications

**Verified live and fresh**, newest item per the feed (URLs in the Tier 1/2 tables): Grab 2026-07-29 · Airbnb 07-28 · Pinterest 07-27 · Zalando 07-24 · Netflix 07-17 · Expedia 07-14 · Lyft 07-09 · Flipkart 2026-05-05 · Agoda (200, 10 items).

Zalando needs care: the working URL is **`atom.xml`** (200, **100 entries**, 2.2 MB); both `feed.xml` and `index.xml` serve an HTML error page under HTTP 200.

**Abandoned — do not add.** `salesforce-engineering` newest item **2022-05-05**. `@swiggybytes` newest **2024-07-02**. `@kelseyhightower` newest **2017-01-23** (and `kelseyhightower.com` does not resolve — he has no live feed).

**Wrong category — do not add.** Razorpay: `blog.razorpay.com/feed/` → `razorpay.com/blog/feed/` (200, 10 items) is a fintech marketing blog, top item *"What is an EEFC Account?"*. PhonePe: `medium.com/feed/phonepe` is the correct slug (200, 0% paywalled) but serves consumer fraud-awareness marketing in nine Indian languages plus *"PhonePe's Blueprint for Cultivating a Culture of Happiness and Employee Wellbeing"*.

**Could not verify.** Walmart Global Tech (reset, both slugs), Wise (reset; `wise.com/engineering/feed.xml` → 404), Booking.com (`feed.xml` and `index.xml` → 404), Gojek (`tech.gojek.io` / `blog.gojekengineering.com` unresolvable; `www.gojek.io/blog/rss.xml` → **429 Vercel Security Checkpoint**), Zomato (301s to `zomato.com` then HTTP/2 `INTERNAL_ERROR`; `tech.zomato.com` unresolvable), PayPal (reset).

Blunt note for an India-based reader: the Indian engineering-blog scene is thinner than its reputation. Of eight Indian names checked, exactly **one** — Flipkart — is a live full-text engineering feed, publishing roughly monthly. Grab and Agoda are the high-frequency SE-Asian substitutes.

---

## 3. dev.to / Forem API — one undocumented bug that matters

No key needed for public `GET /api/articles`; `/api/articles/me` returns **401** without one. Documented params: `page`, `per_page` (1–1000, default 30), `tag`, `tags`, `tags_exclude`, `username`, `state` (`fresh`|`rising`|`all`), `top` (last N days), `collection_id` ([developers.forem.com](https://developers.forem.com/api/v1)). `per_page=1000` really returned 1000 objects. No rate-limit headers are emitted and 12 rapid paginated requests all returned 200 — no practical throttle at dashboard volumes.

**The bug: `tag` filters, `tags` is silently ignored.** Items actually carrying the requested tag:

| Query | hit rate |
|---|---|
| `?tag=devops&per_page=8` | **8 / 8** |
| `?tag=devops&top=14&per_page=8` | **8 / 8** |
| `?tags=devops&top=14&per_page=8` | **0 / 8** |
| `?tags=devops,kubernetes&per_page=8` | **0 / 8** |

Plural `tags` — even with one value — returns the unfiltered global feed, contrary to its docs. `tags_exclude=beginners` produced byte-identical results to omitting it. Any ingest code using `tags=` is pulling the firehose while believing it is filtered.

**Tag quality, 30 items sampled per tag.** `devops` published 30+ articles **on a single day** and the median got **0 reactions and 0 comments**. Same for `architecture`, `systemdesign`, `aws`, `kubernetes`, `security`, `java`, `linux`, `docker`; `ai` medianed 0.5, `webdev` 1.0. Median reading time 4–5 minutes everywhere. That is the signature of automated SEO output. By contrast `softwarearchitecture` has produced only **19 articles ever since 2017** — and those median **9 reactions**. The low-volume tag is the honest one. Tag spam confirmed: the `devops` feed returned *"Automatizar tu marketing de contenidos en 2026"* tagged `['devops','automation','tutorial']`.

**The depth filter that works: `?tag=X&top=<days>`.** Sorting by reactions over 7–14 days surfaced real posts — *"I Run Bare-Metal Kubernetes on $200 of Scrap Hardware"* (43 reactions), *"I Learned Go by Hacking Kubernetes RBAC Security"* (19), *"I Had a Lot of Fun Building a Linux Packet Flight Recorder"* (15). `state=rising` works standalone (21–32 reactions/item) but **degrades when combined with `tag`** — `state=rising&tag=devops` returned five items all at 0. Use one or the other.

The **organization endpoint works**: `dev.to/api/organizations/aws/articles?per_page=3` → 200, clean JSON. Highest-signal dev.to surface. Recommended ingest: drop raw tag polling; poll `?tag=X&top=14&per_page=15` for `kubernetes`, `devops`, `aws`, `security`, `architecture`, apply a client-side floor of ~10 reactions, and add `/api/organizations/{aws,cloudflare,hashicorp}/articles`.

---

## 4. Reddit — honest position

Endpoints: `www.reddit.com/r/<sub>/.rss` (Atom) and `.json` variants. Observed:

| Request | Result |
|---|---|
| `.rss`, default curl UA | **403** |
| `.rss`, `TechPulse/1.0 (+...)` | **429** |
| `.rss`, `linux:com.github.techpulse:v1.0 (by /u/techpulse)` | **429** ×3 consecutive |
| `old.reddit.com/r/devops/.rss` | **429** |
| `/r/devops/top.json?t=week&limit=10` | **403** with a **189,908-byte HTML** body — under every UA |
| `.rss` after 35 s idle | **200**, 25 entries, *"Everything DevOps"* |

A descriptive UA is necessary (default UA → 403) but nowhere near sufficient. The headers are explicit: `x-ratelimit-used: 1`, `x-ratelimit-remaining: 0.0`, `x-ratelimit-reset: 25`. **One request exhausts the entire unauthenticated budget**, resetting in 25–41 s. Even at **45–50 s spacing**, one of eight subreddit fetches still 429'd. The `.json` endpoints look closed to unauthenticated clients — and a 403 carrying HTML would silently poison a naive JSON parser.

**Policy is unambiguous.** `www.reddit.com/robots.txt` reads `User-agent: *` / `Disallow: /`, with header comments pointing at the [Public Content Policy](https://support.reddithelp.com/hc/en-us/articles/26410290525844-Public-Content-Policy) for "access and use restrictions" and [r/reddit4researchers](https://www.reddit.com/r/reddit4researchers/) for non-commercial use. That blanket disallow covers `/r/*/.rss` and `/r/*/.json`. Scheduled polling of those paths is crawling a disallowed path regardless of the 200 you get. The policy page itself returned **403** to both WebFetch and curl, so its clauses are **UNVERIFIED**; the robots.txt directive is not.

**The compliant path is the OAuth Data API.** Reddit's rules require UA format `<platform>:<app ID>:<version> (by /u/<username>)`, state "Clients must authenticate with OAuth2", allow "up to 60 requests per minute", and require tracking `X-Ratelimit-*` ([archived API wiki](https://github.com/reddit-archive/reddit/wiki/API)). `POST /api/v1/access_token` with `grant_type=client_credentials` returned **401** without credentials, confirming a registered app is mandatory. Secondary sources put the free non-commercial tier at **100 QPM per OAuth client**, commercial use at $0.24/1,000 calls, and claim self-service registration closed in late 2025 ([socialcrawl](https://www.socialcrawl.dev/blog/reddit-data-api-2026), [redditapis](https://www.redditapis.com/blogs/reddit-data-api-2026)) — SEO marketing blogs, not Reddit, so **UNVERIFIED**. `reddit.com/prefs/apps` returned 302 (login redirect), consistent with registration existing but proving nothing.

**Recommendation:** register a free script app, store `REDDIT_CLIENT_ID`/`REDDIT_CLIENT_SECRET` as repo secrets, mint a `client_credentials` token, hit `oauth.reddit.com/r/<sub>/top?t=day` with the prescribed UA. Zero cost, 60–100× the quota, and it moves ingestion out of robots.txt scope onto the Data API Terms. **Do not ship the unauthenticated `.rss` path** — eight subreddits at 1 req/40 s needs five minutes of wall-clock per cycle and still loses ~12% of fetches.

**Subreddits verified live (all 200, 25 entries), ranked by signal:** 1. **r/ExperiencedDevs** — senior career and architecture judgement, highest signal-per-post. 2. **r/sre** — small, technical, low noise. 3. **r/kubernetes** — strong operator discussion. 4. **r/devops** — useful but heavy on "how do I break into DevOps". 5. **r/softwarearchitecture** — good discussion, meaningful student share. 6. **r/aws** — mostly support traffic, worth it only filtered to top-of-day. 7. **r/netsec** — strictly-moderated link aggregator, near-zero chatter. Skip r/programming and r/webdev: low seniority and largely duplicated by the existing Hacker News integration.

---

## 5. Other platforms

**Substack/newsletter feeds are the best-behaved sources tested** — plain RSS, no bot protection, 15–20 items each: ByteByteGo `blog.bytebytego.com/feed` (20, 1.13 MB) · System Design Newsletter `newsletter.systemdesign.one/feed` (20, 1.65 MB) · Architecture Notes `architecturenotes.co/feed` (20 — note `/rss/` **404s**, the working path is `/feed`) · Pragmatic Engineer `blog.pragmaticengineer.com/rss/` (15, newest 07-23, Ghost not Substack). **Quastor is dead** — `newsletter.quastor.org/feed`, `www.quastor.org/feed` and `quastor.org/rss` all return **HTTP 520** with a 16-byte body. Paid tiers truncate; how much of ByteByteGo's paid content survives in RSS is **UNVERIFIED**.

**Hashnode — do not add.** Two independent blockers. The public GraphQL API is gone: `gql.hashnode.com` now **301s to `hashnode.com/announcements/graphql-api`**, which states *"We're retiring free GraphQL API access"* effective 2026-05-13, every query and mutation now requiring a Pro plan, explicitly to stop scrapers mirroring content ([announcement](https://hashnode.com/announcements/graphql-api)). `api.hashnode.com` returns `Stellate service "api.hashnode.com" not found`. And per-blog RSS is behind bot protection — `engineering.hashnode.com/rss.xml` → **429 "Vercel Security Checkpoint"**.

**Lobsters — ethical exclusion, do not ingest.** `lobste.rs/rss` does return 200 with 25 items. But `lobste.rs/robots.txt` allow-lists exactly seven named search crawlers (Applebot, BingBot, DuckDuckBot, GoogleBot, ia_archiver, Kagibot, Slurp), attaches `Content-Signal: ai-input=no, ai-train=no, search=yes` to that group, then sets `User-agent: *` / `Disallow: /`. The file carries a maintainer comment asking crawlers to follow the standard honestly. TechPulse is not a search engine, so it falls under the wildcard disallow, and `ai-input=no` covers exactly the summarisation TechPulse performs. The `Content-Signal` directive appears only in robots.txt — it was **not** emitted as an HTTP header on `/rss`. Content overlaps heavily with Hacker News anyway, so honouring this costs almost nothing.

**InfoQ — add.** `www.infoq.com/feed/architecture-design/` 301s to `feed.infoq.com/architecture-design/`, 200, **15 items**. `feed.infoq.com/` (all topics) gives 15; `/cloud-computing/` gave only 3. Editor-reviewed, feed not paywalled, low volume. Take topic feeds, not the firehose.

**Hacker News** — already integrated; sanity-checked `hn.algolia.com/api/v1/search_by_date?tags=story&query=kubernetes` → 200, `nbHits: 11398`. No change.

**Individual staff/principal-engineer blogs — highest signal per byte of anything tested.** All nine verified 200 with live content; URLs and item counts in the Tier 1 table. Newest-item dates: Willison 07-28, Luu 07-23, Orosz 07-23, Evans 07-21, Brooker 07-20, Majors 07-08, Kingsbury 06-12, Leach 05-31. Two gotchas: **Kleppmann is `feed.rss`** — `feed.xml`, `atom.xml` and `rss.xml` all 404; and **Dan Luu's feed is 11.1 MB** of untruncated full text, so cap the parse or a scheduled job burns time and memory every cycle.

---

## 6. Integrity note — hidden payload in the Stack Overflow Blog feed

`stackoverflow.blog/feed/` returns 200 with 40 items, and the first title renders as *"You need reliable AI context for your site reliability"* followed by **1,144 invisible characters**.

Measured: **88,680 zero-width characters across the feed** — U+200B, U+200C, U+200D, U+FEFF — exactly **1,144 in every `<title>` and 1,160 in every `<description>`, in all 40 of 40 items**, with a **distinct payload per item**. A four-symbol alphabet over 1,144 symbols is 2,288 bits ≈ 286 bytes of encoded data per field.

Verified real, not a client artefact: identical count when re-fetched with a Chrome UA; **zero** zero-width characters on the HTML homepage `stackoverflow.blog/`; zero in all 30+ other feeds fetched today. Feed-specific and UA-independent. Decoding two bits per symbol under a permuted mapping yields an obfuscated string containing an `https://` scheme, a host resembling a Stack Overflow domain, and field-like tokens (`type`, `origin`, `published`). No single-byte XOR or additive cipher recovers clean text, so exact semantics are **UNVERIFIED** — most likely a per-item provenance/licensing watermark or a scraper canary. It contains no readable text addressing the reader, so this is not a prompt injection, but it is undeclared data smuggled into a syndication feed.

**Required handling regardless of intent:** strip `[U+200B U+200C U+200D U+FEFF]` from all ingested titles and descriptions before storage. Otherwise the payload corrupts dedup hashes, inflates stored text ~29% for this feed, and gets passed verbatim into any LLM summarisation step. Make it a global sanitiser, not a Stack Overflow special case.

No other source fetched today addressed the reader directly or attempted to issue instructions.

---

## 7. Recommendation table

**Tier 1 — add first. High signal, no paywall, no CI risk.**

| Source | URL | Items | Note |
|---|---|---|---|
| Simon Willison | `simonwillison.net/atom/everything/` | 30 | — |
| Marc Brooker | `brooker.co.za/blog/rss.xml` | 162 | 1.6 MB |
| Dan Luu | `danluu.com/atom.xml` | 128 | **11.1 MB — cap it** |
| Julia Evans | `jvns.ca/atom.xml` | 20 | — |
| Martin Kleppmann | `martin.kleppmann.com/feed.rss` | 10 | not `feed.xml` |
| Kyle Kingsbury | `aphyr.com/posts.atom` | 12 | — |
| Charity Majors | `charity.wtf/feed/` | 20 | — |
| Brandur Leach | `brandur.org/articles.atom` | 20 | — |
| Pragmatic Engineer | `blog.pragmaticengineer.com/rss/` | 15 | paid tier truncates |
| ByteByteGo | `blog.bytebytego.com/feed` | 20 | paid tier truncates |
| System Design Newsletter | `newsletter.systemdesign.one/feed` | 20 | paid tier truncates |
| Architecture Notes | `architecturenotes.co/feed` | 20 | `/rss/` 404s |
| InfoQ Arch & Design | `www.infoq.com/feed/architecture-design/` | 15 | — |
| Grab Engineering | `engineering.grab.com/feed.xml` | 10 | — |
| Zalando Engineering | `engineering.zalando.com/atom.xml` | 100 | 2.2 MB; not `feed.xml` |

**Tier 2 — add with the stated mitigation.** All Medium entries are 0% paywalled but carry **high CI risk** (silent TCP reset — retry with backoff, never fail the build): Netflix `medium.com/feed/netflix-techblog` (10, high signal) · Airbnb `medium.com/feed/airbnb-engineering` (10, high) · Pinterest `medium.com/feed/pinterest-engineering` (10, high) · Lyft `eng.lyft.com/feed` (10, high, medium risk) · Flipkart `blog.flipkart.tech/feed` (10, high, monthly cadence) · Agoda `medium.com/feed/agoda-engineering` (10, medium) · Expedia `medium.com/feed/expedia-group-tech` (10, medium). Plus: Stack Overflow Blog `stackoverflow.blog/feed/` (40, medium signal, no CI risk, **must strip zero-width chars**) · dev.to per-tag `/api/articles?tag=X&top=14&per_page=15` (≤15, medium, singular `tag` only) · dev.to orgs `/api/organizations/{org}/articles` (≤30, medium-high) · Reddit ×7 subs `oauth.reddit.com/r/<sub>/top?t=day` (25, high once filtered, **OAuth app required**).

**Tier 3 — do not add.**

| Source | Why not |
|---|---|
| `medium.com/feed/tag/*` (any tag) | 100% content-free by construction; visible SEO/spam titles |
| Level Up Coding `gitconnected` | 60% member-only → headline + one sentence |
| The Startup `swlh` | 60% paywalled, and not a programming publication |
| JavaScript in Plain English | **90% member-only** |
| Better Programming | Paywall ratio unmeasurable (429/reset); same publication class |
| ITNEXT `itnext` | Borderline — 30% paywalled; only if Tier 1/2 leaves room |
| Salesforce Engineering (Medium) | Newest item **2022-05-05** |
| SwiggyBytes | Newest item **2024-07-02** |
| Kelsey Hightower (Medium) | Newest item **2017-01-23**; no live blog |
| Razorpay blog | Fintech marketing, zero engineering content |
| PhonePe (Medium) | Consumer fraud-awareness marketing, nine languages |
| Quastor | **HTTP 520** on all three candidate URLs |
| Hashnode (any surface) | GraphQL retired 2026-05-13 (Pro-only); RSS behind Vercel bot check |
| Lobsters | `robots.txt` wildcard `Disallow: /` + `Content-Signal: ai-input=no` |
| Reddit unauthenticated `.rss` | 1 req / ~40 s per IP; robots.txt disallows all |
| dev.to raw tag polling (no `top`) | 30 posts/day/tag at **median 0 reactions, 0 comments** |
| r/programming, r/webdev | Low seniority; duplicates the existing HN feed |

**Ingestion tooling — licences read from `api.github.com/repos/…` `license.spdx_id`** (GitHub core limit 51/60 remaining, no 403). Permissive and active: `praw-dev/praw` **BSD-2-Clause** (2026-07-27, 4,203★ — best Reddit client if Python is acceptable) · `rbren/rss-parser` **MIT** (2026-03-25, 1,524★) · `miniflux/v2` **Apache-2.0** (9,526★) · `RSS-Bridge/rss-bridge` **Unlicense** (9,122★, public-domain dedication). Copyleft with a network clause — a modified hosted instance triggers source disclosure: `forem/forem` **AGPL-3.0** (22,755★) · `FreshRSS/FreshRSS` **AGPL-3.0** (15,646★). Not confirmed OSI-safe: `kurtmckee/feedparser` and `lobsters/lobsters` both report **NOASSERTION** — GitHub cannot classify their licence files, so read `LICENSE` before vendoring. Avoid: `damoeb/rss-proxy` reports **null**, i.e. all rights reserved, last push 2025-01-06 · `not-an-aardvark/snoowrap` is MIT but **archived**, last push 2023-02-20.

Given TechPulse's zero-dependency design none need vendoring; `rss-parser` (MIT) and `praw` (BSD-2) are the only candidates, and PRAW only if a Python step is acceptable.

---

## Sources

**Fetched directly on 2026-07-29** — every feed URL, API call and `robots.txt` named in §1–§7, with its observed status code and item count stated inline at the point of use. That set covers 18 `medium.com/feed/*` paths plus `eng.lyft.com`, `blog.flipkart.tech`, `netflixtechblog.com` and `swiggybytes.medium.com`; nine org blogs (Grab, Zalando ×3 paths, Razorpay, Gojek, Booking ×2, Zomato ×2, Wise); the `dev.to/api/articles` parameter matrix plus `/api/organizations/aws/articles` and `/api/articles/me`; seven subreddit `.rss` paths plus `/r/devops/top.json`, `reddit.com/robots.txt`, `/api/v1/access_token`, `/prefs/apps` and `old.reddit.com`; `lobste.rs/{robots.txt, rss}`; five Hashnode endpoints; seven newsletter feeds; four InfoQ/Stack Overflow URLs; twelve individual-blog feed paths; `hn.algolia.com/api/v1/search_by_date`; and ten `api.github.com/repos/…` licence lookups.

Documentation and policy:

- [Forem API v1 reference](https://developers.forem.com/api/v1) — `/api/articles` params, `per_page` 1–1000, `state` enum
- [Reddit API access rules (archived wiki)](https://github.com/reddit-archive/reddit/wiki/API) — UA format, OAuth requirement, 60 req/min, `X-Ratelimit-*`
- [Reddit Public Content Policy](https://support.reddithelp.com/hc/en-us/articles/26410290525844-Public-Content-Policy) — referenced from robots.txt; returned **403**, contents UNVERIFIED
- [r/reddit4researchers](https://www.reddit.com/r/reddit4researchers/) — non-commercial path named in robots.txt
- [Hashnode: retiring free GraphQL API access](https://hashnode.com/announcements/graphql-api) — 2026-05-13, Pro required
- [Medium Help: About the paywall](https://help.medium.com/hc/en-us/articles/360017581433-About-the-paywall)
- [Medium Help: Using RSS feeds of profiles, publications, and topics](https://help.medium.com/hc/en-us/articles/214874118-Using-RSS-feeds-of-profiles-publications-and-topics)
- [WP RSS Aggregator: Medium feed formats](https://finder.wprssaggregator.com/rss-feeds/platform/medium) — cited only to contradict its paywall-bypass claim
- [SocialCrawl: Reddit Data API 2026](https://www.socialcrawl.dev/blog/reddit-data-api-2026) and [redditapis.com: Reddit Data API 2026](https://www.redditapis.com/blogs/reddit-data-api-2026) — source of the 100 QPM and "registration closed late 2025" claims; marketing blogs, both **UNVERIFIED**
