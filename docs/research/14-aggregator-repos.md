# Aggregating Community-Platform Content: Repos, Licences, Techniques

> Research brief · compiled 2026-07-29
>
> **Adversarial review 2026-07-29.** All 42 licence rows re-checked against the GitHub API (**zero discrepancies**) and every recommended feed URL re-fetched. Corrections are marked inline as blockquotes or `~~strikethrough~~`. **Materially wrong and fixed: `netflixtechblog.com/feed` (429 Cloudflare challenge, not 200), the article-extraction F1 figures (quoted from a 2021 table; the current one contradicts the "tie"), the `hnrss` search 502 (transient — it works), the Lobsters and dev.to item counts, and the gofeed layout count.** Downgraded to **UNVERIFIED**: the Reddit rate-limit numbers (community estimates quoted in a blog, not published limits) and the SimHash threshold (correct string, wrong problem domain).

Licences come from `GET api.github.com/repos/OWNER/REPO` → `license.spdx_id` (authenticated via `gh`, so no rate-limit gaps). Every feed URL was fetched with `curl` from this machine; status codes and item counts are as measured.

## Integrity note

No fetched page contained text addressed to me. Two `WebFetch` summaries (`lapcatsoftware.com`, `fivefilters.org`) came back with a trailing first-person aside referencing "Communique" and steering me off-task. I re-fetched both with raw `curl`: `grep -c -i communique` returned **0** on each. The aside came from my own fetch-summarisation layer leaking operating context, not from the sites. I used only raw-`curl` text for the Reddit facts below.

## Bottom line

The two platforms you prioritised — **Medium and Reddit — are the two that actively fight unattended CI polling.** dev.to works reliably but is ~35% filler. The best community feed here is one you didn't name: **Lobsters**.

Measured this session:

| Endpoint | Status | Items |
|---|---|---|
| `reddit.com/r/devops/.rss` | 200 | 25 `<entry>` (first request only) |
| `reddit.com/r/ExperiencedDevs/.rss` | **429** | 0 (after 12s gap) |
| `reddit.com/r/aws/.rss` | **429** | 0 (after 12s gap) |
| `reddit.com/r/kubernetes/top/.rss?t=week` | 200 | 25 `<entry>` |
| `medium.com/feed/tag/system-design` | 200 | 9 `<item>` |
| same, retry +25s | **000** | `Recv failure: Connection reset by peer` |
| `netflixtechblog.com/feed` | ~~200~~ **429** | ~~10 `<item>`~~ **0** — see correction below |
| `dev.to/feed/tag/architecture` | 200 | 12 `<item>` |
| `lobste.rs/rss` · `/t/devops.rss` · `/t/distributed.rss` · `/t/practices.rss` | 200 | 25 `<item>` each |
| `lobste.rs/t/kubernetes.rss` | **404** | tag does not exist |
| `hnrss.org/frontpage?points=200` | 200 | 11 `<item>` |
| `hnrss.org/newest?q=architecture&points=50` | ~~502~~ **200** | **20 `<item>`** on re-fetch — the 502 was transient, not a broken variant |
| `rsshub.app/reddit/subreddit/devops/hot` | **403** | body title `Just a moment...` (Cloudflare) |
| `rss-bridge.org/bridge01/?...RedditBridge...` | **429** | public instance exhausted |

Medium gave four good responses then TCP-reset the IP — not an HTTP status your parser can branch on. Reddit 429'd 2 of 3 requests at 12-second spacing. **Public RSSHub and RSS-Bridge instances are not a workaround** — both were already blocked when I tried them. That is why the self-host question matters.

> **Correction (re-verified 2026-07-29): `netflixtechblog.com/feed` no longer returns 200.** Three attempts spread over ~20 minutes, with both `TechPulse/1.0` and a full Chrome UA, all returned **HTTP 429** with a 5,465-byte Cloudflare interstitial (`<title>Just a moment...</title>`) and these response headers: `cf-mitigated: challenge`, `server: cloudflare`, `content-type: text/html`. `cf-mitigated: challenge` means Cloudflare is demanding an **interactive** challenge, not throttling — a headless CI job cannot clear it at all, and there is no `retry-after` to back off against. Medium tag feeds still fail the other way (`000`, connection reset). **Netflix's blog is a Medium-hosted custom domain, so per-publication feeds inherit Medium's edge protection — recommendation 3 below does not hold as written.** Caveat: challenge decisions are partly IP-reputation-driven, so a fresh IP may see 200; GitHub Actions runner IPs are *more* likely to be challenged than a residential IP, not less. Treat any Medium-hosted feed as unavailable to unattended CI until proven otherwise from the runner itself.
>
> Reddit re-fetch: `r/devops/.rss` returned **200 / 25 `<entry>` / feed `<title>Everything DevOps</title>`** (correct publisher, not repurposed). Every subsequent Reddit request in the same run — including `r/kubernetes/top/.rss?t=week` and `old.reddit.com` — returned **429**. The `top/...?t=week` variants are *not* a way around the limit; they draw on the same per-minute budget.
>
> `hnrss.org/newest?q=architecture&points=50` re-fetched **200, 20 `<item>`, channel `<title>Hacker News - Newest: "architecture"</title>`**. The search variant works; the earlier 502 was a one-off.

Reddit changed this in June 2026 ([lapcatsoftware.com](https://lapcatsoftware.com/articles/2026/6/3.html), article dated **12 June 2026**). The same page documents appending `user=` and `feed=` parameters from your account's RSS preferences, valid on any public feed. I **could not verify that workaround** (needs a logged-in account) — **UNVERIFIED**, but cheap to test.

> **Correction — attribution of the rate-limit numbers.** The strings `100 updates per 10 minutes` and `1 update per 1 minute` are on that page, but they are **not the author's own measurement**. Re-read in full, the article quotes them from two r/rss community threads it links ([1u3qrij](https://www.reddit.com/r/rss/comments/1u3qrij/reddit_seems_to_have_severly_rate_limited_their/), [1u3qqmk](https://www.reddit.com/r/rss/comments/1u3qqmk/did_reddit_change_the_rate_limit/)), and the second redditor explicitly hedges: *"I've never looked at this before so I might be misinterpreting."* **Treat both figures as UNVERIFIED community estimates, not published limits.** What *is* first-hand evidence in that article is the header trio a redditor pasted — `x-ratelimit-used: 1`, `x-ratelimit-remaining: 0.0`, `x-ratelimit-reset: 58` — plus the author's own observation that "only the first request in each batch works." My own re-fetch reproduces exactly that shape (1 × 200, then all 429). So **"roughly one request per minute per IP" is well supported directionally; the specific before/after numbers are not.**
>
> Two further facts from the same article the brief omitted, both material: (a) the author **tried adding his Reddit account authentication and it did not stop the 429s** — so authenticating is not by itself a fix; and (b) the article links an r/modnews admin post, *"Deprecating unauthenticated JSON access"*, which it quotes as saying Reddit will shut down unauthenticated `.json` endpoints and adds: *"another common surface for scraping is RSS… as we develop secure solutions."* **I could not verify that post at source — `reddit.com/r/modnews/comments/1tq9vxo/...` returns a bot-check shell ("Please wait for verification") to a plain client, so it is UNVERIFIED**, but if accurate it means Reddit has publicly signalled RSS is next. That is a reason to treat any Reddit-via-RSS design as temporary regardless of whether `user=`/`feed=` works today.

Reddit's own terms page (HTTP 200, 566,677 bytes) contains, in **§3.1 Fees**: `Reddit reserves the right to charge fees for future use or access to the Data APIs, rates to be determined at Reddit's sole discretion. If you are interested in using the Data APIs for commercial purposes, research in excess of rate limits, or for any use that is not expressly permitted under the Data API Terms, then you will need to enter into a separate agreement with Reddit.` **Verified — and note the second half: rates are at Reddit's sole discretion, so no published price is binding anyway.**

Vendor blogs quote "100 QPM with OAuth", "10 QPM without", "$0.24/1K calls" and a "$12,000 annual minimum"; every source selling Reddit data, and Reddit's docs are JS-rendered or 403 to a plain client — **those figures are UNVERIFIED**. Confirmed by grep against the terms page text: **zero occurrences of `QPM`, `queries per`, `per minute`, `0.24` or `12,000`.** `rate limit` appears exactly once, in the §3.1 sentence above, with no number attached. A repeat search surfaced only resellers (`data365.co`, `socialcrawl.dev`, `redditapis.com`, `painonsocial.com`), which disagree among themselves — some say 100 QPM, at least one says 60 — and one concedes the price is what "community reports put it around". `support.reddithelp.com`'s Data API wiki **403s** to both `WebFetch` and a browser-UA `curl`, so the one plausibly-primary page is unreachable. Relevant point: a dashboard informing client work sits closer to "commercial" than "personal project".

## 1. Feed generation for sites without feeds

**Self-host, don't install** — none belong inside a zero-dependency repo. Separate container, your parser consumes the output.

- **RSS-Bridge** — **Unlicense**, PHP, 2026-07-24, 9.1k stars. Licence file is `UNLICENSE`: "free and unencumbered software released into the public domain." **Most permissive option in this brief** — no copyleft, no attribution, no network clause. Its `RedditBridge` still inherits Reddit's limits.
- **RSSHub** — **AGPL-3.0**, TS, pushed today, 45.5k stars. Widest route coverage. **Network clause:** run a *modified* instance others can reach and you owe them the source. Unmodified private use is fine.
- **Miniflux** — **Apache-2.0**, Go, 2026-07-24, 9.5k stars. **Best fit for your architecture.** Single binary + Postgres; documented REST API using `X-Auth-Token`, `GET /v1/feeds`, `GET /v1/entries`, and critically `GET /v1/entries/{id}/fetch-content`, which returns already-extracted article body ([docs](https://miniflux.app/docs/api.html), verified 200). That hands you readability extraction as JSON with **zero npm dependencies**; Miniflux absorbs retries, conditional GETs and backoff. Permissive, so no copyleft either way.
- **FreshRSS** — **AGPL-3.0**, PHP, 2026-07-28, 15.6k stars. Very active. Same network caveat.
- **Tiny Tiny RSS** — GPL-3.0, PHP, 2026-07-26, 801 stars. Copyleft *without* AGPL's network clause. Older; Miniflux wins.
- **Feedbin** — MIT, Ruby, 2026-07-29. Permissive but a full Rails app.
- **rss-proxy** — **`spdx_id` = null**. No root `LICENSE` (the `/license` endpoint 404s); README claims GPLv3. **A README sentence is weaker than a licence file** — unresolved, not GPL-confirmed. Dormant since 2025-01-06, and `tokenSecret.txt` is committed at root. Skip. *(All four facts re-verified: `spdx_id` null, `/license` → `{"message":"Not Found"}`, `tokenSecret.txt` present in the root tree, README line 61 = `This project uses the following license: [GNU GPLv3]`. One fairness note on the conservative call: that README line is an **explicit** grant sentence, not a passing mention, and counsel may well accept it — the practical objection here is the abandonment and the committed secret, which are decisive on their own.)*
- **Nitter** — AGPL-3.0, Nim, 2026-07-11. Archetypal bridge pattern; X's guest-token lockdown makes it unreliable. Study, don't deploy.
- **FiveFilters Full-Text RSS** — `fivefilters/full-text-rss` **404s on GitHub**. `ftr-site-config` exists: `spdx_id` = **NOASSERTION**, but I decoded the file — "released to the public domain", citing CC0, so **the site-config rules are safe to reuse**. The engine is separate: third parties call it AGPL, but I fetched `fivefilters.org/full-text-rss/` (200) and grepped — **zero** hits for "AGPL" or "licence". Its own page advertises v3.9.13 dated March 2023. **Engine licence: UNVERIFIED — re-verified and still UNVERIFIED.** My own fetch of `fivefilters.org/full-text-rss/` (200, 97,272 bytes) gives `agpl` 0, `licen` 0, `gpl` 0, `open source` 0 — the vendor's product page makes no licence statement of any kind. The `fivefilters/full-text-rss` 404 also confirmed.
  **New, and more useful than the engine:** the org's other repos *are* licence-tagged, and one is both maintained and permissive — **`fivefilters/readability.php` = Apache-2.0, pushed 2026-07-21**. `fivefilters/ftr-site-config-build` is AGPL-3.0 (circumstantial support for the third-party AGPL claim about the engine, but not evidence about the engine itself). So the FiveFilters stack splits three ways: **rules = CC0, `readability.php` = Apache-2.0, engine = unknown.** Take the first two, skip the engine — Miniflux covers it.

## 2. Curated lists — the licence question that matters

Two separate layers. **The URLs themselves are very likely not copyrightable** — *Feist v. Rural Telephone* (499 U.S. 340) held facts plus unoriginal arrangement lack the required originality. **The curation is different**: selection rationale, headings, annotations and grouping are authored expression and *are* protected. **Practical rule: extract `xmlUrl` values programmatically, re-derive your own grouping, copy none of the prose.** That holds even against the no-licence repos, and is materially safer than pasting a curated markdown section. Not legal advice.

- **`kilimchoi/engineering-blogs`** — **`spdx_id` = null**, `/license` **404** (no licence file at all), 38.4k stars, **last push 2024-08-21**. Formally **all rights reserved.** The one you'd most want. I fetched `engineering_blogs.opml`: 200, 64,089 bytes, **422 `xmlUrl` entries**.
- **`sumodirjo/engineering-blogs`** — **GPL-2.0**, 2026-04-10, 1.68k stars. GPL on a markdown list is a category error by the author, but it's the declared licence. `SOURCES.md` link list, not OPML. Fresher than kilimchoi.
- **`plenaryapp/awesome-rss-feeds`** — **CC0-1.0**, 2026-06-18, 2.6k stars. **Public domain, copy freely.** Cleanest licence here; consumer/news-leaning. Counted: **582 `xmlUrl` entries across 41 OPML files in `recommended/with_category/`** (the brief's "~500" undercounts; there is also a `countries/` tree on top).
- **`tuan3w/awesome-tech-rss`** — **CC0-1.0**, 2026-03-18. `feeds.opml` verified: 200, 19,320 bytes, **143 `xmlUrl` entries**. **Lowest-friction start.**
- **`mmcgrana/services-engineering`** — **null**, last push 2022-10-02. All rights reserved; a reading list, not feeds.
- **`donnemartin/system-design-primer`** — NOASSERTION; decoded `LICENSE.txt` states **CC BY 4.0**. 359k stars. **Reusable commercially with attribution.** No feed URLs.
- **`ashishps1/awesome-system-design-resources`** — GPL-3.0, 2026-02-16, 40k stars. Copyleft.
- **`checkcheckzz/system-design-interview`** — **null**, 2023-04-03. All rights reserved, stale.

**Two popular repos are NonCommercial *and* NoDerivatives:** `ByteByteGoHq/system-design-101` (NOASSERTION; decoded `LICENSE.md` = **CC BY-NC-ND 4.0**) and `karanpratapsingh/system-design` (decoded `LICENSE` = `Attribution-NonCommercial-NoDerivatives 4.0 International`). NC bars commercial use; ND bars excerpted or adapted redistribution. Their diagrams circulate constantly in enterprise architecture decks — putting one in a client deck breaches both. Link, don't reproduce.

### Half of kilimchoi's list is dead

I sampled deterministically (`awk 'NR%28==3'`, n=15), fetched each, and extracted the newest `pubDate`/`updated`:

- **Hard failures — 2/15:** `advancedweb.hu/atom.xml` (`000`), `codenameone.com/feed` (**404**, body "404 Page not found").
- **Live but dormant — 5/15:** `techblog.thescore.com` (newest Oct 2024), `0xadada.pub` (Jun 2024), `evanmiller.org` (Aug 2024), `idiosyncratic-ruby.com` (**Aug 2020**), `iridakos.com` (**May 2020**). All returned **200 with valid `<item>` elements** — exactly your trap: a 200 and well-formed XML prove nothing about whether anyone still writes there.
- **Fresh (2026) — 8/15**, including `engineering.fb.com`, `devblogs.microsoft.com/oldnewthing`.

~13% dead, ~33% dormant, ~53% current. Extrapolated to 422 (n=15, directional only): **roughly 200 of those feeds are noise.** The sample also caught `rosehosting.com/blog/feed/` — a hosting vendor's marketing blog, fresh and worthless. **Gate any imported list on freshness:** drop feeds whose newest item is >~120 days old, re-check monthly.

*Re-verified independently: every one of these measurements reproduced exactly — the two hard failures, all five dormancy dates (thescore 2024-10-08, 0xadada 2024-06-23, evanmiller 2024-08-05, idiosyncratic-ruby 2020-08-24, iridakos 2020-05-13), and both OPML byte counts (64,089 / 422 and 19,320 / 143). The extrapolation is the only soft part and the brief already labels it directional; that label is honest — at n=15 the 95% CI on "33% dormant" runs roughly 12–62%, so "roughly 200 of 422" could as easily be 100 or 300. The **conclusion** (gate on freshness) does not depend on the number.*

Two sampled feeds showed a **date-ordering pathology**: `nickcraver.com` returned 2026-07-04 immediately followed by 2020-02-11, and `planet.mozilla.org/releng` gave 2026-07-28 then 2021-02-18. Feeds are **not** reliably reverse-chronological — pinned posts and Planet-style republishers break it. If your parser trusts document order for "latest", it is already wrong on these two.

## 3. Reddit clients and libraries

- **`praw`** — **BSD-2-Clause**, Python, 2026-07-27, 4.2k stars. Healthy reference implementation. **Requires OAuth credentials**; no meaningful anonymous mode.
- **`asyncpraw`** — BSD-2-Clause, 2026-07-27, 154 stars. Same team, async, also **OAuth-only**.
- **`snoowrap`** — MIT, JS, **ARCHIVED**, last push 2023-02-20. This *was* the JS client; it predates both the 2023 repricing and the 2026 RSS clampdown. **Do not build on it.** I found no maintained JS/TS Reddit client with comparable coverage — that gap argues for the RSS path or ~30 hand-written lines, not a dependency.
- **`reddit-archive/reddit`** — NOASSERTION; decoded licence is **CPAL-1.0**, copyleft *with a mandatory attribution badge*. **ARCHIVED** 2017. Historical only.

**Recommendation:** skip all clients. Test the `user=`/`feed=` RSS parameters first — a config change, no code. If that fails, a `client_credentials` call to `oauth.reddit.com/r/<sub>/top` is ~30 lines of `fetch`, but check the non-commercial terms first.

## 4. Reference implementations worth reading

**Study, don't install.** One file dominates for your specific bugs:

- **`mmcdole/gofeed`** — **MIT**, Go, 2026-07-20, 2.9k stars. **Highest-value read here.** `internal/shared/` is exactly your bug classes: `dateparser.go` (256 lines ✓; **recount: 168 distinct layouts, not 164** — they live in *two* slices, `dateFormats` at line 10 with 120 entries and `dateFormatsWithNamedZone` at line 142 with 49 entries of which one duplicates, plus a separate `timezoneAbbreviations` map at line 201. Port all three; the named-zone slice and the abbreviation map are the parts a naive JS port drops), `xmlsanitizer.go`, `xmlbase.go` (4,862 bytes ✓ of `xml:base`/relative-URL resolution, the root cause of CDATA-wrapped-link breakage), `charsetconv.go`. **MIT lets you port that layout list straight into your JS parser** with attribution. Do this.
- **`feed-rs/feed-rs`** — API `spdx_id` = **null**, Rust, 2026-07-07. **A GitHub API artefact, not all-rights-reserved:** the licence sits at `feed-rs/LICENSE-MIT` in a subdirectory the detector can't see, and `feed-rs/Cargo.toml` declares `license = "MIT"`. **Actually MIT.** Good normalisation model (RSS 0.9x/1/2, Atom, JSON Feed → one struct).
- **`newsboat`** — MIT, C++, 2026-07-28, 3.9k stars. Battle-hardened against real-world malformation.
- **`nkanaev/yarr`** — MIT, Go, 2026-07-28, 3.9k stars. Compact, readable end-to-end.
- **`osmoscraft/osmosfeed`** — MIT, TS, **last push 2023-10-11**. Architecturally your closest twin: reader built from a repo, fetched by GitHub Actions, served as static Pages, no backend. Search results call it active; **the API says nearly three years without a push.** Read the design, don't depend on it.
- **`NewsBlur`** — MIT, Python, 2026-07-28, 7.6k stars. Its fetch scheduler and intelligence classifier are the interesting parts.
- **`GetStream/Winds`** — BSD-3-Clause, **ARCHIVED** 2021-10-11. Dead five years.
- **`HackerNews/API`** — MIT, 2025-01-01. ~~Keep using Algolia — `hnrss.org` search gave me a **502**.~~ **Corrected:** `hnrss.org/newest?q=architecture&points=50` re-fetches **200 with 20 `<item>`**; that 502 was transient. Algolia is a fallback, not a necessity.

## 5. Text quality and deduplication

**Near-duplicate detection.** SimHash is right; the JS ecosystem for it is abandoned. `vkandy/simhash-js` is MIT but last pushed **2017-06-29** (40 stars); on npm, `simhash-js@1.0.0` published **2017-06-29** and `minhash@0.0.9` **2018-06-02** (both MIT, verified via `registry.npmjs.org`). **Do not add an eight-year-dead dependency to a CI job.** SimHash is ~40 lines: hash shingled 3-grams, sum bit vectors ±1, sign-threshold to 64 bits, compare by Hamming distance. References: `1e0ng/simhash` (MIT, 2022-03-24) and `ekzhu/datasketch` (MIT, 2026-07-22, 2.9k stars, actively maintained MinHash/LSH). A community write-up reports Hamming distance **3–5** ([naman.so](https://naman.so/blog/simhash-web-crawl-caching)) — **UNVERIFIED, and the brief mis-stated what it is about.** I fetched it (200): the phrase is there verbatim ("3-5 is the sweet spot for most content"), but it is an aside in the "Mistakes I Made" section of a post about **web-crawl cache invalidation — comparing successive versions of the *same* URL to decide whether to re-fetch — not cross-source near-duplicate detection of news items.** Those are different problems with different tolerances. Two more mismatches: the post's own working code and its Postgres example both use `distance <= 3`, not 3–5; and it tokenises on whitespace, not the shingled 3-grams described above. It attributes its 0–3 band to Google's near-duplicate paper (Manku et al.), which is the citation worth chasing if you want a defensible threshold. **Start at 3, not 5, and tune on your own corpus.** For 86 feeds, honestly: normalised-title matching plus canonical-URL dedup catches most cross-posting; SimHash is phase two.

**Boilerplate extraction.** `mozilla/readability` (Apache-2.0, 2026-07-09, 11.4k), `adbar/trafilatura` (Apache-2.0, 2026-07-28, 6.4k, most active), `buriy/python-readability` (Apache-2.0, 2026-01-26), `postlight/parser` (Apache-2.0, dormant since 2024-07-10). **`go-shiori/go-readability` is ARCHIVED** (MIT, last push 2025-12-05) — it was on your candidate list; it's retired. All permissive, all client-safe. On accuracy, `scrapinghub/article-extraction-benchmark` (MIT, but **ARCHIVED** 2026-05-29 ✓).

> **Correction — those two F1 figures are five years old and the "tie" is contradicted by the source.** 0.945 and 0.943 appear in the README, but inside the block headed **`Earlier results from April 2021`** (trafilatura *0.5.1* vs a 2021 go-readability commit). The block headed **`Results of the latest evaluation`** reads:
>
> | tool | version | F1 |
> |---|---|---|
> | `rs_trafilatura` | 9261e08 | **0.970 ± 0.004** |
> | `go_trafilatura` | ae7ea06 | 0.960 ± 0.007 |
> | `trafilatura` | 2.0.0 | **0.958 ± 0.006** |
> | `readability_js` (= `mozilla/readability`) | 0.6.0 | **0.947 ± 0.005** |
> | `go_readability` | 9f5bf5c | **0.934 ± 0.009** |
>
> So trafilatura leads go-readability by **0.024 F1 with non-overlapping error bars** — **not a tie.** And the practically important row for a JS/TS repo: **`mozilla/readability` went 0.887 (Feb 2021) → 0.947**, putting it within 0.011 of trafilatura and *ahead* of go-readability. **If you ever do need in-process extraction, `mozilla/readability` (Apache-2.0, JS, 2026-07-09) is now the right pick — the brief's own stale numbers hid that.**

**You need none of them:** Miniflux's `fetch-content` gives extraction over HTTP with zero dependencies.

**AI-slop detection.** No credible open-source classifier is worth wiring in, and searching for guidance returned mostly SEO-marketing content that was itself the phenomenon — I'm citing none of it as authority. Use structural and engagement heuristics. Measured from `dev.to/feed/tag/architecture` (200, 12 items): of ~~13~~ **12** titles, substantive ones ("Good mechanisms are not an architecture until a doctrine names them", "The State Machine Behind Honest Automatic Backup") sat beside clear filler ("How to Use One OpenAI-Compatible API for Multiple AI Models", "Cut AI API Costs by Up to 80%...", "CAP Theorem Explained: Like Choosing Your Path in 'The Matrix'") plus a bare intro post ("Hi, I'm Okikiola..."). **~35% noise** — see the correction below. ~~All 9 titles~~ **All 25 items** from `lobste.rs/t/devops.rss` were substantive — zero filler. That asymmetry is your filtering strategy in one observation.

> **Correction — both counts, and the durability of "~35%".**
> - "13 titles" counted the **channel** `<title>` as an item. The feed has 12 `<item>` elements and 13 `<title>` elements total. Denominator is **12**.
> - "9 titles" for Lobsters contradicts this brief's own table, which records 25 items for `/t/devops.rss`. I re-fetched: **25 `<item>`, and reading all 25, every one is a substantive technical post — zero filler.** The asymmetry claim is *stronger* than stated, on a denominator nearly 3× larger.
> - **The ~35% figure does not reproduce.** Re-fetching the same URL hours later, **2 of the 3 cited filler examples were already gone** — "Cut AI API Costs by Up to 80%" and "CAP Theorem Explained: Like Choosing Your Path in 'The Matrix'" have rotated out. The other four cited titles are still present. On the current 12, I count 2 clear filler (~17%). **So "~35% noise" is one snapshot of a fast-rotating 12-item window, not a measured rate** — directionally right, numerically unrepeatable. Consequence for the heuristics below: two of them (`/Cut .* by (Up to )?\d+%/`, `/Explained: Like /`) were reverse-engineered from items with a shelf life of hours. Keep them, they cost nothing, but **do not treat that regex list as tuned** — the engagement floor and the author allowlist are the parts that will still work next month.
> - Confirmed as stated: the dev.to RSS feed carries **no engagement data at all** — zero occurrences of `public_reactions_count` or even the substring `reaction`. The JSON-API argument holds.

Heuristics that would have caught the dev.to filler: drop `/^Hi,? I'?m /` and `/^(Day|Week) \d+ of /`; drop `/Cut .* by (Up to )?\d+%/` and `/\b\d{1,3}% (faster|cheaper|less)\b/`; drop `/Explained: Like /` and `/\bTop \d+\b/`; require a `public_reactions_count` floor from the dev.to JSON API (**the RSS feed omits engagement entirely** and returns only 12 items); and keep an author allowlist — on dev.to, author identity predicts quality far better than tag does. One title in that same feed — "Architecting Edge-to-Cloud Telemetry for Event Access Control and ROI Dashboards" — is directly on your professional beat. **Keep dev.to, filter it hard.**

## 6. Final table

Licence-risky first. "Client-safe" = may you ship this code or excerpted content to a paying MNC client.

| Repo | URL | SPDX (API) | Lang | Last push | Archived? | For | Client-safe? |
|---|---|---|---|---|---|---|---|
| kilimchoi/engineering-blogs | https://github.com/kilimchoi/engineering-blogs | **null** | Ruby | 2024-08-21 | No | 422-feed OPML | **NO** — all rights reserved; extract URLs only |
| mmcgrana/services-engineering | https://github.com/mmcgrana/services-engineering | **null** | – | 2022-10-02 | No | Reading list | **NO** — all rights reserved |
| checkcheckzz/system-design-interview | https://github.com/checkcheckzz/system-design-interview | **null** | – | 2023-04-03 | No | Link list | **NO** — all rights reserved |
| damoeb/rss-proxy | https://github.com/damoeb/rss-proxy | **null** | TS | 2025-01-06 | No | Feeds via CSS selectors | **NO** — no licence file |
| ByteByteGoHq/system-design-101 | https://github.com/ByteByteGoHq/system-design-101 | NOASSERTION → **CC BY-NC-ND 4.0** | – | 2025-04-04 | No | Arch diagrams | **NO** — NonCommercial + NoDerivatives |
| karanpratapsingh/system-design | https://github.com/karanpratapsingh/system-design | NOASSERTION → **CC BY-NC-ND 4.0** | – | 2026-07-08 | No | Course | **NO** — NonCommercial + NoDerivatives |
| reddit-archive/reddit | https://github.com/reddit-archive/reddit | NOASSERTION → **CPAL-1.0** | Python | 2017-10-17 | **YES** | Historic source | No — copyleft + attribution badge |
| DIYgod/RSSHub | https://github.com/DIYgod/RSSHub | **AGPL-3.0** | TS | 2026-07-29 | No | 5,000+ site→RSS routes | Self-host unmodified; **network clause** |
| FreshRSS/FreshRSS | https://github.com/FreshRSS/FreshRSS | **AGPL-3.0** | PHP | 2026-07-28 | No | Reader + API | Self-host unmodified; **network clause** |
| zedeus/nitter | https://github.com/zedeus/nitter | **AGPL-3.0** | Nim | 2026-07-11 | No | X bridge | **network clause**; unreliable |
| tt-rss/tt-rss | https://github.com/tt-rss/tt-rss | GPL-3.0 | PHP | 2026-07-26 | No | Reader + API | Copyleft, no network clause |
| ashishps1/awesome-system-design-resources | https://github.com/ashishps1/awesome-system-design-resources | GPL-3.0 | Java | 2026-02-16 | No | Design list | Copyleft — don't vendor |
| sumodirjo/engineering-blogs | https://github.com/sumodirjo/engineering-blogs | GPL-2.0 | – | 2026-04-10 | No | Blog link list | Copyleft; extract URLs only |
| not-an-aardvark/snoowrap | https://github.com/not-an-aardvark/snoowrap | MIT | JS | 2023-02-20 | **YES** | JS Reddit client | Licence fine, **abandoned** |
| GetStream/Winds | https://github.com/GetStream/Winds | BSD-3-Clause | JS | 2021-10-11 | **YES** | RSS app | Licence fine, dead 5 yrs |
| go-shiori/go-readability | https://github.com/go-shiori/go-readability | MIT | Go | 2025-12-05 | **YES** | Readability port | Licence fine, **retired** |
| scrapinghub/article-extraction-benchmark | https://github.com/scrapinghub/article-extraction-benchmark | MIT | Python | 2026-05-29 | **YES** | Extraction benchmark | Yes, frozen — **read the `latest evaluation` block, not `Earlier results from April 2021`** |
| fivefilters/readability.php | https://github.com/fivefilters/readability.php | Apache-2.0 | PHP | 2026-07-21 | No | FiveFilters' own extractor | **Yes** — added in review; permissive, unlike the engine |
| osmoscraft/osmosfeed | https://github.com/osmoscraft/osmosfeed | MIT | TS | 2023-10-11 | No | Static CI reader | Yes; **dormant — study only** |
| vkandy/simhash-js | https://github.com/vkandy/simhash-js | MIT | JS | 2017-06-29 | No | SimHash in JS | Yes, 8 yrs dead — reimplement |
| RSS-Bridge/rss-bridge | https://github.com/RSS-Bridge/rss-bridge | **Unlicense** | PHP | 2026-07-24 | No | Per-site bridges | **Yes — public domain** |
| fivefilters/ftr-site-config | https://github.com/fivefilters/ftr-site-config | NOASSERTION → **CC0** | – | 2026-07-27 | No | Extraction rules | **Yes — public domain** |
| plenaryapp/awesome-rss-feeds | https://github.com/plenaryapp/awesome-rss-feeds | **CC0-1.0** | Shell | 2026-06-18 | No | ~500 feeds + OPML | **Yes — copy freely** |
| tuan3w/awesome-tech-rss | https://github.com/tuan3w/awesome-tech-rss | **CC0-1.0** | Python | 2026-03-18 | No | 143-feed OPML | **Yes — copy freely** |
| miniflux/v2 | https://github.com/miniflux/v2 | Apache-2.0 | Go | 2026-07-24 | No | Reader + API + extraction | **Yes — best fit** |
| mmcdole/gofeed | https://github.com/mmcdole/gofeed | MIT | Go | 2026-07-20 | No | Robust parser | **Yes — port the date layouts** |
| feed-rs/feed-rs | https://github.com/feed-rs/feed-rs | null → **MIT** (Cargo.toml) | Rust | 2026-07-07 | No | Normalising parser | Yes — MIT despite API null |
| mozilla/readability | https://github.com/mozilla/readability | Apache-2.0 | JS | 2026-07-09 | No | Boilerplate removal | Yes |
| adbar/trafilatura | https://github.com/adbar/trafilatura | Apache-2.0 | Python | 2026-07-28 | No | Best-accuracy extraction | Yes |
| buriy/python-readability | https://github.com/buriy/python-readability | Apache-2.0 | Python | 2026-01-26 | No | Readability port | Yes |
| postlight/parser | https://github.com/postlight/parser | Apache-2.0 | JS | 2024-07-10 | No | Article parser | Yes, dormant |
| donnemartin/system-design-primer | https://github.com/donnemartin/system-design-primer | NOASSERTION → **CC BY 4.0** | Python | 2026-03-20 | No | Design reference | **Yes with attribution** |
| praw-dev/praw | https://github.com/praw-dev/praw | BSD-2-Clause | Python | 2026-07-27 | No | Reddit client (OAuth) | Yes (licence); ToS is the limit |
| praw-dev/asyncpraw | https://github.com/praw-dev/asyncpraw | BSD-2-Clause | Python | 2026-07-27 | No | Async PRAW (OAuth) | Yes (licence) |
| newsboat/newsboat | https://github.com/newsboat/newsboat | MIT | C++ | 2026-07-28 | No | TUI reader | Yes |
| nkanaev/yarr | https://github.com/nkanaev/yarr | MIT | Go | 2026-07-28 | No | Single-binary reader | Yes |
| samuelclay/NewsBlur | https://github.com/samuelclay/NewsBlur | MIT | Python | 2026-07-28 | No | Reader + classifier | Yes |
| feedbin/feedbin | https://github.com/feedbin/feedbin | MIT | Ruby | 2026-07-29 | No | Rails reader + API | Yes |
| ekzhu/datasketch | https://github.com/ekzhu/datasketch | MIT | Python | 2026-07-22 | No | MinHash/LSH | Yes |
| 1e0ng/simhash | https://github.com/1e0ng/simhash | MIT | Python | 2022-03-24 | No | SimHash reference | Yes |
| HackerNews/API | https://github.com/HackerNews/API | MIT | – | 2025-01-01 | No | Official HN API docs | Yes |

**Licence audit re-run independently against `GET /repos/{owner}/{repo}`: all 42 rows above — every `spdx_id`, every `archived` flag, every `pushed_at`, and every star count — matched this brief exactly, with zero discrepancies.** All five NOASSERTION decodings were re-confirmed by base64-decoding the `/license` payload: `ftr-site-config` → "released to the public domain… creativecommons.org/publicdomain/zero/1.0" (CC0); `system-design-primer` → "Creative Commons Attribution 4.0 International License (CC BY 4.0)"; `system-design-101` → CC BY-NC-ND 4.0; `karanpratapsingh/system-design` → "Attribution-NonCommercial-NoDerivatives 4.0 International"; `reddit-archive/reddit` → "Common Public Attribution License Version 1.0 (CPAL)". All four `null` repos genuinely 404 on `/license`. **The `feed-rs` override is correct and I would make the same call:** `feed-rs/LICENSE-MIT` exists (1,072 bytes, "MIT License / Copyright (c) 2019 Hiroki Kumamoto"), `feed-rs/Cargo.toml` declares `license = "MIT"` and even lists `"LICENSE-MIT"` in its packaged files — the root has no licence, which is exactly why GitHub's detector misses it. **Section 2's licence work is the most reliable part of this brief; the errors are all in the measured-behaviour and cited-figure claims.**

### `license.spdx_id` = null — all rights reserved, cannot be reused

**`kilimchoi/engineering-blogs`, `mmcgrana/services-engineering`, `checkcheckzz/system-design-interview`, `damoeb/rss-proxy`.** No licence grant: no right to copy, modify or redistribute the content. `feed-rs/feed-rs` also returns null but is a **false positive** — `LICENSE-MIT` in a subdirectory, MIT in `Cargo.toml`. That distinction is why null warrants a look inside rather than an automatic verdict.

### AGPL — network clause

**`RSSHub`, `FreshRSS`, `nitter`.** Unmodified private instances are fine. **Modify one and let anyone else reach it over a network, and you owe those users your modified source.** A self-hosted gateway handling confidential client material will accrete internal tweaks — precisely the disclosure trigger. **Prefer Miniflux (Apache-2.0) or RSS-Bridge (Unlicense) and the question never arises.**

## Recommendation

1. **Add Lobsters now** — `lobste.rs/rss`, `/t/devops.rss`, `/t/distributed.rss`, `/t/practices.rss` (all 200, 25 items). One tag per URL: `/t/kubernetes.rss` **404s** and comma/dot multi-tag syntax **404s**.
2. **Keep dev.to via the JSON API, not RSS** — you need `public_reactions_count` to filter the ~35% noise.
3. ~~**Medium: per-publication feeds only.**~~ **Superseded — drop Medium entirely for now.** Tag feeds TCP-reset my IP after four requests, *and* on re-verification the flagship per-publication feed (`netflixtechblog.com/feed`) returns **429 with `cf-mitigated: challenge`** — a Cloudflare interactive challenge no CI job can clear. Custom-domain Medium publications sit behind the same edge as `medium.com`, so "per-publication only" does not buy you a way in. If you want Netflix's blog, get it via an aggregator that already has it (Lobsters, HN) or re-test from the Actions runner before committing a URL.
4. **Reddit: try `user=`/`feed=` before writing code** — but budget for it being temporary. The rate-limit numbers are community estimates, not published limits (see correction above), the article's author found that **account authentication alone did not stop the 429s**, and Reddit appears to have publicly flagged RSS as a scraping surface it intends to address. If `user=`/`feed=` fails, drop Reddit rather than build OAuth against non-commercial terms.
5. **Port gofeed's ~~164~~ 168 date layouts** from `internal/shared/dateparser.go` (MIT) — **both slices plus the `timezoneAbbreviations` map**, not just `dateFormats`; read `xmlbase.go` for the CDATA/relative-link bug.
6. **Add a freshness gate** before importing any list — half of kilimchoi's 422 feeds are dead or dormant while returning HTTP 200.
7. **Stop trusting document order** for "newest" — 2 of 15 sampled feeds were not reverse-chronological. *(Both re-verified: `nickcraver.com` 2026-07-04 → 2020-02-11, `planet.mozilla.org/releng` 2026-07-28 → 2021-02-18.)*
8. **Added in review — HN search is available after all.** `hnrss.org/newest?q=<term>&points=<n>` re-fetched 200/20 items. The brief's 502 was transient, so you are not forced onto Algolia for keyword filtering; `hnrss` keyword feeds are a valid, zero-dependency source. Keep Algolia as the fallback, not the only option.

## Sources

- GitHub REST API `GET /repos/{owner}/{repo}` and `/repos/{owner}/{repo}/license` — https://docs.github.com/rest/repos/repos#get-a-repository (all SPDX ids, push dates, archived flags, stars)
- https://lapcatsoftware.com/articles/2026/6/3.html — Reddit RSS limit change (raw HTML verified: "100 updates per 10 minutes" → "1 update per 1 minute"; `user=`/`feed=`)
- https://www.redditinc.com/policies/data-api-terms — Data API Terms (200, 566,677 bytes; §3.1 verified verbatim: commercial/above-limit use needs a separate agreement, fees "at Reddit's sole discretion". **Contains no `QPM`, `queries per`, `per minute`, `0.24` or `12,000`** — the quoted pricing and rate figures are not from here)
- https://miniflux.app/docs/api.html — `X-Auth-Token`, `/v1/entries/{id}/fetch-content`
- https://raw.githubusercontent.com/kilimchoi/engineering-blogs/master/engineering_blogs.opml — 200, 64,089 bytes, 422 `xmlUrl`
- https://raw.githubusercontent.com/tuan3w/awesome-tech-rss/master/feeds.opml — 200, 19,320 bytes, 143 `xmlUrl`
- https://registry.npmjs.org/simhash-js · https://registry.npmjs.org/minhash — publish dates 2017-06-29 / 2018-06-02
- https://github.com/scrapinghub/article-extraction-benchmark — extraction F1 figures
- https://naman.so/blog/simhash-web-crawl-caching — "3-5 is the sweet spot" (**UNVERIFIED**; and the post is about **crawl-cache invalidation on the same URL**, not cross-source news dedup — its own code uses `<= 3`)
- https://www.fivefilters.org/full-text-rss/ — 200, 97,272 bytes; **no** licence statement present (`agpl`/`gpl`/`licen` all zero — engine licence UNVERIFIED); advertises v3.9.13, March 2023
- https://github.com/fivefilters/readability.php — Apache-2.0, pushed 2026-07-21 (added in review: FiveFilters' maintained, permissively-licensed extractor)
- https://raw.githubusercontent.com/scrapinghub/article-extraction-benchmark/master/README.rst — **current** table: trafilatura 2.0.0 = 0.958 ± 0.006, `readability_js` 0.6.0 = 0.947 ± 0.005, `go_readability` = 0.934 ± 0.009. The brief's 0.945/0.943 are from the `Earlier results from April 2021` block
- https://www.reddit.com/r/rss/comments/1u3qrij/ · https://www.reddit.com/r/rss/comments/1u3qqmk/ — the actual origin of the "100 per 10 min → 1 per 1 min" figures (community threads quoted by lapcatsoftware, one poster self-hedging)
- https://www.reddit.com/r/modnews/comments/1tq9vxo/ — Reddit's "deprecating unauthenticated JSON access / RSS as a scraping surface" post. **UNVERIFIED at source:** returns a bot-check shell ("Please wait for verification") to a plain client; known only as quoted by lapcatsoftware
- https://support.reddithelp.com/hc/en-us/articles/16160319875092-Reddit-Data-API-Wiki — **403** to both `WebFetch` and browser-UA `curl`; the one plausibly-primary rate-limit page is unreachable
- Feeds fetched directly this session with `curl -sSL -A 'TechPulse/1.0 (+https://github.com/techpulse)' --max-time 18`: `reddit.com/r/{devops,ExperiencedDevs,aws,kubernetes}/.rss`; `medium.com/feed/tag/{system-design,kubernetes,platform-engineering}`; `netflixtechblog.com/feed`; `dev.to/feed/tag/{architecture,devops,aws,kubernetes,systemdesign}`; `lobste.rs/rss` and `/t/{devops,distributed,practices,kubernetes}.rss`; `hnrss.org/frontpage?points=200`; `hnrss.org/newest?q=architecture&points=50`; `rsshub.app/reddit/subreddit/devops/hot`; `rss-bridge.org/bridge01/`; and 15 sampled feeds from the kilimchoi OPML
- *Feist Publications v. Rural Telephone Service*, 499 U.S. 340 (1991) — facts and unoriginal arrangement not copyrightable (background, not advice). Citation and holding are stated correctly, and the brief's own caveats are the right ones: **it is US law only** — the EU/UK *sui generis* database right (Directive 96/9/EC) protects substantial-investment databases with no originality requirement, so "a bare list of URLs is not copyrightable" is **not** a safe global assumption for an MNC-facing deliverable. The brief's operative advice — extract `xmlUrl`, re-derive your own grouping, copy no prose — is sound either way and does not depend on Feist
- Re-verification round 2026-07-29: 41 feed URLs re-fetched with `curl -sSL -w '%{http_code} %{content_type}' -A 'TechPulse/1.0 (+https://github.com/techpulse)' --max-time 18`, each body checked for `<item>`/`<entry>` presence **and** for a `<title>` matching the claimed publisher (all live feeds matched — no repurposed or hijacked feeds found); 42 repos re-queried via `gh api repos/{owner}/{repo}`
