# Smart Attendee Engagement Software — An Engineering Blueprint

> Research brief · compiled 2026-07-29

Scope: what it takes to build attendee-engagement software and web-based event activities in-house, for an agency already running on-ground plus digital amplification. Every factual claim carries a source URL; anything not traceable to a primary document is marked **UNVERIFIED**.

---

## 1. Feature catalogue and real build cost

Difficulty is 1–5 on *engineering* effort, not design. "Realtime shape" is what determines architecture.

| Feature | Diff | Realtime shape | What it actually needs |
|---|---|---|---|
| Live polling | 2 | many→1 burst, 1→many push | Idempotent vote (device token), server aggregate, throttled result broadcast |
| Q&A + upvote + moderation | 3 | many→many, ordered | Moderation queue, optimistic upvote with server reconcile, sort stability |
| Quiz + leaderboard | 3 | timed rounds, ranked read | Server-authoritative clock, tie-break rule, sorted-set ranking |
| Points/badges | 3 | write-heavy ledger | Append-only event ledger + derived state; never mutate a score in place |
| Spin-wheel / prize draw | 2 | 1→many, auditable | Server-side seeded RNG + audit log; client animation is theatre only |
| Photo booth | 2 | upload only | Canvas compositing, resumable upload, moderation before display |
| AI photo generation | 4 | async job | Queue, per-attendee spend cap, consent capture, human review gate |
| Graffiti / collab wall | 4 | many→many, high-frequency | CRDT (§7) or LWW with server ordering; cursor throttling |
| Live word cloud | 2 | many→1, 1→many | Stopword+profanity filter, stemming, layout per tick |
| Session feedback | 1 | none | Form + offline queue |
| Networking matchmaking | 4 | batch | Embeddings + constrained matching; explainability matters to clients |
| Scavenger hunt / QR trails | 3 | write bursts | Signed, rotating QR payloads (else attendees screenshot and share) |
| Second screen | 3 | 1→many, state sync | One source of truth for current state + resync on reconnect |
| Live reaction stream | 4 | extreme many→many | Aggregated and rate-limited; never relay per-tap |
| Virtual booth | 3 | mixed | Per-booth room isolation, lead-capture consent |
| Audience-controlled main screen | 5 | many→1→projector, **<200 ms** | Dedicated low-latency path, brownout mode, operator kill switch |

Two features dominate the architecture: **live reactions** and **audience-controlled visuals**. Everything else fits comfortably inside whatever you build for those.

---

## 2. Realtime architecture (the core problem)

### Transport choice

- **WebSocket** — the default for anything the attendee writes to.
- **SSE** — one-directional, auto-reconnects with `Last-Event-ID` and a server-settable `retry:`. But over HTTP/1.1 browsers allow only **6 concurrent connections per browser+domain**, shared across tabs; over HTTP/2 the negotiated default is **100 simultaneous streams** ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events)). A legitimate choice for the read-only *projector* screen on HTTP/2+.
- **WebTransport** — MDN marks it **Baseline 2026, "newly available"**, working across latest browsers **since March 2026** ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/WebTransport) — re-verified verbatim 2026-07-29); exact per-browser version floors **UNVERIFIED** (the compat table did not render). MDN also appends an asterisk to that Baseline badge, meaning *"some parts of this feature may have varying levels of support"* — which reinforces the conclusion below rather than undercutting it. Its unreliable-datagram mode is the right primitive for reaction spam, but too new to be the *only* transport at a client event. Build a transport seam, ship WebSocket, treat WebTransport as an experiment.

### Fan-out: one presenter → 5,000 attendees

Never fan out from one process to every socket. Use a two-level tree:

```
presenter → coordinator (authoritative state, 1 per session)
              → shard 0..N (≤1,000 sockets each)
                  → sockets
```

Concrete capacity anchors:

- **Cloudflare Durable Objects**: soft limit **1,000 requests/second per object**, **10 GB SQLite per object**, 32 MiB max WebSocket message (*docs qualify this as "only for received messages"*), 6 simultaneous outgoing connections, unlimited object count — though note the separate cap of **500 Durable Object *classes* per account** on Workers Paid (100 on Free), which constrains how many distinct room *types* you define, not how many rooms you run ([DO limits](https://developers.cloudflare.com/durable-objects/platform/limits/); all values re-verified 2026-07-29). Hibernation API: `state.acceptWebSocket()` / `ctx.getWebSockets()` / `serializeAttachment()` / `deserializeAttachment()`, **16,384-byte** max serialised attachment; sockets stay connected while the object is evicted from memory ([DO WebSockets](https://developers.cloudflare.com/durable-objects/best-practices/websockets)). The widely-cited "hibernates after 10 s idle" is **UNVERIFIED** — the docs say only "a short period"; the 10 s figure comes from a [third-party writeup](https://thomasgauvin.com/writing/how-cloudflare-durable-objects-websocket-hibernation-works/).
- **Phoenix Channels**: 2,000,000 concurrent connections on one 40-core/128 GB box, and **~1 second** to broadcast to 2M subscribers after sharding the pubsub registry (Chris McCord, 2015-11-03 — [phoenixframework.org](https://www.phoenixframework.org/blog/the-road-to-2-million-websocket-connections)). Re-verified 2026-07-29: date, hardware (40 cores / 128 GB, a Rackspace OnMetal I/O instance) and the claim all match — the post says they *"reach 2M subscribers without timeouts and maintain 1s broadcasts"* after sharding the pubsub registry by subscriber pid. Two caveats the number invites: it is **ten years and eight months old** (the brief's "11-year-old" rounds up) on 2015 hardware and OTP, so it is a *floor-setting* data point, not current capacity guidance — re-benchmark before quoting throughput to a client. It settles that 5,000 attendees is not a *scaling* problem on BEAM — it is a single-point-of-failure problem.
- **Redis pub/sub** as backplane is fire-and-forget with no replay and no backpressure; in Redis Cluster use sharded pub/sub (`SSUBSCRIBE`/`SPUBLISH`) to keep a channel on one shard ([Ably](https://ably.com/blog/scaling-pub-sub-with-websockets-and-redis)). "A server missed 3 seconds of messages" is a visible on-stage failure — prefer an actor/DO model with authoritative per-room state, or Redis **Streams** with consumer offsets.

### The presenter-screen path (sub-200 ms)

A separate, budgeted pipeline — not the channel carrying attendee chatter. Allocate roughly: tap→dispatch 16–32 ms, device→edge on contended wifi 40–90 ms, edge aggregate on a 50 ms tick, edge→projector 15–40 ms, paint 16–33 ms. These are **engineering budgets, not measurements** — allocate, then verify with venue telemetry. Hard rules: the projector is a *wired* client on a dedicated origin; it renders from a monotonic sequence number so a late frame is dropped, not replayed; and it holds last-known-good state so a 5-second outage looks like a frozen counter, not a blank screen.

### Backpressure and the "everyone votes in 3 seconds" herd

5,000 attendees voting inside a 3-second window is ~1,700 writes/s inbound — trivial. The failure is **outbound**: naively echoing each vote to every attendee is 5,000 × 5,000 = 25,000,000 messages. The fixes, in order of importance:

1. **Aggregate, never relay.** Attendees receive *tallies* on a fixed 4–10 Hz tick, not individual votes — O(N²) becomes O(N) per tick.
2. **Tick + coalesce** in the coordinator's memory, flush on a timer. Redis's own thundering-herd guidance is to queue and drain at a rate the downstream absorbs, and to add **jitter** to break client synchronisation ([redis.io](https://redis.io/blog/how-to-tame-the-thundering-herd-problem/)).
3. **Jitter the client too** — randomise first send by 0–500 ms and jitter reconnect backoff. Without it, a wifi blip becomes a synchronised reconnect stampede worse than the outage.
4. **Per-connection token bucket** at the edge (say 5/s, burst 20), with *silent drop* rather than errors — errors trigger retries, which amplify.
5. **Shard by session then attendee-hash**; a shard never needs to know another shard's sockets.
6. **Reconnect = resync, not replay.** Client sends its last sequence number; server returns a snapshot on a large gap, deltas on a small one. Never replay 30 seconds of reactions.
7. **Bot gate on join.** Turnstile's free tier does give *"Unlimited challenges (traffic or verification requests)"* — confirmed, and better sourced to the current docs than to the 2023 GA blog post ([Turnstile plans](https://developers.cloudflare.com/turnstile/plans/), which supersedes [blog.cloudflare.com](https://blog.cloudflare.com/turnstile-ga/)). ~~The free-tier widget/hostname caps circulating in secondary sources are **UNVERIFIED**.~~ **Correction: those caps are documented on Cloudflare's own plans page, and they bind an agency.** Free is *"Up to 20 widgets"* and *"10 hostnames per widget"*; Enterprise is unlimited widgets and 200 hostnames per widget. Unlimited *requests* is not unlimited *tenants* — one widget per client event hits the cap at 20 events, so key widgets to a reusable per-client scheme (or one widget with up to 10 event hostnames) rather than minting one per event. Free analytics retention is also only 7 days, which matters if a client asks for a post-event bot-traffic report.

---

## 3. Stack options, with prices at 1k / 5k / 20k concurrent

Modelled workload: 90-minute session, each attendee sends ~20 messages, receives ~200 aggregated broadcasts.

**Cloudflare Workers + Durable Objects.** Workers Paid: **$5/mo** base, 10M requests included then **$0.30/M**, 30M CPU-ms included then **$0.02/M CPU-ms**, no egress charge ([Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/)). DO: 1M requests/mo then **$0.15/M**; 400,000 GB-s then **$12.50/M GB-s**; **incoming WebSocket messages bill at a 20:1 ratio** (100 incoming = 5 requests); SQLite storage billing began January 2026 at $0.20/GB-month ([DO pricing](https://developers.cloudflare.com/durable-objects/platform/pricing/)). At 20,000 attendees: 400,000 inbound messages ÷ 20 = 20,000 billable requests ≈ **$0.003**; outbound fan-out is not billed as requests; ~20 shard objects over 90 minutes stay inside the included 400,000 GB-s. **Marginal cost: cents per event.**

> **Both flagged assumptions here checked out — the docs are explicit, not merely suggestive** (re-verified 2026-07-29, same [DO pricing](https://developers.cloudflare.com/durable-objects/platform/pricing/) page). On outbound: *"There is no charge for outgoing WebSocket messages, nor for incoming WebSocket protocol pings."* That is a direct statement, so the cost model does **not** change by orders of magnitude. On memory: *"Duration billing charges for the 128 MB of memory your Durable Object is allocated, regardless of actual usage"* — the 128 MB assumption is documented, not inferred, and the arithmetic is 20 × 0.128 GB × 5,400 s = **13,824 GB-s**, comfortably inside 400,000 (≈28 such events/month on the included allowance). The conclusion is in fact **stronger** than claimed: *"Durable Objects eligible for hibernation are not billed for duration, even before the runtime has hibernated them"* — so a correctly-written hibernatable socket room accrues no duration charge at all while idle between sessions. Breaks at: the 1,000 req/s per-object soft limit forces you to write the sharding tree yourself, a single object is a single-threaded bottleneck, and the 6-outgoing-connection cap complicates calling third-party APIs from inside a DO.

**Self-hosted Node/Elixir** (Phoenix Channels, uWebSockets.js). Pure infrastructure: 20,000 sockets fits on 2–3 mid-size instances given the Phoenix benchmark — call it **$200–600/mo** plus your own on-call. Breaks at: you now own TLS termination, sticky routing, the backplane, and rolling deploys that do not drop every socket mid-keynote. For an events business the deploy-during-live-session problem is the real cost, not the servers.

**Managed realtime**

| Provider | 1,000 | 5,000 | 20,000 |
|---|---|---|---|
| **Ably** | Standard **$29/mo** + ~$0.65 usage | Standard fits; ~$3.20 usage | Pro **$399/mo** + ~$13 usage |
| **Pusher Channels** | Pro **$99/mo** (2,000 conns, 4M msg/day) | Business **$299/mo** (5,000 / 10M) | Plus **$899/mo** (20,000 / 60M) |
| **PubNub** | Starter **$98/mo** (1,000 MAU) | ~**$370/mo** (5,000 MAU) | ~$1,130/mo at 25,000 MAU |
| **Supabase Realtime** | Pro fits (500, or 10,000 uncapped) | at the 10,000 / 2,500 msg-s ceiling | **does not fit** |

Where each breaks:

- **Ably** — on **message rate, not connections**. Per-channel publish rate is **50 msg/s on every tier**; account-wide is 2,500/s (Standard) and 10,000/s (Pro) ([limits](https://ably.com/docs/platform/pricing/limits)). Ably bills *outbound per subscriber* in 5 KiB chunks ([FAQ](https://faqs.ably.com/how-does-ably-count-messages)) — confirmed verbatim: *"if you send a single 50KiB message to a channel with 100 subscribers, this will be billed as 10 inbound published messages, and 1,000 outbound (subscriber) messages"* — so one poll update to 20,000 subscribers is 20,000 messages; at two updates/second that is 40,000 msg/s against Pro's 10,000. **The inference that the account-wide *rate limit* counts outbound the same way as billing is now partly corroborated but still not conclusive** (re-checked 2026-07-29): the limits page describes the account-wide limit as *"the maximum rate at which messages can be published **and received** across your account each second"* — "and received" supports the reading — whereas the 50 msg/s per-channel limit is scoped explicitly to messages *"published"*, and so is **not** breached by fan-out. Ably's docs never state the composition of the account-wide figure outright, so treat the "exceeds Pro at 20k" conclusion as **well-supported but requiring written confirmation from Ably before it goes in a client proposal.** Note the direction of the risk is asymmetric: if outbound counts you are capped far below the connection tier you bought. Rates: $2.50/M messages, $1.00/M connection-minutes, $1.00/M channel-minutes, $0.25/GiB ([pricing](https://ably.com/pricing)).
- **Pusher** — fixed connection tiers; you buy a whole month's tier for one event day ([pricing](https://pusher.com/channels/pricing/)).
- **PubNub** — **MAU billing is structurally wrong for events**: an attendee who uses the app once for 90 minutes costs a full monthly active user ([pricing](https://www.pubnub.com/pricing/)).
- **Supabase** — default limits of 10,000 concurrent, 2,500 msg/s and 2,500 channel-joins/s on Team; 5,000 attendees receiving one broadcast is 5,000 messages instantly ([quotas](https://supabase.com/docs/guides/realtime/quotas)). **Correction: these are defaults, not hard ceilings** — the page states *"All limits are configurable per project. Contact support if you need your limits increased,"* and lists Enterprise as "10,000+" concurrent and "2,500+" msg/s. So the table's "**does not fit**" at 20,000 is a statement about the *published* tiers, not a platform limit; it becomes a sales conversation, not an architectural dead end. The structural objection stands regardless: you are still paying for a fan-out model that bills every delivered message.

**Recommendation.** Workers + Durable Objects for the engagement core: the actor model matches "one authoritative room per session" exactly, cost is negligible, and hibernation means idle rooms between sessions cost nothing. Keep Ably as a contractual fallback for a tier-1 client demanding a vendor SLA, behind the same transport interface so the swap is config, not a rewrite.

---

## 4. Moderation before it hits the CEO's screen

Three tiers, in this order, with a total budget of ~400 ms from submit to "eligible for display":

1. **Deterministic denylist / normaliser (<5 ms, in-process)** handling leetspeak, zero-width characters and homoglyph bypasses. `jo3-l/obscenity` (MIT) does the normalisation properly; `LDNOOBW` is a multilingual word list under CC-BY-4.0 — a *data* licence requiring attribution, not a code licence.
2. **Classifier (50–250 ms).** OpenAI's `omni-moderation-latest` covers 13 harm categories across text and image (images ≤20 MB) and **the moderation endpoint is free to use**; no latency figure is published ([OpenAI](https://developers.openai.com/api/docs/guides/moderation)). ~~Perspective API reportedly defaults to **1 QPS per project**, needing a quota increase for production~~ — **do not design against Perspective API at all: it is being shut down.** [perspectiveapi.com](https://perspectiveapi.com/) states verbatim: "Perspective API is sunsetting and service is officially ending after 2026" and "The API will no longer be in service after 2026, and we will not be offering direct migration support." Service ends **2026-12-31**; usage and quota-increase requests were only accepted **until February 2026** — already past as of this brief's date. Any 90-day plan starting now would ship onto a platform with under five months of life and no route to raise quota. The **1 QPS per project** default remains **UNVERIFIED** (the limits page is JS-rendered and returns only a loading shell / "CSS Error" on fetch — re-confirmed 2026-07-29), and is now moot. Azure AI Content Safety bills per 1,000 text records (a record = up to 1,000 Unicode code points), but **its public pricing page shows masked per-unit prices ("$– per 1,000 text records")** — unbudgetable without a quote ([Azure](https://azure.microsoft.com/en-us/pricing/details/cognitive-services/content-safety/)).
3. **Human queue.** For any screen behind client leadership, run **allowlist mode**: nothing displays until released. What works: two operators on independent devices; "release" and "kill all" taking effect within one broadcast tick; keyboard-first UI; a 3-second undo on release; and a projector `blackout` state that supersedes all content. Auto-approve is fine for word clouds and reaction counts, never for free text or images.

**Why pure-LLM moderation is the wrong primary gate:** it is non-deterministic (the same string can pass and fail, so you cannot regression-test it); tail latency is unbounded against a 200 ms budget; audience text is *untrusted input to your prompt*, making injection a live attack surface on the main screen; 429s arrive exactly during the burst; and OpenAI documents that on streaming responses moderation scores only arrive after generation completes. Use an LLM as a *third* signal for nuance — sarcasm, targeted harassment — feeding the human queue's priority order. Never as the release gate.

---

## 5. AI-native features that are feasible now

Claude prices below were originally taken from the Anthropic API reference bundled in this workspace's `claude-api` skill (cached 2026-06-24): Haiku 4.5 at **$1/$5 per MTok**, batch API at **50% off**, prompt-cache reads ~0.1× and writes 1.25× (5 min) / 2× (1 h). **Every one of these re-verified against the live page on 2026-07-29** ([platform.claude.com pricing](https://platform.claude.com/docs/en/about-claude/pricing)): Haiku 4.5 is $1/MTok base input, $5/MTok output, $1.25 5-minute cache write, $2 1-hour cache write, $0.10 cache read — i.e. exactly 1.25× / 2× / 0.1× — and the Batch API is *"a 50% discount on both input and output tokens"* ($0.50/$2.50 for Haiku 4.5). The cached figures were accurate; no correction needed.

| Feature | Latency | Cost | Wifi-dies failure mode |
|---|---|---|---|
| Rolling session summary to screen (Haiku 4.5) | 2–6 s | 90-min transcript ≈ 18k tokens → **~$0.02/summary**, per *session* not per attendee | Screen holds last summary with visible timestamp; queue transcript locally, catch up on reconnect |
| Translated live captions — Deepgram Nova-3 streaming **$0.0048/min** ($0.0058 multilingual, Flux English $0.0065) — all three re-verified 2026-07-29, page is per-**minute** throughout; Azure speech translation price is **UNVERIFIED** for ≤2 target languages, billed per second | Deepgram's sub-300 ms claim is **UNVERIFIED** — its pricing page states no latency figure | **Per audio stream, not per attendee**: 90 min ≈ $0.43 (Deepgram) → $0.0004/attendee at 1,000. Azure equivalent not costable — see note | First thing to die. Run STT from the venue-wired encoder, never attendee devices; degrade to source-language captions before none |
| AI portraits — Gemini 3.1 Flash Image **$0.067**/1K image, Flash Lite **$0.0336**, batch halves it. Imagen 4 Fast is $0.02 but **shuts down 2026-08-17**. OpenAI publishes no per-image price, only a calculator | 5–20 s | 1,000 attendees × 2 attempts ≈ **$134** (Flash) / **$67** (Lite) | Fully async: capture locally, queue, deliver by email/QR. Never make the booth synchronous |
| RAG concierge (Haiku 4.5 + caching). **Minimum cacheable prefix is 4,096 tokens on Haiku 4.5** — a short agenda silently will not cache. Confirmed live 2026-07-29 against [prompt caching](https://platform.claude.com/docs/en/build-with-claude/prompt-caching): *"4,096 tokens for Claude Haiku 4.5"*, and *"Shorter prompts cannot be cached, even if marked with `cache_control` … no error is returned"* — so the silent-failure warning is exactly right; check `cache_read_input_tokens` to detect it | 1–3 s | 20k-token cached corpus → **~$0.005/query** | Ship the agenda to IndexedDB with keyword search; the LLM is the enhancement, not the index |
| AI networking intros (Haiku, batched 50/call) | offline | fractions of a cent per pair | Pre-generate before doors open |
| Sentiment on Q&A (Haiku, batched) | 1–2 s | negligible | Sort by upvotes; sentiment is a moderator hint, never a display element |

> **The Deepgram figure survived; the Azure one did not.** The author flagged Deepgram's `$0.0048/min` as possibly mis-transcribed from a column labelled "per hour". Re-fetched 2026-07-29: no labelling error — [deepgram.com/pricing](https://deepgram.com/pricing) is per-minute in every column, Nova-3 streaming is **$0.0048/min** pay-as-you-go (pre-recorded $0.0077/min; Growth tier $0.0042 streaming), multilingual **$0.0058**, Flux English **$0.0065**. All three match. **But the Azure `$2.50/hour` does not appear on the cited page at all**: [Azure Speech pricing](https://azure.microsoft.com/en-us/pricing/details/speech/) masks its rates exactly as the Content Safety page does, showing *"$– per audio hour"*. The page does confirm the scope — *"1 audio input and output, up to 2 text translation language"* — and that *"usage is billed in one-second increments"*, but the number itself is unsourced, so the derived "$3.75 per 90 min" has been removed. Treat Azure speech as quote-only, like Content Safety.

Structural insight: **speech and summarisation scale with session-hours; image generation scales with headcount.** Budget them differently, and hard-cap per-attendee spend on anything generative — a booth with a "regenerate" button is an uncapped bill.

---

## 6. Venue reality: offline-first and progressive degradation

- **Assume a hostile network**: contended 2.4 GHz, one AP per 300 people, a captive portal you do not control. Android has detected captive portals since API 21 and exposes a Captive Portal API for APs to identify themselves ([Android](https://developer.android.com/about/versions/11/features/captive-portal)) — but you cannot rely on the venue configuring it.
- **QR-to-join must survive no-DNS.** Full HTTPS URL, session token **in the path, never a query string**. Short origin on your own domain. No URL shortener — it adds a DNS lookup and a redirect on the worst possible network.
- **PWA, app-shell-first.** Shell, agenda, floor plan and exhibitor list precached so the app opens with zero network. Writes go to an IndexedDB outbox and drain with jittered backoff. `absurd-sql` (MIT) if you need real local SQL.
- **Degrade in defined stages**, with a visible connection chip: (1) full realtime; (2) realtime lost → poll every 5 s with `Last-Event-ID`-style cursors; (3) polling failing → local-only, queue writes, show cached state stamped "as of HH:MM"; (4) fully offline → QR-only flows validating signed payloads locally, reconciling later.
- **At 200 ms loss / high jitter**: *raise* the WebSocket ping interval (aggressive pings cause false disconnects), keep messages inside one MTU, prefer one coalesced tick over many frames, and make every write idempotent so a retried vote is not a double vote.
- **Keep a no-network rig for the room**: a laptop running the presenter app against a local server on the venue LAN, syncing afterwards. For a client keynote that is not paranoia, it is the deliverable.

---

## 7. Open-source building blocks (licences verified via GitHub API)

Verified with `gh api repos/OWNER/REPO`, reading `license.spdx_id`, `archived`, `pushed_at`. Checked 2026-07-29. The **unauthenticated** API was already rate-limited (HTTP 403) from this IP, so these were read with an authenticated token.

> **Independent re-check, 2026-07-29.** All 36 `license.spdx_id` values below were re-read against `https://api.github.com/repos/OWNER/REPO` and **every SPDX value, every `archived: false`, and every `pushed_at` date matched this document** — including the three staleness callouts (`partykit` 2026-01-29, `absurd-sql` 2023-08-06, `soketi` 2025-03-03) and the `AirenSoft/` → `OvenMediaLabs/` rename, which the API confirms as a redirect. The *interpretation* of `NOASSERTION` did not survive re-check — see the corrected subsection below.

**Permissive — safe to build on** (SPDX, last push; none archived)

- Realtime servers: `socketio/socket.io` MIT 07-24 · `uNetworking/uWebSockets.js` Apache-2.0 07-11 · `phoenixframework/phoenix` MIT 07-24 · `centrifugal/centrifugo` Apache-2.0 07-26 · `nats-io/nats-server` Apache-2.0 07-28 · `cloudflare/workerd` Apache-2.0 07-29 · `partykit/partykit` MIT **2026-01-29, 6 months stale**
- Collab/CRDT: `automerge/automerge` MIT 07-27 · `ueberdosis/hocuspocus` MIT 07-28 · `excalidraw/excalidraw` MIT 07-28
- State/leaderboards: `valkey-io/valkey` BSD-3-Clause 07-29 (sorted sets) · `electric-sql/electric` Apache-2.0 07-28 · `rocicorp/mono` Apache-2.0 07-29 · `jlongster/absurd-sql` MIT **2023-08-06, unmaintained**
- Moderation: `jo3-l/obscenity` MIT 07-28 · `unitaryai/detoxify` Apache-2.0 07-06
- Word clouds: `jasondavies/d3-cloud` BSD-3-Clause 03-09 · `amueller/word_cloud` MIT 01-22
- Captions/media: `ggml-org/whisper.cpp` MIT 07-29 · `openai/whisper` MIT 07-28 · `ossrs/srs` MIT 07-26 · `livekit/livekit` Apache-2.0 07-28 · `jitsi/jitsi-meet` Apache-2.0 07-28
- Activities: `PhotoboothProject/photobooth` MIT 07-24 · `surveyjs/survey-library` MIT 07-28

**Copyleft — read before shipping.** `mawoka-myblock/ClassQuiz` MPL-2.0 (file-level; a Kahoot-style quiz base). `soketi/soketi` AGPL-3.0 — **network copyleft**, and **no push since 2025-03-03**. `lukevella/rallly` AGPL-3.0. `OvenMediaLabs/OvenMediaEngine` AGPL-3.0 (moved from `AirenSoft/`). `LDNOOBW/...Bad-Words` CC-BY-4.0 — data, attribution required, not an OSI software licence. The AGPL network clause is what bites an agency: host a modified AGPL server for a client and you owe source.

**`NOASSERTION` — read the LICENSE file, do not assume.** *Correction (fact-check 2026-07-29): the earlier draft of this section read `NOASSERTION` as "unclassifiable custom licence; treat as all-rights-reserved" and grouped all six repos as "not safely open source". That was a methodological error.* `NOASSERTION` only means GitHub's [licensee](https://github.com/licensee/licensee) classifier could not match the file to a known template — it says nothing about whether a licence exists. Reading each `LICENSE` in-tree via `GET /repos/OWNER/REPO/license` (field `content`, base64) gives a very different picture, and two of the six are ordinary permissive licences:

- `yjs/yjs` — **MIT**, verbatim: "The MIT License (MIT) / Copyright (c) 2023 - Kevin Jahns … RWTH Aachen University". Not a legal risk; the classifier is defeated only by the multi-line copyright block. The earlier "**UNVERIFIED**, prefer `automerge`" steer was a false negative.
- `vercel/ai` — **Apache-2.0**, verbatim: "Copyright 2023 Vercel, Inc. / Licensed under the Apache License, Version 2.0". Also a false negative.
- `formbricks/formbricks` — **AGPL-3.0 core**, with `packages/js|android|ios|api/` under MIT and everything under `apps/web/modules/ee/` under a separate proprietary enterprise licence. This belongs in the **copyleft** bucket above, and the AGPL network clause applies.
- `baptisteArno/typebot.io` — **FSL-1.1-Apache-2.0** (Functional Source License v1.1): source-available with a competing-use restriction that converts to Apache-2.0 two years after each release. Genuinely not OSI-approved today.
- `redis/redis` — **tri-licensed from Redis 8**: your choice of RSALv2, SSPLv1, **or AGPLv3**; 7.2 and earlier remain BSD-3-Clause. So Redis 8+ *is* available under an OSI licence (AGPLv3) — the earlier "relicensed away from BSD, use `valkey`" was too blunt. `valkey` (BSD-3-Clause) is still the easier choice for an agency precisely because it avoids the AGPL obligation.
- `tldraw/tldraw` — genuinely bespoke and the one real trap: tldraw Inc.'s own licence gates a "Production Environment" behind a programmatically generated **License Key**, with alternative commercial licences sold separately. **Commercial client deliverables need a paid licence.** Not open source.

Separately, BUSL-1.1, SSPL, Elastic-2.0 and PolyForm are source-available, not OSI open source. **Lesson for future audits: `license.spdx_id` alone is not a licence audit.** Six of 36 repos returned `NOASSERTION`, and SPDX-only reading mis-classified four of those six.

---

## 8. Ninety-day plan to something demoable at a real client event

**Days 1–20 — the spine.** One Worker + two DO classes: `SessionRoom` (authoritative state, tick loop) and `ShardRoom` (≤1,000 sockets). Transport-abstraction seam. QR-to-join with signed tokens. PWA shell + IndexedDB outbox. Turnstile on join. **Live polling** end-to-end plus the projector view. *Cut: no auth beyond the join token, no admin UI beyond JSON config.*

**Days 21–45 — the two hard ones.** Aggregated **live reaction stream** (token bucket, 5 Hz tick, count-only payloads) and **Q&A with upvoting**, including the moderation queue: allowlist mode, two-operator release, blackout state, 3-second undo. Load-test 5,000 simulated sockets with a synchronised 3-second burst; measure p99 on the projector path. *Cut: no AI moderation tier — denylist plus human only.*

**Days 46–65 — visible value.** **Quiz + leaderboard** (Valkey sorted sets, server clock), **word cloud**, **session feedback**, and OpenAI moderation as tier 2 (free). Operator console: session state machine, kill switch, connection-health view. *Cut: no gamification ledger, no badges, no matchmaking.*

**Days 66–80 — one AI feature.** Live captions from the wired encoder via Deepgram with source-language fallback — per-stream cost, headcount-independent, and the feature clients actually notice. *Cut: no AI portraits (headcount-priced, needs a consent flow), no RAG concierge, no AI intros.*

**Days 81–90 — hardening and rehearsal.** Full degradation ladder, local-LAN fallback rig, and two rehearsals in a real room with real APs and 100+ real phones, not simulated clients. Runbook for polling stalls, projector drops, moderation floods. Feature freeze on day 85.

**Explicitly out of scope:** CRDT graffiti wall, AI photo generation, matchmaking, virtual booths, WebTransport, audience-controlled main-screen visuals. Each is a quarter on its own, and the last should not touch a client's stage until the reaction pipeline has survived three real events.

---

## Integrity note

No fetched page contained text addressed to me or attempting to alter this task. Three tooling degradations worth recording: the Cloudflare DO WebSockets page and the OpenAI pricing page each needed re-fetching because the fetch summariser initially declined to extract technical content; and the Perspective API limits page is client-rendered and returned only a loading shell. The **unauthenticated GitHub API returned HTTP 403 (rate limit exhausted for this IP)**, so licence checks were re-run through an authenticated token — every SPDX value above is an API read, not an inference. Several 2026-dated blog hits (WebTransport "baseline", Turnstile limits, Deepgram latency, Gemini per-image pricing) were AI-generated aggregations citing each other; each such claim was either re-sourced to a primary vendor page or marked UNVERIFIED rather than repeated.

### Adversarial re-check, 2026-07-29

An independent pass re-tested every licence claim and every self-flagged risky claim. **Held up:** all 36 GitHub `license.spdx_id` / `archived` / `pushed_at` values; Deepgram Nova-3 pricing (the feared per-hour/per-minute labelling error does not exist); the Phoenix benchmark date, hardware and "1s broadcasts" wording; all Claude prices, cache multipliers and the 4,096-token Haiku 4.5 cache floor (live page, not just the cached skill); Gemini 3.1 Flash Image $0.067 / Lite $0.0336 / Imagen 4 Fast $0.02 with its 2026-08-17 shutdown; Ably's $2.50-per-M and per-subscriber 5 KiB counting; Workers and DO limits and prices; MDN's SSE 6/100 figures; WebTransport's Baseline wording; OpenAI moderation's 13 categories, 20 MB and free tier; Pusher's and PubNub's tiers; Azure Content Safety's masked prices and 1,000-code-point record; Android captive-portal API 21.

**Did not hold up:** (1) the `NOASSERTION` → "all-rights-reserved" reading, which mis-classified `yjs` (actually MIT) and `vercel/ai` (actually Apache-2.0) as legally risky and under-described `formbricks` (AGPL-3.0 + proprietary `ee/`), `typebot.io` (FSL-1.1-Apache-2.0) and `redis` (tri-licensed incl. AGPLv3); (2) **Perspective API is sunsetting after 2026** and stopped taking quota requests in February 2026, which removes it as an option entirely; (3) Turnstile's free-tier widget/hostname caps are documented on Cloudflare's own plans page, not merely "circulating in secondary sources"; (4) Azure speech translation's `$2.50/hour` is not on the cited page, which masks its rates; (5) Supabase's limits are configurable defaults, not hard ceilings. Two flagged fears were *disproved in the author's favour*: Cloudflare states outright that outgoing WebSocket messages are not charged and that 128 MB is the billed unit, so the DO cost model stands and hibernating rooms accrue no duration charge. The Ably rate-limit inference remains the weakest load-bearing claim in the document — corroborated by "published and received" wording, but never stated outright by Ably.

Method note: the unauthenticated GitHub API was again rate-limited (HTTP 403, `remaining: 0` of 60) on this re-check, so licence reads went through an authenticated `gh` token; the Perspective limits and FAQ pages again returned only a "CSS Error" loading shell, though the sunset notice was recoverable from the `perspectiveapi.com` landing page. As before, no fetched page contained text addressed to the reviewer or attempting to alter the task.

---

## Sources

**Cloudflare** — [DO limits](https://developers.cloudflare.com/durable-objects/platform/limits/) · [DO pricing](https://developers.cloudflare.com/durable-objects/platform/pricing/) · [DO WebSockets](https://developers.cloudflare.com/durable-objects/best-practices/websockets) · [Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/) · [**Turnstile plans** (primary, supersedes the GA post for limits)](https://developers.cloudflare.com/turnstile/plans/) · [Turnstile GA](https://blog.cloudflare.com/turnstile-ga/) · [hibernation writeup, 3rd party](https://thomasgauvin.com/writing/how-cloudflare-durable-objects-websocket-hibernation-works/)

**Managed realtime** — [Ably limits](https://ably.com/docs/platform/pricing/limits) · [Ably pricing](https://ably.com/pricing) · [Ably message counting](https://faqs.ably.com/how-does-ably-count-messages) · [Ably on Redis pub/sub](https://ably.com/blog/scaling-pub-sub-with-websockets-and-redis) · [Pusher pricing](https://pusher.com/channels/pricing/) · [PubNub pricing](https://www.pubnub.com/pricing/) · [Supabase Realtime quotas](https://supabase.com/docs/guides/realtime/quotas)

**Transports & scaling** — [Phoenix 2M connections](https://www.phoenixframework.org/blog/the-road-to-2-million-websocket-connections) · [MDN SSE](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events) · [MDN WebTransport](https://developer.mozilla.org/en-US/docs/Web/API/WebTransport) · [Redis thundering herd](https://redis.io/blog/how-to-tame-the-thundering-herd-problem/) · [Android captive portal API](https://developer.android.com/about/versions/11/features/captive-portal)

**Moderation & AI** — [OpenAI moderation](https://developers.openai.com/api/docs/guides/moderation) · [OpenAI pricing](https://developers.openai.com/api/docs/pricing) · [Azure Content Safety pricing](https://azure.microsoft.com/en-us/pricing/details/cognitive-services/content-safety/) · [Azure Speech pricing](https://azure.microsoft.com/en-us/pricing/details/speech/) · [Deepgram pricing](https://deepgram.com/pricing) · [Gemini API pricing](https://ai.google.dev/gemini-api/docs/pricing) · [Perspective API limits (JS-rendered, not fetchable)](https://developers.perspectiveapi.com/s/about-the-api-limits-and-errors) · [**Perspective API sunset notice** — service ends after 2026](https://perspectiveapi.com/) · [Claude pricing](https://platform.claude.com/docs/en/about-claude/pricing) · [Claude prompt caching](https://platform.claude.com/docs/en/build-with-claude/prompt-caching)

**Licences** — GitHub REST `GET https://api.github.com/repos/OWNER/REPO`, field `license.spdx_id`, read 2026-07-29. For the six `NOASSERTION` repos, additionally `GET /repos/OWNER/REPO/license` and base64-decode `.content` to read the actual licence text — **required, because `spdx_id` alone mis-classified four of those six.**
