# AWS & Cloud Platform Landscape

> Research brief · compiled 2026-07-29 · sources cited inline.
> Claims that could not be traced to a primary source are marked **UNVERIFIED** — treat those as leads, not facts.

## 1. New and notable AWS launches (2025 → July 2026)

**Serverless compute.** re:Invent 2025 (Dec 1–5, 2025) shipped **AWS Lambda Durable Functions** — stateful, long-running orchestration inside Lambda with built-in checkpointing, retries and recovery, executions that can pause up to one year ([AWS top announcements](https://aws.amazon.com/blogs/aws/top-announcements-of-aws-reinvent-2025/)). It expanded to 16 more regions in April 2026 ([What's New](https://aws.amazon.com/about-aws/whats-new/2026/04/lambda-durable-functions-16-new-regions/)) and the **.NET durable execution SDK hit GA** the week of July 27, 2026 ([Weekly Roundup](https://aws.amazon.com/blogs/aws/aws-weekly-roundup-july-27-2026/)). Also at re:Invent 2025: **Lambda Managed Instances** (dedicated EC2/GPU-backed Lambda, later raised to 32 GB memory) and **Lambda tenant isolation mode** — pass a tenant ID at invoke time and Lambda guarantees execution environments are never shared across tenants, aimed at SaaS/code-execution workloads ([What's New, Nov 2025](https://aws.amazon.com/about-aws/whats-new/2025/11/aws-lambda-tenant-isolation-mode)); in Q2 2026 tenant isolation extended to SQS/Kinesis/EventBridge event source mappings ([Serverless ICYMI Q2 2026](https://aws.amazon.com/blogs/compute/serverless-icymi-q2-2026/)). Q2 2026 also added **Lambda MicroVMs** (VM-level isolation, resume across 8-hour sessions), **S3 Files** (mount buckets as POSIX filesystems), scheduled scaling via EventBridge Scheduler, response streaming everywhere, and Ruby 4.0 ([same source](https://aws.amazon.com/blogs/compute/serverless-icymi-q2-2026/)).

Two quota changes matter architecturally: **Lambda Provisioned Mode for SQS ESM** (Nov 2025) — 3x faster scaling to 1,000 concurrent executions/minute and 16x higher ceiling at 20,000 concurrent executions ([What's New](https://aws.amazon.com/about-aws/whats-new/2025/11/aws-lambda-provisioned-mode-sqs-esm)); and **payload limits raised 256 KB → 1 MB** for async Lambda invokes, SQS messages and EventBridge events, effective Jan 29, 2026 ([EventBridge What's New](https://aws.amazon.com/about-aws/whats-new/2026/01/amazon-eventbridge-increases-event-payload-size-256-kb-1-mb), [AWS Compute Blog](https://aws.amazon.com/blogs/compute/more-room-to-build-serverless-services-now-support-payloads-up-to-1-mb)). This kills a lot of "claim-check to S3" boilerplate.

**Containers.** **ECS Express Mode** (Nov 21, 2025) takes an image plus two IAM roles and provisions Fargate, ALB, HTTPS, autoscaling, security groups and CloudWatch ([analysis](https://www.factualminds.com/blog/amazon-ecs-express-mode/)). **EKS Auto Mode** (GA from re:Invent 2024, GovCloud Oct 22, 2025) fully manages compute/storage/networking and node selection ([What's New](https://aws.amazon.com/about-aws/whats-new/2024/12/amazon-eks-auto-mode/), [GovCloud](https://aws.amazon.com/about-aws/whats-new/2025/10/amazon-eks-auto-mode-aws-govcloud-us-east-west)). New at re:Invent 2025: **EKS Capabilities** — managed Argo CD, AWS Controllers for Kubernetes (ACK) and kro whose controllers run in AWS-managed accounts, not your cluster ([AWS re:Post](https://repost.aws/articles/ARuQ_xaEg8TnOQh3sbXwdUvA/re-invent-2025-simplify-your-kubernetes-journey-with-amazon-eks-capabilities)). **GuardDuty Extended Threat Detection** extended to ECS ([top announcements](https://aws.amazon.com/blogs/aws/top-announcements-of-aws-reinvent-2025/)).

**Data.** **Aurora DSQL** GA May 27, 2025 — serverless, active-active multi-region, PostgreSQL wire-compatible, strong cross-region consistency, 99.999% multi-region availability, scale-to-zero, AWS claims up to 4x read/write vs other distributed SQL ([What's New](https://aws.amazon.com/about-aws/whats-new/2025/05/amazon-aurora-dsql-generally-available), [press release](https://press.aboutamazon.com/2025/5/aws-announces-the-general-availability-of-amazon-aurora-dsql-the-fastest-distributed-sql-database)); Frankfurt added Oct 2025, ~10 regions live ([What's New](https://aws.amazon.com/about-aws/whats-new/2025/10/amazon-aurora-dsql-available-in-frankfurt)). **S3 Tables** (managed Iceberg) integrated GA with SageMaker Lakehouse March 13, 2025 ([What's New](https://aws.amazon.com/about-aws/whats-new/2025/03/amazon-sagemaker-lakehouse-integration-s3-tables-generally-available)), then gained **table replication** (cross-region/cross-account) and **Intelligent-Tiering for Tables** (up to 80% storage savings) at re:Invent 2025 ([top announcements](https://aws.amazon.com/blogs/aws/top-announcements-of-aws-reinvent-2025/)). S3 also raised **max object size 5 TB → 50 TB** and made Batch Operations ~10x faster ([Logicata keynote recap](https://www.logicata.com/blog/36-announcements-aws-reinvent-2025-keynote/), [Blocks & Files](https://blocksandfiles.com/2025/12/03/aws-s3/)). **Database Savings Plans** — one commitment spanning RDS, Aurora, DynamoDB, ElastiCache, Neptune, DocumentDB, up to 35% off ([TechCrunch](https://techcrunch.com/2025/12/04/all-the-biggest-news-from-aws-big-tech-show-reinvent-2025/)). Redshift's 2026 story is serverless-by-default with AI-driven scaling, zero-ETL ingest from Aurora/RDS/DynamoDB, and Iceberg participation rather than warehouse lock-in ([Redshift Check-In Spring 2026](https://dev.to/aws-heroes/redshift-check-in-spring-2026-14cg)); note DynamoDB zero-ETL latency floor is ~15 minutes and continuous CDC can prevent Redshift Serverless from auto-pausing ([Usage AI](https://www.usage.ai/blogs/aws/reserved-instances/dynamodb/zero-etl-integration/)).

**AI/ML.** **Bedrock AgentCore** GA Oct 13, 2025 with VPC, PrivateLink, CloudFormation and tagging support ([What's New](https://aws.amazon.com/about-aws/whats-new/2025/10/amazon-bedrock-agentcore-available)); re:Invent 2025 added **AgentCore Policy** (deterministic guardrails on agent actions) and **AgentCore Evaluations** (13 prebuilt scorers). MCP is now first-class: open-source **AgentCore MCP server** (Oct 2025, [What's New](https://aws.amazon.com/about-aws/whats-new/2025/10/open-source-mcp-server-amazon-bedrock-agentcore)), **stateful MCP** in AgentCore Runtime with elicitation/sampling/progress notifications (Mar 10, 2026, [What's New](https://aws.amazon.com/about-aws/whats-new/2026/03/amazon-bedrock-agentcore-runtime-stateful-mcp)), an **AWS-for-SAP MCP server** GA May 2026 ([What's New](https://aws.amazon.com/about-aws/whats-new/2026/05/aws-sap-mcp-amazon-bedrock/)), and **IAM Policy Autopilot** shipped as an open-source MCP server. Step Functions gained a native **AgentCore reasoning step**; AgentCore observability consolidated into a single CloudWatch log group (July 2026). **Nova 2** family — Lite, Pro, Sonic (speech-to-speech), Omni (multimodal) — plus **Nova Forge** for mid-training on proprietary data and **Nova Act** GA for UI automation ([top announcements](https://aws.amazon.com/blogs/aws/top-announcements-of-aws-reinvent-2025/)). Bedrock added 18 open-weight models plus Mistral Large/Ministral 3, reinforcement fine-tuning, and **Claude Opus 5** with zero data retention by default (July 2026, [Weekly Roundup](https://aws.amazon.com/blogs/aws/aws-weekly-roundup-july-27-2026/)). **S3 Vectors** GA Dec 2025: 2B vectors/index (40x preview), 20T vectors/bucket, ~$0.06 per logical GB-month plus per-query metering; AWS's worked example is $11.38/mo for 10M vectors at 1M queries ([What's New](https://aws.amazon.com/about-aws/whats-new/2025/12/amazon-s3-vectors-generally-available/), [InfoQ](https://www.infoq.com/news/2026/01/aws-s3-vectors-ga/)). **Kiro**, the spec-driven agentic IDE (requirements.md/design.md/tasks.md), reached GA in 2026 — sources disagree between March and May 7, 2026 (**UNVERIFIED** exact date) at $20/$40/$100/$200 per user/month tiers ([Kiro pricing](https://pingax.com/kiro-pricing-free-tier/)).

**Compute silicon.** **Graviton5** GA June 2026: 192 cores/socket, 5x L3 cache, up to 25% faster than Graviton4, on-demand price 9% above Graviton4 (~15% better price-performance) ([InfoQ](https://www.infoq.com/news/2026/06/aws-graviton5-ga/), [About Amazon](https://www.aboutamazon.com/news/aws/aws-graviton-5-cpu-amazon-ec2)). **Trainium3 UltraServers** GA (4.4x compute, 3.9x memory bandwidth), **Trainium4** announced, **P6e GB300** GPU instances, **AWS AI Factories** for on-prem sovereign deployments ([Logicata](https://www.logicata.com/blog/36-announcements-aws-reinvent-2025-keynote/)).

**Networking.** **AWS Interconnect – multicloud** in preview (private high-speed links to other CSPs; Google Cloud first, Azure later in 2026), **Route 53 Global Resolver** (anycast DNS for public+private zones; existing Resolver renamed **Route 53 VPC Resolver**), NAT Gateway regional availability mode, VPC encryption controls (~$110/month per non-empty VPC), Transit Gateway native Network Firewall attachment, CloudFront flat-rate pricing plans (Nov 2025) ([AWS networking blog announcements](https://aws.amazon.com/blogs/networking-and-content-delivery/category/post-types/announcements/), [Chris Farris recap](https://www.chrisfarris.com/post/reinvent2025/)).

**Observability.** 40+ launches Jan–May 2026, themed on OpenTelemetry-as-standard: native **OTLP metrics ingestion** into a new high-cardinality metric store preserving counters/histograms/gauges without conversion, **PromQL support** and Query Studio, **CloudWatch Log Analytics** unifying Logs Insights + Live Tail + Contributor Insights with 23 new commands, a unified log store accepting third-party sources (Okta, CrowdStrike), and **Coding Agent Insights** for AI-tool adoption metrics ([AWS Observability ICYMI Jan–May 2026](https://aws.amazon.com/blogs/mt/aws-observability-icymi-jan-may-2026/), [CloudWatch OTel/PromQL](https://aws.amazon.com/blogs/mt/introducing-opentelemetry-promql-support-in-amazon-cloudwatch/), [InfoQ](https://www.infoq.com/news/2026/04/cloudwatch-opentelemetry-metrics/)). Security Hub 2.0 GA with near-real-time risk analytics and simpler pricing.

## 2. Deprecated, discouraged, or losing mindshare

- **AWS App Runner** — closed to new customers April 30, 2026; existing services keep running, no new features. AWS explicitly points to **ECS Express Mode** ([AWS App Runner page](https://aws.amazon.com/apprunner/), [Encore](https://encore.dev/articles/end-of-app-runner)). This is the biggest 2026 deprecation for small teams.
- **Amazon Q Developer** — being retired in favor of Kiro: new Free/Pro signups blocked May 15, 2026; newest Claude models Kiro-only from May 29, 2026; full end-of-support for IDE plugins and paid subs April 30, 2027 ([AWS DevOps Blog](https://aws.amazon.com/blogs/devops/amazon-q-developer-end-of-support-announcement/)).
- **Amazon CodeCatalyst** — closed to new customers Nov 7, 2025; AWS recommends CodeBuild/CodePipeline/CodeDeploy/CodeArtifact or partners ([AWS re:Post](https://repost.aws/questions/QUNYPqqKvZRZSn-NcawQ28HQ/amazon-q-developer-pro-and-amazon-codecatalyst)).
- **AWS Proton** — end of support Oct 7, 2026 ([AWS docs](https://docs.aws.amazon.com/proton/latest/userguide/getting-started-prerequisites.html)).
- **Earlier cohort still winding down** (closed to new customers July 25, 2024): CodeCommit, Cloud9, CloudSearch, SimpleDB, S3 Select, Data Pipeline, Forecast ([The Stack](https://www.thestack.technology/aws-deprecations-services-codecommit/), [WizzDev](https://wizzdev.com/blog/aws-codecommit-codestar-and-cloud9-eol-and-how-you-can-migrate/)). CodeStar projects ended July 31, 2024.
- **Losing mindshare without formal deprecation:** raw CloudFormation authoring (CDK/Terraform absorb it), Control Tower and AWS Config Recorders (called out as not evolving for modern org structures), CloudTrail data events (expensive, 30% surcharge for aggregation Athena already does) ([Chris Farris](https://www.chrisfarris.com/post/reinvent2025/)). Self-managed EKS node groups and Karpenter-by-hand are being displaced by EKS Auto Mode ([EKS Auto Mode analysis](https://alexandre-vazquez.com/eks-auto-mode/)).

## 3. What "modern AWS architecture" looks like in 2026

- **IaC:** Terraform (or **OpenTofu** for greenfield enterprise, on licensing/governance grounds) is the default; CDK is the AWS-native choice for teams already all-in on AWS and TypeScript; Pulumi has crossed into mainstream enterprise; CDKTF is a niche third; SAM survives as a Lambda-local dev/build tool rather than a platform IaC choice ([Wolyra](https://wolyra.ai/infrastructure-as-code-platform-choices-enterprise/), [CloudWizz](https://cloudwizz.com/blog/terraform-vs-pulumi-vs-cdk-2026/), [Pulumi](https://www.pulumi.com/blog/best-terraform-alternatives/)). SAM did gain BuildKit multi-stage/cross-arch builds in Q2 2026 ([ICYMI](https://aws.amazon.com/blogs/compute/serverless-icymi-q2-2026/)).
- **Compute:** the serverless-vs-container war is over — they're treated as complementary. The pragmatic default is Lambda for event handlers/APIs and **ECS Express Mode or EKS Auto Mode** for anything long-running, stateful, or with heavy dependencies. Durable Functions now absorbs orchestration work that previously forced Step Functions or a container.
- **Event backbone:** EventBridge is the recommended starting point (custom events, partner sources from Stripe/Datadog, filtering, schema registry, Pipes, Scheduler); the canonical fan-out remains **EventBridge → SNS → multiple SQS queues**, with EventBridge routing, SNS fanning out, SQS buffering per consumer ([techoral](https://techoral.com/aws/aws-eventbridge.html), [Serverless Land EDA](https://serverlessland.com/event-driven-architecture)). Kinesis/MSK are reserved for genuine high-throughput ordered streaming and ecosystem-Kafka requirements, not general app integration. EventBridge multi-region failover with Route 53 health checks is now a documented pattern ([ICYMI Q2 2026](https://aws.amazon.com/blogs/compute/serverless-icymi-q2-2026/)).
- **Data/AI defaults:** Iceberg-on-S3-Tables as the lakehouse substrate queried by Athena/EMR/Redshift/Spark; zero-ETL over hand-built pipelines; S3 Vectors for cost-sensitive RAG, OpenSearch for latency-sensitive vector search; Bedrock + AgentCore + MCP as the agent stack.
- **Governance:** Well-Architected added a new **Responsible AI Lens** plus updated **ML** and **Generative AI** lenses at re:Invent 2025, layered over the six core pillars ([AWS Architecture Blog](https://aws.amazon.com/blogs/architecture/announcing-the-updated-aws-well-architected-generative-ai-lens/), [Gen AI Lens docs](https://docs.aws.amazon.com/wellarchitected/latest/generative-ai-lens/generative-ai-lens.html)).

## 4. Cost / FinOps, Graviton, repatriation

Graviton is no longer optional: **>50% of AWS's new CPU capacity is Graviton for the third consecutive year, 98% of the top 1,000 EC2 customers use it, 120,000+ customers total**, and Graviton powered >40% of Amazon's own Prime Day compute ([About Amazon](https://www.aboutamazon.com/news/aws/aws-graviton-5-cpu-amazon-ec2), [AWS Graviton](https://aws.amazon.com/ec2/graviton/)). Headline claim remains up to 40% better price-performance vs equivalent x86.

FinOps has broadened from cloud cost to technology financial management: **98% of respondents now manage AI spend, 90% manage SaaS, 64% licensing, 57% private cloud, 48% data center**, and **78% of FinOps practices report into CTO/CIO** (up 18 points vs 2023) ([State of FinOps 2026](https://data.finops.org/), [nOps recap](https://www.nops.io/blog/state-of-finops-2026/), [Finout](https://www.finout.io/blog/state-of-finops-2026-report-key-trends-insights-and-what-comes-next)). AI cost management is the single most in-demand skill. AWS's counter-moves are commitment-flexibility products: Database Savings Plans (up to 35%), CloudFront flat-rate plans, SES pricing plans, S3 Intelligent-Tiering for Tables.

Repatriation is real but selective — FinOps is now the decision-support function for it, and migration and repatriation are happening simultaneously in the same organizations ([State of FinOps 2026](https://data.finops.org/), [CIO Dive](https://www.ciodive.com/news/cloud-spend-finops-repatriation-generative-ai-flexera/742886/)). Claims that "93% of enterprises are pulling AI workloads home" circulate but come from a vendor blog, not a primary survey — **UNVERIFIED** ([Practical Logix](https://www.practicallogix.com/the-great-cloud-repatriation-of-2026-why-93-of-enterprises-are-pulling-ai-workloads-home/)). Macro backdrop: Amazon FY2026 capex guided above $200B with AWS alone potentially ~$165B (up >70% YoY), and AWS Q2 2026 consensus was ~$40.5B revenue at 31–33% growth with ~33.8% operating margin, reported July 30, 2026 — i.e. **after this brief's date, so the actual numbers are UNVERIFIED** ([S&P Global preview](https://www.spglobal.com/market-intelligence/en/news-insights/research/2026/07/amazon-earnings-preview-q2-2026), [ts2](https://ts2.tech/en/amazon-earnings-outlook-aws-margins-under-pressure-amid-200-billion-capex-plan/)).

## 5. AWS vs Cloudflare Workers vs Azure vs GCP for a small team (web apps + APIs)

Market position: Q1 2026 cloud infrastructure was ~$129B, +35% YoY; **AWS ~31% share, Azure ~23–25%, GCP ~11–12%**, but growth diverges sharply — AWS 28% (some sources cite 19% for the infra segment), Azure ~40%, Google Cloud ~63% on $20.0B, its fastest quarter ever ([CloudZero](https://www.cloudzero.com/blog/cloud-service-providers/), [Tech Insider](https://tech-insider.org/google-cloud-82-percent-growth-aws-earnings-2026/)). Precise per-vendor growth figures vary by source and definition — treat the exact percentages as approximate.

- **Cloudflare Workers** is the better default for HTTP APIs and edge-sensitive web apps: sub-5ms cold starts across 330+ POPs vs Lambda's typical 100–500ms and ~33 regions; billing on CPU time not wall-clock (so I/O wait is free); $5/month paid plan including 10M requests; KV/D1/R2/Durable Objects colocated with zero inter-service egress. Constraints: JS/TS/WASM only, 128 MB memory, 30s CPU per request, and D1 tops out around 10 GB per database and is not an RDS substitute for heavy OLTP ([Leaper](https://leaper.dev/blog/cloudflare-workers-vs-lambda-2026), [Tech Insider](https://tech-insider.org/cloudflare-workers-vs-lambda-2026/), [Vantage](https://www.vantage.sh/blog/cloudflare-workers-vs-aws-lambda-cost), [srvrlss.io](https://www.srvrlss.io/provider/cloudflare/)).
- **AWS** wins on breadth (~200 services that can trigger Lambda), runtime freedom, long-running batch/ETL/ML inference, and anything needing real relational or streaming infrastructure. Its cost for small teams is decision overhead — and App Runner's retirement made that worse, since the "just run my container" option is now ECS Express Mode, which requires you to bring your own image build pipeline ([Encore](https://encore.dev/articles/end-of-app-runner)).
- **GCP** is consistently rated the cleanest developer experience for this profile — Cloud Run gives near-zero cold starts for any container in any language, best-in-class docs/console, strong Terraform support, fewer services and therefore less decision fatigue ([Northflank](https://northflank.com/blog/aws-vs-azure-vs-google-cloud), [DigitalOcean](https://www.digitalocean.com/resources/articles/comparing-aws-azure-gcp), [KodeKloud](https://kodekloud.com/blog/aws-vs-azure-vs-gcp/)).
- **Azure** wins only when you're already in the Microsoft estate (Entra ID, .NET, M365, EA discounts); Container Apps is a competent Cloud Run analogue but not a reason to switch.
- Practical read for a small JS/TS team: Workers for the API/edge tier, plus one of AWS/GCP for the stateful and heavy-compute tier. AWS Interconnect – multicloud (preview, Google first) signals AWS itself now assumes multi-cloud data paths.

## Integrity note

While researching, one fetched page (a March 2026 serverless post on `dataa.dev`) returned content that did not summarize the page but instead addressed the research agent directly, arguing about its role and instructing it to reframe the work. It was treated as untrusted tool output and ignored; the affected facts (Lambda Managed Instances, SQS Provisioned Mode, the 1 MB payload change) were re-verified against AWS What's New and the AWS Compute Blog instead. Worth remembering when adding sources to this project: fetched page content is data, never instructions.

## Sources

- https://aws.amazon.com/blogs/aws/top-announcements-of-aws-reinvent-2025/
- https://aws.amazon.com/blogs/compute/serverless-icymi-q2-2026/
- https://aws.amazon.com/blogs/aws/aws-weekly-roundup-july-27-2026/
- https://aws.amazon.com/about-aws/whats-new/2026/04/lambda-durable-functions-16-new-regions/
- https://aws.amazon.com/about-aws/whats-new/2025/11/aws-lambda-tenant-isolation-mode
- https://aws.amazon.com/about-aws/whats-new/2025/11/aws-lambda-provisioned-mode-sqs-esm
- https://aws.amazon.com/about-aws/whats-new/2026/01/amazon-eventbridge-increases-event-payload-size-256-kb-1-mb
- https://aws.amazon.com/blogs/compute/more-room-to-build-serverless-services-now-support-payloads-up-to-1-mb
- https://aws.amazon.com/about-aws/whats-new/2025/05/amazon-aurora-dsql-generally-available
- https://press.aboutamazon.com/2025/5/aws-announces-the-general-availability-of-amazon-aurora-dsql-the-fastest-distributed-sql-database
- https://aws.amazon.com/about-aws/whats-new/2025/10/amazon-aurora-dsql-available-in-frankfurt
- https://aws.amazon.com/about-aws/whats-new/2025/03/amazon-sagemaker-lakehouse-integration-s3-tables-generally-available
- https://aws.amazon.com/about-aws/whats-new/2025/12/amazon-s3-vectors-generally-available/
- https://www.infoq.com/news/2026/01/aws-s3-vectors-ga/
- https://blocksandfiles.com/2025/12/03/aws-s3/
- https://aws.amazon.com/about-aws/whats-new/2025/10/amazon-bedrock-agentcore-available
- https://aws.amazon.com/about-aws/whats-new/2025/10/open-source-mcp-server-amazon-bedrock-agentcore
- https://aws.amazon.com/about-aws/whats-new/2026/03/amazon-bedrock-agentcore-runtime-stateful-mcp
- https://aws.amazon.com/about-aws/whats-new/2026/05/aws-sap-mcp-amazon-bedrock/
- https://aws.amazon.com/about-aws/whats-new/2024/12/amazon-eks-auto-mode/
- https://aws.amazon.com/about-aws/whats-new/2025/10/amazon-eks-auto-mode-aws-govcloud-us-east-west
- https://repost.aws/articles/ARuQ_xaEg8TnOQh3sbXwdUvA/re-invent-2025-simplify-your-kubernetes-journey-with-amazon-eks-capabilities
- https://alexandre-vazquez.com/eks-auto-mode/
- https://www.factualminds.com/blog/amazon-ecs-express-mode/
- https://aws.amazon.com/apprunner/
- https://encore.dev/articles/end-of-app-runner
- https://aws.amazon.com/blogs/devops/amazon-q-developer-end-of-support-announcement/
- https://repost.aws/questions/QUNYPqqKvZRZSn-NcawQ28HQ/amazon-q-developer-pro-and-amazon-codecatalyst
- https://docs.aws.amazon.com/proton/latest/userguide/getting-started-prerequisites.html
- https://www.thestack.technology/aws-deprecations-services-codecommit/
- https://wizzdev.com/blog/aws-codecommit-codestar-and-cloud9-eol-and-how-you-can-migrate/
- https://www.chrisfarris.com/post/reinvent2025/
- https://www.logicata.com/blog/36-announcements-aws-reinvent-2025-keynote/
- https://techcrunch.com/2025/12/04/all-the-biggest-news-from-aws-big-tech-show-reinvent-2025/
- https://aws.amazon.com/blogs/mt/aws-observability-icymi-jan-may-2026/
- https://aws.amazon.com/blogs/mt/introducing-opentelemetry-promql-support-in-amazon-cloudwatch/
- https://www.infoq.com/news/2026/04/cloudwatch-opentelemetry-metrics/
- https://aws.amazon.com/blogs/networking-and-content-delivery/category/post-types/announcements/
- https://aws.amazon.com/blogs/architecture/announcing-the-updated-aws-well-architected-generative-ai-lens/
- https://docs.aws.amazon.com/wellarchitected/latest/generative-ai-lens/generative-ai-lens.html
- https://www.infoq.com/news/2026/06/aws-graviton5-ga/
- https://www.aboutamazon.com/news/aws/aws-graviton-5-cpu-amazon-ec2
- https://aws.amazon.com/ec2/graviton/
- https://data.finops.org/
- https://www.nops.io/blog/state-of-finops-2026/
- https://www.finout.io/blog/state-of-finops-2026-report-key-trends-insights-and-what-comes-next
- https://www.ciodive.com/news/cloud-spend-finops-repatriation-generative-ai-flexera/742886/
- https://www.practicallogix.com/the-great-cloud-repatriation-of-2026-why-93-of-enterprises-are-pulling-ai-workloads-home/
- https://www.spglobal.com/market-intelligence/en/news-insights/research/2026/07/amazon-earnings-preview-q2-2026
- https://ts2.tech/en/amazon-earnings-outlook-aws-margins-under-pressure-amid-200-billion-capex-plan/
- https://www.cloudzero.com/blog/cloud-service-providers/
- https://tech-insider.org/google-cloud-82-percent-growth-aws-earnings-2026/
- https://leaper.dev/blog/cloudflare-workers-vs-lambda-2026
- https://tech-insider.org/cloudflare-workers-vs-lambda-2026/
- https://www.vantage.sh/blog/cloudflare-workers-vs-aws-lambda-cost
- https://www.srvrlss.io/provider/cloudflare/
- https://northflank.com/blog/aws-vs-azure-vs-google-cloud
- https://www.digitalocean.com/resources/articles/comparing-aws-azure-gcp
- https://kodekloud.com/blog/aws-vs-azure-vs-gcp/
- https://wolyra.ai/infrastructure-as-code-platform-choices-enterprise/
- https://cloudwizz.com/blog/terraform-vs-pulumi-vs-cdk-2026/
- https://www.pulumi.com/blog/best-terraform-alternatives/
- https://techoral.com/aws/aws-eventbridge.html
- https://serverlessland.com/event-driven-architecture
- https://dev.to/aws-heroes/redshift-check-in-spring-2026-14cg
- https://www.usage.ai/blogs/aws/reserved-instances/dynamodb/zero-etl-integration/
- https://pingax.com/kiro-pricing-free-tier/
