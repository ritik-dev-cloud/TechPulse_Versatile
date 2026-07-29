# Hyperscale Streaming Architecture — Netflix, Hotstar and Peers

> Research brief · compiled 2026-07-29

Every number below is traced to a source and a date. Much "how Netflix works" content online is recycled and wrong; where only secondary reporting exists, it says so. Where a source was unreachable from this machine, that is stated rather than papered over.

---

## 1. Netflix: the real timeline

**2008 → 2016.** Migration began "August of 2008, when we experienced a major database corruption" and finished "early January, 2016, after seven years of diligent effort" ([completing-the-netflix-cloud-migration](https://about.netflix.com/en/news/completing-the-netflix-cloud-migration)). Two details are usually mis-told: they explicitly refused to "forklift all of the systems, unchanged, out of the data center," instead having "denormalized … our data model, using NoSQL databases"; and the payoff cited is economic, not raw speed — "cloud costs per streaming start ended up being a fraction of those in the data center." Same post: "from a monolithic app to hundreds of micro-services."

**Open Connect.** Netflix states it "delivers 100% of Netflix's video traffic," at "tens of terabits per second of simultaneous peak traffic," with "close to 90% of Netflix's traffic … delivered via direct connections between Open Connect and the residential ISPs" ([How Netflix Works With ISPs](https://about.netflix.com/en/news/how-netflix-works-with-isps-around-the-globe-to-deliver-a-great-viewing-experience); the "125 million hours/day" on that page is dated — treat as a floor). Hardware from Netflix's partner site ([appliances](https://openconnect.netflix.com/en/appliances/)): **Storage Appliance** 2U, up to **120 TB raw**, **~200 Gbps**, ~400 W peak; **Global Appliance** up to **60 TB**, **~80 Gbps**, ~250 W. "Over a thousand ISPs" partnered; same-capability OCAs in "60+ global data centers" ([openconnect.netflix.com/en](https://openconnect.netflix.com/en/)).

OCAs are **directed caches**, not pull-through: an OCA serves only client prefixes advertised to it over **BGP**, the ISP controls steering, and content is pre-positioned in nightly **fill windows** by predicted popularity. The control plane stays in AWS; the bytes never touch it.

**Edge / API.** Zuul 1 blocked; Zuul 2 is Netty-based and async — and Netflix's retrospective is refreshingly negative: "our aspirations have differed from the results"; the event loop's "stack trace is meaningless when trying to follow a request"; mishandled state produces "ByteBuf leaks, file descriptor leaks, and lost responses" that are "quite difficult to debug." The one clear win is **connection scaling**, bought with "a system that is much more complex to debug, code, and test" (Oct 2016, via [InfoQ](https://www.infoq.com/news/2016/10/netflix-zuul-asynch-nonblocking/) — Medium original unreachable, §6). Zuul 2 also added **origin concurrency protection** so one slow backend cannot starve the rest.

**GraphQL federation.** QCon Plus, Jennifer Shin and Stephen Spalding, **23 Nov 2020** ([InfoQ](https://www.infoq.com/presentations/netflix-api-graphql-federation/)). Self-inflicted problem: a monolithic Falcor aggregation layer where "the API gateway had become the new monolith," and a graph where "no single human understands the entire surface area. Yet the entire graph is owned by a single team." From that talk: **50+ graph services in production within one year**, **60+ studio apps**, schema **~800 nodes (Oct 2019) → ~7,000**, planning plus execution averaging **under 1 ms**. Domain services (DGSs) sit behind the federated gateway, itself behind Zuul; [Netflix/dgs-framework](https://github.com/Netflix/dgs-framework) is the OSS implementation.

**Hystrix is dead, and Netflix says why.** The [README](https://github.com/Netflix/Hystrix/blob/master/README.md): "no longer in active development, and is currently in maintenance mode," because their "focus has shifted towards more adaptive implementations that react to an application's real time performance rather than pre-configured settings (for example, through adaptive concurrency limits)," and they now "leverage open and active projects like resilience4j for new internal projects. We are beginning to recommend others do the same." Final release 1.5.18. The most useful reversal in the corpus: **static circuit-breaker thresholds lose to measured, adaptive limits** — Little's-Law queue estimation in [Netflix/concurrency-limits](https://github.com/Netflix/concurrency-limits). Relatedly, Eureka + Ribbon (Java-only client-side discovery/LB) gave way to Envoy as the stack went polyglot; because Envoy needed clusters declared up front, Netflix funded **On-Demand Cluster Discovery** upstream, yielding a "zero configuration" mesh ([InfoQ, Sept 2023](https://www.infoq.com/news/2023/09/zero-config-service-mesh-netflix/)).

**Caching.** The most concrete published Netflix figures, from *Building a Global Caching System at Netflix* (Rangarajan & Karumanchi, **11 Oct 2024**, [InfoQ](https://www.infoq.com/articles/netflix-global-cache/)): **200 memcached clusters**, **22,000 instances**, **400M ops/sec**, **~2 trillion items**, **14.3 PB**, **4 regions**, **30M replication events/sec**. Replication is **client-initiated** — metadata to **Kafka**, a reader polls and calls the remote writer, failures retried via **SQS**. Zstandard cut bandwidth 35%; replacing NLBs with Eureka DNS client-side LB cut transfer cost ~50% and dropped NLB traffic from 45 GB/s to <100 MB/s. Cassandra is the durable tier ([Netflix/Priam](https://github.com/Netflix/Priam)).

**Data platform.** [Netflix/maestro](https://github.com/Netflix/maestro) (open-sourced July 2024) schedules "hundreds of thousands of workflows, millions of jobs every day" — ~500k daily, up to **2M on busy days**. Netflix created **Apache Iceberg** and reports **1M+ Iceberg tables** internally. Spinnaker is the delivery platform, and a hard dependency of modern Chaos Monkey.

**Chaos engineering.** Chaos Monkey → Simian Army → **ChAP**. Simian Army is explicitly unmaintained; Janitor Monkey became Swabbie, Conformity Monkey folded into Spinnaker ([SimianArmy](https://github.com/Netflix/SimianArmy)). ChAP is peer-reviewed — Basiri, Hochstein, Jones, Tucker, ICSE-SEIP 2019 ([arxiv.org/abs/1905.04648](https://arxiv.org/abs/1905.04648)). The design that matters for running a show: provision **two scaled-down clusters** (control baseline + canary), route a small slice of real traffic to each, inject latency/errors into the canary only, compare, and **auto-abort on a pre-defined error budget**. Chaos with a blast radius and a kill switch — not random instance killing.

**Compute.** [Netflix/titus-control-plane](https://github.com/Netflix/titus-control-plane) is now **archived** (last push 2022-05-13). Direction since is Kubernetes-native: Netflix migrated Titus onto **EKS in ~11 weeks** after nine months of prep, running **<20 production clusters across four regions**, up to **10,000 instances and 80,000 pods per cluster**, needing **70,000 containers launched in five minutes** at peak (AWS re:Invent 2025 material on [repost.aws](https://repost.aws/articles/ARpqKdaLinSJqT4dTbRn7WUg/aws-re-invent-2025-the-future-of-kubernetes-on-aws)). **That page 403'd on direct fetch — those figures reached me only via search indexing, so treat as secondary until you watch the session.** Homegrown batch queueing has been replaced by upstream **Kueue** (June 2026).

**Encoding.** Three published generations: **per-title** (Dec 2015) picks a ladder per title by complexity; the **Dynamic Optimizer** extends this **per shot**, spending bits on complex shots at equal perceptual quality; **shot-based 4K encodes** shipped to production ([research.netflix.com](https://research.netflix.com/publication/optimized-shot-based-encodes-for-4k-now-streaming)). AV1 rolled out to TVs, high-viewership titles first. Quality measured with **VMAF** — licence **NOASSERTION** (§7).

**Live, and the public failure.** Jake Paul vs Mike Tyson (15 Nov 2024): **60M households** live, peak **65M concurrent streams** globally, **38M in the US**, 108M average-minute global viewers ([about.netflix.com](https://about.netflix.com/en/news/jake-paul-vs-mike-tyson-over-108-million-live-global-viewers)). It also buffered visibly and widely — the clearest demonstration that a VOD-optimised CDN and a real-time live event are different problems.

---

## 2. Hotstar / JioHotstar — the record holder

Closest case to a live-event business, and the one where numbers are most abused.

**What is actually claimed, by whom, when.** Strongest primary artefact: AWS re:Invent 2019 deck **CMY302, "Scaling hotstar.com for 25 million concurrent viewers," Gaurav Kamboj, Cloud Architect, Hotstar** ([PDF](https://d1.awsstatic.com/events/reinvent/2019/Scaling_Hotstar.com_for_25_million_concurrent_viewers_CMY302.pdf) — slide text extracted directly). Its own comparison slide: YouTube "Supersonic Jump" **8M**; NBC Sports App Super Bowl **3.1M**; hotstar IPL 2018 Final **10.3M**; hotstar IPL 2019 Final **18.6M**; hotstar World Cup India v New Zealand **25.3M**. The 18.6M is independently confirmed by [AWS, May 2019](https://aws.amazon.com/blogs/media/in-the-news-hotstar-sets-new-global-record-for-live-viewership/).

Later records are **company claims relayed by press**, not engineering publications: **53M** concurrent for India–New Zealand (15 Nov 2023) and **59M / 5.9 crore** for the India–Australia ODI World Cup final (19 Nov 2023), attributed to Sajith Sivanandan of Disney+ Hotstar India ([OTTVerse](https://ottverse.com/india-vs-australia-world-cup-finals-hits-5-9-crore-59-million-concurrent-viewers-on-disney-hotstar/), [TechCrunch](https://techcrunch.com/2023/11/19/india-and-australia-world-cup-final-shatters-streaming-records-on-hotstar)). The current record has a good source: the **ICC's own media release** gives **65.2M peak concurrent viewers** on JioHotstar for India–England, T20 World Cup semi-final, **5 March 2026**, plus **619M views**, beating "the previous global record of 65 million set by an international streaming platform in November 2024" (Netflix's Paul–Tyson figure), and notes JioHotstar's was single-market ([ICC media release](https://www.icc-cricket.com/media-releases/icc-men-s-t20-world-cup-2026-sets-new-global-streaming-record-on-jiohotstar-during-india-england-semi-final)).

**Numbers to reject.** Several AI-written posts claim **821 million / 82.1 crore concurrent streams** for the 2026 final. That is not concurrency — it is a views figure or a fabrication, with no primary support. Treat anything above 65.2M as **UNVERIFIED**. [konkurrency.com](https://konkurrency.com/) lists **72M** for the final but cites no sources and disclaims its own accuracy. The endlessly copied "500+ C4 instances / 16 TB RAM / 8,000 cores / 32 Gbps" Hotstar spec appears only in SEO blogs and is inconsistent with a 10 Tbps-class event — **UNVERIFIED**.

**How they survive a wicket.** From the deck's own slides: **GameDay** — "Face the real game before actual game"; a "Battle-tested scaling strategy"; deliberate chaos; and an explicit **Panic mode** defined on-slide as *"P0 services must be always up"* plus *"Graceful Degradation — Turn off non-critical services."* Closing takeaways: "Prepare for failures / Understand your user journey / Okay to degrade gracefully." The architectural crux is that **reactive autoscaling does not work** for this traffic shape — a wicket falls and millions arrive within seconds, far faster than an ASG boots and warms. The answer is **pre-scaling against a fixture calendar**, plus an in-house load generator (**Hulk**) used to rehearse tens of millions of sessions. AWS references two Hotstar posts by title — *"Scaling for Tsunami Traffic"* (Kaushik Chandrashekar) and *"Saving Millions: Leveraging EC2 Spots at Scale"* (Kamboj) — the canonical sources for the tsunami pattern and spot economics. **I could not fetch either: Hotstar's blog is Medium-hosted and Medium is hard-blocked here (§6), so those details rest on the AWS post plus secondary summaries.** The "Infinite Retry Storm" framing traces to Hotstar talks but I found **no primary page** — **UNVERIFIED**.

**The merger.** Disney completed the merger of its Indian TV/streaming assets with Reliance in **November 2024**, forming **JioStar** (₹70,352 crore / ~US$8.5bn; Viacom18/Reliance 63.16%, Disney 36.84%, Reliance operating partner) — [jiostar.com](https://www.jiostar.com/news/reliance-and-disney-announce-completion-of-transaction-to-form-joint-venture-to-bring-together-the-most-iconic-and-engaging-entertainment-brands-in-india/). Apps merged **14 February 2025** into **JioHotstar**, with **JioCinema's infrastructure absorbing Disney+ Hotstar's catalogue** rather than the reverse; JioCinema subscriptions stopped renewing 15 Feb 2025. There is **no published post-merger engineering write-up of the combined live path** — a real gap.

---

## 3. Peers

**Prime Video — the monolith story, correctly scoped.** The 2023 post *Scaling up the Prime Video audio/video monitoring service and reducing costs by 90%* covered **one internal tool**: the Video Quality Analysis service sampling streams for block corruption and A/V desync. It orchestrated per-frame work via **Step Functions + Lambda**, passing frames through **S3**; the bottlenecks were state-transition limits and per-frame S3 round-trips. The fix collapsed detectors into a **single process on EC2/ECS** — "monolith" meaning one deployment unit, not a company-wide reversal — plus compute savings plans. The 90% is that service's infrastructure cost. **Caveat: primevideotech.com now 301-redirects to aboutamazon.com and the post is gone**; web.archive.org is unreachable from this tool, and Adrian Cockcroft's rebuttal (*So many bad takes*) is Medium-hosted and equally unreachable. Treat the mechanism as **reconstructed from secondary reporting**.

**Twitch** — best-documented live ingest in public. *Ingesting Live Video Streams at Global Scale* (26 Apr 2022, [blog.twitch.tv](https://blog.twitch.tv/en/2022/04/26/ingesting-live-video-streams-at-global-scale/)): **nearly a hundred PoPs**; a media proxy terminates RTMP (or WebRTC) at the edge, then asks a centralised stateful **Intelligest Routing Service** which origin to use — deliberately *not* DNS or plain anycast, so routing responds to live capacity signals from **Capacitor** (compute) and **The Well** (backbone); on capacity loss IRS steers *new* streams away. *Low Latency, High Reach* (25 Oct 2021, [blog.twitch.tv](https://blog.twitch.tv/en/2021/10/25/low-latency-high-reach-creating-an-unparalleled-live-video-streaming-network-at-twitch/)): latency ~15 s → 10 s → **3 s** with low-latency HLS, **1.5 s** in Korea; **hundreds of thousands of concurrent channels**, **1.5M+ streaming at any moment**; hardware transcoding gave **10× capacity at 2× cost**, up from 2–3% of channels transcoded.

**YouTube.** Google's SIGCOMM 2017 *The QUIC Transport Protocol* ([research.google](https://research.google/pubs/the-quic-transport-protocol-design-and-internet-scale-deployment/)): QUIC cut **YouTube rebuffer rates 18.0% on desktop, 15.3% on mobile**, Search latency 8.0%/3.6%. Lesson: on poor networks, head-of-line blocking and handshake cost dominate rebuffering, not bitrate.

**Spotify** — best cheap analogue for a scheduled spike. *Load Testing for 2022 Wrapped* (31 Mar 2023, [engineering.atspotify.com](https://engineering.atspotify.com/2023/3/load-testing-for-2022-wrapped)): 150M+ engaged users, 111 markets, "tens of thousands of requests per second" across US/EU/Asia; load generated with an internal Backstage plugin (**Moshpit**, HTTP + gRPC over protobuf); pods scaled horizontally in advance; **upstream owners** (metadata, translation, image generation, personalisation) notified so they scaled too. The 2025 follow-up states it outright: *Wrapped doesn't ramp, it spikes*, so reactive autoscaling is too slow — pre-scale compute and database nodes hours ahead and run synthetic load in every region to **warm connection pools, caches and database tablet assignments**.

**Zoom.** Meetings are distributed across Zoom's DC network with users joining the nearest, and **Multimedia Routers (MMRs)** forward multiple streams per client rather than mixing centrally; MMRs group into "Meeting Zones," duplicated per data centre and addable on the fly ([library.zoom.com](https://library.zoom.com/admin-corner/architecture-and-design/zoom-architected-for-reliability)). Context: ~10M daily meeting participants Dec 2019 → ~300M April 2020.

**Cloudflare Stream** shipped LL-HLS to open beta 25 Sep 2023 with "as little as three seconds" player latency ([blog.cloudflare.com](https://blog.cloudflare.com/cloudflare-stream-low-latency-hls-open-beta/)).

**Disney+.** No genuine Disney engineering blog is reachable. Nearest primary-adjacent material is a Databricks/AWS case study co-authored with Disney+ engineers: **billions of events per hour** into Kinesis Data Streams, processed with Kinesis Data Analytics for Flink. Vendor-authored — **secondary**.

**Other India.** JioCinema's IPL 2024 figures (620M reach, 350bn minutes, 12 language feeds, 4K, multicam) are press, not engineering. **SonyLIV and Zee5 have no engineering blog or feed** — `sonyliv.com/feed` 404s, `zee5.com/feed` 403s.

---

## 4. Transferable patterns at event scale (hundreds to low thousands)

| Pattern | Principle → documented by | Cheap version at event scale |
|---|---|---|
| Pre-warm, don't autoscale | Spiky arrivals outrun ASG boot + warm-up → Hotstar CMY302; Spotify Wrapped | Min-capacity = expected peak, from 60–90 min before doors. Two idle hours ≪ a failed keynote. |
| Capacity reservation | Guarantee the instances exist → Hotstar (spot + on-demand mix) | On-demand Capacity Reservation for the show window; spot only for re-runnable transcode. |
| Multi-CDN, active failover | One CDN will have a bad region on the day → Netflix Open Connect; Twitch IRS | Two CDNs on one HLS origin; player-side manifest fallback plus a rehearsed CNAME switch. Measure from the venue and the audience's ISPs. |
| ABR ladder discipline | Ladder matches content, not a template → Netflix per-title/per-shot; Twitch transcode economics | 4–5 rungs (240/480/720/1080). Keep a 400–600 kbps rung — hotel and office Wi-Fi need it. |
| Graceful degradation | Define P0 vs droppable first → Hotstar Panic mode (*P0 always up; turn off non-critical*) | Written kill list — chat, polls, reactions, Q&A, analytics — each behind a flag someone in the room can flip. Playback is P0; nothing else is. |
| Load shedding / backpressure | Reject fast rather than queue forever → Zuul 2 origin concurrency protection | Concurrency cap and fast 429 at the gateway; static fallback manifest from object storage when over budget. |
| Adaptive limits > fixed breakers | Measured beats guessed → Netflix: Hystrix → adaptive concurrency limits | resilience4j with modest timeouts. Don't hand-tune 40 thresholds you'll never revalidate. |
| Jittered exponential backoff | Naive retries are a self-DDoS → Zuul 2 adaptive retries; Hotstar (primary unverified) | Cap total attempts; backoff **with full jitter**; client-side breaker. A synchronised 1 s retry loop across 3,000 viewers is 3,000 rps of pure damage. |
| Cell / bulkhead isolation | Failure domain smaller than the audience → Zoom Meeting Zones | Split viewers across two independent stacks so a bad deploy loses half the room, not all of it. |
| Chaos test before the show | Rehearse failure with blast radius + kill switch → ChAP; Hotstar GameDay | 30-minute GameDay the day before: kill the primary encoder, blackhole CDN #1, saturate the venue uplink, expire a DRM licence. Define an abort condition. |
| Observability for incidents | Answer "us or them" in 30 seconds → Netflix Atlas; Twitch Capacitor/The Well | One wall dashboard: concurrents, rebuffer ratio, startup time, 4xx/5xx by CDN, encoder bitrate, dropped frames. Pre-open it; don't write queries at showtime. |

---

## 5. Protocol and infrastructure reality

**Ingest.** RTMP over TCP is still the default contribution path from hardware encoders and OBS — Twitch terminates RTMP at the edge, WebRTC on the same proxy design. SRT and RIST are the modern lossy-network alternatives; AWS Elemental MediaConnect is the managed transport (used by Hotstar per the AWS M&E post).

**Delivery.** Plain **HLS** (RFC 8216) with 6 s segments lands ~15–30 s glass-to-glass. **LL-HLS** (partial segments, blocking playlist reload, preload hints) and **DASH with chunked CMAF** land ~**2–4 s** — Cloudflare states "as little as three seconds," Twitch reports 3 s typical and 1.5 s best case. **CMAF** matters commercially because one set of fragmented-MP4 segments serves both HLS and DASH, halving packaging and storage. **WebRTC/SFU** (LiveKit, mediasoup, Jitsi, Pion) is the only genuine sub-second route — Zoom's MMR is the proprietary equivalent — but it costs per-participant server capacity rather than per-byte CDN, so it stops being cheap in the low thousands.

The tradeoff to internalise: **latency is bought with buffer, and buffer is what absorbs jitter.** Sub-second is worth it for a fireside chat with live Q&A; for a keynote broadcast it is a reliability tax with no upside. LL-HLS at 3–5 s is the right default, with a WebRTC path only for the interactive segment.

**DRM.** Enterprise events rarely need studio DRM — signed URLs plus AES-128/SAMPLE-AES HLS encryption usually satisfies confidentiality. If you do need it, Microsoft's own docs define **SL150** (dev/test, "not suitable for commercial content"), **SL2000** ("Software-DRM"), and **SL3000** (hardware TEE, "highest quality of commercial content," PlayReady 3.0+); licence servers set a `MinimumSecurityLevel` per licence so an SL3000 client "will have access to a higher resolution than the SL2000 Client" ([learn.microsoft.com](https://learn.microsoft.com/en-us/playready/overview/security-level)). Widevine L1/L2/L3 and Apple FairPlay's Secure Enclave path follow the same pattern — hardware-rooted keys unlock HD/4K, software-only is capped. Multi-DRM means Widevine (Android/Chrome) + FairPlay (Apple) + PlayReady (Windows/TVs), which is why you buy rather than build.

**Managed options, prices checked 2026-07-29.** Worked example throughout: a **2-hour HD event for 1,000 viewers**.
- **AWS IVS** ([pricing](https://aws.amazon.com/ivs/pricing/)): input $0.20/hr Basic, $0.50 Advanced SD, $0.85 Advanced HD, $2.00 Standard; North America output from $0.0072/hr audio-only, $0.036 SD, $0.072 HD, $0.144 Full HD (first 10,000 hrs/mo). Real-time WebRTC $0.072/participant-hour. Example ≈ **$144 output + ~$1.70 input**.
- **Cloudflare Stream** ([pricing](https://developers.cloudflare.com/stream/pricing/)): **$1 per 1,000 minutes delivered**, **$5 per 1,000 stored**; ingest, encoding and bandwidth included, no egress fees. Example ≈ 120,000 delivered minutes ≈ **$120**, resolution-independent — easiest to budget.
- **Mux** ([pricing](https://www.mux.com/pricing/video)): delivery $0.0008/min at 720p, $0.001 at 1080p; encoding from $0.025/min (Plus); storage $0.0024–$0.0096/min; free tier 100k delivery min/mo (VOD only); DRM $100/mo + $0.003/play. Example at 1080p ≈ **$120**.
- **LiveKit** (Apache-2.0, 20.0k★) is self-hostable for sub-second without per-participant pricing — but you own SFU capacity planning.

---

## 6. Feeds verified 2026-07-29

Working — `200`, real `<item>` elements, title confirmed:

`blog.cloudflare.com/rss/` 20 · `aws.amazon.com/blogs/media/feed/` 20 · `aws.amazon.com/blogs/architecture/feed/` 20 · `aws.amazon.com/blogs/networking-and-content-delivery/feed/` 20 · `engineering.atspotify.com/feed/` 5 · `www.mux.com/blog/rss.xml` 15 · `developers.zoom.us/blog/rss.xml` 181 · `zerodha.tech/index.xml` 14 · `blog.razorpay.com/feed/` 10 · `blog.youtube/rss/` 20 · `www.infoq.com/feed/architecture-design/` 15 · `www.infoq.com/feed/` 15 · `engineering.fb.com/feed/` 9 · `slack.engineering/feed/` 8 · `discord.com/blog/rss.xml` 100 · `stackoverflow.blog/engineering/feed/` 40 · `tech.ebayinc.com/rss/` 30 · `www.wowza.com/blog/feed` 10 · `blog.frame.io/feed/` 868 · `www.jiostar.com/feed/` 1 (corporate PR, low value).

Failed, with the real reason:

- **All Medium-hosted feeds are blocked from this network.** `netflixtechblog.com/feed`, `/feed/`, `/rss` → **429** Cloudflare "Just a moment…"; `blog.hotstar.com/feed` → **429**; `blog.phonepe.com/feed` → redirects to `medium.com/phonepe/feed`, HTML, 0 items; `eng.lyft.com/feed` → 429; `medium.com/pinterest-engineering/feed`, `medium.com/zerodha-tech/feed`, `bytes.swiggy.com/feed`, `netflixtechblog.medium.com/feed` → **TLS connection reset (curl 35)**. This is an egress block, not a broken feed — **validate Medium feeds from the machine that will poll them** (GitHub Actions runners generally reach Medium; this workstation does not).
- `www.uber.com/blog/engineering/rss/` → **406** (bot filtering; path is correct). `/blog/rss/` and `/en-IN/blog/engineering/rss/` → 404.
- `blog.twitch.tv/en/rss/` → 200 but redirects to the HTML index, **0 items**. Twitch has no working RSS.
- `tech.flipkart.com/feed/` → **403 "Flipkart reCAPTCHA"**. `blog.zomato.com/feed/` → 200 but HTML, 0 items. `bitmovin.com/blog/feed/` → 403; `akamai.com/blog/feed` → 403; `fastly.com/blog/feed` → 404. `sonyliv.com/feed` → 404; `zee5.com/feed` → 403.
- No feed exists for Netflix Open Connect, JioHotstar engineering, or Disney streaming engineering.

---

## 7. Open source, licences from the GitHub API

Queried live 2026-07-29 via `api.github.com/repos/OWNER/REPO`, reading `license.spdx_id`, `archived`, `pushed_at`, `stargazers_count`. No rate limiting hit.

**Apache-2.0, active:** `Netflix/zuul` 14,051★ (2026-07-28) · `Netflix/maestro` 3,810★ · `Netflix/EVCache` 2,199★ · `Netflix/hollow` 1,365★ · `Netflix/atlas` 3,558★ · `Netflix/mantis` 1,469★ · `Netflix/chaosmonkey` 17,049★ (2025-01-06) · `Netflix/concurrency-limits` 3,591★ · `Netflix/dgs-framework` 3,383★ · `Netflix/metaflow` 10,201★ · `Netflix/eureka` 12,727★ · `Netflix/ribbon` 4,616★ · `Netflix/spectator` 765★ · `Netflix/Priam` 1,039★ · `Netflix/servo` · `spinnaker/spinnaker` 9,757★ · `resilience4j/resilience4j` 10,722★ · `apache/iceberg` 9,090★. `Netflix/dynomite` Apache-2.0 but last pushed 2024-05-20 — dormant.

**Flag these:**
- **`Netflix/Hystrix` — `license.spdx_id` is `null`**, and the `/license` endpoint 404s: **no licence detectable via the API, i.e. not safely open source as published on `master`** — on top of declared maintenance mode. Do not adopt.
- **`Netflix/vmaf` — `NOASSERTION`.** Custom terms the API cannot classify; read `LICENSE` before shipping it.
- **`Netflix/Fenzo` — `null` and archived** (2023-03-31). Dead.
- **Archived, don't build on:** `Netflix/conductor` (archived 2023-12-22 — live fork is **`conductor-oss/conductor`**, Apache-2.0, 32,045★, pushed 2026-07-29) · `Netflix/titus-control-plane` (2022-05-13) · `Netflix/dispatch` (2025-09-03).

**Streaming/media:** `livekit/livekit` Apache-2.0 20,020★ · `ossrs/srs` MIT 29,081★ · `bluenviron/mediamtx` MIT 19,657★ · `owncast/owncast` MIT 11,426★ · `shaka-project/shaka-player` Apache-2.0 8,173★ · `pion/webrtc` MIT 16,673★ · `versatica/mediasoup` ISC 7,319★ · `jitsi/jitsi-videobridge` Apache-2.0 3,093★ · `AlexxIT/go2rtc` MIT 13,564★ · `arut/nginx-rtmp-module` BSD-2-Clause 14,027★ but last pushed 2024-12-24 — unmaintained, prefer SRS or MediaMTX.
**`video-dev/hls.js` and `Dash-Industry-Forum/dash.js` both return `NOASSERTION`** — in practice permissive, but unconfirmable via API; read their licence files before enterprise use.
**`grafana/grafana` is AGPL-3.0** — the network copyleft clause bites: expose a *modified* Grafana over a network and you must offer corresponding source. Fine for internal show-ops; get sign-off before embedding in a client-facing portal.

---

## Integrity note

- No fetched page tried to instruct me or redirect the task. Two page-summarisation responses (the Open Connect overview PDF and `research.netflix.com`) returned unsolicited commentary about Communique's positioning; that is bleed from the summarising tool's own configuration, not page content, and nothing was acted on as an instruction.
- **Medium is hard-blocked from this workstation** (Cloudflare 429 / TLS reset). Material normally sourced from `netflixtechblog.com`, `blog.hotstar.com`, `eng.lyft.com` and `medium.com/*` is therefore cited via InfoQ, `about.netflix.com`, `research.netflix.com`, `raw.githubusercontent.com`, AWS or search indexing — and labelled where that weakens it.
- `web.archive.org` is unreachable from the fetch tool, so the deleted Prime Video post could not be recovered. `primevideotech.com` now 301s to `aboutamazon.com`: **Amazon has taken that post offline**; anyone citing it is citing a dead link.
- Numbers I would not repeat without further verification: the 821M/82.1cr and 72M JioHotstar "concurrency" claims; the "500 C4 instances / 8,000 cores / 32 Gbps" Hotstar spec; an "18 Tbps at the 2026 Super Bowl" Open Connect figure that appears only in a CDN vendor's blog; and the Netflix EKS cluster/pod/container figures, which reached me only through search indexing of a 403-ing AWS re:Post page.

## Sources

Primary — company, standards, peer-reviewed:
https://about.netflix.com/en/news/completing-the-netflix-cloud-migration ·
https://about.netflix.com/en/news/how-netflix-works-with-isps-around-the-globe-to-deliver-a-great-viewing-experience ·
https://about.netflix.com/en/news/jake-paul-vs-mike-tyson-over-108-million-live-global-viewers ·
https://openconnect.netflix.com/en/ · https://openconnect.netflix.com/en/appliances/ ·
https://d1.awsstatic.com/events/reinvent/2019/Scaling_Hotstar.com_for_25_million_concurrent_viewers_CMY302.pdf ·
https://www.icc-cricket.com/media-releases/icc-men-s-t20-world-cup-2026-sets-new-global-streaming-record-on-jiohotstar-during-india-england-semi-final ·
https://www.jiostar.com/news/reliance-and-disney-announce-completion-of-transaction-to-form-joint-venture-to-bring-together-the-most-iconic-and-engaging-entertainment-brands-in-india/ ·
https://aws.amazon.com/blogs/media/in-the-news-hotstar-sets-new-global-record-for-live-viewership/ ·
https://blog.twitch.tv/en/2022/04/26/ingesting-live-video-streams-at-global-scale/ ·
https://blog.twitch.tv/en/2021/10/25/low-latency-high-reach-creating-an-unparalleled-live-video-streaming-network-at-twitch/ ·
https://engineering.atspotify.com/2023/3/load-testing-for-2022-wrapped ·
https://library.zoom.com/admin-corner/architecture-and-design/zoom-architected-for-reliability ·
https://blog.cloudflare.com/cloudflare-stream-low-latency-hls-open-beta/ · https://developers.cloudflare.com/stream/pricing/ ·
https://aws.amazon.com/ivs/pricing/ · https://www.mux.com/pricing/video ·
https://learn.microsoft.com/en-us/playready/overview/security-level ·
https://arxiv.org/abs/1905.04648 · https://research.google/pubs/the-quic-transport-protocol-design-and-internet-scale-deployment/ ·
https://research.netflix.com/publication/optimized-shot-based-encodes-for-4k-now-streaming ·
https://github.com/Netflix/Hystrix/blob/master/README.md · https://github.com/Netflix/SimianArmy ·
GitHub REST API `/repos/{owner}/{repo}` for every licence assertion in §7

Conference talks / InfoQ (primary per brief):
https://www.infoq.com/presentations/netflix-api-graphql-federation/ ·
https://www.infoq.com/articles/netflix-global-cache/ ·
https://www.infoq.com/news/2016/10/netflix-zuul-asynch-nonblocking/ ·
https://www.infoq.com/news/2023/09/zero-config-service-mesh-netflix/ ·
https://repost.aws/articles/ARpqKdaLinSJqT4dTbRn7WUg/aws-re-invent-2025-the-future-of-kubernetes-on-aws (403 on fetch)

Secondary, used only where labelled:
https://ottverse.com/india-vs-australia-world-cup-finals-hits-5-9-crore-59-million-concurrent-viewers-on-disney-hotstar/ ·
https://techcrunch.com/2023/11/19/india-and-australia-world-cup-final-shatters-streaming-records-on-hotstar ·
https://konkurrency.com/ (no sources cited; leads only) ·
https://www.databricks.com/blog/2020/12/14/learn-how-disney-built-their-streaming-data-analytics-platform-with-databricks-and-aws-to-improve-the-customer-experience.html
