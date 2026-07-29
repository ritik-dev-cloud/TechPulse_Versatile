# DevOps / Platform Engineering: State of the Tooling

> Research brief · compiled 2026-07-29 · licence, star and archive data verified against the GitHub REST API on that date.
> Claims sourced only to SEO/aggregator blogs are flagged **UNVERIFIED** — that category was unusually dominant in search results for CI/CD and service-mesh market share, so treat those numbers as directional.

## 1. New entrants (~2024–2026) with real traction, and what they displace

**Kubernetes node lifecycle.** Karpenter is the clearest displacement story of the period: Datadog telemetry shows Karpenter-provisioned nodes up 22% over two years while Cluster Autoscaler-provisioned nodes fell 17% (https://www.datadoghq.com/state-of-containers-and-serverless/). AWS donated the vendor-neutral core to Kubernetes SIG Autoscaling and made it the default in EKS Auto Mode; an Azure provider is production-ready, GCP is community WIP (**UNVERIFIED** — multi-cloud provider status sourced to https://scaleops.com/blog/karpenter-vs-cluster-autoscaler/). Replaces: cluster-autoscaler, managed node groups, hand-tuned instance-type lists.

**Ingress → Gateway API. This is the single most consequential forced migration in the ecosystem right now.** The Kubernetes Steering and Security Response Committees announced the retirement of `ingress-nginx` in March 2026, citing that a controller used by ~50% of cloud-native environments (Datadog data, cited by the committees) was maintained by "one or two people working in their free time," with technical debt that "cannot be resolved" (https://www.kubernetes.io/blog/2026/01/29/ingress-nginx-statement/). The Ingress API itself remains GA but feature-frozen; development moved to Gateway API. Kubernetes shipped `ingress2gateway` 1.0 as a migration assistant (https://kubernetes.io/blog/2026/03/20/ingress2gateway-1-0-release). The committees explicitly warn: "None of the available alternatives are direct drop-in replacements." Gateway API v1.4 is the designated successor. If you run Kubernetes and haven't audited for ingress-nginx, that is the highest-priority action item in this brief.

**Networking / mesh.** Cilium (eBPF CNI, graduated CNCF Oct 2023) is now the default CNI on GKE Dataplane V2, EKS-A and AKS options. Istio's ambient mode (sidecar-less, ztunnel-per-node) is the incumbent's answer; a prediction that >50% of new Istio installs use ambient by end-2026 is **UNVERIFIED** (https://lucaberton.com/blog/service-mesh-istio-ambient-cilium/). Linkerd's 2024 licensing/stable-release governance change under Buoyant damaged community trust and pushed evaluations toward Istio ambient and Cilium (**UNVERIFIED**, same source class).

**OS layer.** Talos Linux — API-only, immutable, no SSH/shell/package manager — is the notable new base layer, with Sidero Labs claiming "thousands of organizations" (https://thenewstack.io/open-source-talos-linux-bringing-simplicity-to-kubernetes/, https://cloudnativenow.com/features/sidero-labs-to-extend-scope-of-talos-linux-platform-for-kubernetes/). Its compliance story is the real selling point: no shell means whole classes of CIS benchmark controls become non-applicable. Replaces: Ubuntu/RHEL + kubeadm + config management. k3s (33.6k stars) and k0s (6.4k) hold edge/single-node. KubeVirt is riding post-Broadcom VMware displacement.

**CI/CD.** Earthly is dead as a product: Earthly Cloud and Satellites were shut down 16 July 2025, the CLI is in maintenance-only mode, and the company pivoted to an AI-guardrails product ("Earthly Lunar") (https://earthly.dev/blog/shutting-down-earthfiles-cloud/). Earthly arranged a migration path to Dagger, which offered ex-Earthly users a free year of Dagger Cloud Team (https://dagger.io/blog/earthly-to-dagger-migration/). Last push to `earthly/earthly` was 2025-10-23 — effectively dormant. Dagger (16.1k stars) is the surviving "pipelines as code, not YAML" option and has pivoted hard toward agentic/AI workflows. Kargo (Akuity, 3.4k stars) is the notable new entrant for **environment promotion**, a gap Argo CD deliberately left open; CNCF's own Argo user survey names GitOps Promoter, Kargo and Codefresh GitOps as the emerging promotion layer (https://www.cncf.io/announcements/2025/07/24/cncf-end-user-survey-finds-argo-cd-as-majority-adopted-gitops-solution-for-kubernetes/).

**IaC after the BSL fork.** OpenTofu (MPL-2.0, Linux Foundation, 29.6k stars) has genuinely diverged rather than merely tracking Terraform: state encryption, `provider for_each`, early variable evaluation, and `-exclude` exist in OpenTofu and not in Terraform's open binary. Reported adoption is ~12% of IaC practitioners with 27% evaluating, against Terraform at 33–62% depending on measurement; HCP Terraform reportedly ended its free tier in March 2026 (all **UNVERIFIED** — https://www.turbogeek.co.uk/opentofu-vs-terraform-2026/, https://jorijn.com/en/blog/opentofu-vs-terraform-2026-the-fork-finally-diverged/). Named enterprise migrations (Fidelity ~50k state files, Capital One) are **UNVERIFIED**. Crossplane 2.x (graduated CNCF) redesigned composition so composite resources can compose *any* Kubernetes resource, not just managed cloud resources — repositioning it from "Terraform-in-Kubernetes" to a general platform API engine (https://blog.crossplane.io/announcing-crossplane-2-0/, https://docs.crossplane.io/latest/whats-new/). **System Initiative failed**: `systeminit/si` was archived on GitHub (last push 2026-02-06, archived flag = true, verified via API), with the shutdown discussed publicly in Feb 2026 (https://news.ycombinator.com/item?id=46910293).

**Observability.** OpenTelemetry graduated from CNCF on 2026-05-21 (https://opentelemetry.io/blog/2026/otel-graduates/) and is CNCF's second-highest-velocity project with over 24,000 contributors (https://www.cncf.io/announcements/2026/01/20/kubernetes-established-as-the-de-facto-operating-system-for-ai-as-production-use-hits-82-in-2025-cncf-annual-cloud-native-survey/). The ClickHouse-backed cost-reduction cohort is real and now radar-visible: Thoughtworks Radar Vol. 34 (April 2026) places **SigNoz** and **ClickStack** in Assess (https://www.thoughtworks.com/radar/platforms). HyperDX was acquired into the ClickHouse orbit and forms the basis of ClickStack. Quickwit (11.4k stars) covers object-storage-native log search.

**Policy / supply chain.** Kyverno graduated from CNCF on 2026-03-24 after a third-party security audit and a TAG Security assessment (https://www.cncf.io/announcements/2026/03/24/cloud-native-computing-foundation-announces-kyvernos-graduation/) — it now sits alongside OPA as a graduated peer, and for pure Kubernetes admission control it is the lower-cognitive-load default (no Rego). Sigstore is the settled signing substrate: npm Trusted Publishing went GA July 2025 and OIDC publishing auto-attaches Sigstore provenance at SLSA Build Level 2 (https://blog.sigstore.dev/npm-provenance-ga/).

**AI-for-ops.** A distinct agentic-SRE category emerged 2025–2026: Resolve AI (reported $1B valuation Dec 2025), Traversal (deployed at DigitalOcean), Cleric, Neubird, Parity. All vendor-reported outcome numbers (80% auto-resolution targets, 36,000 engineering hours saved, 20–30% capacity freed) are **UNVERIFIED** marketing claims (https://www.mezmo.com/learn/the-2026-ai-sre-market-map-agents-harnesses-and-the-data-layer, https://cleric.ai/resources/reports/the-state-of-ai-sre). Nothing in this category is open source or portable yet — treat as vendor lock-in risk.

## 2. Solid vs hype vs declining

**Solid / default.** Kubernetes (82% of container users in production), Docker/OCI, Argo CD, OpenTelemetry + Prometheus, Terraform *or* OpenTofu, Trivy, cert-manager, Kyverno or OPA, Helm 4 (released Nov 2025, WASM plugin system, server-side apply; v4.1.4 as of April 2026 — **UNVERIFIED** version detail, https://en.wikipedia.org/wiki/Helm_(package_manager)), Backstage or Port, GitHub Actions.

**Hype / unsettled.** Agentic SRE and "AI platform engineer" tooling — no independent adoption data, no OSS options, heavy vendor claims. Full Crossplane-as-everything platforms: powerful but the operational burden of running a control plane is routinely understated. Score as a *universal* workload spec: the spec repo has 8,075 stars but the tooling repos are tiny (`score-k8s` 47 stars, `score-compose` 458) and `score-humanitec` is **archived** — adoption is broad in mindshare, thin in implementation. Thoughtworks Vol. 34's central warning is about **cognitive debt** from AI-generated code and *semantic diffusion* — terms like "spec-driven development" and "harness engineering" being used before their meanings stabilize (https://www.thoughtworks.com/about-us/news/2026/combat-ai-cognitive-debt-radar-v34).

**Declining / retiring.** `ingress-nginx` — retired, not declining (see §1). Cluster Autoscaler — negative growth in Datadog telemetry. Earthly — maintenance-only. System Initiative — archived. Jenkins — losing new-project share, still deeply entrenched in enterprise; JetBrains puts it second at 28% organizational vs GitHub Actions 33% (https://blog.jetbrains.com/teamcity/2025/10/the-state-of-cicd/). Claims of "Jenkins -8% YoY" and "GitHub Actions 85% of pipelines" are **UNVERIFIED** SEO-blog numbers. Chef/Puppet-style config management: Stack Overflow 2025 puts Ansible at 11.7% and Chef/Puppet below the reporting threshold (https://survey.stackoverflow.co/2025/technology) — immutable-image + Talos-style declarative OS is the replacement pattern. Sidecar-mode Istio is being actively deprecated in practice by ambient.

## 3. Adoption data (with source and year)

| Claim | Value | Source / year |
|---|---|---|
| Container users running K8s in production | 82% (66% in 2023) | CNCF Annual Survey 2025, pub. Jan 2026 |
| Orgs that have adopted cloud native techniques | 98% | CNCF 2025 |
| Orgs running GenAI inference on Kubernetes | 66% | CNCF 2025 |
| Top cloud-native barrier: cultural change | 47% (training 36%, security 36%, complexity 34%) | CNCF 2025 |
| GitOps used "extensively" by cloud-native innovators | 58% (vs 23% of "adopters") | CNCF 2025 |
| K8s clusters using Argo CD | ~60%; 97% in production; NPS 79 | CNCF Argo user survey, July 2025 |
| Argo CD instances managing >500 apps | 42% (15% in 2023) | CNCF Argo survey 2025 |
| Platform engineers as share of Argo CD users | 37% | CNCF Argo survey 2025 |
| Docker usage among developers | 71.1% (+17pp YoY, largest single-year jump of any tech) | Stack Overflow Dev Survey 2025 |
| Kubernetes / Terraform / Ansible developer usage | 28.5% / 17.8% / 11.7% | Stack Overflow 2025 |
| Orgs investing in both Prometheus and OTel | 65% (Prometheus 77%, OTel 76%) | Grafana Observability Survey 2026 (4th annual, Mar 2026) |
| OTel signal usage | metrics 57%, traces 50%, logs 48% | Grafana 2026 |
| AI adoption among software professionals | 90% (+14pp YoY); median 2 hrs/day | DORA State of DevOps 2025 |
| Developers with low trust in AI code | 30% low trust vs 24% high trust | DORA 2025 |
| CI/CD tools, organizational use | GitHub Actions 33%, Jenkins 28%, GitLab CI 19%, TeamCity 7% | JetBrains State of CI/CD 2025 (n=805) |
| Orgs using ≥2 CI/CD tools | 32% two, 9% three or more | JetBrains 2025 |
| Teams using no AI in CI/CD at all | 73% | JetBrains 2025 |
| ARM adoption on managed Kubernetes | 2.6% → 7.1% | Datadog Container Report |
| Containerized GPU compute time growth | +58% YoY (vs +25% non-containerized) | Datadog Container Report |
| Large software orgs with platform teams by end-2026 | 80% forecast (45% in 2022) | Gartner forecast, widely cited — **UNVERIFIED** (primary paywalled) |

The DORA 2025 headline finding is not a tooling finding: AI now correlates positively with **throughput** but also with **higher instability** — more change failures, more rework. DORA frames it as a mirror: AI amplifies whatever system it lands in. "The challenge of successful AI adoption isn't a tools problem — it's a systems problem" (https://itrevolution.com/articles/ais-mirror-effect-how-the-2025-dora-report-reveals-your-organizations-true-capabilities/).

## 4. Platform engineering as a discipline

The discipline has stabilized around three separable layers, and conflating them is the most common failure mode: a **portal** (Backstage or Port — discovery, catalog, scorecards, templates), an **orchestrator** (Humanitec Platform Orchestrator, Kratix, or Crossplane — turns a workload request into real infrastructure), and a **delivery engine** (Argo CD/Flux + Kargo). Golden paths are the unit of product: pre-configured, opinionated templates covering the common ~80% of use cases while leaving an explicit escape hatch — per the CNCF Platforms Working Group framing (https://tag-app-delivery.cncf.io/whitepapers/platforms/). The corollary matters: a golden path with no escape hatch becomes a gate, and gated platforms get bypassed.

Humanitec shipped Orchestrator v2 in Sept 2025, decoupling from Kubernetes-only to cover VMs, serverless and anything in the Terraform/OpenTofu provider ecosystem (https://humanitec.com/blog/the-all-new-platform-orchestrator). No evidence of a Humanitec acquisition was found — it appears to remain independent and VC-funded (https://www.crunchbase.com/organization/humanitec). Reported platform-team resourcing is grim: 47.4% of platform initiatives run on budgets under $1M while carrying org-wide mandates (https://platformengineering.org/blog/the-biggest-challenges-platform-engineering-teams-are-facing-in-2026).

**A defensible 2026 reference stack, end to end:** Talos Linux or a managed distro → Cluster API for cluster lifecycle → Karpenter for nodes → Cilium CNI → **Gateway API (not Ingress)** → Argo CD for delivery + Kargo for promotion → Helm 4 / Kustomize for packaging → OpenTofu or Terraform + Crossplane for infra APIs → Backstage or Port as the portal → Kyverno for admission policy → secrets via OpenBao or a cloud KMS → OpenTelemetry Collector into Grafana LGTM *or* a ClickHouse-backed stack (SigNoz / ClickStack) if telemetry cost is the binding constraint → Trivy + Syft + Sigstore/cosign + SLSA provenance in CI → Falco at runtime. The genuinely new 2026 additions versus 2024 are Gateway API (now mandatory), Kargo, Crossplane v2 semantics, and the ClickHouse observability tier.

For a compliance-sensitive enterprise context, the load-bearing choices are Talos (no shell → CIS controls become non-applicable), Kyverno (auditable YAML policy rather than Rego), Sigstore + SLSA provenance (attestable build chain), and OpenTofu over Terraform (OSI-approved MPL-2.0 removes BSL redistribution ambiguity).

## 5. Repos worth studying — licences verified 2026-07-29 via GitHub API

**Apache-2.0 / MIT / MPL-2.0 — unambiguous OSI open source:**
`kubernetes/kubernetes` (Apache-2.0, 124k), `cilium/cilium` (Apache-2.0, 24.8k), `siderolabs/talos` (**MPL-2.0**, 10.8k), `k3s-io/k3s` (Apache-2.0, 33.6k), `kubernetes-sigs/karpenter` (Apache-2.0), `kubernetes-sigs/gateway-api` (Apache-2.0), `kubernetes-sigs/cluster-api` (Apache-2.0), `kubevirt/kubevirt` (Apache-2.0), `dagger/dagger` (Apache-2.0, 16.1k), `argoproj/argo-cd` (Apache-2.0, 23.8k), `akuity/kargo` (Apache-2.0, 3.4k), `fluxcd/flux2` (Apache-2.0), `opentofu/opentofu` (**MPL-2.0**, 29.6k), `pulumi/pulumi` (Apache-2.0, 25.5k), `gruntwork-io/terragrunt` (**MIT**, 9.7k), `crossplane/crossplane` (Apache-2.0, 11.9k), `backstage/backstage` (Apache-2.0, 34k), `syntasso/kratix` (Apache-2.0, 765), `open-policy-agent/opa` (Apache-2.0), `kyverno/kyverno` (Apache-2.0), `sigstore/cosign` (Apache-2.0), `aquasecurity/trivy` (Apache-2.0, 37.1k), `anchore/syft` (Apache-2.0), `falcosecurity/falco` (Apache-2.0), `helm/helm` (Apache-2.0, 30k), `kubernetes-sigs/kustomize` (Apache-2.0), `openbao/openbao` (**MPL-2.0**, 6.8k — the OSI-licensed Vault fork), `open-telemetry/opentelemetry-collector` (Apache-2.0), `quickwit-oss/quickwit` (Apache-2.0), `hyperdxio/hyperdx` (**MIT**), `bridgecrewio/checkov` (Apache-2.0), `stefanprodan/timoni` (Apache-2.0), `kedacore/keda` (Apache-2.0), `temporalio/temporal` (MIT).

**Copyleft — legally OSS but with real distribution implications for a product you ship or SaaS you host:**
- `grafana/grafana`, `grafana/loki`, `grafana/mimir`, `grafana/tempo`, `grafana/pyroscope` — **all AGPL-3.0**. Fine to self-host internally; the network-copyleft clause is the thing to check before embedding in anything customer-facing.
- `semgrep/semgrep` — **LGPL-2.1** (and the commercial rules registry is separately licensed).

**Source-available but NOT OSS, or ambiguous — flag these:**
- `hashicorp/terraform` and `hashicorp/vault` — GitHub reports **NOASSERTION**; both are **BSL 1.1** (Business Source License). Not OSI-approved. This is the licence event that produced OpenTofu and OpenBao.
- `SigNoz/signoz` — **NOASSERTION / split licence**: everything under `ee/` and `cmd/enterprise/` falls under a separate enterprise licence in `ee/LICENSE`; everything else is MIT Expat. Open-core, not uniformly MIT.
- `k0sproject/k0s` — **NOASSERTION** but benign on inspection: Apache-2.0 for code, CC-BY-SA-4.0 for `docs/`.
- `slsa-framework/slsa` and `in-toto/in-toto` — **NOASSERTION** (specification/mixed-content repos rather than restrictive terms; verify per-file if you vendor anything).
- `score-spec/setup-score` — **no licence file at all**. Also note `score-spec/score-humanitec`, `score-spec/schema` and `score-spec/score-helm-charts` are **archived**.

**Archived / dead — do not build on:**
- `systeminit/si` — **archived** (Apache-2.0, last push 2026-02-06).
- `earthly/earthly` — MPL-2.0, not flagged archived but last push 2025-10-23; maintenance-only per vendor announcement.
- `aquasecurity/tfsec` — MIT, last push 2026-03-25; superseded by Trivy's IaC scanning.

## Sources

- CNCF 2025 Annual Cloud Native Survey — https://www.cncf.io/announcements/2026/01/20/kubernetes-established-as-the-de-facto-operating-system-for-ai-as-production-use-hits-82-in-2025-cncf-annual-cloud-native-survey/
- CNCF Argo end-user survey — https://www.cncf.io/announcements/2025/07/24/cncf-end-user-survey-finds-argo-cd-as-majority-adopted-gitops-solution-for-kubernetes/
- CNCF Kyverno graduation — https://www.cncf.io/announcements/2026/03/24/cloud-native-computing-foundation-announces-kyvernos-graduation/
- CNCF project list — https://www.cncf.io/projects/
- OpenTelemetry graduation — https://opentelemetry.io/blog/2026/otel-graduates/
- Kubernetes ingress-nginx retirement statement — https://www.kubernetes.io/blog/2026/01/29/ingress-nginx-statement/
- ingress2gateway 1.0 — https://kubernetes.io/blog/2026/03/20/ingress2gateway-1-0-release
- Stack Overflow Developer Survey 2025 — https://survey.stackoverflow.co/2025/technology
- JetBrains State of CI/CD 2025 — https://blog.jetbrains.com/teamcity/2025/10/the-state-of-cicd/
- Grafana 4th Annual Observability Survey (2026) — https://grafana.com/press/2026/03/18/grafana-labs-4th-annual-observability-survey-reveals-a-field-at-a-crossroads-ai-economics-complexity-and-the-enduring-power-of-open-source/
- Grafana Observability Survey 2025 — https://grafana.com/observability-survey/2025/
- DORA State of DevOps 2025 — https://blog.google/innovation-and-ai/technology/developers-tools/dora-report-2025/ and https://itrevolution.com/articles/ais-mirror-effect-how-the-2025-dora-report-reveals-your-organizations-true-capabilities/
- Thoughtworks Technology Radar Vol. 34 (Apr 2026) — https://www.thoughtworks.com/radar/platforms and https://www.thoughtworks.com/about-us/news/2026/combat-ai-cognitive-debt-radar-v34
- Datadog State of Containers and Serverless — https://www.datadoghq.com/state-of-containers-and-serverless/ and https://www.datadoghq.com/container-report/
- Earthly shutdown — https://earthly.dev/blog/shutting-down-earthfiles-cloud/ ; Dagger migration — https://dagger.io/blog/earthly-to-dagger-migration/
- Crossplane 2.0 — https://blog.crossplane.io/announcing-crossplane-2-0/ ; v2.2 — https://blog.crossplane.io/crossplane-v2-2-more-capable-more-reliable-more-observable/
- Humanitec Orchestrator v2 — https://humanitec.com/blog/the-all-new-platform-orchestrator
- System Initiative shutdown — https://news.ycombinator.com/item?id=46910293
- Sigstore npm provenance GA — https://blog.sigstore.dev/npm-provenance-ga/
- Talos Linux — https://thenewstack.io/open-source-talos-linux-bringing-simplicity-to-kubernetes/ and https://cloudnativenow.com/features/sidero-labs-to-extend-scope-of-talos-linux-platform-for-kubernetes/
- Platform engineering challenges 2026 — https://platformengineering.org/blog/the-biggest-challenges-platform-engineering-teams-are-facing-in-2026
- CNCF Platforms WG whitepaper — https://tag-app-delivery.cncf.io/whitepapers/platforms/
- AI SRE market map — https://www.mezmo.com/learn/the-2026-ai-sre-market-map-agents-harnesses-and-the-data-layer (vendor-adjacent; **UNVERIFIED**)
- OpenTofu adoption estimates — https://www.turbogeek.co.uk/opentofu-vs-terraform-2026/ , https://jorijn.com/en/blog/opentofu-vs-terraform-2026-the-fork-finally-diverged/ (**UNVERIFIED**)
- Service mesh comparisons — https://lucaberton.com/blog/service-mesh-istio-ambient-cilium/ (**UNVERIFIED**)
- All licence/star/archive data: GitHub REST API `/repos/{owner}/{repo}` and `/repos/{owner}/{repo}/license`, queried 2026-07-29
