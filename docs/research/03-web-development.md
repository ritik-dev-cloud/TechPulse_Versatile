# Web Development & Developer Tooling: State of Play

> Research brief · compiled 2026-07-29 · sources cited inline.
> Where only secondary/SEO-grade blogs could be found, the claim is marked **UNVERIFIED**.

## 1. Frameworks

**The headline finding of the year is stabilization, not churn.** State of JS 2025 (13,002 respondents, Sept–Nov 2025) reports framework usage rankings essentially unchanged year-over-year — only Alpine.js and HTMX swapped places — and that the average respondent has used just 2.6 frontend frameworks in their career (https://2025.stateofjs.com/en-US/libraries/meta-frameworks/, https://survey.devographics.com/en-US/survey/state-of-js/2025). React remains #1, Vue #2, Angular #3. Solid, at ~10% usage, has held the top satisfaction score five years running while React topped the *pain points* list, cited by 3,748 respondents — more than any other single complaint (**UNVERIFIED** on exact counts; from survey write-ups at https://strapi.io/blog/state-of-javascript-2025-key-takeaways and https://www.infoq.com/news/2026/03/state-of-js-survey-2025).

**React** is still on the 19.x line. 19.2.0 shipped 2025-10-01; latest patch is 19.2.7 (2026-06-01), and there is no React 20 (https://react.dev/versions, https://react.dev/blog/2025/10/01/react-19-2). The **React Compiler reached 1.0 in October 2025**, ending its experimental phase — automatic memoization is now a supported path rather than a bet (https://react.dev/versions).

**Next.js 16** made Turbopack the stable default for both `next dev` and `next build`, introduced **Cache Components** (`use cache` directive, compiler-generated cache keys) replacing the widely disliked implicit caching, shipped stable React Compiler integration, and added an alpha Build Adapters API (https://nextjs.org/blog/next-16, https://nextjs.org/docs/app/guides/upgrading/version-16). Vercel claims 2–5x faster builds and 5–10x faster Fast Refresh. Next.js is at 16.3 with continued Turbopack work (https://nextjs.org/blog/next-16-3-turbopack). The Next.js paradox is real in the data: it keeps gaining usage while losing satisfaction, and **Astro now leads meta-framework satisfaction by roughly 39 points** (https://2025.stateofjs.com/en-US/libraries/meta-frameworks/).

**Astro** had the biggest structural news of 2026: **Cloudflare acquired The Astro Technology Company**, announced 2026-01-16, with a commitment to keep Astro open source (https://www.cloudflare.com/press/press-releases/2026/cloudflare-acquires-astro-to-accelerate-the-future-of-high-performance-web-development/, https://thenewstack.io/cloudflare-acquires-team-behind-open-source-framework-astro/). **Astro 6.0 shipped 2026-03-10**: dev server rebuilt on Vite's Environment API so `astro dev` runs the *actual* production runtime (workerd, Bun, Deno) locally with real KV/D1/R2/Durable Object bindings; built-in Fonts API; Live Content Collections; stable CSP API; Vite 7, Zod 4; Node 22 floor; experimental Rust compiler replacing the Go one (https://astro.build/blog/astro-6/).

**Svelte** stayed on the 5.x line (runes stable since Oct 2024). The 2026 story is **remote functions** and async data flow maturing, plus SvelteKit config moving into `vite.config`, server-side error boundaries, and long-lived remote query APIs (https://svelte.dev/blog — monthly "What's new in Svelte" Jan–Jul 2026). Line is around 5.49–5.55 in 2026 (**UNVERIFIED** exact version).

**Angular 21** shipped 2025-11-20: **zoneless change detection is the default for new apps**, Karma replaced by **Vitest**, experimental **Signal Forms**, new ARIA directives, and an MCP server in the CLI (https://blog.angular.dev/announcing-angular-v21-57946c34f14b, https://www.angulararchitects.io/blog/whats-new-in-angular-21-signal-forms-zone-less-vitest-angular-aria-cli-with-mcp-server/). Angular's signals-plus-zoneless rebuild is now essentially complete, which is a bigger deal than its survey ranking suggests.

**Vue 3.6 / Vapor Mode** compiles opt-in components to direct DOM operations, dropping the virtual DOM per-component and incrementally adoptable alongside vdom components (https://vueschool.io/articles/news/vue-js-2025-in-review-and-a-peek-into-2026/). **Nuxt 4** (mid-2025) was a deliberate stability release: `app/` directory, better data fetching, faster CLI (**UNVERIFIED** on Vue 3.6 GA status and Nuxt 5 plans).

**TanStack Start** cut its v1 Release Candidate on 2025-09-23, with RSC support explicitly deferred to a non-breaking 1.x addition (https://tanstack.com/blog/announcing-tanstack-start-v1). Claims that stable 1.0 landed March 2026 come only from secondary blogs — **UNVERIFIED**. It generated 235 write-in mentions in State of JS 2025 despite not being on the ballot.

**The "back to basics" counter-movement is real but smaller than its volume suggests.** HTMX has more GitHub mindshare (~48.1k stars vs Alpine's ~31.6k) while Alpine.js has roughly 3x HTMX's npm install volume (~498k weekly) because it ships inside server-rendered and static stacks (**UNVERIFIED**, https://www.pkgpulse.com/guides/htmx-vs-alpinejs-2026). Phoenix LiveView continues as the strongest full server-rendered reactive model (https://github.com/phoenixframework/phoenix_live_view, MIT). Practically: these win for CRUD, admin panels, and content sites; they have not displaced React in product engineering.

## 2. Build tooling and runtimes

**Vite 8.0 shipped 2026-03-12 with Rolldown as the single default bundler — no opt-in** (https://vite.dev/blog/announcing-vite8). Vite is now one integrated Rust toolchain: Rolldown (bundler) + Oxc (parse/transform/minify). Vendor-published production build numbers: Linear 46s → 6s, Beehiiv −64%, Ramp −57%, Mercedes-Benz.io up to −38%. Node floor stays 20.19+/22.12+. Also new: integrated Devtools, tsconfig `paths`, WASM SSR. Environment API is still stabilizing. In State of JS 2025, Webpack still has marginally higher lifetime usage (87% vs Vite 84%) but Vite's satisfaction is 98% vs Webpack's 26% (**UNVERIFIED** figures, per survey write-ups).

**TypeScript 7.0 shipped 2026-07-08** — the Go port ("Corsa"), often ~10x faster than 6.0, with parallel parsing/checking/emit. Microsoft reports the new language server cut failing LSP commands >80% and crashes >60%; Slack reported CI type-check going ~7.5 min → 1.25 min and 40% of merge-queue time eliminated (https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/, background: https://devblogs.microsoft.com/typescript/typescript-native-port/). **Critical caveat: 7.0 ships without a public compiler API — 7.1 is expected to add one.** That means Vue, Svelte, Astro, MDX, and Angular template tooling can't move yet; run 7.0 side-by-side with 6.0. Independent tests land nearer 3.9–7.3x on type-heavy repos (**UNVERIFIED**, https://visualstudiomagazine.com/articles/2026/06/22/typescript-7-0-rc-moves-microsofts-go-rewrite-into-the-mainline-compiler.aspx).

**Node.js**: TypeScript type stripping is documented as stable, `node file.ts` needs no flag, and Node 26 removed `--experimental-transform-types` (https://nodejs.org/api/typescript.html). Node 24 is the recommended LTS; Node 26 landed 2026-05-05 (**UNVERIFIED** date, https://versionlog.com/nodejs/26/). The built-in `node --test` runner (assertions, mocks, coverage, watch, parallel) is production-grade, and State of JS 2025 shows `node:test` usage rising while Jest declines and Vitest surges; Playwright satisfaction 91% vs Cypress 72% (**UNVERIFIED**, https://qaskills.sh/blog/state-of-js-2025-testing-frameworks-results).

**Bun**: 1.3 shipped 2025-10-10 (zero-config frontend via `bun index.html`, unified `Bun.SQL` incl. MySQL, built-in Redis client, package catalogs, full-stack single-file executables); latest is 1.3.14 (2026-05-13). Two strategic items: **"Bun is joining Anthropic" (2025-12-02)** and **"Rewriting Bun in Rust" (2026-07-08)** (https://bun.com/blog, https://bun.com/blog/bun-v1.3). Vercel added Bun runtime support 2025-10-28.

**Deno**: latest is **Deno 2.9 (2026-06-25)** — `deno desktop` for native apps, better package-manager compatibility, CSS module imports, Node 26 support; 2.8 (2026-05-22) added `import defer` and much faster npm installs (https://deno.com/blog). No Deno 3.

**Package managers**: pnpm is the default recommendation for new projects, ~103M weekly downloads and ~3x growth since 2024; Yarn is bifurcated into frozen Classic and PnP-based Modern (**UNVERIFIED**, https://www.pkgpulse.com/guides/npm-vs-yarn-vs-pnpm-2026).

**Linting**: three-way race. Biome 2.0 (June 2025) added type-aware linting via its own inference engine (no TypeScript install needed) with a ~97% Prettier-compatible formatter in one `biome.json`. Oxlint (VoidZero) is faster still and ESLint-plugin-compatible, adopted by Preact, Shopify, ByteDance. ESLint keeps the 20,000+ plugin ecosystem. The emerging pragmatic pattern is **oxlint as a fast pre-pass alongside ESLint**, reported at 60%+ CI improvement (**UNVERIFIED**, https://www.pkgpulse.com/guides/biome-vs-eslint-vs-oxlint-2026).

## 3. The web platform

CSS has genuinely absorbed work that used to require JavaScript. `:has()` is both the most-used and most-loved CSS feature in State of CSS 2025; CSS Nesting usage rose 13% YoY; container *style* queries jumped 11 ranking spots (https://2025.stateofcss.com/en-US/features/, https://2025.stateofcss.com/en-US/usage/).

**Interop 2026** (Apple, Google, Igalia, Microsoft, Mozilla) tells you precisely what is *not yet* reliably interoperable — and the list is instructive: **anchor positioning, container style queries, scroll-driven animations, dialogs/popovers (`<dialog closedby>`, `:open`, `popover="hint"`), cross-document view transitions, `attr()`, `contrast-color()`, Navigation API, scoped custom element registries, scroll snap, `shape()`, WebTransport, JSPI for Wasm, `zoom`** (https://web.dev/blog/interop-2026, https://github.com/web-platform-tests/interop/blob/main/2026/README.md). Same-document view transitions reached **Baseline Newly available** via Interop 2025. Container queries, `:has()`, nesting, and popover are Baseline-mature.

> Blog posts claiming anchor positioning and scroll-driven animations are fully cross-browser stable are contradicted by their presence as 2026 Interop focus areas — **treat those as still needing fallbacks.**

**WebGPU**: Safari 26.0 shipped stable WebGPU in September 2025 (macOS Tahoe 26, iOS/iPadOS 26, visionOS 26); Firefox 147 (2026-01-13) enabled it on Windows and ARM64 macOS, with Linux/Android in progress; Chrome/Edge since 113. So WebGPU is effectively Baseline on desktop and iOS but **not on Android Firefox or Linux Firefox** (**partially UNVERIFIED**, https://www.webgpu.com/news/webgpu-hits-critical-mass-all-major-browsers/).

**WebAssembly**: W3C ratified **Wasm 3.0 in September 2025** (GC, Memory64). **WASI 0.3 / Preview 3** adds native async I/O via futures and streams; sources conflict on whether 0.3.0 actually shipped in Feb 2026 versus Preview 2 remaining the stable listing — **UNVERIFIED** (https://platform.uno/blog/the-state-of-webassembly-2025-2026/).

**PWA on iOS remains the platform's weakest link.** Install is still manual Add-to-Home-Screen — Safari does not implement `beforeinstallprompt`. Web Push requires the PWA to be home-screen installed (iOS 16.4+). Safari 18.4 added Declarative Web Push and Screen Wake Lock. iOS 26 defaults home-screen sites to open as web apps. **In the EU, Apple's DMA response removed standalone PWA behaviour — EU PWAs open as Safari tabs with no push** (**UNVERIFIED** on current EU status; verify before shipping to EU users: https://www.magicbell.com/blog/pwa-ios-limitations-safari-support-complete-guide).

**Hardware APIs matrix**: Web Serial — Chrome/Edge/Opera 89+ desktop, Chrome Android 148 beta, and **new in 2026: Firefox 151 Desktop shipped Web Serial**, enabled for normal users but **disabled by default under Firefox Enterprise Policies** (https://hacks.mozilla.org/2026/05/web-serial-support-in-firefox/). Safari: **not supported anywhere**, WebKit holds an opposed position on fingerprinting grounds. WebUSB and Web Bluetooth remain Chromium-only (https://developer.mozilla.org/en-US/docs/Web/API/Web_Serial_API).

## 4. AI in the developer workflow

**Adoption is near-universal; trust is not.** Stack Overflow 2025 (49,000+ responses, 177 countries): **84% use or plan to use AI tools, up from 76%**, but favourable sentiment fell from 70%+ to **60%**; only **3% highly trust** AI output accuracy while **46% actively distrust** it — and distrust rises with experience (10+ years: 2.6% high trust, 20.7% high distrust) (https://survey.stackoverflow.co/2025/ai). JetBrains 2025 (24,534 devs) reports 85% regular AI use and 62% using at least one assistant/agent/AI editor (https://blog.jetbrains.com/research/2025/10/state-of-developer-ecosystem-2025/).

**Agents are not yet mainstream.** Only **31% use agents regularly**; **38% have no adoption plans**. Among agent users: ChatGPT 82%, GitHub Copilot 68%, Gemini 47%, **Claude Code 41%**. Top frustration, cited by **66%**: solutions that are "almost right." **45%** say debugging AI code takes longer than writing it themselves. Deployment/monitoring is the least AI-delegated task (6% mostly-AI, 76% won't) (https://survey.stackoverflow.co/2025/ai).

**Market motion is extreme but poorly sourced.** Cursor/Anysphere reportedly went $100M ARR (Jan 2025) → $1B (Nov 2025) → $2B (Feb 2026) → ~$4B (Jun 2026); Claude Code past $2.5B annualized run-rate by Feb 2026; Copilot ~20M total users vs Cursor ~1M paying. JetBrains' Jan 2026 AI Pulse put at-work usage at Copilot 29%, Cursor 18%, Claude Code 18% (**all UNVERIFIED** — secondary sources only).

**MCP is now a governed industry standard, not a vendor protocol.** Anthropic donated MCP to the **Linux Foundation's Agentic AI Foundation (AAIF)**, formed December 2025, co-founded with Block (goose) and OpenAI (AGENTS.md), backed by Google, AWS, Microsoft, Cloudflare, Bloomberg (https://www.linuxfoundation.org/press/linux-foundation-announces-the-formation-of-the-agentic-ai-foundation, https://openai.com/index/agentic-ai-foundation/). Client-side it's in ChatGPT, Cursor, Gemini, Microsoft Copilot, VS Code; ecosystem counts of 5,800+/10,000+ public servers are **UNVERIFIED**. Angular's CLI now ships an MCP server — MCP has reached framework tooling.

### The skeptical evidence, which matters more than the marketing

- **METR RCT (July 2025)**: 16 experienced OSS maintainers, 246 tasks on repos averaging 22k+ stars and 1M+ LOC, randomized AI-allowed vs not (mostly Cursor Pro + Claude 3.5/3.7 Sonnet). Developers were **19% slower with AI**, having predicted 24% faster, and **still believed afterwards they'd been 20% faster** (https://metr.org/blog/2025-07-10-early-2025-ai-experienced-os-dev-study/, https://arxiv.org/abs/2507.09089).
- **METR's own follow-up (2026-02-24) cuts both ways and is essential context**: their late-2025 replication showed *potential speedup*, but METR says the data is "only very weak evidence" and they are **redesigning the methodology**. Developers now refuse to participate without AI even at $50/hr; **30–50% withheld tasks** they didn't want to do without AI; and time-tracking broke down because devs multitask while agents run (https://metr.org/blog/2026-02-24-uplift-update/). **Anyone citing "AI makes devs 19% slower" as settled 2026 fact is over-claiming — so is anyone citing the speedup.**
- **DORA 2025**: AI adoption now correlates *positively* with throughput (a reversal from 2024) but **also with increased delivery instability**, absent strong automated testing, mature version control, and fast feedback. AI is an amplifier of existing capability; **no measurable effect on friction or burnout** (https://cloud.google.com/blog/products/ai-machine-learning/announcing-the-2025-dora-report, https://redmonk.com/rstephens/2025/12/18/dora2025/).
- **Maintainability is measurably degrading.** GitClear's 2026 research: block duplication (5+ repeated meaningful lines) up 81% vs 2023 to a record high; within-commit copy/paste up from 9.4% (2022) to 15.7% (H1 2026); two-week code churn from a ~3.3% pre-AI baseline to 5.7% (2024), 7.1% (2025); **moved/refactored code collapsed from 21% (2022) to 3.8% YTD 2026** (https://www.gitclear.com/the_ai_code_quality_maintainability_gap, https://leaddev.com/ai/code-maintainability-plummets-in-the-ai-coding-era).
- **Security**: Veracode's 2025 GenAI Code Security Report — 80 curated tasks across 100+ LLMs — found models chose the insecure implementation **45% of the time**, concentrated in OWASP Top 10 categories; Java worst at ~72% failure; XSS only 12–13% secure (https://www.veracode.com/resources/analyst-reports/2025-genai-code-security-report/). The "2.74x more vulnerabilities than human code" figure is secondary and **UNVERIFIED**.
- **AI code review** is now a real category: ~$420M aggregate 2026 ARR, ~44% of teams using one on at least some PRs; **GitHub Copilot code review hit GA in March 2026**. Benchmarks disagree wildly on bug-catch rates (Greptile 82% vs CodeRabbit 44% vs Copilot 54% in one study; 36.1%/28.7%/24.6% in another), with Greptile trading recall for ~11 false positives per run vs CodeRabbit's 2 (**all UNVERIFIED**, vendor-adjacent).

**Honest synthesis**: AI clearly increases code *volume* and throughput and is now default-on for ~85% of developers. The evidence that it increases *net delivered value* is weak, self-reported, and contested; the evidence that it degrades duplication, refactoring, churn, and security posture is measured and consistent. If you handle confidential client data, the Veracode and GitClear findings are the operative ones: gate AI output with SAST, SCA, secret scanning, and mandatory review rather than trusting perceived speedup.

**Structural signal**: Octoverse 2025 found **TypeScript overtook Python and JavaScript as GitHub's most-used language** by monthly contributors in August 2025 — 2,636,006 monthly contributors, +66.6% YoY — attributed partly to typed languages catching LLM errors at compile time (one 2025 study found 94% of LLM compilation errors were type-check failures) and partly to frameworks scaffolding TS by default. Also: 180M+ developers, ~80% of new developers using Copilot in week one, and 1.1M+ public repos importing an LLM SDK (+178% YoY) (https://github.blog/news-insights/octoverse/octoverse-a-new-developer-joins-github-every-second-as-ai-leads-typescript-to-1/).

## 5. A pragmatic 2026 stack for a small team shipping a PWA + API

Optimized for boring reliability, fast CI, and auditability — not novelty.

- **Language/typecheck**: TypeScript **6.x in CI today**, with 7.0 (`tsgo`) run side-by-side for speed. Do **not** make 7.0 your only checker if you use Vue/Svelte/Astro/Angular templates or any tool touching the compiler API — wait for 7.1's API.
- **Frontend**: React 19.2 + Vite 8 (Rolldown) for an app-shell PWA; **Astro 6** if the product is content-led; SvelteKit if the team prefers it — all three are safe. Choose Next.js 16 only if you actually want RSC/Cache Components and Vercel-shaped deployment.
- **Build/lint/test**: Vite 8, **oxlint or Biome 2** (keep ESLint only for plugins you can't replace), Vitest + Playwright, `node --test` for pure-Node packages. pnpm.
- **Runtime/API**: Node 24 LTS with native type stripping (no build step for server TS), or Cloudflare Workers if you're already Cloudflare-shaped — Astro 6's workerd-in-dev and Cloudflare's Astro acquisition make that path notably smoother.
- **Platform features to use directly**: `:has()`, nesting, container queries, popover, same-document view transitions. **Feature-detect and provide fallbacks** for anchor positioning, scroll-driven animations, cross-document view transitions, and Navigation API — all still Interop 2026 focus areas.
- **PWA reality check**: assume manual Add-to-Home-Screen on iOS, no `beforeinstallprompt`, tighter storage quotas, push only when home-screen-installed, and verify EU standalone-PWA status before promising push to EU users.
- **Hardware access**: Chromium-first, Firefox 151+ viable for Web Serial only, Safari never. Plan a native or desktop fallback if hardware I/O is core.
- **AI guardrails (non-negotiable given §4)**: secret scanning + SAST + SCA in CI, branch protection, human review on every AI-authored PR, and periodic duplication/churn measurement.

**Repos worth studying, with licences** (from repo metadata; spot-check before adopting): `vitejs/vite` — MIT; `rolldown/rolldown` and `oxc-project/oxc` — MIT; `facebook/react` — MIT; `vercel/next.js` — MIT; `withastro/astro` — MIT; `sveltejs/svelte` and `sveltejs/kit` — MIT; `TanStack/router` — MIT; `angular/angular` — MIT; `vuejs/core` — MIT; `oven-sh/bun` — MIT (with JavaScriptCore under LGPL); `denoland/deno` — MIT; `biomejs/biome` — MIT or Apache-2.0; `bigskysoftware/htmx` — BSD 2-Clause; `alpinejs/alpine` — MIT; `phoenixframework/phoenix_live_view` — MIT; `modelcontextprotocol/*` (now under LF AAIF) — MIT; `web-platform-tests/interop` — BSD-3-Clause. **UNVERIFIED**: these were not re-fetched per-LICENSE-file in this pass — treat as a study shortlist, not legal clearance.

## Sources

- https://2025.stateofjs.com/en-US/libraries/meta-frameworks/ · https://survey.devographics.com/en-US/survey/state-of-js/2025
- https://2025.stateofcss.com/en-US/features/ · https://2025.stateofcss.com/en-US/usage/
- https://survey.stackoverflow.co/2025/ai · https://stackoverflow.blog/2025/12/29/developers-remain-willing-but-reluctant-to-use-ai-the-2025-developer-survey-results-are-here/
- https://blog.jetbrains.com/research/2025/10/state-of-developer-ecosystem-2025/ · https://devecosystem-2025.jetbrains.com/artificial-intelligence
- https://github.blog/news-insights/octoverse/octoverse-a-new-developer-joins-github-every-second-as-ai-leads-typescript-to-1/ · https://www.infoworld.com/article/4080454/typescript-rises-to-the-top-on-github.html
- https://react.dev/versions · https://react.dev/blog/2025/10/01/react-19-2
- https://nextjs.org/blog/next-16 · https://nextjs.org/blog/next-16-3-turbopack · https://nextjs.org/docs/app/guides/upgrading/version-16
- https://astro.build/blog/astro-6/ · https://www.cloudflare.com/press/press-releases/2026/cloudflare-acquires-astro-to-accelerate-the-future-of-high-performance-web-development/ · https://thenewstack.io/cloudflare-acquires-team-behind-open-source-framework-astro/
- https://svelte.dev/blog
- https://blog.angular.dev/announcing-angular-v21-57946c34f14b · https://www.angulararchitects.io/blog/whats-new-in-angular-21-signal-forms-zone-less-vitest-angular-aria-cli-with-mcp-server/
- https://vueschool.io/articles/news/vue-js-2025-in-review-and-a-peek-into-2026/
- https://tanstack.com/blog/announcing-tanstack-start-v1
- https://vite.dev/blog/announcing-vite8
- https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/ · https://devblogs.microsoft.com/typescript/typescript-native-port/ · https://visualstudiomagazine.com/articles/2026/06/22/typescript-7-0-rc-moves-microsofts-go-rewrite-into-the-mainline-compiler.aspx
- https://nodejs.org/api/typescript.html · https://versionlog.com/nodejs/26/
- https://bun.com/blog · https://bun.com/blog/bun-v1.3
- https://deno.com/blog
- https://www.pkgpulse.com/guides/npm-vs-yarn-vs-pnpm-2026 · https://www.pkgpulse.com/guides/biome-vs-eslint-vs-oxlint-2026 · https://www.pkgpulse.com/guides/htmx-vs-alpinejs-2026
- https://web.dev/blog/interop-2026 · https://github.com/web-platform-tests/interop/blob/main/2026/README.md · https://webkit.org/blog/17818/announcing-interop-2026/
- https://www.webgpu.com/news/webgpu-hits-critical-mass-all-major-browsers/
- https://platform.uno/blog/the-state-of-webassembly-2025-2026/
- https://www.magicbell.com/blog/pwa-ios-limitations-safari-support-complete-guide · https://www.mobiloud.com/blog/progressive-web-apps-ios
- https://hacks.mozilla.org/2026/05/web-serial-support-in-firefox/ · https://developer.mozilla.org/en-US/docs/Web/API/Web_Serial_API
- https://metr.org/blog/2025-07-10-early-2025-ai-experienced-os-dev-study/ · https://arxiv.org/abs/2507.09089 · https://metr.org/blog/2026-02-24-uplift-update/
- https://cloud.google.com/blog/products/ai-machine-learning/announcing-the-2025-dora-report · https://redmonk.com/rstephens/2025/12/18/dora2025/
- https://www.gitclear.com/the_ai_code_quality_maintainability_gap · https://leaddev.com/ai/code-maintainability-plummets-in-the-ai-coding-era
- https://www.veracode.com/resources/analyst-reports/2025-genai-code-security-report/
- https://www.linuxfoundation.org/press/linux-foundation-announces-the-formation-of-the-agentic-ai-foundation · https://openai.com/index/agentic-ai-foundation/ · https://workos.com/blog/everything-your-team-needs-to-know-about-mcp-in-2026

**Two claims to re-check before relying on them**: TanStack Start stable 1.0 (RC is the last primary-confirmed state) and the current EU standalone-PWA/push situation on iOS.
