# AWS + DevOps: An Enterprise-Grade Reference Project That Actually Moves Hiring

> Research brief · compiled 2026-07-29 · all GitHub licence, archive and star data verified against the GitHub REST API on that date via authenticated `gh api`. AWS prices taken from AWS's own pricing pages, us-east-1 unless stated. India labour-market figures are almost entirely from recruitment-marketing blogs and are flagged **UNVERIFIED**.

## 1. What 2026 job specs actually ask for

**Table stakes** — absence kills the application, presence signals nothing: Linux, Git, Docker/OCI, one cloud (AWS), Terraform in HCL with reusable modules + remote state + multi-env layout, Kubernetes basics, a CI system (GitHub Actions leads: **41% organizational use, 62% for personal projects**, n=805 — https://blog.jetbrains.com/teamcity/2025/10/the-state-of-cicd/; the cited page gives **no** organizational percentage for Jenkins, saying only that it is "adopted significantly less often in small companies than in medium and large ones", so the earlier "33% vs Jenkins 28%" head-to-head is **UNVERIFIED** and does not appear on the cited source — it traces to secondary blogs recycling a different JetBrains survey), dashboards. Platform-engineer postings ask for "EKS or GKE, Argo CD or Flux, Helm, and GitHub Actions" as one bundle (https://www.kore1.com/platform-engineer-job-description-template/, https://roadmap.sh/devops/job-description).

**Differentiators**, in rough order of interview leverage:
1. **Multi-account AWS design.** Senior specs ask for "designing multi-account AWS organization structures" (https://dev.to/ajbuilds/devops-jobs-in-2026-roles-salaries-and-how-to-actually-get-hired-3bbf). Almost no portfolio has more than one account — the cheapest way to look senior.
2. **Progressive delivery with automated rollback tied to SLOs**, not "we deploy on merge".
3. **Supply-chain provenance**: SBOM + signing + *admission-time verification*. Kyverno graduated CNCF 2026-03-24 (https://www.cncf.io/announcements/2026/03/24/cloud-native-computing-foundation-announces-kyvernos-graduation/).
4. **FinOps with actual numbers** — nobody's portfolio has a cost-per-tenant metric.
5. **Compliance evidence generation** — decisive for MNC/GCC and BFSI work, and rare.
6. **OpenTelemetry over vendor agents.** OTel graduated CNCF 2026-05-21 (https://opentelemetry.io/blog/2026/otel-graduates/); 65% of orgs invest in both Prometheus and OTel (https://grafana.com/press/2026/03/18/grafana-labs-4th-annual-observability-survey-reveals-a-field-at-a-crossroads-ai-economics-complexity-and-the-enduring-power-of-open-source/).

**India market.** The only primary index available is Naukri JobSpeak (Info Edge): FY26 white-collar hiring **+8%** (strongest in three years) and March '26 **+9%** YoY, both confirmed verbatim in the Info Edge deck (https://www.infoedge.in/pdfs/News_Events_pdfs/Naukri-Jobspeak-Mar-2026.pdf); the 20+ LPA band **+23%** YoY. Two corrections to the earlier read of this source: **"IT +6%" is contradicted by the deck's own industry table**, which shows *IT-Software/Software Services* at **↑1%** YoY and *IT-Hardware & Networking* at **↑11%** — there is no +6% IT figure in the instrument; and **"AI/ML +41–45%" is not a range the deck supports** — AI/ML is not a row in its industry table at all, and secondary reporting of the same release gives +37% for March with the full fiscal closing at +45%, so treat the single figure **+45% full-fiscal (UNVERIFIED**, narrative/chart only, not in the extractable table**)**. JobSpeak does **not** break out cloud/DevOps — verified by full-text search of the deck: **zero** occurrences of "cloud" or "devops". So "cloud and DevOps +38% YoY on Naukri", "DevOps third at +19%", "GCC share 41%→44%", "132,000 new GCC jobs", "55–60% cloud-native talent deficit", every LPA band (₹5–9 fresher, ₹18–35 mid, ₹60+ senior) and "certs add 20–35% to base" are all **UNVERIFIED** — recruitment blogs, no instrument, no n, no methodology (https://taggd.in/blogs/it-hiring-trends/, https://savannahr.com/insights/gcc-skills-demand-report-q1-2026, https://resources.instahyre.com/blog/devops-engineer-salary-in-india/). Direction real, decimals fiction. The one credible global read: Linux Foundation's 2026 State of Tech Talent (n=400, Feb 2026) — "Not a Jobs Crisis, but a Skills Crisis With an Upskilling Answer", +31% net hiring effect (+60% for AI-specific roles), upskilling 57% beating external hiring 49%, and 57% reporting capability gaps in **AI** security & risk management and **AI** operations & monitoring — the "AI" qualifier matters and was dropped in the earlier summary; this is *not* a finding about general security/ops skills (https://training.linuxfoundation.org/blog/just-released-2026-state-of-tech-talent-report/).

## 2. The reference project

**Build a multi-tenant enterprise event & conference platform.** The domain is chosen deliberately: *bursty* (registration opens; doors open), *multi-tenant by nature*, exactly one place needing hard consistency (seat/quota) and eventual consistency everywhere else, real PII + consent (GDPR / India DPDP Act) manufacturing a genuine compliance surface, and offline tolerance at the door. That is an enterprise *shape*, not a CRUD toy — and if you already know the domain, the ADRs read like they were written by someone who has shipped.

**Bounded contexts — 7 services, not 30:** Tenant & Identity · Event Catalog · Registration & Ticketing (quotas, waitlist, idempotent booking) · Access Control & Check-in (badge scan, entitlement verification, burst + offline) · Notifications · Analytics & Projections · Compliance & Audit (append-only consent/audit log). Seven is where boundaries stay defensible and solo ops stays survivable.

**Data layer.** Aurora PostgreSQL Serverless v2 as system of record — $0.12/ACU-hour Standard (confirmed on AWS's own Aurora pricing page, not a secondary blog: the worked example reads "5 ACUs * $0.12 per ACU-hour"; I/O-Optimized is **$0.156/ACU-hour**), and critically a **minimum of 0 ACU** since Nov 2024, so non-prod pauses to zero compute (https://aws.amazon.com/about-aws/whats-new/2024/11/amazon-aurora-serverless-v2-scaling-zero-capacity); storage $0.10/GB-mo Standard, $0.225 I/O-Optimized, I/O $0.20/million (https://aws.amazon.com/rds/aurora/pricing/). Multi-tenancy: **pool model with row-level security** plus `tenant_id` in the JWT, and *one* silo tenant (dedicated schema + cluster) to show tiered isolation. DynamoDB on-demand for check-in idempotency keys and rate-limit counters. S3 with Object Lock for audit evidence — that's your immutability control. *Rejected:* DynamoDB as primary (single-table modelling hides your data reasoning and makes the quota invariant awkward); database-per-tenant (cost, and no RLS to show).

**Event backbone.** Transactional outbox in Postgres → pump → **EventBridge** custom bus → SQS per consumer + DLQ, EventBridge Archive for replay. Custom-bus ingestion $1.00/M events, Pipes $0.40/M, archive $0.10/GB processed + $0.023/GB stored (https://aws.amazon.com/eventbridge/pricing/). *Rejected: Kafka.* MSK Serverless is **$0.75 per cluster-hour** — $547/month before a single partition, plus $0.0015/partition-hr (https://aws.amazon.com/msk/pricing/). The $0.75 rate is confirmed for **both** us-east-1 and us-east-2 against the AWS Price List API, so the earlier N. Virginia/Ohio label ambiguity is resolved. **But it is not region-flat:** ap-south-1 (Mumbai) is **$0.79/cluster-hr = $577/month**, with partition-hours at $0.0016 — so an India-based reader should budget ~$577, not $547 (AWS Price List API, `AmazonMSK` offer index, queried 2026-07-29). Say so in an ADR: "Kafka is the enterprise default; here is the cost model that made it wrong at this scale, and here is how ordering, replay and poison-message handling are covered without it." Cost-aware judgement reads as seniority; Kafka-because-resume reads as the opposite.

**Auth.** Cognito user pools as platform IdP (Essentials $0.015/MAU, 10,000 MAU free; M2M client-credentials tokens $0.00225 each — https://aws.amazon.com/cognito/pricing/), federated to **Keycloak in a container playing "the client's corporate IdP"**. That pairing is the point: enterprise event platforms live and die on customer SSO, so you demonstrate OIDC federation, SAML attribute mapping, JIT provisioning and per-tenant app clients — without patching an HA Keycloak cluster.

**Compute: EKS, for stated reasons.** For seven services the better *engineering* answer is ECS Fargate — ECS has no control-plane charge at all (https://aws.amazon.com/ecs/pricing/) versus EKS at $0.10/cluster-hour. But Argo CD, Rollouts, Kyverno, External Secrets, Karpenter, HPA and the OTel Operator all presume Kubernetes, and Kubernetes is the hiring signal. So: EKS, Fargate profiles for system/critical pods, Karpenter on Spot for burst, Lambda only at the edges (outbox pump, evidence signer, cron) — and the ECS-vs-EKS cost comparison in the repo as ADR-0004 with real numbers. The ADR is worth more than the cluster. Two EKS-Fargate constraints to design around, both from the primary docs (https://docs.aws.amazon.com/eks/latest/userguide/fargate.html): Fargate pods on EKS are **x86-only** (no Graviton — see §3 Build), and **"Amazon EKS doesn't support Fargate Spot"**, so all Spot savings must come from Karpenter EC2 nodes. DaemonSets also don't run on Fargate, which matters for the OTel Collector DaemonSet in §3.

## 3. The DevOps chain, tool by tool

| Layer | Choice + rationale | Rejected |
|---|---|---|
| Repo | Monorepo for services, **separate** infra repo, **separate** GitOps manifests repo — Argo CD must not be triggerable from an app build; separation is the auditable boundary | single repo (blast radius); repo-per-service (7× wiring, no payoff) |
| Branching | Trunk-based, short-lived branches, tags as release units, `main` protected | GitFlow — long-lived release branches are the #1 tell of a tutorial project |
| CI | GitHub Actions with **OIDC federation to AWS**, `sub` claim pinned to repo+branch+environment; every action traceable in CloudTrail under the assumed-role ARN (https://docs.github.com/actions/security-for-github-actions/security-hardening-your-deployments/configuring-openid-connect-in-amazon-web-services) | stored `AWS_ACCESS_KEY_ID` secrets — instantly disqualifying in review |
| IaC | **OpenTofu** (MPL-2.0), layered stacks, state in the Deployments account. Terraform and Vault report `NOASSERTION` on GitHub and are BUSL-1.1 — source-available, *not* OSI; OpenTofu removes the ambiguity | CDK (fine for Lambda-shaped stacks, but HCL is what specs test); **CDKTF is dead** — archived 2025-12-10, "did not find product-market fit at scale" (https://www.env0.com/blog/another-one-bites-the-dust-what-the-cdktf-deprecation-means-for-you) |
| Build | Multi-stage distroless, **ARM64/Graviton** on Karpenter EC2 nodes, ECR immutable tags + scan-on-push. Graviton "cost up to 20% less than comparable x86-based Amazon EC2 instances" (https://aws.amazon.com/ec2/graviton/). **Correction: ARM Fargate ($0.03238/vCPU-hr vs $0.04048 x86) is ECS-only and cannot be used for EKS pods** — the Fargate pricing page states "Windows Operating System and ARM CPU Architecture are currently only available for Amazon ECS" (https://aws.amazon.com/fargate/pricing/), and the EKS Fargate comparison table answers "Can run workloads that require Arm processors — **No**" (https://docs.aws.amazon.com/eks/latest/userguide/fargate.html). So Graviton savings here must come from Karpenter-managed Graviton EC2 nodes, not from Fargate profiles | mutable `:latest` |
| Orchestration | EKS + Karpenter on Spot + Fargate profiles for system pods. Karpenter's *share* rose 22 points over two years (~11% → ~34%, Oct 2023–Oct 2025) while Cluster Autoscaler fell 17 points (~40% → ~25%) — share of organizations, not node count, which the earlier "Karpenter nodes +22%" phrasing implied (2025 edition, https://www.datadoghq.com/state-of-containers-and-serverless/) | managed node groups; ECS (see §2); **`aws/copilot-cli` archived**, EOS 2026-06-12 (https://aws.amazon.com/blogs/containers/announcing-the-end-of-support-for-the-aws-copilot-cli) |
| Ingress | **Gateway API**. `ingress-nginx` was retired by the Kubernetes Steering + Security Response Committees, and "None of the available alternatives are direct drop-in replacements" (https://www.kubernetes.io/blog/2026/01/29/ingress-nginx-statement/) | ingress-nginx — a visible knowledge-currency failure in 2026 |
| GitOps | Argo CD app-of-apps; manifests repo is the only writer. ~60% of clusters, 97% in production, NPS 79 (https://www.cncf.io/announcements/2025/07/24/cncf-end-user-survey-finds-argo-cd-as-majority-adopted-gitops-solution-for-kubernetes/) | `kubectl apply` in CI — no drift detection, no audit |
| Promotion | Kargo for dev→stage→prod; Argo CD deliberately left promotion out | hand-copying image tags between folders |
| Progressive delivery | Argo Rollouts canary with **analysis templates querying Prometheus SLIs** and automatic abort — the single most interview-effective artifact here | blue/green with a manual promote button |
| Secrets | Secrets Manager + External Secrets Operator, IRSA/Pod Identity per service | Sealed Secrets (weak rotation story); plaintext SSM params |
| Policy | Kyverno — YAML not Rego, and the `PolicyReport` CRD *is* your compliance artifact | OPA/Gatekeeper: fine, but Rego is a tax you don't need |
| Supply chain | Syft → SPDX SBOM, cosign keyless via GitHub OIDC, SLSA provenance, **Kyverno `verifyImages` blocking unsigned images at admission**. The chain must enforce, not just generate | attestation generation with no admission gate — an SBOM nobody verifies is theatre |
| Scanning | Trivy (image + IaC + K8s), Semgrep (SAST), gitleaks in pre-commit *and* CI | ECR scan-on-push alone |
| Observability | OTel auto-instrumentation → OTel Collector DaemonSet → CloudWatch + AMP/Grafana, `tenant_id` on every span via baggage. Per-tenant telemetry is what no portfolio has and every SaaS needs | CloudWatch agent + printf logs. Note Grafana OSS is **AGPL-3.0** — fine self-hosted, check before embedding |
| FinOps | Organizations tag policy + SCP enforcement, per-env Budgets with actions, Infracost on every infra PR, Savings Plan modelled (not bought), Graviton, OpenCost per-namespace → publish **cost per registration** | a Cost Explorer screenshot |

## 4. Multi-account landing zone

**Control Tower vs Organizations + IaC.** Control Tower itself is free; you pay for what it turns on — Config at $0.003/configuration item (continuous) and $0.001/rule evaluation, CloudTrail at $2.00 per 100,000 management events, plus S3; AWS's own 25-account example is ~$60.63/month recurring (https://aws.amazon.com/controltower/pricing/). **For a portfolio, build it with Organizations + Terraform**: Control Tower is a console click-through that leaves almost nothing reviewable in Git, and the reviewable HCL *is* the deliverable. Stand Control Tower up once in a throwaway org so you can speak to Account Factory / AFT / guardrails fluently, then destroy it.

**OU layout.** Root → `Security` (Log Archive, Audit) · `Infrastructure` (Network, Shared Services) · `Workloads` (Dev, Prod) · `Deployments` (OIDC roles, ECR, Terraform state) · `Sandbox` · `Suspended`. Six or seven accounts is enough to be real.

**SCPs.** Deny leaving the org · deny disabling CloudTrail/Config/GuardDuty · deny root-user actions · region allow-list (`ap-south-1` + `us-east-1` for global services) · deny unencrypted EBS/S3 · require IMDSv2 · deny `iam:CreateUser`. Two documented facts most candidates get wrong, and you should say out loud: **SCPs have no effect on the management account**, and **SCPs cannot restrict service-linked roles** (https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_scps.html). Consequences: never put workloads in the management account, and layer **RCPs** for the resource perimeter (S3/KMS/STS confused-deputy) instead of treating SCPs as a complete boundary.

**IAM Identity Center.** Zero IAM users anywhere. `AdministratorAccess` → Sandbox only; `PowerUserAccess` → Dev; `ReadOnly` plus a documented, alarmed break-glass role → Prod. Attribute-based access on team tags.

**Network.** Transit Gateway in the Network account; one VPC per env, /20, three AZs, workloads private-only; **centralised egress via a single NAT in the Network account** — or, better, no NAT at all, using gateway/interface endpoints for S3, ECR, Logs, STS and Secrets Manager. Route 53 Resolver rules for hybrid DNS. Skip Network Firewall (expensive; note it in the ADR).

**Well-Architected → concrete controls** (six pillars, doc-confirmed: operational excellence, security, reliability, performance efficiency, cost optimization, sustainability — https://docs.aws.amazon.com/wellarchitected/latest/framework/the-pillars-of-the-framework.html):

| Pillar | Concrete control |
|---|---|
| Operational excellence | Argo CD as sole applier; in-repo runbooks; game-day report; DORA dashboard |
| Security | OIDC-only CI; IRSA per service; Kyverno signed-image gate; SCP/RCP perimeter; Object Lock audit log |
| Reliability | Aurora Multi-AZ + **pilot light** cross-region DR — AWS's four strategies are backup & restore, pilot light, warm standby, multi-site active/active (https://docs.aws.amazon.com/whitepapers/latest/disaster-recovery-workloads-on-aws/disaster-recovery-options-in-the-cloud.html) — with a tested restore and measured RTO |
| Performance efficiency | k6 registration-open burst test; HPA + Karpenter; documented p99 |
| Cost optimization | Tag policy + Budgets actions; Infracost gate; Graviton; Spot; cost-per-tenant |
| Sustainability | Graviton (AWS: up to 60% less energy); scale-to-zero non-prod; right-sizing pass |

## 5. Cost

**Always-on "full" mode**, two envs, two EKS clusters, three-plus accounts, us-east-1:

| Item | Monthly |
|---|---|
| 2 × EKS control plane @ $0.10/hr | $146 |
| EKS Fargate, ~3 vCPU + 6 GB steady ($0.04048/vCPU-hr, $0.004446/GB-hr) | ~$108 |
| 4 × NAT Gateway @ $0.045/hr (2 AZ × 2 VPC) + data processing $0.045/GB | ~$135 |
| 2 × ALB @ $0.0225/hr + light LCU | ~$36 |
| 2 × Aurora Serverless v2 @ 0.5 ACU floor × $0.12 | ~$88 |
| CloudWatch Logs ~20 GB @ $0.50/GB + storage $0.03/GB-mo | ~$10 |
| AWS Config (continuous CIs + ~20k evaluations) | ~$30 |
| Security Hub Essentials @ $3.75 per resource unit, ~15 units | ~$56 |
| **Realistic total** | **$700–900** (revised — see below) |

The $3.75/resource-unit Essentials rate is **confirmed** against the live pricing page, along with the unit-conversion ratios (1 EC2 instance = 1 unit; 12 Lambda functions = 1 unit; 18 container images = 1 unit; 125 IAM users/roles = 1 unit), and CSPM is now **included** in Essentials rather than billed per check (https://aws.amazon.com/security-hub/pricing/). EKS control-plane pricing **is** region-flat, now verified rather than inferred: $0.10/cluster-hr and the +$0.50/hr extended-support surcharge are identical in us-east-1, us-west-2 and **ap-south-1** (AWS Price List API, `AmazonEKS` offer index, 2026-07-29) — so the India reader can budget the same control-plane numbers.

**The $550–750 range was too low and has been revised.** The line items above are arithmetically sound and sum to **~$602**, but the table omits **Transit Gateway**, which §4 puts in the Network account: attachments are **$0.05/attachment-hour = $36.50/month each**, plus **$0.02/GB** processing (https://aws.amazon.com/transit-gateway/pricing/). With one VPC per env plus Network and Shared Services, three to four attachments adds **$110–146/month**, taking the running total to **$712–748** before data transfer, KMS, ECR storage, Route 53, GuardDuty or cross-AZ traffic. Budget **$700–900** and treat TGW as the single largest omission a reader would otherwise be surprised by.

**Cheap mode — $25–60/month.** One EKS cluster (or ECS Fargate for dev, $0 control plane) · Aurora Serverless v2 at **min 0 ACU** so idle compute is genuinely free · **one** NAT, or zero NAT with VPC endpoints · one shared ALB, or CloudFront + Lambda function URL as the demo front door · CloudWatch Logs **Infrequent Access at $0.25/GB** with 1-day dev retention · Config recording only the resource types your conformance pack needs, single region · Security Hub on for one evidence sprint, screenshotted, then off · Spot and Graviton via Karpenter EC2 nodes — **not Fargate Spot, which EKS does not support at all**, and not ARM Fargate, which is ECS-only (both per https://docs.aws.amazon.com/eks/latest/userguide/fargate.html); Fargate Spot's up-to-70% discount is only reachable on the ECS-for-dev path · `terraform apply` before a demo, `destroy` after, with state and evidence artifacts committed.

**Free-tier trap — worse than stated, and it directly breaks this project.** Accounts created on or after **16 July 2025** (the announcement date) get a **6-month, $100–200-credit "Free account plan"** instead of the old 12-month free tier, and AWS's billing docs confirm the closure verbatim: "After your free account plan expires, your account closes automatically, and you lose access to your resources and data. AWS retains your content for 90 days before permanently deleting your account" — with a 90-day window to upgrade to a paid plan (https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/free-tier-plans.html). The comparison table is blunter still: "Account closes when credits are depleted or when the plan duration ends." **The part that matters most for a multi-account landing zone:** the same page states that free account plans "will automatically upgrade to paid plan if you join AWS Organizations, set up an AWS Control Tower landing zone, join AWS Partner Network…". Since §4 *is* an Organizations-plus-landing-zone build, the Free plan is not an option for the core of this project — the first `aws organizations create-organization` converts the account to pay-as-you-go. Plan on a paid account from week 1 and use the credits as a discount, not as the funding model.

**Traps that generate the surprise bill:**
- **EKS extended support.** Fall behind on Kubernetes versions and the control plane goes $0.10 → **$0.60/hr**: $73 → **$438/month per cluster** (https://aws.amazon.com/eks/pricing/).
- **NAT Gateway is per-AZ per-VPC** — $32.85/month each *before* $0.045/GB processing, and egress on top. Four is $131/month for nothing.
- **Idle ALBs**: $16.43/month each, forever, empty or not. One per service per env is how portfolios reach $200.
- **CloudWatch ingestion at $0.50/GB.** One debug line in a hot loop is a four-figure month.
- **Cross-AZ traffic at $0.01/GB in *each* direction** — $0.02/GB round trip (https://aws.amazon.com/vpc/pricing/). Chatty services spread across three AZs is the classic.
- **Public IPv4 at $0.005/hr charged even when idle** — $3.65/month per forgotten address.
- **Config on ephemeral resources.** Karpenter churn records a CI on every node create *and* delete; AWS's own page warns ephemeral workloads "significantly increase AWS Config expenses".
- **MSK Serverless at $0.75/cluster-hour** = $547/month. Spin one up "to try Kafka", forget it, and that's your rent.

## 6. Certifications: honest signal value

| Cert | Cost | Signal |
|---|---|---|
| AWS Solutions Architect – Associate | **$150** / **₹12,829.50** (https://aws.amazon.com/certification/policies/before-testing/) | **Get it.** Pure recruiter-filter value, especially for India GCC and AWS-partner pipelines. Near-zero signal to engineers. Cheapest keyword unlock available. |
| **CKA** | **$445**, valid 2 years, 2 attempts + 2 killer.sh simulator sessions (https://training.linuxfoundation.org/certification/certified-kubernetes-administrator-cka/) | **Get it.** The only one on this list that is performance-based in a live cluster, so it's the only one engineers respect. Highest signal per rupee despite being the priciest. |
| CKAD | $445 | **Skip** for platform/DevOps roles — it tests app-developer concerns you'll already demonstrate. |
| HashiCorp Terraform Associate (**004**) | **$70.50**, 1 hour, valid 2 years (https://developer.hashicorp.com/certifications/infrastructure-automation) | Marginal. Weak signal, but so cheap it's not worth arguing about. Do it in a weekend or don't. |
| AWS DevOps Engineer – Professional (**DOP-C02**) | **$300** / **₹25,659**; 75 questions, 180 min (all confirmed at https://aws.amazon.com/certification/certified-devops-engineer-professional/); **750/1000 to pass is UNVERIFIED** — the cited exam-guide URL returned no retrievable exam-detail content on re-check, and the certification page does not state a passing score | **Conditional.** Real value only where HR filters on it — large SIs, AWS partners, some GCCs. Its CodePipeline/CodeDeploy-centric worldview is not how modern teams ship. Do not do it before you have the project. |

The recurring "certifications add 20–35% to base offers" claim is **UNVERIFIED** — it appears only in recruitment blogs with no linked instrument. Sequence: **project first, then CKA, then SAA if you need the keyword.** A reviewer who sees CKA plus a working canary-with-auto-rollback will not ask about DevOps Pro.

## 7. Twelve weeks, with a demonstrable artifact each stage

| Wk | Deliverable | Artifact a reviewer can open |
|---|---|---|
| 1 | Org, OUs, 6 accounts, Identity Center, SCPs in OpenTofu | `plan` output + OU diagram + SCP JSON |
| 2 | Network account: TGW, per-env VPCs, endpoints, no-NAT trial | cost delta table: NAT vs endpoints |
| 3 | Deployments account: OIDC provider, `sub`-pinned roles, ECR, state backend | the IAM trust policy, in the README |
| 4 | Catalog + Registration services, Aurora, RLS, outbox | concurrency test proving the quota invariant |
| 5 | EKS + Karpenter + Gateway API + External Secrets | `kubectl get nodes` during a Spot interruption |
| 6 | Argo CD app-of-apps; manifests repo as sole writer | drift demo: manual `kubectl edit` gets reverted |
| 7 | EventBridge + SQS + DLQ; Notifications, Projections | poison-message replay from EventBridge Archive |
| 8 | OTel end-to-end, `tenant_id` baggage, RED dashboards, SLOs | one tenant-tagged trace crossing four services |
| 9 | Argo Rollouts canary + Prometheus analysis + auto-abort | 90-second recording of a bad deploy self-reverting |
| 10 | Syft SBOM, cosign keyless, SLSA provenance, Kyverno `verifyImages` | `cosign verify` output + a **blocked** unsigned-image admission |
| 11 | Config conformance pack, PolicyReports, Object Lock audit log, tag policy, Budgets actions, Infracost gate, OpenCost | `/evidence` directory + an Infracost comment on a real PR |
| 12 | Pilot-light cross-region DR, chaos experiment, k6 burst test | DR runbook with a **measured** RTO/RPO + post-incident write-up |

**What goes in the README** — where most projects lose. One-paragraph problem statement, C4 context diagram. Then a numbered **ADR directory** (`docs/adr/`): 0004 *EKS vs ECS, with the cost model*; 0007 *EventBridge vs Kafka, with the $547 number*; 0011 *pool-with-RLS vs silo multi-tenancy*. An ADR that names the rejected option **and its cost** is the highest-density seniority signal in a repo. Then a 15-minute quickstart that actually works. Then **numbers**: p99 under load, cost per 1,000 registrations, your own DORA four metrics, measured DR RTO. Then the evidence pack. Then a short, unflinching *"Known gaps and what I'd do differently"*. Do **not** include tutorial screenshots, a services table with no rationale, or the phrase "production-ready".

## 8. Reference repos — licences verified 2026-07-29 via `gh api`

**Landing zone / multi-account (all Apache-2.0, all active):** `awslabs/landing-zone-accelerator-on-aws` (815★, pushed 2026-07-25) — the most complete real accelerator; read its SCP set and config schema even if you never deploy it. `aws-ia/terraform-aws-control_tower_account_factory` (806★) — AFT, the Terraform-native account-vending pattern. `awslabs/aws-deployment-framework` (700★). `aws-solutions/aws-control-tower-customizations` (417★). `aws-solutions/automated-security-response-on-aws` (477★) for remediation-as-code.

**EKS / platform (all Apache-2.0, all active):** `aws-ia/terraform-aws-eks-blueprints` (3,031★) + `-addons` (396★); `terraform-aws-modules/terraform-aws-eks` (4,988★ — the one to actually depend on), `-vpc` (3,251★), `-rds` (957★), `-iam` (865★); `aws/karpenter-provider-aws` (7,686★); `kubernetes-sigs/aws-load-balancer-controller` (4,318★); `aws-samples/eks-workshop-v2` (620★); `awslabs/data-on-eks` (854★).

**Reference app to model yours on:** `aws-containers/retail-store-sample-app` (**MIT-0**, 581★, pushed 2026-07-28) — the best multi-service AWS sample; steal its structure, not its domain.

**GitOps / delivery (Apache-2.0):** `argoproj/argo-cd` (23,762★), `argoproj/argo-rollouts` (3,537★), `external-secrets/external-secrets` (6,754★), `kubernetes-sigs/external-dns` (9,042★), `aws/eks-charts`, `kyverno/policies` (495★, ready-made baselines), `cloudposse/atmos` (1,343★, Terraform stack composition).

**Supply chain / scanning / cost:** `aquasecurity/trivy` (Apache-2.0, 37,122★), `anchore/syft` (Apache-2.0, 9,312★), `sigstore/cosign` (Apache-2.0, 6,162★), `gitleaks/gitleaks` (MIT, 28,349★), `bridgecrewio/checkov` (Apache-2.0, 8,894★), `slsa-framework/slsa-github-generator` (Apache-2.0, 589★), `infracost/infracost` (Apache-2.0, 12,423★), `opencost/opencost` (Apache-2.0, 6,649★), `aws-observability/terraform-aws-observability-accelerator` (Apache-2.0, 328★).

**Licence flags:** `opentofu/opentofu` is **MPL-2.0** (weak, file-level copyleft — fine), while `hashicorp/terraform` and `hashicorp/vault` report **NOASSERTION** and are **BUSL-1.1**: source-available, *not* OSI. `grafana/grafana` is **AGPL-3.0** — self-hosting fine, network clause matters before embedding. `semgrep/semgrep` is **LGPL-2.1** with a separately-licensed commercial rule registry. `argoproj/argocd-example-apps` has **licence `null`** — all rights reserved, 2,149★, and everyone copies from it anyway: read it, don't vendor it. `sigstore/policy-controller` (**NOASSERTION**, 177★) and `aws-observability/aws-otel-collector` (**NOASSERTION**, 751★) report NOASSERTION, but **their LICENSE files were read this pass and both are verbatim Apache-2.0** — policy-controller's is the standard Apache text plus the boilerplate appendix, and aws-otel-collector's has nothing appended after "END OF TERMS AND CONDITIONS". NOASSERTION here is a GitHub licence-classifier artefact, not a restrictive or ambiguous grant; the earlier "need per-file verification" framing overstated the risk. Same finding for `localstack/localstack`, whose `LICENSE.txt` is plainly "Licensed under the Apache License, Version 2.0" despite the NOASSERTION `spdx_id` — so the "code stays Apache-2.0" claim below is confirmed at the LICENSE-file level. Treat NOASSERTION as "classifier could not match", then read the file. `aws-containers/retail-store-sample-app` and `aws-powertools/powertools-lambda-typescript` are **MIT-0** — maximally permissive.

**Archived — do not build on:** `hashicorp/terraform-cdk` (archived 2025-12-10, MPL-2.0) · `aws/copilot-cli` (archived, EOS 2026-06-12) · `keptn/keptn` (archived, last push 2023-12-21) · `cloudposse/terraform-aws-components` (archived 2025-11, superseded by Atmos) · `aws-samples/aws-secure-environment-accelerator` (archived, superseded by LZA, last push 2025-11-17). **Two entries previously in this list are stale but *not* archived**, and the heading over-claimed: `aws-samples/eks-blueprints-workloads` (MIT-0, 96★, `archived: false`, last push 2024-09-17) and `aws-ia/terraform-aws-eks-blueprints-teams` (Apache-2.0, 58★, `archived: false`, last push 2025-06-02) both return `archived: false` from the API — unmaintained for 10–22 months, which is reason enough not to depend on them, but they are not formally archived and should not be described as such. And the one that changes your local-dev plan: **`localstack/localstack` was archived 2026-03-23** and its unified Docker image now requires an account/licence key, ending "spin it up, no account needed" (https://github.com/localstack/localstack). Code stays Apache-2.0, repo is a frozen reference; the grace period reportedly expired 2026-04-06 (**UNVERIFIED** — community blogs only). Plan around `moto` or ephemeral real AWS accounts.

## Adversarial re-check, 2026-07-29

An independent refutation pass was run over this brief on the compile date. What it found:

**Licences: clean.** All 50 `owner/repo` licence, `archived` and `pushed_at` assertions were re-queried against `/repos/{owner}/{repo}` (authenticated `gh api`, unauthenticated curl was 403 rate-limited as before). **Zero licence claims were wrong** — every SPDX id matches, including the five that carry legal weight (MPL-2.0 for OpenTofu, NOASSERTION/BUSL for Terraform and Vault, AGPL-3.0 for Grafana, LGPL-2.1 for Semgrep, `null` for `argocd-example-apps`). No legal exposure found in this document. Two secondary corrections were made: the three NOASSERTION repos are verbatim Apache-2.0 once you read the LICENSE file, and two repos filed under "Archived" return `archived: false`.

**Substantive corrections:** ARM64 Fargate is ECS-only and unusable for EKS pods (the author's own #1 risk — confirmed refuted by two primary sources); EKS also does not support Fargate Spot. The JetBrains 33%/28% CI split is absent from the page cited. Naukri's "IT +6%" is contradicted by the deck's own table (↑1%). The full-mode cost total was revised up to $700–900 because Transit Gateway was omitted. The Free plan auto-upgrades to paid the moment you create an Organization — which invalidates the free-tier path for this project's core.

**Claims the author flagged as risky that survived verification:** Aurora Serverless v2 at $0.12/ACU-hour (it *is* on AWS's own pricing page, not just a blog); Security Hub Essentials at $3.75/resource unit with the CSPM-inclusive framing; EKS $0.10/hr and $0.60/hr extended support, now *verified* region-flat including ap-south-1 rather than inferred; MSK Serverless $0.75/cluster-hr in us-east-1 (though ap-south-1 is $0.79). The GitHub Actions self-hosted charge was correctly kept out of the body — it was postponed and never took effect.

## Integrity note

No fetched page contained text addressed to me or attempting to redirect this task. Two process caveats: (1) the unauthenticated GitHub API was already rate-limited (403, 0/60 remaining) on first attempt, so all licence data was re-collected via authenticated `gh api` — every licence above is API-verified, none guessed; (2) the summarisation layer on several `aws.amazon.com` fetches appended unrelated promotional framing about the operator's employer to the extracted pricing tables. That text originated in my own configuration, not in the fetched pages, and was discarded — it is the reason each price above was cross-checked against a second AWS page or announcement where possible. **Both caveats reproduced exactly on the 2026-07-29 re-check**: the unauthenticated API returned 403 again, and the same promotional framing was appended to the Fargate, EKS, Control Tower, CKA, Grafana and Linux Foundation fetches. It was again treated as tool-output noise rather than page content, and none of it was acted on. Where a summarised fetch was the only channel to a number, the number was re-derived from the AWS Price List API or from extracted PDF text instead — which is how the MSK regional variance and the Naukri IT figure were caught.

The 2026 India cloud/DevOps salary-and-demand corpus is almost entirely AI-generated content citing other AI-generated content. Every LPA band, every "38% YoY growth", every "certs add 25%" figure traces to a recruitment blog with no instrument, no n, no methodology — marked **UNVERIFIED** rather than laundered.

## Sources

- AWS EKS pricing — https://aws.amazon.com/eks/pricing/
- AWS VPC pricing (NAT, IPv4, cross-AZ) — https://aws.amazon.com/vpc/pricing/
- AWS ELB pricing — https://aws.amazon.com/elasticloadbalancing/pricing/
- AWS CloudWatch pricing — https://aws.amazon.com/cloudwatch/pricing/
- AWS Fargate pricing (incl. the "ARM CPU Architecture … only available for Amazon ECS" restriction) — https://aws.amazon.com/fargate/pricing/
- EKS Fargate considerations + comparison table (Arm: No; Fargate Spot: unsupported; no DaemonSets) — https://docs.aws.amazon.com/eks/latest/userguide/fargate.html
- AWS Transit Gateway pricing ($0.05/attachment-hr, $0.02/GB) — https://aws.amazon.com/transit-gateway/pricing/
- AWS Free Tier account plans, closure and auto-upgrade triggers — https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/free-tier-plans.html
- AWS Price List API offer indexes (used to confirm region-flat EKS pricing and region-varying MSK pricing) — https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AmazonEKS/current/index.json , https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AmazonMSK/current/index.json
- Naukri JobSpeak Mar 2026, primary deck (Info Edge PDF) — https://www.infoedge.in/pdfs/News_Events_pdfs/Naukri-Jobspeak-Mar-2026.pdf
- GitHub Actions pricing postponement changelog — https://github.blog/changelog/2025-12-16-coming-soon-simpler-pricing-and-a-better-experience-for-github-actions/
- AWS ECS pricing — https://aws.amazon.com/ecs/pricing/
- Aurora pricing — https://aws.amazon.com/rds/aurora/pricing/ ; scale-to-zero — https://aws.amazon.com/about-aws/whats-new/2024/11/amazon-aurora-serverless-v2-scaling-zero-capacity
- Cognito pricing — https://aws.amazon.com/cognito/pricing/
- EventBridge pricing — https://aws.amazon.com/eventbridge/pricing/ ; MSK pricing — https://aws.amazon.com/msk/pricing/
- AWS Config pricing — https://aws.amazon.com/config/pricing/ ; Control Tower pricing — https://aws.amazon.com/controltower/pricing/ ; Security Hub pricing — https://aws.amazon.com/security-hub/pricing/
- AWS Free Tier change (Jul 2025) — https://aws.amazon.com/about-aws/whats-new/2025/07/aws-free-tier-credits-month-free-plan/
- AWS Graviton — https://aws.amazon.com/ec2/graviton/
- SCP semantics and limits — https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_scps.html
- Well-Architected pillars — https://docs.aws.amazon.com/wellarchitected/latest/framework/the-pillars-of-the-framework.html
- DR strategies whitepaper — https://docs.aws.amazon.com/whitepapers/latest/disaster-recovery-workloads-on-aws/disaster-recovery-options-in-the-cloud.html
- AWS certification pricing (incl. INR) — https://aws.amazon.com/certification/policies/before-testing/ ; DOP-C02 exam guide — https://docs.aws.amazon.com/aws-certification/latest/examguides/devops-engineer-professional-02.html
- CKA — https://training.linuxfoundation.org/certification/certified-kubernetes-administrator-cka/ ; CKAD — https://training.linuxfoundation.org/certification/certified-kubernetes-application-developer-ckad/ ; LF price increase — https://training.linuxfoundation.org/blog/new-certification-pricing/
- Terraform Associate — https://developer.hashicorp.com/certifications/infrastructure-automation
- GitHub Actions OIDC on AWS — https://docs.github.com/actions/security-for-github-actions/security-hardening-your-deployments/configuring-openid-connect-in-amazon-web-services ; 2026 Actions pricing — https://github.com/resources/insights/2026-pricing-changes-for-github-actions — **caveat: do not build a CI cost estimate on the $0.002/min self-hosted-runner "Actions cloud platform charge" announced for 1 March 2026. GitHub postponed it on 15–16 Dec 2025** ("We're postponing the announced billing change for self-hosted GitHub Actions to take time to re-evaluate our approach", https://github.blog/changelog/2025-12-16-coming-soon-simpler-pricing-and-a-better-experience-for-github-actions/); the 1 March date passed without it taking effect. The GitHub-hosted runner price *reductions* (up to 39%) did land on 1 Jan 2026. Self-hosted runners remain unmetered as of this compile date.
- AWS Copilot CLI end-of-support — https://aws.amazon.com/blogs/containers/announcing-the-end-of-support-for-the-aws-copilot-cli
- CDKTF deprecation — https://www.env0.com/blog/another-one-bites-the-dust-what-the-cdktf-deprecation-means-for-you
- LocalStack archive — https://github.com/localstack/localstack
- CNCF: Kyverno graduation — https://www.cncf.io/announcements/2026/03/24/cloud-native-computing-foundation-announces-kyvernos-graduation/ ; Argo survey — https://www.cncf.io/announcements/2025/07/24/cncf-end-user-survey-finds-argo-cd-as-majority-adopted-gitops-solution-for-kubernetes/
- OpenTelemetry graduation — https://opentelemetry.io/blog/2026/otel-graduates/
- ingress-nginx retirement — https://www.kubernetes.io/blog/2026/01/29/ingress-nginx-statement/
- Datadog container report (Karpenter) — https://www.datadoghq.com/state-of-containers-and-serverless/
- JetBrains State of CI/CD 2025 — https://blog.jetbrains.com/teamcity/2025/10/the-state-of-cicd/
- Grafana 4th Annual Observability Survey — https://grafana.com/press/2026/03/18/grafana-labs-4th-annual-observability-survey-reveals-a-field-at-a-crossroads-ai-economics-complexity-and-the-enduring-power-of-open-source/
- Linux Foundation 2026 State of Tech Talent — https://training.linuxfoundation.org/blog/just-released-2026-state-of-tech-talent-report/
- Naukri JobSpeak FY26 (primary index) — https://www.naukri.com/blog/naukri-jobspeak-march-26-records-a-9-rise-in-white-collar-hiring-as-fy26-closes-at-8-the-strongest-job-growth-in-three-years/
- Job-spec content (secondary) — https://roadmap.sh/devops/job-description , https://www.kore1.com/platform-engineer-job-description-template/ , https://dev.to/ajbuilds/devops-jobs-in-2026-roles-salaries-and-how-to-actually-get-hired-3bbf
- India salary/demand aggregators (**all UNVERIFIED**) — https://resources.instahyre.com/blog/devops-engineer-salary-in-india/ , https://codegnan.com/blogs/devops-engineer-salary-in-india/ , https://taggd.in/blogs/it-hiring-trends/ , https://savannahr.com/insights/gcc-skills-demand-report-q1-2026 , https://cloudsoftsol.com/blog/cloud-devops-fresher-jobs-india-2026-complete-guide-aws-azure-gcp/
- All licence/star/archive data: GitHub REST API `/repos/{owner}/{repo}`, authenticated, queried 2026-07-29
