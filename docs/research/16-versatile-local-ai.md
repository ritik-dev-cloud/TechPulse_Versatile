# Pinokio-class tooling: one-click local AI launchers and the "versatile repo" ecosystem

> Research brief · compiled 2026-07-29

Every licence in this brief was read from the GitHub REST API on 2026-07-29 (`license.spdx_id`, `archived`, `pushed_at`, `stargazers_count`), and where the API returned `NOASSERTION` or `null` I decoded the actual `LICENSE` blob and quote it. Star counts and push dates are same-day snapshots. Model-weight licences were read from the vendors' own licence files, not from summaries.

---

## 1. What Pinokio actually is

Pinokio bills itself as an "AI Browser" — an Electron desktop app that installs and launches AI applications locally from scripted install recipes. Repo: [pinokiocomputer/pinokio](https://github.com/pinokiocomputer/pinokio), **MIT**, JavaScript, 7,797 stars, last push 2026-07-22 (API, 2026-07-29). Homepage [pinokio.co](https://pinokio.co/) claims macOS/Windows/Linux and NVIDIA/AMD/Apple GPU support, and markets apps as "100% local".

The kernel is not the interesting part — the recipe format is. A Pinokio app is a git repo containing JSON (or JS) scripts that the kernel interprets. From the official docs source ([docs.pinokio.computer/api/shell.md](https://github.com/pinokiocomputer/docs.pinokio.computer/blob/main/api/shell.md)):

> "You can automatically run ANY command in the Pinokio browser, using the `shell` API."

`shell.run` takes `message` (a raw command string or a yargs-style object), `path`, and `env` (arbitrary environment variables injected into the shell). Isolation is by convention: scripts live under `~/pinokio/api`, binaries under `~/pinokio/bin`, and a `venv` attribute creates a per-app Python virtualenv (default Python 3.10, overridable via `venv_python`). The `fs` API writes arbitrary JSON/text/buffers to arbitrary paths ([fs.md](https://github.com/pinokiocomputer/docs.pinokio.computer/blob/main/api/fs.md)); the `net` API is a thin axios wrapper that does arbitrary HTTP to arbitrary hosts ([networking.md](https://github.com/pinokiocomputer/docs.pinokio.computer/blob/main/api/networking.md)). Recipes can also ship a `.js` file exporting an object that receives the `kernel` handle directly ([custom/quickstart.md](https://github.com/pinokiocomputer/docs.pinokio.computer/blob/main/custom/quickstart.md)) — i.e. arbitrary in-process Node execution.

**The honest security read.** Pinokio is a remote-code-execution engine with a friendly button — not a criticism of its authors, it is the stated feature. The venv gives *dependency* isolation, not *privilege* isolation: a recipe runs as your user, with your home directory, SSH keys, keychain, VPN routes and network. Nothing prevents a recipe from reading `~/Documents` and POSTing it somewhere.

Not hypothetical here. In June 2024 the `ComfyUI_LLMVISION` custom node was found exfiltrating browser passwords, credit-card data and browsing history to a Discord webhook, delivered via typosquatted fake `openai`/`anthropic` wheels running an encoded PowerShell stager ([Gigazine](https://gigazine.net/gsc_news/en/20240611-comfyui-llmvision-malware/), [404 Media](https://www.404media.co/hackers-target-ai-users-with-malicious-stable-diffusion-tool-on-github/)). Same threat model, same one-click delivery path.

Pinokio's mitigation is publisher verification — a script must be transferred into an official org before it appears on the Discover page. Judge how much that buys you from the org itself: **[pinokiofactory](https://github.com/pinokiofactory) has 101 repos, of which 95 carry `license.spdx_id = null`** (3 Apache-2.0, 2 MIT, 1 NOASSERTION; API-enumerated 2026-07-29). Curation is about provenance, not audit, and certainly not about licensing.

**Mitigation, given that you handle confidential MNC client data:** do not run Pinokio on the machine that holds client material. Use a separate physical box or a VM with no shared folders, a separate OS user account, no cloud-drive sync client signed in, and no SSH/API keys present. Read `install.js`/`torch.js` before you click — they are small JSON files and the `shell.run` messages are plain text. Treat a recipe update like a dependency bump, not a refresh. Given Communique's compliance posture, a Pinokio box should be considered untrusted infrastructure and kept off any segment carrying client data.

---

## 2. The alternatives, licence-verified

All rows: GitHub API, 2026-07-29. Canonical path shown where the requested path redirected.

### Local LLM runtimes and UIs

| Tool | Repo | SPDX (API) | Lang | Stars | Last push | When to choose |
|---|---|---|---|---|---|---|
| Ollama | ollama/ollama | MIT | Go | 177,186 | 2026-07-29 | Default. One binary, model registry, OpenAI-compatible API. |
| llama.cpp | ggml-org/llama.cpp | MIT | C++ | 121,950 | 2026-07-29 | Control over quantisation/offload; what Ollama sits on. |
| LM Studio | *(app closed; SDK lmstudio-js MIT, 1,733★)* | **proprietary** | — | — | 2026-07-28 | Best model-discovery GUI. Not redistributable. |
| Jan | janhq/jan *(was menloresearch/jan)* | NOASSERTION → **Apache-2.0** | TS | 43,752 | 2026-07-29 | Open substitute for LM Studio. |
| GPT4All | nomic-ai/gpt4all | MIT | C++ | 77,400 | **2025-05-27** | Dormant ~14 months. Prefer Jan. |
| LocalAI | mudler/LocalAI | MIT | Go | 47,983 | 2026-07-29 | One OpenAI-compatible API for text+image+audio. |
| vLLM | vllm-project/vllm | Apache-2.0 | Python | 87,557 | 2026-07-29 | Production serving. Tier-3 default. |
| SGLang | sgl-project/sglang | Apache-2.0 | Python | 30,915 | 2026-07-29 | vLLM rival; strong on structured output. |
| TGI | huggingface/text-generation-inference | Apache-2.0 | Python | 10,884 | **ARCHIVED** 2026-03-21 | Archived. Do not adopt. |
| text-generation-webui | oobabooga/textgen | **AGPL-3.0** | Python | 47,504 | 2026-06-02 | Power-user experimentation. AGPL — see §3. |
| Open WebUI | open-webui/open-webui | NOASSERTION → **custom** | Python | 147,197 | 2026-07-27 | Best chat frontend. Branding clause — see §3. |
| AnythingLLM | Mintplex-Labs/anything-llm | MIT | JS | 64,046 | 2026-07-29 | Genuinely-MIT RAG over documents. |
| LibreChat | danny-avila/LibreChat | MIT | TS | 41,409 | 2026-07-29 | Multi-user chat with real auth. MIT, no clauses. |
| Msty | *(only docs repos public, unlicensed)* | **proprietary** | — | — | — | CloudStack, LLC. Closed. |
| koboldcpp | LostRuins/koboldcpp | **AGPL-3.0** | C++ | 11,286 | 2026-07-27 | Single-file llama.cpp fork. |
| llamafile | mozilla-ai/llamafile | NOASSERTION → **Apache-2.0** | C++ | 25,462 | 2026-07-27 | Model as one executable. Good for demos. |
| ExLlamaV2 | turboderp-org/exllamav2 | MIT | Python | 4,596 | 2026-03-04 | Fastest consumer-GPU quantised inference. |

### Image, video, audio

| Tool | Repo | SPDX (API) | Stars | Last push | Note |
|---|---|---|---|---|---|
| ComfyUI | Comfy-Org/ComfyUI | **GPL-3.0** | 122,715 | 2026-07-29 | Node graph; the serious choice. Repo moved to Comfy-Org. |
| ComfyUI-Manager | Comfy-Org/ComfyUI-Manager | GPL-3.0 | 15,549 | 2026-07-29 | The custom-node installer — and the §1 malware vector. |
| A1111 webui | AUTOMATIC1111/stable-diffusion-webui | **AGPL-3.0** | 164,310 | 2026-03-02 | Slowing (5 months). |
| Forge | lllyasviel/stable-diffusion-webui-forge | **AGPL-3.0** | 12,893 | **2025-07-31** | Dormant ~12 months. |
| SwarmUI | mcmonkeyprojects/SwarmUI | MIT | 4,383 | 2026-07-25 | ComfyUI backend, friendly frontend. Active, MIT. |
| InvokeAI | invoke-ai/InvokeAI | Apache-2.0 | 27,674 | 2026-07-29 | Most product-like; best for a non-technical operator. |
| Fooocus | lllyasviel/Fooocus | GPL-3.0 | 51,514 | 2025-12-01 | Zero-config image gen. Quiet 8 months. |
| StabilityMatrix | LykosAI/StabilityMatrix | **AGPL-3.0** | 8,567 | 2026-07-26 | Pinokio's closest peer for image tools. |
| kohya_ss | bmaltais/kohya_ss | Apache-2.0 | 12,507 | 2026-07-13 | LoRA/fine-tune training GUI. |
| ai-toolkit | ostris/ai-toolkit | MIT | 11,486 | 2026-07-28 | Modern FLUX/SDXL LoRA trainer. |
| Whisper | openai/whisper | MIT | 106,006 | 2026-07-28 | Reference ASR. Weights MIT too — rare and valuable. |
| whisper.cpp | ggml-org/whisper.cpp | MIT | 52,403 | 2026-07-29 | CPU transcription that works on a laptop. |
| faster-whisper | SYSTRAN/faster-whisper | MIT | 24,608 | 2025-11-19 | Realistic pick for near-real-time captions. |
| WhisperX | m-bain/whisperX | BSD-2-Clause | 23,314 | 2026-07-13 | Word-level timestamps + diarisation. |
| Coqui TTS | coqui-ai/TTS | MPL-2.0 | 45,834 | **2024-08-16** | Abandoned ~2 years. XTTS *weights* are not MPL — §3. |
| RVC | RVC-Project/…-WebUI | MIT | 36,794 | 2026-07-23 | Code MIT; the models are the problem — §3. |
| AudioCraft | facebookresearch/audiocraft | MIT | 23,526 | 2026-03-03 | **Code MIT, weights CC-BY-NC-4.0.** The canonical split. |
| fish-speech | fishaudio/fish-speech | NOASSERTION → **Fish Audio Research Licence** | 31,506 | 2026-07-26 | Non-commercial. Avoid for client work. |
| OpenVoice | myshell-ai/OpenVoice | MIT | 37,045 | 2025-04-19 | Voice cloning; consent risk regardless of licence. |

### Agent and workflow platforms

| Tool | Repo | SPDX (API) | Stars | Last push | Note |
|---|---|---|---|---|---|
| n8n | n8n-io/n8n | NOASSERTION → **Sustainable Use License v1.0** | 198,517 | 2026-07-29 | **NOT OSI.** See §3. |
| Flowise | FlowiseAI/Flowise | NOASSERTION → Apache-2.0 core + commercial `enterprise/` | 55,011 | 2026-07-29 | Core is Apache-2.0; enterprise dir is not. |
| Langflow | langflow-ai/langflow | **MIT** | 152,563 | 2026-07-29 | Cleanest licence of the visual builders. |
| Dify | langgenius/dify | NOASSERTION → **modified Apache-2.0** | 150,686 | 2026-07-29 | Multi-tenant + branding restrictions. See §3. |
| AutoGen | microsoft/autogen | CC-BY-4.0 *(but `LICENSE-CODE` = MIT)* | 60,076 | 2026-04-15 | API misleads: `LICENSE` is CC-BY-4.0 for content, **code is MIT**. |
| CrewAI | crewAIInc/crewAI | MIT | 56,315 | 2026-07-29 | Role-based multi-agent, Python-native. |
| OpenHands | OpenHands/OpenHands | MIT | 82,479 | 2026-07-29 | Autonomous SWE agent. Sandbox it. |
| Cline | cline/cline | Apache-2.0 | 65,169 | 2026-07-29 | VS Code agent; BYO key. |
| goose | aaif-goose/goose *(was block/goose)* | Apache-2.0 | 51,890 | 2026-07-29 | Moved from Block to the Linux Foundation's Agentic AI Foundation, Apr 2026 ([goose blog](https://goose-docs.ai/blog/2026/04/07/goose-moves-to-aaif/), [LF press](https://www.linuxfoundation.org/press/linux-foundation-announces-the-formation-of-the-agentic-ai-foundation)). Neutral governance is a procurement plus. |
| Activepieces | activepieces/activepieces | NOASSERTION → **MIT Expat** core + `packages/ee` | 23,462 | 2026-07-29 | The genuinely-open n8n alternative. |
| Windmill | windmill-labs/windmill | NOASSERTION → **AGPLv3** + Apache + proprietary EE | 17,353 | 2026-07-29 | Script-first; AGPL by default. |

### App-in-a-box / self-hosted platforms

| Tool | Repo | SPDX (API) | Stars | Last push | Note |
|---|---|---|---|---|---|
| Coolify | coollabsio/coolify | **Apache-2.0** | 59,789 | 2026-07-28 | Best licence/capability trade in this row. Recommended. |
| Dokploy | Dokploy/dokploy | NOASSERTION → Apache-2.0 core + `/proprietary` | 36,161 | 2026-07-28 | Lighter Coolify. |
| CasaOS | IceWhaleTech/CasaOS | Apache-2.0 | 36,897 | **2025-08-06** | Quiet ~12 months. |
| Umbrel | getumbrel/umbrel | NOASSERTION → **PolyForm Noncommercial 1.0.0** | 11,699 | 2026-07-10 | **Non-commercial. Cannot be used for client work.** |
| Runtipi | runtipi/runtipi | GPL-3.0 | 9,589 | 2026-07-22 | Copyleft but OSI. |
| YunoHost | YunoHost/yunohost | AGPL-3.0 | 2,957 | 2026-07-26 | Mature, Debian-based, AGPL. |
| Docker Compose | *(Compose itself Apache-2.0)* | — | — | — | Honestly the right answer for you. No platform licence to reason about. |

---

## 3. The licence minefield

This category is unusually bad, for three reasons: vendors use source-available licences that read like open source, the GitHub API's `spdx_id` is frequently wrong in both directions, and **model weights are licensed separately from code**.

**Tools people wrongly assume are OSI open source:**

- **n8n — Sustainable Use License v1.0.** The operative text: *"You may use or modify the software only for your own internal business purposes or for non-commercial or personal use. You may distribute the software or provide it to others only if you do so free of charge for non-commercial purposes."* Running n8n inside Communique to automate your own event ops is fine. Standing up n8n *for a client*, or as part of a paid deliverable, is not. Files with `.ee.` in the name need a paid Enterprise licence, and content on non-`master` branches is **not licensed at all**.
- **Umbrel — PolyForm Noncommercial 1.0.0.** Straightforwardly excluded from commercial use.
- **fish-speech — Fish Audio Research License** (updated 2026-03-07): *"intended to allow research and non-commercial"* use.
- **LM Studio — proprietary.** Element Labs, Inc. grants use "for personal and / or internal business purposes" only, forbids reverse engineering, modification and redistribution, and states the source code constitutes "valuable trade secrets" ([app terms](https://lmstudio.ai/app-terms)). Commercial *use* at work became free on 2025-07-08 ([announcement](https://lmstudio.ai/blog/free-for-work)) — but free-to-use is not open source, and you cannot ship it to a client.
- **Msty — proprietary**, CloudStack, LLC; only docs repos are public and those are unlicensed.
- **Dify — modified Apache-2.0** with a multi-tenant prohibition and a branding requirement. Fine internally, restricted as a hosted service.
- **Open WebUI — bespoke licence.** BSD-3-shaped, but clause 4 forbids altering or removing Open WebUI branding above **50 end users in a rolling 30-day period** without a paid enterprise licence. White-labelling it for a client event portal at any real scale is a licence breach.
- **AGPL-3.0 tools** — A1111, Forge, text-generation-webui, koboldcpp, StabilityMatrix, Windmill, YunoHost. These *are* OSI open source, but the §13 network clause means if you expose a modified version over a network to users, you must offer those users the corresponding source. For an internally-modified attendee-facing portal, that is a live obligation, not a footnote.
- **`spdx_id = null`** — 95 of 101 pinokiofactory recipe repos. See §6.

**Code vs weights — the part that bites.** A permissive repo routinely ships or downloads a non-commercial model:

- **AudioCraft** states it outright: *"The code in this repository is released under the MIT license… The models weights in this repository are released under the CC-BY-NC 4.0 license"* — two files, `LICENSE` and `LICENSE_weights`. MusicGen output is not usable in a paid client deliverable.
- **FLUX** — repo [black-forest-labs/flux](https://github.com/black-forest-labs/flux) is Apache-2.0, but the weights split: **FLUX.1 [schnell] is Apache-2.0**; **FLUX.1 [dev] is the "FLUX.1 [dev] Non-Commercial License v1.1.1"**, granting rights *"solely for your Non-Commercial Purposes"*, where non-commercial explicitly excludes *"(a) revenue-generating activity, (b) in direct interactions with or that has impact on end users"*. The trap: §2(d) says *"You may use Output for any purpose (including for commercial purposes)"* — so people conclude dev is commercially safe. It is not. **Owning the output does not license the act of running the model.** Generating client event artwork on FLUX.1 [dev] requires a paid BFL licence; use **schnell** if you need Apache-2.0 clean.
- **Stable Diffusion** — code [Stability-AI/generative-models](https://github.com/Stability-AI/generative-models) is MIT, weights are not. SD1.5/SDXL are CreativeML OpenRAIL(-M/++-M): permissive on IP but with use-based behavioural restrictions, which is exactly why they fall outside the OSI definition ([RAIL FAQ](https://www.licenses.ai/faq-2)). SD3.5 and friends moved to the **Stability AI Community License**: free including commercially *unless* you or your organisation exceed **USD $1M annual revenue, "regardless of the source of that revenue"* ([stability.ai/license](https://stability.ai/license)) — at which point an Enterprise licence is required. For a Communique-scale entity, assume you are over the line.
- **Llama** — [meta-llama/llama-models](https://github.com/meta-llama/llama-models) reports `NOASSERTION` because `LICENSE` is a pointer; the real terms are per-model Community Licences. Llama 3.1's requires you to display **"Built with Llama"**, prefix any derivative model's name with **"Llama"**, incorporates the Acceptable Use Policy *by reference*, and adds commercial terms above **700 million MAU**. Not OSI; workable for you, but the attribution duty is real in a client deliverable.
- **XTTS-v2** — code is MPL-2.0, weights are under the **Coqui Public Model License**, a bespoke non-OSI model licence. Coqui shut down; the licence did not lapse with it.
- **RVC / voice cloning** — code MIT, but community voice models are overwhelmingly trained on real people's voices without consent. The binding constraint here is not copyright, it is personality/publicity rights and India's DPDP Act treatment of biometric-adjacent personal data. Cloning an executive's voice for an event needs written consent regardless of what any repo licence says.

**Also worth knowing:** the API's `spdx_id` misled in both directions in this research. `NOASSERTION` was actually clean Apache-2.0 for Jan and llamafile, and clean MIT for Real-Time-Voice-Cloning; conversely AutoGen reports `CC-BY-4.0` when its code is MIT via `LICENSE-CODE`. Always decode the blob.

---

## 4. Very low to ultra high: the capability ladder

**Tier 0 — dabbling, laptop, no GPU.** Ollama + Open WebUI (or Jan, if you want a single app). Models: `gemma3:270m` ≈ 292 MB, `llama3.2:1b` ≈ 1.3 GB, `llama3.2:3b` ≈ 2.0 GB, `mistral:7b` ≈ 4.4 GB (sizes from [ollama.com/library](https://ollama.com/library), 2026-07-29). Transcription: whisper.cpp with `tiny`/`base` — officially ~1 GB and ~7–10× realtime relative to `large` ([Whisper README table](https://github.com/openai/whisper/blob/main/README.md)). **Floor:** 8 GB RAM (16 GB to be pleasant), ~30 GB disk. **Genuinely not achievable:** usable-speed inference above ~7B; SDXL image generation (ComfyUI runs with `--cpu` but it is minutes per image); any video generation; any fine-tuning.

**Tier 1 — serious hobby, consumer GPU.** RTX 3060 12 GB or 4060 Ti 16 GB. ComfyUI (its README claims *"smart memory management: can automatically run large models on GPUs with as low as 1GB vram with smart offloading"* — true but slow; 12 GB is the real comfort floor for SDXL/FLUX), plus SwarmUI for a sane frontend, plus kohya_ss or ai-toolkit for LoRA training. Whisper `large` needs ~10 GB VRAM per the official table; `faster-whisper` gets it into 12 GB with headroom and is what you would use for near-live captions. **Floor:** 12 GB VRAM, 32 GB RAM, **1 TB NVMe** — this is where people underestimate: an SDXL checkpoint is ~6.5 GB, FLUX dev ~24 GB, and a working library of checkpoints/LoRAs/VAEs/upscalers passes 500 GB fast. **Not achievable:** full fine-tunes of large models, concurrent multi-user serving, long-form video.

**Tier 2 — small-team production.** vLLM or SGLang (both Apache-2.0, no licence friction) on a single L4/A10G 24 GB or L40S 48 GB, fronted by LibreChat (MIT) for multi-user auth, orchestrated with plain Docker Compose or Coolify (Apache-2.0). Use Activepieces or Langflow rather than n8n if any of it touches a client engagement. **Floor:** 24 GB VRAM, 64 GB RAM, 2 TB. **Not achievable:** 70B-class at low latency on one card; any real SLA without a second node.

**Tier 3 — enterprise.** vLLM on multi-GPU H100/H200 with tensor parallelism, on Kubernetes, with real observability and autoscaling. This is where your day job overlaps: the same reliability thinking behind a live-stream — n+1 encode paths, health-checked failover, capacity headroom for a spike at keynote start — applies to inference capacity for a live captioning or Q&A-summarisation service. A single-node Ollama box is a single point of failure and has no place on a show floor. **Not achievable:** avoiding the licence audit. At this tier, weights licensing is procurement's problem and needs answering before deployment, not after.

**CPU-only viability, plainly:** LLM chat at 1–3B, yes. Whisper transcription (not real-time), yes. Image generation, technically yes and practically no. Video, no.

---

## 5. Curated collections worth mining

Copying from a curated list carries the list's licence, so this matters if you republish internally.

| List | Repo | SPDX (API) | Stars | Reuse |
|---|---|---|---|---|
| awesome-selfhosted | awesome-selfhosted/awesome-selfhosted | NOASSERTION → **CC-BY-SA-3.0** | 309,017 | **Share-alike.** Attribute, and a derived list must stay CC-BY-SA. |
| Awesome-LLM | Hannibal046/Awesome-LLM | **CC0-1.0** | 27,205 | Public domain. Copy freely. Last push 2025-07-31. |
| awesome-mcp-servers | punkpeye/awesome-mcp-servers | MIT | 91,532 | Free with attribution. Very active. |
| awesome-generative-ai | steven2358/awesome-generative-ai | **CC0-1.0** | 12,399 | Public domain. |
| awesome-ai-tools | mahseema/awesome-ai-tools | MIT | 5,802 | Free with attribution. |
| prompts.chat *(was awesome-chatgpt-prompts)* | f/prompts.chat | NOASSERTION → **MIT (code) + CC0-1.0 (prompts)** | 166,501 | Prompt text is CC0. Dual-licensed — check which part you took. |
| awesome-comfyui | ComfyUI-Workflow/awesome-comfyui | **GPL-3.0** | 726 | Odd choice for a list; treat as copyleft. `idosal/awesome-comfyui` **404s** — no canonical list exists. |
| ComfyUI_examples | comfyanonymous/ComfyUI_examples | NOASSERTION → ISC-like permissive grant | 4,415 | Workflows explicitly free to use "with or without fee". |

---

## 6. Final table, sorted by licence risk

| Tool | Repo | SPDX (API-verified) | Truly OSS? | Weights licensed separately? | Tier | Safe for paid client work? |
|---|---|---|---|---|---|---|
| Umbrel | getumbrel/umbrel | PolyForm-Noncommercial-1.0.0 | **No** | n/a | 2 | **No — non-commercial** |
| fish-speech | fishaudio/fish-speech | Fish Audio Research Licence | **No** | Yes, same licence | 1 | **No — non-commercial** |
| AudioCraft | facebookresearch/audiocraft | MIT (code) | Code yes | **Yes — CC-BY-NC-4.0** | 1 | **No — NC weights** |
| n8n | n8n-io/n8n | Sustainable Use License 1.0 | **No** | n/a | 2 | **Internal only** |
| LM Studio | *(closed)* | Proprietary | **No** | n/a | 0–1 | Internal use only; no redistribution |
| Msty | *(closed)* | Proprietary | **No** | n/a | 0 | Internal use only |
| XTTS-v2 / Coqui | coqui-ai/TTS | MPL-2.0 (code) | Code yes | **Yes — CPML** | 1 | **No — NC weights**; also abandoned |
| RVC | RVC-Project/…-WebUI | MIT (code) | Code yes | **Yes — models unlicensed/consent risk** | 1 | **No, without written consent** |
| FLUX | black-forest-labs/flux | Apache-2.0 (code) | Code yes | **Yes — dev = NC v1.1.1; schnell = Apache-2.0** | 1 | **schnell yes / dev no** |
| Stable Diffusion | Stability-AI/generative-models | MIT (code) | Code yes | **Yes — OpenRAIL / Community $1M** | 1 | Assume Enterprise licence needed |
| Llama models | meta-llama/llama-models | NOASSERTION → Community Licence | **No** | Yes, per model | 0–3 | Yes, with "Built with Llama" + AUP |
| Open WebUI | open-webui/open-webui | Custom (BSD-3 + branding) | **No** | n/a | 0–2 | Yes if branding kept, or ≤50 users |
| Dify | langgenius/dify | Modified Apache-2.0 | **No** | n/a | 2 | Internal yes; hosted-for-client no |
| Flowise | FlowiseAI/Flowise | Apache-2.0 + commercial dir | Core yes | n/a | 2 | Core yes |
| Windmill | windmill-labs/windmill | AGPL-3.0 + proprietary EE | Yes (AGPL) | n/a | 2 | Yes, with AGPL §13 duty |
| A1111 / Forge / textgen / koboldcpp / StabilityMatrix | *various* | AGPL-3.0 | Yes | Yes (models) | 1 | Yes, with AGPL §13 duty |
| ComfyUI (+Manager) | Comfy-Org/ComfyUI | GPL-3.0 | Yes | **Yes** | 1–2 | Yes; weights are the constraint |
| Runtipi | runtipi/runtipi | GPL-3.0 | Yes | n/a | 2 | Yes |
| YunoHost | YunoHost/yunohost | AGPL-3.0 | Yes | n/a | 2 | Yes, with §13 duty |
| **Pinokio** | pinokiocomputer/pinokio | **MIT** | Yes | Recipes: 95/101 null | 0–1 | Kernel yes; **recipes no** |
| Whisper | openai/whisper | MIT | Yes | **No — weights MIT too** | 0–3 | **Yes, cleanest in the brief** |
| Ollama · llama.cpp · ExLlamaV2 | ollama, ggml-org, turboderp-org | MIT | Yes | Yes (models) | 0–3 | **Yes** |
| vLLM · SGLang | vllm-project, sgl-project | Apache-2.0 | Yes | Yes (models) | 2–3 | **Yes** |
| Jan · llamafile | janhq, mozilla-ai | Apache-2.0 | Yes | Yes (models) | 0–1 | **Yes** |
| LibreChat · AnythingLLM · LocalAI | danny-avila, Mintplex-Labs, mudler | MIT | Yes | LocalAI: yes | 1–2 | **Yes** |
| whisper.cpp · faster-whisper | ggml-org, SYSTRAN | MIT | Yes | No | 0–2 | **Yes** |
| WhisperX | m-bain/whisperX | BSD-2-Clause | Yes | Diarisation models gated | 1–2 | Mostly yes |
| Langflow · CrewAI | langflow-ai, crewAIInc | MIT | Yes | n/a | 2 | **Yes** |
| Activepieces | activepieces/activepieces | MIT Expat + ee dir | Core yes | n/a | 2 | **Yes** (use instead of n8n) |
| Coolify | coollabsio/coolify | Apache-2.0 | Yes | n/a | 2 | **Yes** |
| Dokploy | Dokploy/dokploy | Apache-2.0 + proprietary dir | Core yes | n/a | 2 | **Yes** |
| CasaOS | IceWhaleTech/CasaOS | Apache-2.0 | Yes | n/a | 1 | Yes, but stale |
| InvokeAI · SwarmUI | invoke-ai, mcmonkeyprojects | Apache-2.0 / MIT | Yes | **Yes** | 1 | Yes; weights are the constraint |
| kohya_ss · ai-toolkit | bmaltais, ostris | Apache-2.0 / MIT | Yes | **Yes** (base model) | 1 | Yes; base-model licence governs |
| goose · Cline | aaif-goose, cline | Apache-2.0 | Yes | n/a | 1–2 | **Yes** (goose is LF-governed) |
| OpenHands | OpenHands/OpenHands | MIT | Yes | n/a | 1–2 | Yes; sandbox it |
| AutoGen | microsoft/autogen | CC-BY-4.0 *(code MIT)* | Code yes | n/a | 2 | **Yes** (code is MIT) |
| GPT4All | nomic-ai/gpt4all | MIT | Yes | Yes | 0 | Yes, but dormant |
| TGI | huggingface/text-generation-inference | Apache-2.0, **ARCHIVED** | Yes | Yes | 2 | Legally yes; **don't adopt** |

### `spdx_id = null` — all rights reserved, cannot legally be reused

Under US and Indian copyright law, absence of a licence means **no** rights are granted. You may look; you may not copy, modify, redistribute or build on these.

- **95 of the 101 [pinokiofactory](https://github.com/pinokiofactory) recipe repos** — including the most-used ones: `cogstudio` (391★), `RMBG-2-Studio` (281★), `flux-webui` (190★), `e2-f5-tts` (80★), `bolt` (58★), `wan` (39★), `comfy` (30★), `Ultimate-TTS-Studio` (28★), `openaudio` (27★), `Hunyuan3d-2-lowvram` (23★), `MFLUX-WEBUI` (23★), `Frame-Pack` (22★).
- `pinokiocomputer/docs.pinokio.computer` and `pinokiocomputer/program.pinokio.computer` — the documentation itself.
- `pinokiofactory/factory` — null licence, 0 stars, last push 2024-08-27; appears to be an inactive placeholder, not the recipe index.
- Msty's public repos (`cloudstack-llc/msty-docs`, `msty-app-i18n`, `msty-studio-docs`) and `lucianosb/awesome-comfyui`.

The practical consequence: **the Pinokio kernel is MIT and safe; the ecosystem that makes Pinokio useful is legally unusable in anything you deliver or bill for.** Use it as a learning and prototyping sandbox on an isolated machine. For anything client-facing, reimplement on the Apache-2.0/MIT column of the table above.

---

## Recommended feeds (each fetched and verified 2026-07-29)

| Feed | URL | Status | Items |
|---|---|---|---|
| Pinokio releases | `https://github.com/pinokiocomputer/pinokio/releases.atom` | 200 atom+xml | 10 entries |
| Ollama releases | `https://github.com/ollama/ollama/releases.atom` | 200 atom+xml | 10 entries |
| ComfyUI releases | `https://github.com/Comfy-Org/ComfyUI/releases.atom` | 200 atom+xml | 10 entries |
| llama.cpp releases | `https://github.com/ggml-org/llama.cpp/releases.atom` | 200 atom+xml | 10 entries |
| vLLM releases | `https://github.com/vllm-project/vllm/releases.atom` | 200 atom+xml | 10 entries |
| Open WebUI releases | `https://github.com/open-webui/open-webui/releases.atom` | 200 atom+xml | 10 entries |
| n8n releases | `https://github.com/n8n-io/n8n/releases.atom` | 200 atom+xml | 10 entries |
| Hugging Face blog | `https://huggingface.co/blog/feed.xml` | 200 rss+xml | 833 items |
| ComfyUI newsletter | `https://blog.comfy.org/feed` | 200 xml | 20 items |
| r/LocalLLaMA | `https://www.reddit.com/r/LocalLLaMA/.rss` | 200 atom+xml | 25 entries |
| Simon Willison | `https://simonwillison.net/atom/everything/` | 200 xml | 30 entries |
| n8n blog | `https://blog.n8n.io/rss/` | 200 rss+xml | 15 items |

`https://blog.comfy.org/rss.xml` returns **404** — use `/feed`.

## Integrity note

- No fetched page attempted to issue me instructions. Two page-summarisation passes (stability.ai/license, the ComfyUI README) returned appended commentary about Communique's services that was **not present in the source documents**; it was a summariser artefact and I discarded it rather than treating it as page content.
- `docs.pinokio.computer` and `program.pinokio.computer` **do not resolve via DNS** from this environment. I read the documentation from its GitHub source repos instead and cite those, not the website.
- `huggingface.co/black-forest-labs/FLUX.1-dev` and `FLUX.1-schnell` are **gated (HTTP 401)**. I therefore quote the licence texts from `black-forest-labs/flux/model_licenses/` on GitHub, which are ungated and authoritative.
- `idosal/awesome-comfyui` and `SYSTRAN/faster-whisper-server` returned **404** — treated as non-existent rather than assumed.
- Ollama's README no longer carries a RAM-requirement table; the Tier-0 size figures come from `ollama.com/library` model pages, which are vendor-published but scraped rather than an API, so treat them as approximate.
- **Excluded by scope:** searches in this space surface repos distributing cracked commercial AI software and leaked/unlawfully redistributed model checkpoints. None are catalogued here — those create actual legal exposure rather than licence ambiguity.
- Anything not traceable above is not asserted. In particular I make **no claim** about Pinokio's precise disk/GPU minimums: neither pinokio.co nor the repo README publishes them, so that figure is **UNVERIFIED** and per-recipe in practice.

## Sources

- Pinokio: [pinokio.co](https://pinokio.co/) · [pinokiocomputer/pinokio](https://github.com/pinokiocomputer/pinokio) · [shell API](https://github.com/pinokiocomputer/docs.pinokio.computer/blob/main/api/shell.md) · [fs API](https://github.com/pinokiocomputer/docs.pinokio.computer/blob/main/api/fs.md) · [net API](https://github.com/pinokiocomputer/docs.pinokio.computer/blob/main/api/networking.md) · [custom scripts](https://github.com/pinokiocomputer/docs.pinokio.computer/blob/main/custom/quickstart.md) · [pinokiofactory org](https://github.com/pinokiofactory)
- Licence metadata: GitHub REST API `GET /repos/{owner}/{repo}` and `GET /repos/{owner}/{repo}/license`, all queried 2026-07-29
- Supply-chain incident: [Gigazine on ComfyUI_LLMVISION](https://gigazine.net/gsc_news/en/20240611-comfyui-llmvision-malware/) · [404 Media](https://www.404media.co/hackers-target-ai-users-with-malicious-stable-diffusion-tool-on-github/)
- Model weights: [FLUX.1 dev Non-Commercial v1.1.1](https://github.com/black-forest-labs/flux/blob/main/model_licenses/LICENSE-FLUX1-dev) · [FLUX.1 schnell Apache-2.0](https://github.com/black-forest-labs/flux/blob/main/model_licenses/LICENSE-FLUX1-schnell) · [Stability AI Community License](https://stability.ai/license) · [RAIL FAQ](https://www.licenses.ai/faq-2) · [Llama 3.1 Community License](https://github.com/meta-llama/llama-models/blob/main/models/llama3_1/LICENSE) · [AudioCraft README licence section](https://github.com/facebookresearch/audiocraft/blob/main/README.md) · [XTTS-v2 model card](https://huggingface.co/coqui/XTTS-v2)
- Proprietary tools: [LM Studio app terms](https://lmstudio.ai/app-terms) · [LM Studio "free for work", 2025-07-08](https://lmstudio.ai/blog/free-for-work) · [msty.ai](https://msty.ai/)
- Hardware figures: [Whisper README VRAM table](https://github.com/openai/whisper/blob/main/README.md) · [ComfyUI README memory management](https://github.com/comfyanonymous/ComfyUI/blob/master/README.md) · [ollama.com/library](https://ollama.com/library)
- Governance: [goose moves to AAIF, 2026-04-07](https://goose-docs.ai/blog/2026/04/07/goose-moves-to-aaif/) · [Linux Foundation AAIF announcement](https://www.linuxfoundation.org/press/linux-foundation-announces-the-formation-of-the-agentic-ai-foundation)
