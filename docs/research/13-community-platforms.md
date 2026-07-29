# 13 · Community & Senior-Engineering Content Platforms

> Research brief · compiled 2026-07-29

Every URL below was fetched from this machine with `curl -A 'TechPulse/1.0 (+https://github.com/techpulse)' --max-time 18`. Status codes and item counts are observed. Unverifiable claims are marked **UNVERIFIED**.

**Three sources returned HTTP 200 with a useless body**, which is why status-only checks are worthless: `engineering.zalando.com/feed.xml` (`text/html`, feed title *"Oooops, something went wrong."*, 0 items), `hashnode.com/rss` (`text/html`, 0 items), and `blog.hashnode.dev/rss.xml` (valid XML, title *"Test Blog"*, **0 items**).

---

## 1. Medium: feed shapes, the paywall, and silent IP throttling

All four shapes resolve, all capped at **10 items**: publication (`medium.com/feed/netflix-techblog`), tag (`medium.com/feed/tag/software-architecture`), user (`medium.com/feed/@swiggybytes`), custom domain (`eng.lyft.com/feed`, `blog.flipkart.tech/feed`). `swiggybytes.medium.com/feed` returned byte-identical output to the `/@user` form (both 86,824 bytes). Wrong slugs 404 with a 22,615-byte *"Not Found – Medium"* page — `level-up-coding`, `@AgodaEng` and `@phonepe.engineering` are all wrong; the real slugs are `gitconnected`, `agoda-engineering`, `phonepe`.

### Paywall truncation is total, not partial

Measured over each feed's current 10-item window; "full" = item carries `<content:encoded>`:

| Feed | full / 10 | % paywalled |
|---|---|---|
| netflix-techblog, airbnb-engineering, pinterest-engineering, eng.lyft.com, expedia-group-tech, agoda-engineering, blog.flipkart.tech, phonepe | 10 / 10 | **0%** |
| itnext | 7 / 10 | 30% |
| gitconnected (Level Up Coding) | 4 / 10 | 60% |
| swlh (The Startup) | 4 / 10 | 60% |
| javascript-in-plain-english | 1 / 10 | **90%** |
| tag/software-architecture | 0 / 10 | **100%** |

The mechanism: a free story carries `<content:encoded>` with 12–46 KB of article HTML and an empty `<description>`. A member-only story carries **no `<content:encoded>` element at all** plus a 363–760 byte `<description>` holding a cover image and one sentence — literally `<p class="medium-feed-snippet">Most businesses collect data.</p>` then *"Continue reading on Medium »"*. Title, link, one sentence. Widely-repeated advice that Medium RSS "bypasses paywall logic entirely" ([wprssaggregator](https://finder.wprssaggregator.com/rss-feeds/platform/medium)) is measurably false. Tag feeds are worse still — *structurally* content-free, `<description>`-only for every item regardless of paywall state.

### Medium throttles by IP, silently, and it will hurt in CI

25 back-to-back requests to a known-good feed: **6 × HTTP 200, 19 × `curl: (35) Recv failure: Connection reset by peer`** — 76% loss, with Medium dropping the TCP connection instead of returning a status. Spaced **8 s apart**: 5/8 succeeded, still 37% loss. After ~50 cumulative requests Medium escalated to explicit **HTTP 429**. `medium.com/robots.txt` was itself reset, so Medium's stated crawler policy is **UNVERIFIED**.

The resets are **not per-slug and not deterministic**. `better-programming`, `lyft-engineering`, `agoda-engineering` and `@kelseyhightower` each reset 2–4 consecutive times then returned 200 later in the session — anyone probing slugs in a loop will wrongly blacklist working publications. `walmartglobaltech` and `wise-engineering` reset on every attempt and remain **UNVERIFIED**.

A GitHub Actions runner shares egress with a large pool, so expect ≥37–76% loss. Cap Medium at ~8 feeds, ≥10 s apart, 3 retries with backoff, treat a reset as "skip this cycle, keep last good items", never fail the build on it.

Custom domains are not an escape hatch: `netflixtechblog.com/feed` returned **429 with a Cloudflare interstitial** (*"Just a moment..."*) in the same window that `medium.com/feed/netflix-techblog` returned 200 — custom-domain Medium blogs sit behind Cloudflare bot management, which is harder to survive. `eng.lyft.com` and `blog.flipkart.tech` did work, so test per-domain.

### Verdict

Add corporate engineering publications only — 0% paywalled, full text, edited. **Do not add** generalist programming publications or any tag feed. Beyond the paywall ratios, the current `tag/software-architecture` window includes *"Macropay-Solutions PHP Framework's Docs are Out"*, a Portuguese-language post, and *"Tumanomir: What Actually Got Built After 'Source of the Unknown'"*; and `swlh` is not even a programming publication — top item *"The Simple Math You Need to Manage Unpredictable Income"*.

---

## 2. Engineering-org publications

**Verified live and fresh**, newest item per the feed: Grab 2026-07-29, Airbnb 07-28, Pinterest 07-27, Zalando 07-24, Netflix 07-17, Expedia 07-14, Lyft 07-09, Agoda current, Flipkart lagging at 2026-05-05. Zalando needs care — the working URL is **`atom.xml`** (200, **100 entries**, 2.2 MB); `feed.xml` and `index.xml` both serve an HTML error page under HTTP 200.

**Abandoned — all return 200, so only the dates expose them.** `salesforce-engineering` newest item **2022-05-05** · `@swiggybytes` **2024-07-02** · `@kelseyhightower` **2017-01-23** (and `kelseyhightower.com` does not resolve — he has no live feed).

**Wrong category.** `razorpay.com/blog/feed/` (200, 10 items) is a fintech marketing blog, top item *"What is an EEFC Account?"*. `medium.com/feed/phonepe` is the correct slug (200, 0% paywalled) but serves consumer fraud-awareness marketing in nine Indian languages plus *"PhonePe's Blueprint for Cultivating a Culture of Happiness"*.

**Could not verify.** Walmart Global Tech and PayPal (reset on every attempt) · Wise (reset; `wise.com/engineering/feed.xml` → 404) · Booking.com (`feed.xml`, `index.xml` → 404) · Gojek (both subdomains unresolvable; `www.gojek.io/blog/rss.xml` → **429 Vercel Security Checkpoint**) · Zomato (301s to `zomato.com`, then HTTP/2 `INTERNAL_ERROR`).

Blunt note for an India-based reader: the Indian engineering-blog scene is thinner than its reputation. Of eight Indian names checked, exactly **one** — Flipkart — is a live full-text engineering feed, and it publishes roughly monthly. Grab and Agoda are the high-frequency SE-Asian substitutes.

---

## 3. dev.to / Forem API — one undocumented bug that matters

No key needed for public `GET /api/articles`; `/api/articles/me` returns **401** without one. Documented params: `page`, `per_page` (1–1000, default 30), `tag`, `tags`, `tags_exclude`, `username`, `state` (`fresh`|`rising`|`all`), `top` (last N days), `collection_id` ([developers.forem.com](https://developers.forem.com/api/v1)). `per_page=1000` really returned 1000 objects. No rate-limit headers are emitted and 12 rapid paginated requests all returned 200 — no practical throttle.

**The bug: `tag` filters, `tags` is silently ignored.** Items actually carrying the requested tag:

| Query | hit rate |
|---|---|
| `?tag=devops&per_page=8` | **8 / 8** |
| `?tag=devops&top=14&per_page=8` | **8 / 8** |
| `?tags=devops&top=14&per_page=8` | **0 / 8** |
| `?tags=devops,kubernetes&per_page=8` | **0 / 8** |

Plural `tags` — even with one value — returns the unfiltered global feed, contrary to its docs. `tags_exclude=beginners` produced byte-identical results to omitting it. Any ingest code using `tags=` is pulling the firehose while believing it is filtered.

**Tag quality, 30 items sampled per tag.** `devops` published 30+ articles **on a single day** and the median got **0 reactions and 0 comments**. Same for `architecture`, `systemdesign`, `aws`, `kubernetes`, `security`, `java`, `linux`, `docker`; `ai` medianed 0.5, `webdev` 1.0. Median reading time 4–5 minutes everywhere — the signature of automated SEO output. By contrast `softwarearchitecture` has produced only **19 articles ever since 2017**, and those median **9 reactions**: the low-volume tag is the honest one. Tag spam confirmed — the `devops` feed returned *"Automatizar tu marketing de contenidos en 2026"* tagged `['devops','automation','tutorial']`.

**The depth filter that works: `?tag=X&top=<days>`.** Sorting by reactions over 7–14 days surfaced real posts — *"I Run Bare-Metal Kubernetes on $200 of Scrap Hardware"* (43 reactions), *"I Learned Go by Hacking Kubernetes RBAC Security"* (19). `state=rising` works standalone (21–32 reactions/item) but **degrades when combined with `tag`** — `state=rising&tag=devops` returned five items all at 0. Use one or the other. The **organization endpoint works** (`/api/organizations/aws/articles` → 200, clean JSON) and is the highest-signal dev.to surface. Recommended ingest: drop raw tag polling, poll `?tag=X&top=14&per_page=15` for five tags with a client-side floor of ~10 reactions, and add `/api/organizations/{aws,cloudflare,hashicorp}/articles`.

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

**Policy is unambiguous.** `www.reddit.com/robots.txt` reads `User-agent: *` / `Disallow: /`, with header comments pointing at the [Public Content Policy](https://support.reddithelp.com/hc/en-us/articles/26410290525844-Public-Content-Policy) and [r/reddit4researchers](https://www.reddit.com/r/reddit4researchers/). That blanket disallow covers `/r/*/.rss` and `/r/*/.json`, so scheduled polling of them is crawling a disallowed path regardless of the 200 you get back. The policy page itself returned **403** to both WebFetch and curl, so its clauses are **UNVERIFIED**; the robots.txt directive is not.

**The compliant path is the OAuth Data API.** Reddit's rules require UA format `<platform>:<app ID>:<version> (by /u/<username>)`, state "Clients must authenticate with OAuth2", allow "up to 60 requests per minute", and require tracking `X-Ratelimit-*` ([archived API wiki](https://github.com/reddit-archive/reddit/wiki/API)). `POST /api/v1/access_token` with `grant_type=client_credentials` returned **401** without credentials, confirming a registered app is mandatory. Secondary sources put the free non-commercial tier at **100 QPM per OAuth client**, commercial use at $0.24/1,000 calls, and claim self-service registration closed in late 2025 — SEO marketing blogs, not Reddit, so **UNVERIFIED**. `reddit.com/prefs/apps` returned 302 (login redirect), consistent with registration existing but proving nothing.

**Recommendation:** register a free script app, store `REDDIT_CLIENT_ID`/`REDDIT_CLIENT_SECRET` as repo secrets, mint a `client_credentials` token, hit `oauth.reddit.com/r/<sub>/top?t=day` with the prescribed UA. Zero cost, 60–100× the quota, and it moves ingestion out of robots.txt scope onto the Data API Terms. **Do not ship the unauthenticated `.rss` path** — eight subreddits at 1 req/40 s costs five minutes of wall-clock per cycle and still loses ~12% of fetches.

**Subreddits verified live (all 200, 25 entries), ranked by signal:** **r/ExperiencedDevs** (senior architecture judgement, highest signal-per-post) → **r/sre** (small, technical) → **r/kubernetes** (strong operator discussion) → **r/devops** (heavy on "how do I break into DevOps") → **r/softwarearchitecture** (meaningful student share) → **r/aws** (mostly support traffic; only worth it filtered to top-of-day) → **r/netsec** (strictly-moderated link aggregator).

---

## 5. Other platforms

**Substack/newsletter feeds are the best-behaved sources tested** — plain RSS, no bot protection: ByteByteGo `blog.bytebytego.com/feed` (20 items, 1.13 MB) · System Design Newsletter `newsletter.systemdesign.one/feed` (20, 1.65 MB) · Architecture Notes `architecturenotes.co/feed` (20 — `/rss/` **404s**) · Pragmatic Engineer `blog.pragmaticengineer.com/rss/` (15, Ghost not Substack). **Quastor is dead** — all three candidate URLs return **HTTP 520** with a 16-byte body. Paid tiers truncate; how much of ByteByteGo's paid content survives in RSS is **UNVERIFIED**.

**Hashnode — do not add.** Two blockers. The public GraphQL API is gone: `gql.hashnode.com` now **301s to `hashnode.com/announcements/graphql-api`**, which states *"We're retiring free GraphQL API access"* effective 2026-05-13, every query and mutation requiring a Pro plan, explicitly to stop scrapers mirroring content ([announcement](https://hashnode.com/announcements/graphql-api)). `api.hashnode.com` returns `Stellate service "api.hashnode.com" not found`. And per-blog RSS sits behind bot protection — `engineering.hashnode.com/rss.xml` → **429 "Vercel Security Checkpoint"**.

**Lobsters — ethical exclusion, do not ingest.** `lobste.rs/rss` does return 200 with 25 items. But `lobste.rs/robots.txt` allow-lists exactly seven named search crawlers (Applebot, BingBot, DuckDuckBot, GoogleBot, ia_archiver, Kagibot, Slurp), attaches `Content-Signal: ai-input=no, ai-train=no, search=yes` to that group, then sets `User-agent: *` / `Disallow: /`. TechPulse is not a search engine, so it falls under the wildcard disallow, and `ai-input=no` covers exactly the summarisation TechPulse performs. The `Content-Signal` directive appears only in robots.txt — it was **not** emitted as an HTTP header on `/rss`. Content overlaps heavily with Hacker News anyway, so honouring this costs almost nothing.

**InfoQ — add.** `www.infoq.com/feed/architecture-design/` 301s to `feed.infoq.com/architecture-design/`, 200, **15 items**. `feed.infoq.com/` (all topics) also gives 15; `/cloud-computing/` gave only 3. Editor-reviewed, not paywalled. Take topic feeds, not the firehose.

**Hacker News** — already integrated; sanity-checked `hn.algolia.com/api/v1/search_by_date?tags=story&query=kubernetes` → 200, `nbHits: 11398`. No change.

**Individual staff/principal-engineer blogs — highest signal per byte of anything tested.** All nine verified 200 with live content, all posting within the last two months (Willison 07-28, Luu 07-23, Orosz 07-23, Evans 07-21, Brooker 07-20, Majors 07-08, Kingsbury 06-12, Leach 05-31); URLs and counts in the Tier 1 list. Two gotchas: **Kleppmann is `feed.rss`** — `feed.xml`, `atom.xml` and `rss.xml` all 404; and **Dan Luu's feed is 11.1 MB** of untruncated full text, so cap the parse.

---

## 6. Integrity note — hidden payload in the Stack Overflow Blog feed

`stackoverflow.blog/feed/` returns 200 with 40 items, and the first title renders as *"You need reliable AI context for your site reliability"* followed by **1,144 invisible characters**. Measured: **88,680 zero-width characters across the feed** — U+200B, U+200C, U+200D, U+FEFF — exactly **1,144 in every `<title>` and 1,160 in every `<description>`, in all 40 of 40 items**, with a **distinct payload per item**. A four-symbol alphabet over 1,144 symbols is 2,288 bits ≈ 286 bytes per field.

Not a client artefact: identical count when re-fetched with a Chrome UA; **zero** on the HTML homepage `stackoverflow.blog/`; zero in all 30+ other feeds fetched today. Decoding two bits per symbol under a permuted mapping yields an obfuscated string containing an `https://` scheme, a host resembling a Stack Overflow domain, and tokens like `type`, `origin`, `published`. No single-byte XOR or additive cipher recovers clean text, so exact semantics are **UNVERIFIED** — most likely a per-item provenance watermark or a scraper canary. It contains no readable text addressing the reader, so it is not a prompt injection, but it is undeclared data smuggled into a syndication feed.

**Required handling regardless of intent:** strip `[U+200B U+200C U+200D U+FEFF]` from all ingested titles and descriptions before storage, as a global sanitiser rather than a special case. Otherwise it corrupts dedup hashes, inflates stored text ~29% for this feed, and is passed verbatim into any LLM summarisation step. No other source fetched today addressed the reader directly or attempted to issue instructions.

---

## 7. Recommendation table

**Tier 1 — add first.** High signal, no paywall, no CI risk. Items per fetch in brackets.

`simonwillison.net/atom/everything/` [30] · `brooker.co.za/blog/rss.xml` [162, 1.6 MB] · `danluu.com/atom.xml` [128, **11.1 MB — cap it**] · `jvns.ca/atom.xml` [20] · `martin.kleppmann.com/feed.rss` [10, **not** `feed.xml`] · `aphyr.com/posts.atom` [12] · `charity.wtf/feed/` [20] · `brandur.org/articles.atom` [20] · `blog.pragmaticengineer.com/rss/` [15, paid tier truncates] · `blog.bytebytego.com/feed` [20, paid tier truncates] · `newsletter.systemdesign.one/feed` [20, paid tier truncates] · `architecturenotes.co/feed` [20, `/rss/` 404s] · `www.infoq.com/feed/architecture-design/` [15] · `engineering.grab.com/feed.xml` [10] · `engineering.zalando.com/atom.xml` [100, 2.2 MB, **not** `feed.xml`]

**Tier 2 — add with the stated mitigation.** All Medium entries are 10 items, 0% paywalled, **high CI risk** (silent TCP reset — retry with backoff, never fail the build): `medium.com/feed/netflix-techblog` (high signal) · `medium.com/feed/airbnb-engineering` (high) · `medium.com/feed/pinterest-engineering` (high) · `eng.lyft.com/feed` (high, medium risk) · `blog.flipkart.tech/feed` (high, monthly) · `medium.com/feed/agoda-engineering` (medium) · `medium.com/feed/expedia-group-tech` (medium). Plus `stackoverflow.blog/feed/` (40 items, medium, no CI risk, **must strip zero-width chars**) · dev.to `/api/articles?tag=X&top=14&per_page=15` (≤15, medium, singular `tag` only) · dev.to `/api/organizations/{org}/articles` (≤30, medium-high) · Reddit ×7 subs via `oauth.reddit.com/r/<sub>/top?t=day` (25, high once filtered, **OAuth app required**).

**Tier 3 — do not add.** *Paywall or noise:* any `medium.com/feed/tag/*` (100% content-free) · `gitconnected` (60% member-only) · `swlh` (60%, not a programming publication) · JavaScript in Plain English (**90%**) · Better Programming (same class) · dev.to raw tag polling without `top` (median 0 reactions) · r/programming, r/webdev (duplicates HN). *Borderline:* ITNEXT at 30% paywalled — only if room remains. *Dead or wrong-category:* Salesforce Engineering, SwiggyBytes, Kelsey Hightower, Razorpay, PhonePe, Quastor. *Excluded by policy:* Hashnode (any surface), Lobsters, Reddit unauthenticated `.rss`. Reasons for each are in §1–§5.

**Ingestion tooling — licences read from `api.github.com/repos/…` `license.spdx_id`** (GitHub core limit 51/60 remaining, no 403). Permissive and active: `praw-dev/praw` **BSD-2-Clause** (4,203★) · `rbren/rss-parser` **MIT** (1,524★) · `miniflux/v2` **Apache-2.0** · `RSS-Bridge/rss-bridge` **Unlicense**. Copyleft with a network clause, so a modified hosted instance triggers source disclosure: `forem/forem` and `FreshRSS/FreshRSS`, both **AGPL-3.0**. Not confirmed OSI-safe: `kurtmckee/feedparser` and `lobsters/lobsters` both report **NOASSERTION** — GitHub cannot classify their licence files, so read `LICENSE` before vendoring. Avoid: `damoeb/rss-proxy` reports **null** (all rights reserved, last push 2025-01-06) and `not-an-aardvark/snoowrap` is MIT but **archived** since 2023-02-20. Given TechPulse's zero-dependency design none need vendoring; `rss-parser` and `praw` are the only candidates, PRAW only if a Python step is acceptable.

---

## Sources

**Fetched directly on 2026-07-29:** every feed URL, API call and `robots.txt` named in §1–§7 — roughly 90 endpoints across Medium, nine org blogs, dev.to, Reddit, Lobsters, Hashnode, newsletters, InfoQ, Stack Overflow, individual blogs, HN Algolia, and ten `api.github.com/repos/…` licence lookups — each with its observed status code and item count stated inline at the point of use.

Documentation and policy:

- [Forem API v1 reference](https://developers.forem.com/api/v1) — params, `per_page` 1–1000, `state` enum
- [Reddit API access rules (archived wiki)](https://github.com/reddit-archive/reddit/wiki/API) — UA format, OAuth requirement, 60 req/min, `X-Ratelimit-*`
- [Reddit Public Content Policy](https://support.reddithelp.com/hc/en-us/articles/26410290525844-Public-Content-Policy) (named in robots.txt; returned **403**, contents UNVERIFIED) and [r/reddit4researchers](https://www.reddit.com/r/reddit4researchers/)
- [Hashnode: retiring free GraphQL API access](https://hashnode.com/announcements/graphql-api) — 2026-05-13, Pro required
- [Medium Help: About the paywall](https://help.medium.com/hc/en-us/articles/360017581433-About-the-paywall) · [Medium Help: Using RSS feeds](https://help.medium.com/hc/en-us/articles/214874118-Using-RSS-feeds-of-profiles-publications-and-topics) · [WP RSS Aggregator](https://finder.wprssaggregator.com/rss-feeds/platform/medium) (cited only to contradict its paywall-bypass claim)
- [SocialCrawl](https://www.socialcrawl.dev/blog/reddit-data-api-2026) and [redditapis.com](https://www.redditapis.com/blogs/reddit-data-api-2026) — source of the 100 QPM and "registration closed late 2025" claims; marketing blogs, both **UNVERIFIED**
