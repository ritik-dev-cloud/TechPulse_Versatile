# How AI Actually Builds Software in 2026

> Research brief · compiled 2026-07-29

Every claim carries an inline source. Untraceable claims are marked **UNVERIFIED**; several widely-repeated ones are named and rejected in the [Integrity note](#integrity-note).

---

## 1. The agentic coding landscape

Four architectures, not one category. Licences via GitHub API, checked 2026-07-29 (§6).

| Tool | Architecture | Good at | Licence |
|---|---|---|---|
| **Claude Code** | CLI/TUI agent, own harness | Long autonomous runs, subagent fan-out, hooks as deterministic gates | `null` — all rights reserved |
| **Codex CLI** | CLI agent | Terminal-Bench leader class | Apache-2.0 |
| **Gemini CLI** | CLI agent | Very large context ingestion | Apache-2.0 |
| **opencode** | CLI agent, provider-agnostic | Model portability | MIT |
| **Aider** | CLI, repo-map + diff-edit | Cheap, legible, scriptable | Apache-2.0 |
| **OpenHands** | Containerised agent runtime | Self-hosting, sandboxed execution | MIT |
| **Cline** | IDE extension, BYO key | Transparent per-step approval | Apache-2.0 |
| **goose** | Local extensible agent | On-prem / air-gapped, MCP-native | Apache-2.0 |
| **Cursor / Windsurf** | Forked IDE + agent | Inline-edit→agent continuum, repo indexing | Proprietary |
| **Copilot agent / Workspace** | Platform-native agent on CI | PR-shaped work inside GitHub | Proprietary |
| **Devin** / **Kiro** | Autonomous SWE / spec-driven agentic IDE (`requirements/design/tasks.md` + file-save hooks, [AWS](https://builder.aws.com/content/3DbBI7LQgNIcs6UUj7IPPvqFHOp/aws-kiro-the-agentic-ide-that-makes-specs-the-unit-of-work)) | Ticket→PR unattended / spec as unit of work | Proprietary |

### Measured evidence, and why to distrust the headline

**Terminal-Bench 2.0** ([tbench.ai](https://www.tbench.ai/leaderboard/terminal-bench/2.0), 89 Docker tasks, 16 categories): **#1** NexAU-AHE/GPT-5.5 84.7% ±2.1 (2026-05-14); **#2** LemonHarness/*multiple* 84.5% ±2.6; **#3** Capy/GPT-5.5 83.1% ±2.1; **#4 Codex CLI/GPT-5.5 82.2% ±2.2** (2026-04-23); **#5** Polaris/*multiple* 82.2% ±2.8; **#6** WOZCODE/Claude Opus 4.7 80.2% ±2.1; **#10** Droid/GPT-5.3-Codex 77.3% ±2.2. (Re-read 2026-07-29: an earlier draft skipped Capy at #3 and Polaris at #5, which flattered Codex CLI's standing — it is **fourth**, and statistically tied with Polaris. The §1 table's "Terminal-Bench leader class" is fair only in the ±2 sense.) Agent and model vary *separately* — GPT-5.5 alone spans **84.7% (NexAU-AHE) → 66.1% (clnkr, #29)** across scaffolds, so "model score" is not a meaningful unit. (Corrected: the earlier "82.2%→75.1%" compared across *different* models — 75.1% is Simple Codex on GPT-5.3-**Codex** at #15, not a GPT-5.5 entry.) The rule that "submissions may not modify timeouts or resources" exists because harness latitude moves scores.

**SWE-bench Verified is the number to trust least.** (1) Weak tests inflate scores: [SWE-ABS (arXiv:2603.00520, 2026-02-28)](https://arxiv.org/abs/2603.00520) strengthened tests on 50.2% of the 500 instances and rejected **19.71% of previously passing patches as semantically flawed**; the top agent fell **78.80% → 62.20%** and dropped to fifth. (2) Original labels were wrong: [UTBoost (arXiv:2506.09289)](https://arxiv.org/abs/2506.09289) found 345 patches mislabelled as passing, affecting **24.4% of Verified leaderboard entries** and causing 11 rank changes. (3) Harnesses aren't comparable: [Epoch AI](https://epoch.ai/benchmarks/swe-bench-verified) runs 484/500 (16 don't run reliably), caps budgets at 2M uncached + 20M cached-read tokens, and warns vendors exclude *different* samples and that a **5–10% baseline error rate** exists in the dataset; the benchmark's own site notes 1.x and 2.x results "are not necessarily comparable" ([swebench.com](https://www.swebench.com/verified.html)).

Harder successors, **each with its own citation — arXiv:2504.02605 was attached to both and supports neither**: **SWE-bench Pro**, 731 instances in the public set (of 1,865 total across 41 repos; public set deliberately drawn from strong-copyleft/GPL repos as contamination resistance), Scale AI, [arXiv:2509.16941](https://arxiv.org/abs/2509.16941) — top models score ~23% here against 70%+ on Verified; and **SWE-bench Multilingual**, **300 tasks across 42 repos and 9 languages** (C, C++, Go, Java, JavaScript, TypeScript, PHP, Ruby, Rust), [swebench.com/multilingual.html](https://www.swebench.com/multilingual.html) — not "8–9". What arXiv:2504.02605 actually is: **Multi-SWE-bench, 1,632 instances across 7 languages** ([arXiv:2504.02605](https://arxiv.org/abs/2504.02605)) — a third, separate benchmark. **Current top Verified scores are UNVERIFIED here** — the official table wouldn't render via fetch, and aggregator figures ("95.0%", "93.9%") trace to no primary document.

---

## 2. How large organisations use it well

**Plan-then-execute, verification as the gate.** Anthropic's guidance: separate exploration from execution because "letting Claude jump straight to coding can produce code that solves the wrong problem" (Explore → Plan → Implement → Commit), the binding constraint being that "context fills up fast, and performance degrades as it fills." Critically: "Claude stops when the work looks done. Without a check it can run, 'looks done' is the only signal available, and you become the verification loop." Escalating hardness — prompt-level check → goal condition re-evaluated per turn → **Stop hook** blocking the turn from ending until a script passes ([best practices](https://code.claude.com/docs/en/best-practices)).

**Migration-at-scale — the reference architecture.** Airbnb migrated **nearly 3.5K React test files in six weeks** (the post's own phrasing; "3,500" rounds up) against a **1.5-year** manual estimate: 75% automated in four hours, 97% overall, final 3% by hand in one more week. Mechanism: a **per-file state machine** (Enzyme refactor → Jest fixes → lint → TypeScript), validation errors fed back as dynamic prompts, ~10 retries typical and **50–100 for the long tail**, prompts of **40,000–100,000 tokens** carrying up to 50 related files ([Airbnb](https://medium.com/airbnb-engineering/accelerating-large-scale-test-migration-with-llms-9565c208023b)). Deterministic gates, bounded retries, a measured tail, humans on the residual.

**Repo context files — and the measured verdict against them.** AGENTS.md is stewarded by the Agentic AI Foundation under the Linux Foundation, claiming **60k+ projects** ("used by over 60k open-source projects") and **20-odd supporting tools** ([agents.md](https://agents.md/)) — the earlier figure of "27" is not supported; two independent reads of the page enumerated **23 and 24** named tools, so the exact count is **UNVERIFIED** but is certainly not 27. But [Gloaguen et al. (arXiv:2602.11988](https://arxiv.org/abs/2602.11988), 2026-02-12) found across multiple LLMs, agents, and *both* LLM-generated and developer-committed files that "providing context files does not generally improve task success rates, while increasing inference cost by over 20% on average." Instructions *were* followed; **repository overviews — the most-recommended section — were not helpful.** Keep commands and non-standard conventions; delete the architecture tour.

**MCP for internal tools, but prefer CLIs.** "Tools like `gh`, `aws`, `gcloud`, and `sentry-cli` are still more context-efficient than MCP servers because they don't add any per-tool listing" ([costs doc](https://code.claude.com/docs/en/costs)); MCP definitions are deferred by default so only names enter context until used.

**AI in review, and its platform economics.** Copilot code review became agentic on GitHub Actions and from 2026-06-01 **consumes Actions minutes** ([changelog](https://github.blog/changelog/2026-04-27-github-copilot-code-review-will-start-consuming-github-actions-minutes-on-june-1-2026/)); all plans moved to usage-based **AI Credits** billed on input, output and cached tokens at listed model rates, with per-user consumption in the metrics API ([GitHub](https://github.blog/news-insights/company-news/github-copilot-is-moving-to-usage-based-billing/), [changelog](https://github.blog/changelog/2026-06-19-ai-credits-consumed-per-user-now-in-the-copilot-usage-metrics-api/)). Google's AutoCommenter enforces best practices across C++/Java/Python/Go in industrial review ([Google Research](https://research.google/pubs/ai-assisted-assessment-of-coding-practices-in-industrial-code-review/)) — "measurable positive impact" claimed, but no acceptance or false-positive rate exposed, so **effect size is UNVERIFIED**.

**Adversarial review + fleets.** Anthropic recommends a reviewer in a **fresh subagent context** seeing "only the diff and the criteria," warning that "a reviewer prompted to find gaps will usually report some, even when the work is sound... Chasing every finding leads to over-engineering." Google reports a complex migration by agents plus engineers finishing **six times faster than a year earlier**, and states **"75% of all new code at Google is now AI-generated and approved by engineers, up from 50% last fall"** ([blog.google, 2026-04-22](https://blog.google/innovation-and-ai/infrastructure-and-cloud/google-cloud/cloud-next-2026-sundar-pichai/)) — primary, but self-reported with **no published definition of "AI-generated."** Adoption signal, not productivity measurement.

---

## 3. Token economics and reuse

### 3.1 List prices, July 2026 (per 1M tokens)

| Model | Input | Cached read | Output |
|---|---|---|---|
| Claude Fable 5 | $10.00 | $1.00 | $50.00 |
| Claude Opus 5 | $5.00 | $0.50 | $25.00 |
| Claude Sonnet 5 | $3.00 (intro $2.00 to 2026-08-31) | $0.30 | $15.00 (intro $10.00) |
| Claude Haiku 4.5 | $1.00 | $0.10 | $5.00 |
| gpt-5.6-sol | $5.00 | $0.50 | $30.00 |
| gpt-5 | $1.25 | $0.125 | $10.00 |
| Gemini 3.1 Pro Preview | $2.00 (≤200K ctx) / $4.00 | 0.1× | $12.00 / $18.00 |
| Gemini 3.6 Flash | $1.50 | 0.1× | $7.50 |

Anthropic: `claude-api` skill model table (cached 2026-06-24) + [caching docs](https://platform.claude.com/docs/en/build-with-claude/prompt-caching.md). OpenAI: [pricing](https://developers.openai.com/api/docs/pricing). Google: [pricing](https://ai.google.dev/gemini-api/docs/pricing), which also charges **cache storage at $4.50 / 1,000,000 tokens per hour** — a meter that runs whether or not you read. (Corrected 2026-07-29: an earlier draft said $1.00/1M/hour. The primary page reads "$4.50 / 1,000,000 tokens per hour", i.e. **4.5× worse than stated** — at 200K cached tokens that is $0.90/hour, ~$21/day, so a cache left resident overnight can cost more than the reads it saves. The `0.1×` cached-read multiplier is correct: Google lists absolute cached input of $0.20 ≤200K / $0.40 >200K against $2.00/$4.00 input.)

### 3.2 Prompt caching: what actually decides whether it works

Caching is a **prefix match**; the prefix renders `tools → system → messages`. One changed byte at position *N* invalidates every breakpoint ≥ *N*.

- **Multipliers:** write 1.25× base input (5-min TTL), 2× (1-hour); **read 0.1×**. Stacks with Batch. Break-even is **two** requests at 5-min TTL (1.25 + 0.1 vs 2.0), **three** at 1-hour (2.0 + 0.2 vs 3.0).
- **Minimum cacheable prefix is model-dependent and non-monotonic:** 512 tokens (Opus 5, Fable 5), 1,024 (Opus 4.8, Sonnet 5/4.6), 2,048 (Opus 4.7), **4,096 (Opus 4.6, Haiku 4.5)**. Below it nothing caches and **no error is returned**.
- **Invalidation hierarchy:** tool definitions or model → everything; system prompt → system + messages; `tool_choice`, images, thinking config → messages only. Per-request `tool_choice` is free; a per-user tool list is catastrophic.
- **Silent invalidators to grep for:** `datetime.now()`/`Date.now()` in `system`, UUIDs early in content, `json.dumps()` without `sort_keys=True`, iterating a `set`, conditional system sections, session/user IDs in `system`.
- **Two traps:** breakpoints look back **at most 20 content blocks**, so agentic turns emitting more silently miss; and an entry is readable only once the first response **begins streaming**, so N parallel identical-prefix requests all pay full price — fire one, await first token, then the rest.
- **Verify empirically:** `cache_read_input_tokens` at 0 across repeated identical prefixes means an invalidator is live. Total prompt = `input + cache_creation + cache_read`.

Cache-preserving escape hatches exist for the two costly cases: mid-conversation `{"role":"system"}` messages appended to `messages[]` (the caching doc lists Fable 5, **Mythos 5**, Opus 4.8 and Opus 5, no beta header, and explicitly *not* Sonnet 5); and `tool_addition`/`tool_removal` blocks, which are **UNVERIFIED** — neither the blocks nor the beta header `mid-conversation-tool-changes-2026-07-01` appears anywhere in the caching doc. Confirm against the tool-use pages before building on it.

### 3.3 Batch APIs

**50% off input and output** on all three providers — Anthropic Message Batches (≤100,000 requests / 256 MB, most complete within an hour, max 24, results kept 29 days), [OpenAI](https://developers.openai.com/api/docs/pricing), [Gemini](https://ai.google.dev/gemini-api/docs/pricing). Batch stacks with caching. This is the largest unexploited discount in coding work: eval sweeps, bulk codemods, docstring backfill, nightly lint triage and test generation are all latency-insensitive and should never run synchronously.

### 3.4 Routing and cascading

The real primary claim from [RouteLLM (arXiv:2406.18665)](https://arxiv.org/abs/2406.18665) is **"over 2 times"** cost reduction in certain cases without compromising quality, plus transfer across model pairs. The circulated "85% reduction at 95% of GPT-4 quality" is **UNVERIFIED** — marketing blogs only. Newer work, [Cluster/Route/Escalate (arXiv:2606.27457, 2026-06-25)](https://arxiv.org/abs/2606.27457), reports retaining **97–99% of the strongest model's accuracy** via offline cost-budgeted clustering plus quality-triggered escalation. One caveat on borrowing it as a *cost* result: the abstract's stated saving is a reduction in **Time Per Output Token (TPOT)** — a latency metric — and it quantifies no cost-reduction percentage.

Practical shape: rules for template-matched work → classifier for the ambiguous middle → cascade with escalation on failure. For coding, **the escalation signal should be the test suite, not model confidence** — a compile or test failure is free and unambiguous. Caveat: **switching models invalidates the prompt cache** (caches are model-scoped), so route at task boundaries and use cheaper *subagents* rather than swapping the main loop's model mid-session.

### 3.5 Context engineering, by leverage

Per Anthropic's [cost](https://code.claude.com/docs/en/costs) and [best-practices](https://code.claude.com/docs/en/best-practices) docs, in order of leverage:

1. **Clear between unrelated tasks** — "stale context wastes tokens on every subsequent message." `/clear` is free; `/compact` is itself a large request because it reads what it summarises.
2. **Subagent isolation** for verbose reads/tests/logs, so only a summary returns — but **agent teams use ~7× the tokens** of a standard session, each teammate holding its own context. The doc's sentence is conditional and the condition matters: "Agent teams use approximately 7x more tokens than standard sessions **when teammates run in plan mode**." Treat 7× as a plan-mode ceiling, not a flat multiplier for every fleet.
3. **Truncate tool results at the source** — a `PreToolUse` hook grepping test output for failures cuts "context from tens of thousands of tokens to hundreds."
4. **Retrieval over stuffing** — code-intelligence/LSP plugins replace grep-then-read-five-candidates with one "go to definition."
5. **Load instructions on demand** — keep `CLAUDE.md`/`AGENTS.md` **under ~200 lines**, conditional workflows in skills. "If your CLAUDE.md is too long, Claude ignores half of it."
6. **Structured output over prose; CLI over MCP** — fewer tokens per decided fact.

### 3.6 Worked example: spend per developer per month

Anthropic publishes the observed distribution: **~$13 per developer per active day, $150–250 per month, 90% of users below $30/active day** ([costs doc](https://code.claude.com/docs/en/costs)). Reconstructing from token math on Opus 5 ($5/$25; read $0.50; 5-min write $6.25) — 40 turns carrying ~120K context each, ~3K output per turn:

- Input **uncached:** 40 × 120K = 4.8M × $5/M = **$24.00/day**
- Input **cached:** one write (120K × $6.25/M = $0.75) + 39 reads (4.68M × $0.50/M = $2.34) = **$3.09/day (−87%)**
- Output: 120K × $25/M = **$3.00/day**
- **≈$6.10/active day ≈ $122/month** at 20 active days.

Just under the published band — the right result, since the band includes multiple sessions, bigger contexts, subagents and MCP overhead. Two levers dominate: the same workload on Sonnet 5 is ≈$3.65/day; agent fleets at ~7× reach **~$40+/active day**, above the 90th-percentile ceiling, which is why fleet spend needs its own budget line rather than being a default. Both the arithmetic and the workload parameters here are mine, not measured telemetry — and the 7× is Anthropic's **plan-mode** figure, so ~$40+/day is an upper bound for plan-mode fleets rather than a general fleet rate. Anthropic's rate-limit planning figures fall with org size (200–300k TPM/user at 1–5 users → 10–15k at 500+), so **concurrency, not headcount, sizes the quota**.

### 3.7 Reasoning budgets and where thinking stops paying

Thinking tokens bill as **output**, and default budgets "can be tens of thousands of tokens per request." The control surface is now `effort` (`low`→`max`), not a token budget: `budget_tokens` is **removed with a 400** on Opus 5 / 4.8 / 4.7 / Fable 5 / Sonnet 5, and adaptive-reasoning models ignore non-zero `MAX_THINKING_TOKENS`. Vendor guidance for Opus 5 is to start at `xhigh` for coding/agentic work then **sweep downward**, because `low` and `medium` are unusually strong — effort defaults inherited from a prior model are usually wrong. **UNVERIFIED:** this start-high-then-sweep guidance is not in either cited Claude Code doc (the costs page says only to *lower* effort for simpler tasks); it needs a citation to the model-config or release-notes page before it is quoted as vendor guidance.

Two constraints worth internalising. **Effort does not reliably shorten user-facing output** — prompting does. (The specific "~20%" figure is **UNVERIFIED**: it does not appear in either cited Claude Code doc. Keep the qualitative point, drop the number until sourced.) And more thinking can *reduce* accuracy: [arXiv:2604.10739 (2026-04-12)](https://arxiv.org/abs/2604.10739) finds "marginal returns diminish substantially at higher budgets," models "overthink" by abandoning previously correct answers, and "optimal thinking length varies across problem difficulty, suggesting that uniform compute allocation is suboptimal." (The quoted "87.3%→70.3% as tokens rise 1,100→15,980" is **UNVERIFIED** — not in that abstract.) Sweep effort per route against your own evals; a flat org-wide effort setting is a cost bug.

### 3.8 Observability and FinOps

Measure: tokens split `input / cache_creation / cache_read / output` (a single `input_tokens` figure hides the entire caching story); **cache-hit ratio per prompt template**; cost per *resolved task*, not per request; cascade escalation rate; retries per completed task (Airbnb's tail hit 50–100); thinking-token share of output.

Anthropic offers four attribution paths — Console dashboard + Claude Code Analytics API, Enterprise Analytics API (`read:analytics`), spend-report CSV, and **OpenTelemetry export, the only one that streams per-user token and cost metrics into your own stack in near real time** (the doc's wording, verbatim). It is *not* the only path that works on Bedrock/Google Cloud/Foundry, as an earlier draft had it: the doc lists **three** options for per-user attribution on those providers — OTel, a self-hosted **Claude apps gateway** (which also offers per-user spend limits), and a third-party **LLM gateway**. What is true is that Claude Code sends no metrics back to Anthropic from those providers, so the Anthropic-side dashboards and the Claude Code Analytics API do not cover that usage. Anthropic notes several large enterprises route Claude Code through **LiteLLM** to track spend per key, while flagging it "unaffiliated with Anthropic and has not been audited for security." Tooling, licence-checked in §6: **Langfuse** and **Helicone** (tracing/cost), **OpenLLMetry** (OTel-native), **Braintrust** (evals) — note Langfuse and LiteLLM are **open-core**, not plain MIT.

---

## 4. The honest counter-evidence

**METR's RCT stands; there is no retraction.** July 2025: 16 experienced OSS developers, 246 tasks, mature repos they knew ~5 years — AI use made tasks take **19% longer, CI [+2%, +39%]**, while the same developers forecast a 24% speedup and estimated 20% afterwards ([METR](https://metr.org/blog/2025-07-10-early-2025-ai-experienced-os-dev-study/), [arXiv:2507.09089](https://arxiv.org/abs/2507.09089)). On 2026-02-24 METR published *We are Changing our Developer Productivity Experiment Design* — **a redesign, not a retraction** ([metr.org](https://metr.org/blog/2026-02-24-uplift-update/)). The reason cuts *against* AI scepticism: 30–50% of developers declined to submit tasks they didn't want to do without AI, so "we are systematically missing developers who have the most optimistic expectations about AI's value" and "tasks which have high expected uplift" — **biasing study 2's speedup estimate downwards**. Pay also fell $150→$50/hr, and timing is unreliable for developers running concurrent agents. Interim study-2 estimates — **−18% [−38%, +9%]** (returning) and **−4% [−15%, +9%]** (new recruits) — are published *and disclaimed as unreliable by METR itself*. Quoting either the 19% slowdown or an "18% speedup" as settled misuses this work.

**DORA 2025: throughput up, stability down.** Higher AI adoption is associated with increases in **both** delivery throughput and **instability**. (The characterisation of this as "a reversal from 2024, when AI was associated with *reduced* throughput" is **UNVERIFIED** — the cited dora.dev page states the 2025 finding but makes no mention of a 2024 figure or of any year-over-year reversal, so the comparison is not supported by the source given for it.) 90% of technology professionals use AI at work; >80% believe it raised productivity; **30% report "little to no trust" in AI-generated code**. The mechanism is a verification tax: time saved writing is reallocated to auditing. AI amplifies — the page's actual wording is that AI's role "is that of an amplifier. It magnifies the strengths of high-performing organizations and the dysfunctions of struggling ones" (the punchier "it doesn't fix a team; it amplifies what's already there" appears **nowhere on the page** and should not sit in quotation marks) — and without strong automated testing, mature version control and fast feedback, higher change volume produces instability ([dora.dev](https://dora.dev/insights/balancing-ai-tensions/), [PDF](https://services.google.com/fh/files/misc/2025_state_of_ai_assisted_software_development.pdf)). Caveat: the cited qualitative slice is **1,110 open-ended responses from Google engineers, Q3 2025** — one company, self-reported.

**GitClear on duplication.** Verified from the primary PDF: **211 million changed lines, January 2020–December 2024**, and "**2024 marked the first year GitClear has ever measured where the number of 'Copy/Pasted' lines exceeded the count of 'Moved' lines**" — moved lines being the refactoring proxy ([v2025.2.5](https://gitclear-public.s3.us-west-2.amazonaws.com/GitClear-AI-Copilot-Code-Quality-2025.pdf)). The circulated 2026 figures (623M changes; duplication +81%, churn +15%, refactoring −70%) are **UNVERIFIED** — that page 403'd. GitClear also sells this measurement, and the metrics are proxies.

**Veracode: security has flatlined.** 80 tasks × 4 languages × 4 CWEs (5 instances each); function completion with no security guidance yields secure code only **55%** of the time. Python 62%, C# 58%, JavaScript 57%, **Java 29%**. Pass rate by CWE: insecure crypto 86%, SQLi 82%, **XSS 15%, log injection 13%**. Flagship models cluster near 55%; OpenAI reasoning models 70–72%; syntax correctness >95% for all. "Two years of 'revolutionary' model releases have moved the security needle from approximately 55% to… approximately 55%" ([Veracode, Spring 2026](https://www.veracode.com/blog/spring-2026-genai-code-security/)). Caveats: the tested set lags the frontier (no Opus 5 / Fable 5 / Sonnet 5), and the protocol deliberately omits security instructions — it measures the **unprompted default**, right for agent fleets, wrong as a ceiling.

**Holding these together.** None of this says AI coding doesn't work. The throughput gain is real and concentrated in greenfield and mechanical work; the cost surfaces as instability, duplication and unprompted insecurity; self-report massively overstates gains (19% measured slowdown vs +20% perceived); and the teams that win already had good control systems. Syntax correctness >95% against security correctness ~55% is the story in two numbers.

---

## 5. What this means for a small team

1. **Make the runnable check the gate, not the review.** Every agent task ships a pass/fail — tests, build exit code, screenshot diff — wired as a **Stop hook** so the turn cannot end until it passes. Highest-leverage habit here — but know the escape valve: the docs state "Claude Code overrides the hook and ends the turn after **8 consecutive blocks**," so a Stop hook is a strong gate, not an unbreakable one. CI must still enforce the same check.
2. **Bound the tail.** Airbnb's distribution is bimodal: most files in ~10 retries, some in 50–100. Cap retries, log the residual, hand it to a human. Never let an agent grind.
3. **SAST + secrets scanning as required pre-merge checks, not nightlies.** At 15% XSS / 13% log-injection pass rates and Java at 29%, injection sinks and output encoding must be machine-verified. Add a net-new-line cap on the diff.
4. **Human plus security review, always, on** auth, secrets, input handling, PII, payments, dependency manifests.
5. **Fight duplication explicitly.** Agents prefer copy/paste to extraction: put a duplication threshold in CI and make "did this add a fifth copy?" a first-class review question.
6. **Keep the context file short and honest** — commands, non-default style rules, gotchas, boundaries; **no architecture tour** (>20% more tokens, no success-rate gain). Under ~200 lines; conditional workflows become skills.
7. **Instrument spend from day one.** OTel per-user export; treat `cache_read_input_tokens` as a health metric and alert on cache-hit regressions (almost always a change that broke prefix stability); give agent-fleet spend its own budget line at ~7×.
8. **Batch everything latency-insensitive** for a flat 50%; sweep `effort` per route rather than defaulting high; prompt for conciseness instead of dialling effort down; cascade off the test suite. Frontier tier for architecture and debugging only.
9. **Adversarial review in a fresh context**, told to report only gaps affecting correctness or stated requirements — otherwise you buy over-engineering, not quality.
10. **Don't trust your own perception.** METR's headline is a 39-point gap between measured and perceived. Judge by change failure rate and time-to-restore, not vibes.

---

## 6. Open-source repos worth studying — licence-verified

All via `GET /repos/{owner}/{repo}` (+ `/license`), **checked 2026-07-29**, reading `license.spdx_id`, `archived`, `pushed_at`, `stargazers_count`. The unauthenticated 60/hour limit was exhausted mid-run, so these came through an authenticated `gh api` call against the same endpoint. **None was archived.**

> **Adversarial re-check, 2026-07-29.** All 31 repos were re-queried independently. Every `spdx_id`, every `archived: false`, and both dated `pushed_at` annotations (`Aider-AI/aider` 2026-05-22, `lm-sys/RouteLLM` 2024-08-10) **matched exactly** — as did all four rename claims, each confirmed by the API redirecting the old path (`block/goose`, `All-Hands-AI/OpenHands`, `sst/opencode`, `laude-institute/terminal-bench`). The SPDX layer was sound. What it did **not** catch was the licence *body*: reading the actual LICENSE files changed the verdict on three `NOASSERTION` rows below, one of them materially (`phoenix`). SPDX `NOASSERTION` is a signal to open the file, never a description of the terms.

**Permissive.** Agents: `openai/codex` Apache-2.0 · `google-gemini/gemini-cli` Apache-2.0 · `cline/cline` Apache-2.0 · `aaif-goose/goose` Apache-2.0 (**renamed from `block/goose`**) · `Aider-AI/aider` Apache-2.0 (last push 2026-05-22 — slowing) · `continuedev/continue` Apache-2.0 · `OpenHands/OpenHands` MIT (**renamed from `All-Hands-AI/`**) · `anomalyco/opencode` MIT (**renamed from `sst/opencode`**). Frameworks/workflow: `github/spec-kit` MIT · `openai/openai-agents-python` MIT · `langchain-ai/langgraph` MIT. Gateways: `Portkey-AI/gateway` MIT. Observability: `Helicone/helicone` Apache-2.0 · `traceloop/openllmetry` Apache-2.0 · `braintrustdata/braintrust-sdk-javascript` Apache-2.0 (SDK only; platform is SaaS). Evals/benchmarks: `promptfoo/promptfoo` MIT · `SWE-bench/SWE-bench` MIT · `harbor-framework/terminal-bench` Apache-2.0 (**renamed from `laude-institute/`**). Routing: `lm-sys/RouteLLM` Apache-2.0 (**last push 2024-08-10 — dormant**). Self-host: `vllm-project/vllm` Apache-2.0 · `ollama/ollama` MIT · `simonw/llm` Apache-2.0.

**Not plainly OSI-open — read before adopting**

| Repo | SPDX | What it is |
|---|---|---|
| `anthropics/claude-code` | **`null`** | **All rights reserved.** No LICENSE file (`/license` 404s). Issues/docs repo, not a source grant. |
| `modelcontextprotocol/servers` | `NOASSERTION` | Not "per-server terms vary" as an earlier draft had it — the LICENSE states the project "is undergoing a licensing transition from the MIT License to the Apache License, Version 2.0". New code and spec contributions are Apache-2.0; **contributions whose authors have not consented to relicensing remain MIT**; docs (excluding specs) are CC-BY-4.0. So the mixture is temporal, not per-directory. |
| `modelcontextprotocol/modelcontextprotocol` | `NOASSERTION` | Spec repo, carrying the **same MIT→Apache-2.0 transition notice** verbatim. |
| `BerriAI/litellm` | `NOASSERTION` | **Open-core.** LICENSE: everything under `enterprise/` uses `enterprise/LICENSE`; the rest MIT. |
| `langfuse/langfuse` | `NOASSERTION` | **Open-core.** `ee/`, `web/src/ee/`, `worker/src/ee/` under `ee/LICENSE`; rest "MIT Expat". |
| `Arize-ai/phoenix` | `NOASSERTION` | **Elastic License 2.0 (ELv2)** — the LICENSE file opens "Elastic License 2.0 (ELv2)". **Source-available, not OSI open source.** You may not "provide the software to third parties as a hosted or managed service", nor "move, change, disable, or circumvent the license key functionality". Corrected 2026-07-29: an earlier draft recorded only "Other". |
| `openai/evals` | `NOASSERTION` | `LICENSE.md` is **plain MIT for the code**; the SPDX reads `NOASSERTION` only because a per-dataset licence inventory is appended below the MIT text (SocialIQA CC-BY-4.0, WordNet License, others). The exposure is in the **eval datasets**, not the code grant. |
| `getsentry/sentry` | `NOASSERTION` | Functional Source License family — **source-available, not OSI open source.** |
| `microsoft/autogen` | **`CC-BY-4.0`** | A **content** licence on a code repo: no patent grant, attribution required. Legal review before use. |

~~No repo carried AGPL/GPL/LGPL/MPL, BUSL-1.1, SSPL-1.0, Elastic-2.0 or PolyForm.~~ **Corrected 2026-07-29 — this was wrong and is the one error here with real legal exposure: `Arize-ai/phoenix` is Elastic License 2.0.** Reading the LICENSE body rather than trusting the `NOASSERTION` SPDX is what surfaced it, so treat every `NOASSERTION` row above as unread until someone has opened the file. Accurate restatement: no repo carried AGPL/GPL/LGPL/MPL, BUSL-1.1, SSPL-1.0 or PolyForm; **one carried Elastic-2.0 (`phoenix`) and one carried FSL-1.1-Apache-2.0 (`sentry`)**, both source-available rather than open source. Cursor, Windsurf, Devin, Kiro and Copilot have no public source repo, so no licence check applies.

---

## Integrity note

- **No fetched page attempted to redirect or instruct me;** no prompt-injection content encountered. Three fetch summaries returned irrelevant commentary about Communique's event business injected by the summarising layer's own system context — harness artifact, not page content.
- **Slop rejected:** (a) the premise of a "METR 2026 methodology **retraction**" is wrong — it is a *redesign*, the 19% result is not withdrawn, and the selection bias runs *against* AI; (b) "RouteLLM: 85% cost reduction at 95% of GPT-4 quality" appears only in marketing blogs — the paper says "over 2 times"; (c) a first-pass search summary **inverted** Veracode's figures (XSS as "86% failure" when the primary gives XSS *pass* 15%, crypto *pass* 86%); (d) SWE-bench Verified scores of "95.0%"/"93.9%" have no primary document; (e) Google's "11 minutes reviewing each AI-generated changelist" has no traceable source.
- **Fetch failures:** GitClear's 2026 page 403'd; the SWE-bench Verified leaderboard table wouldn't render; the METR post 404s at the URL implied by its title (real path `/blog/2026-02-24-uplift-update/`).
- **Vendor-source caveat:** Anthropic's pricing/caching/cost figures and Google's 75% figure are primary but self-published, with no third-party methodology audit.
- **Adversarial re-check pass, 2026-07-29.** An independent reviewer re-verified the licence table, the flagged high-risk claims, and every numeric assertion. What held: all 31 licences and renames; Veracode's full breakdown including the inverted-then-corrected Java 29% / XSS 15% / log-injection 13% figures; Google's 75% and "six times faster" verbatim on blog.google; Anthropic's $13/day, $150–250/month, 90%-below-$30, the TPM ladder, and every prompt-caching mechanic (multipliers, all eight minimum-prefix values, the 20-block lookback, the streaming-before-readable trap); GitClear's 211M lines and the Copy/Pasted-exceeds-Moved sentence, extracted from the PDF itself; Airbnb's retry tail and token ranges; METR's redesign framing, 30–50% task declination, $150→$50 pay, and both disclaimed interim intervals; Epoch's 484/500, 2M/20M caps and 5–10% error rate; the abstracts of SWE-ABS, UTBoost, Multi-SWE-bench, RouteLLM, Cluster/Route/Escalate, the AGENTS.md paper and the overthinking paper; Terminal-Bench's 89 tasks/16 categories; and `gpt-5.6-sol` at $5.00/$0.50/$30.00, which the author had rated least reliable but which is **correct**. What did not hold is listed at the point of each claim, the material items being **`Arize-ai/phoenix` = Elastic-2.0** (and the resulting false "no Elastic-2.0" sweep), **Gemini cache storage at $4.50 not $1.00/1M/hour**, the **arXiv:2504.02605 miscitation** covering two benchmarks it is not, a **fabricated DORA quotation**, the **omitted Terminal-Bench ranks 3 and 5** plus a cross-model score span, **agents.md's tool count**, and the **7× fleet multiplier's dropped plan-mode condition**.
- **Recurring harness artifact, confirmed:** the injected Communique event-business commentary reappeared in this pass on the OpenAI pricing, prompt-caching, METR, AGENTS.md and Multi-SWE-bench fetches. It is demonstrably the summarising layer's own system context bleeding into output, not page content, and it never carried an instruction — but it is a reminder that fetch summaries are a lossy, non-deterministic layer. Two reads of the same agents.md page returned different tool counts, which is exactly how the "27" got in.

---

## Sources

**Benchmarks** — [Terminal-Bench 2.0](https://www.tbench.ai/leaderboard/terminal-bench/2.0) · [SWE-bench Verified](https://www.swebench.com/verified.html) · [Epoch AI methodology](https://epoch.ai/benchmarks/swe-bench-verified) · [SWE-ABS arXiv:2603.00520](https://arxiv.org/abs/2603.00520) · [UTBoost arXiv:2506.09289](https://arxiv.org/abs/2506.09289) · [Multi-SWE-bench arXiv:2504.02605](https://arxiv.org/abs/2504.02605) · [SWE-bench Pro arXiv:2509.16941](https://arxiv.org/abs/2509.16941) · [SWE-bench Multilingual](https://www.swebench.com/multilingual.html) · [Terminal-Bench 2.0 / Harbor announcement](https://www.tbench.ai/news/announcement-2-0)

**Practice** — [Claude Code best practices](https://code.claude.com/docs/en/best-practices) · [Claude Code costs](https://code.claude.com/docs/en/costs) · [Airbnb test migration](https://medium.com/airbnb-engineering/accelerating-large-scale-test-migration-with-llms-9565c208023b) · [agents.md](https://agents.md/) · [Evaluating AGENTS.md arXiv:2602.11988](https://arxiv.org/abs/2602.11988) · [Kiro spec-driven development](https://builder.aws.com/content/3DbBI7LQgNIcs6UUj7IPPvqFHOp/aws-kiro-the-agentic-ide-that-makes-specs-the-unit-of-work) · [Google AutoCommenter](https://research.google/pubs/ai-assisted-assessment-of-coding-practices-in-industrial-code-review/) · [Pichai, Cloud Next 2026](https://blog.google/innovation-and-ai/infrastructure-and-cloud/google-cloud/cloud-next-2026-sundar-pichai/) · [Copilot usage-based billing](https://github.blog/news-insights/company-news/github-copilot-is-moving-to-usage-based-billing/) · [Copilot review + Actions minutes](https://github.blog/changelog/2026-04-27-github-copilot-code-review-will-start-consuming-github-actions-minutes-on-june-1-2026/) · [AI credits in usage API](https://github.blog/changelog/2026-06-19-ai-credits-consumed-per-user-now-in-the-copilot-usage-metrics-api/)

**Token economics** — [Anthropic prompt caching](https://platform.claude.com/docs/en/build-with-claude/prompt-caching.md) · [OpenAI pricing](https://developers.openai.com/api/docs/pricing) · [Gemini pricing](https://ai.google.dev/gemini-api/docs/pricing) · [RouteLLM arXiv:2406.18665](https://arxiv.org/abs/2406.18665) · [Cluster/Route/Escalate arXiv:2606.27457](https://arxiv.org/abs/2606.27457) · [When More Thinking Hurts arXiv:2604.10739](https://arxiv.org/abs/2604.10739)

**Counter-evidence** — [METR July 2025 study](https://metr.org/blog/2025-07-10-early-2025-ai-experienced-os-dev-study/) · [arXiv:2507.09089](https://arxiv.org/abs/2507.09089) · [METR design change, 2026-02-24](https://metr.org/blog/2026-02-24-uplift-update/) · [METR research index](https://metr.org/research/) · [DORA, Balancing AI tensions](https://dora.dev/insights/balancing-ai-tensions/) · [DORA 2025 PDF](https://services.google.com/fh/files/misc/2025_state_of_ai_assisted_software_development.pdf) · [GitClear v2025.2.5 PDF](https://gitclear-public.s3.us-west-2.amazonaws.com/GitClear-AI-Copilot-Code-Quality-2025.pdf) · [Veracode Spring 2026](https://www.veracode.com/blog/spring-2026-genai-code-security/)

**Licences** — GitHub REST API `GET /repos/{owner}/{repo}`, checked 2026-07-29 — https://docs.github.com/rest/repos/repos#get-a-repository
