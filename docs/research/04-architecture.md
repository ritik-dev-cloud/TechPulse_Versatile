# Microservices, Monoliths & Event-Driven Architecture

> Research brief · compiled 2026-07-29 · sources cited inline.

## Reader warning, up front

The "monolith renaissance" discourse is now heavily polluted by AI-generated SEO blogs that cite each other. Two figures circulating everywhere — **"CNCF says 42% of orgs are consolidating microservices"** and **"service mesh adoption fell 18% → 8%"** — do **not** appear in the actual CNCF Annual Survey announcement (https://www.cncf.io/announcements/2026/01/20/kubernetes-established-as-the-de-facto-operating-system-for-ai-as-production-use-hits-82-in-2025-cncf-annual-cloud-native-survey/), which reports only 82% Kubernetes-in-production, 98% cloud-native adoption, 59% "much/nearly all" cloud native, and 47% citing cultural change as the top challenge. Both are flagged **UNVERIFIED** below. Treat them as folklore until someone produces the survey question.

## 1. Microservices: where the industry actually landed

The honest consensus is **"microservices are a specific tool for a specific organizational problem, not a default."** The most load-bearing statement comes from Sam Newman — the person who wrote the book — who told QCon London that microservices should not be the default choice, frames distributed systems as an architecture of *last resort*, and has said that with half of all the clients he has worked with, he told them microservices were not for them, recommending the modular monolith as the underrated option (https://www.infoq.com/news/2020/05/monolith-decomposition-newman/, https://www.theregister.com/2020/03/04/microservices_last_resort/). Martin Fowler's MonolithFirst remains the canonical argument: you cannot know your boundaries at inception, so build the monolith, find the seams, then split — and be willing to treat the first monolith as sacrificial. Note Fowler's own hedge: he says he doesn't feel he has enough anecdotes to get a firm handle on how to decide (https://martinfowler.com/bliki/MonolithFirst.html).

A striking piece of evidence for "the debate is over" is **absence**: the Thoughtworks Technology Radar Vol 34 (April 2026), read in full (58 pages, https://www.thoughtworks.com/content/dam/thoughtworks/documents/radar/2026/04/tr_technology_radar_vol_34_en.pdf), contains **no blip at all** for microservices, monolith, modular monolith, service mesh, saga, or CQRS. Likewise the InfoQ Software Architecture and Design Trends Report (https://www.infoq.com/articles/architecture-trends-2025/) has no microservices/monolith/EDA/service-mesh entries; its blips are Agentic AI (Innovator), Small Language Models (Innovator), RAG (Early Adopter), Socio-Technical Architecture (Early Adopter), Green Software and Privacy Engineering (Innovator), AI-Assisted Development (Early Majority). The pattern war has left the trends conversation — it is now assumed background knowledge, and the oxygen has gone to AI.

### Consolidation cases (real, with numbers)

- **Amazon Prime Video** — the most-misquoted post in the industry. Precisely: the **Video Quality Analysis team's audio/video monitoring service only** — one service, not Prime Video, not Amazon — moved from AWS Step Functions orchestration plus Lambda components passing video frames through S3, into a single process running in one Amazon ECS task with in-memory frame transfer. Reported: moving to a monolith reduced infrastructure cost by over 90%, plus increased scaling headroom to thousands of streams. The bottlenecks named were Step Functions state-transition costs/limits and expensive S3 Tier-1 calls used as intermediate frame storage (https://www.thestack.technology/amazon-prime-video-microservices-monolith/). **They did not claim microservices are bad.** Adrian Cockcroft's rebuttal is the correct read: this is not a microservices-to-monolith story but a Step-Functions-to-microservices story — a Serverless-First prototype refactored into an autoscaled container inside a larger event-driven system, which he calls best practice (https://adrianco.medium.com/so-many-bad-takes-what-is-there-to-learn-from-the-prime-video-microservices-to-monolith-story-4bd0970423d4). Anyone citing "Amazon abandoned microservices and saved 90%" is wrong on scope *and* on causation — the saving was mostly S3/Step Functions call elimination, not "monolith good."
- **Segment** — the strongest genuine reversal. Service-and-queue per destination, adding ~3 destinations/month; shared-library versioning became high-risk; load skew ranged from a handful of events per day to thousands per second per service. They described falling from the microservices tree and hitting every branch on the way down, collapsed back to one service behind an aggregator (Centrifuge), and reported **46 shared-library improvements in six months versus 32 in all of 2016**. Explicit cost: they lost fault isolation — one destination's bug crashes all (https://www.infoq.com/news/2018/07/segment-microservices, https://changelog.com/podcast/312).
- **Istio itself** — in 1.5 (March 2020) it consolidated Pilot, Galley, Citadel and the sidecar injector into a single binary, **istiod**, and removed Mixer. Stated rationale: the benefits of independent rollout and independent scale *did not apply to their control plane* (https://istio.io/latest/blog/2020/istiod/). The cleanest available example of "we had microservices where we needed a module."

### Decomposition-win / right-sizing cases

- **Uber DOMA** — ~2,200 critical microservices classified into ~70 domains with layered dependency rules, domain gateways, and extension points. Reported: 25–50% reduction in feature onboarding time, platform support costs down an order of magnitude, one adopter's integration going from three days to three hours. Their diagnosis of the failure mode is the key transferable idea: services that all have to be deployed together to safely perform any change are **networked monoliths**, and a single root-cause investigation could span ~50 services across 12 teams. They also cite a **~1.5-year half-life for microservices** (50% churn every 18 months) (https://www.uber.com/en-IN/blog/microservice-architecture/).
- **Shopify** — kept one Rails codebase but enforced internal component boundaries (evolving toward Rails Engines), explicitly to get modularity without increasing the number of deployment units (https://shopify.engineering/deconstructing-monolith-designing-software-maximizes-developer-productivity, https://shopify.engineering/shopify-monolith).
- **Monzo** — the counter-example that microservices *do* scale organizationally: 1,500 services when they built Kubernetes network-policy isolation via a code-analysis tool (`rpcmap`) and Calico (https://monzo.com/blog/we-built-network-isolation-for-1-500-services), reported at ~2,800 services later, sustained by a central migrations team plus heavy automation rather than per-team migrations (https://www.infoq.com/news/2024/09/monzo-microservices-migrations).

## 2. Event-driven architecture in practice

The four things are routinely conflated and should not be:

| Pattern | What it is | Genuinely warranted when | Cost |
|---|---|---|---|
| **Pub/sub** (EventBridge, SNS, NATS core, RabbitMQ) | Fire-and-forget notification, no replay | Fan-out, decoupling deploys | Cheapest to adopt |
| **Event streaming** (Kafka, Pulsar, Kinesis, Redpanda) | Durable, ordered-per-partition, replayable log | *Multiple independent consumers* need the same history; you need replay/backfill | Real operational burden |
| **Event sourcing** | Events as the *system of record* | Genuine audit/temporal-query domains (finance, ledgers, compliance) | Highest; requires versioning every event forever |
| **CQRS** | Separate read/write models | Asymmetric read/write scaling | Independent of event sourcing despite being paired with it |

### Concrete costs, stated accurately

- **Exactly-once is a scoped guarantee, not a system property.** Kafka's EOS covers Kafka-internal read-process-write within a transaction; it does not extend across a database boundary. The transactional outbox gives you **at-least-once** publication with atomicity against your DB — consumers must still be idempotent (https://www.conduktor.io/glossary/outbox-pattern-for-reliable-event-publishing).
- **The dual-write problem** is the actual reason outbox exists: writing to DB and broker without a shared transaction loses events or emits phantom events on rollback. Fix: write the event to an outbox table inside the business transaction, then relay. Relay choice: **Debezium/CDC** (sub-10ms after commit, but you now operate Kafka Connect) versus a **polling relay** (a few hundred lines you control). Reasonable field guidance: don't stand up Kafka Connect solely for an outbox if polling meets your latency budget (https://floriancourouge.com/en/blog/transactional-outbox-pattern-postgres-kafka-debezium).
- **Ordering** is per-partition only; global ordering means one partition, i.e. no parallelism.
- **Debugging** is the underrated cost — causality is no longer in a stack trace (https://www.forbes.com/councils/forbestechcouncil/2025/11/26/event-driven-architecture-watch-out-for-these-pitfalls-and-drawbacks/).
- **Schema evolution** requires a registry as a hard prerequisite, not a nice-to-have.

### Standards status (verified)

**CloudEvents graduated in CNCF on 25 January 2024** and is implemented by Azure Event Grid, Google Eventarc, Alibaba EventBridge, Knative, Argo, Falco, Harbor (https://www.cncf.io/announcements/2024/01/25/cloud-native-computing-foundation-announces-the-graduation-of-cloudevents/). **AsyncAPI** is a Linux Foundation project with LEGO, Walmart, eBay, Postman as named users. **Apicurio Registry** was accepted as a CNCF Sandbox project in June 2026 (https://www.apicur.io/blog/2026/06/18/apicurio-registry-joins-cncf) — schema governance is finally getting vendor-neutral infrastructure.

### Broker landscape

Kafka's differentiator is ecosystem, not speed. The live structural change is **diskless / object-storage-backed Kafka**: **KIP-1150 (diskless topics) was accepted by the Apache Kafka community in March 2026**, alongside AutoMQ, WarpStream and Aiven Diskless. Diskless trades latency for cost and is the wrong choice for low-latency inter-service messaging. NATS JetStream is the recommendation for lightest operational footprint (single binary, microsecond-range latency); Pulsar for strict multi-tenant isolation; Redpanda (C++, thread-per-core) for low-latency Kafka-compatible (https://www.automq.com/blog/kafka-alternatives-compared-2026 — **vendor-published, treat rankings as interested**).

## 3. Service communication and boundaries

**API styles.** The stable 2026 shape is boring and hybrid: REST for public/partner APIs, gRPC for internal service-to-service (especially polyglot), tRPC where a TypeScript client and server share one repo, and GraphQL as an aggregation/BFF layer over REST or gRPC rather than as the system's primary contract. The "GraphQL is cooling" argument is directionally supported by practitioners but the circulating numbers are bad: claims of "GraphQL at ~25% enterprise adoption, down from a ~40% peak," "REST ~83% of public APIs," specific npm download deltas, and Cosmo-vs-Apollo federation share swings all trace to AI-generated comparison blogs with no linked survey instrument — **UNVERIFIED, do not cite**. What *is* defensible: federation v2 is mature with multiple viable implementations (Apollo GraphOS, WunderGraph Cosmo, Grafbase), and the BFF-over-microservices pattern is the dominant enterprise deployment (https://wundergraph.com/blog/graphql-vs-federation-vs-trpc-vs-rest-vs-grpc-vs-asyncapi-vs-webhooks).

**Service mesh** is the clearest architectural correction of the period. Sidecars lost on operational cost — reported: 60% of KubeCon respondents cited complexity as the blocker to adoption, up from 25% in 2021. **Istio ambient mode reached GA in v1.24 on 7 November 2024**, with ztunnel, waypoints and APIs marked Stable after 26 months of work — L4 handled by a per-node ztunnel, L7 only where you deploy a waypoint proxy, eliminating per-pod sidecars and the double-hop (https://istio.io/latest/blog/2024/ambient-reaches-ga/, https://www.cncf.io/blog/2024/11/07/fast-secure-and-simple-istios-ambient-mode-reaches-general-availability-in-v1-24/). Cilium's eBPF-first approach competes by collapsing CNI, network policy, observability and mesh into one stack.

> **Selection rule:** Cilium when you want one eBPF networking stack; Istio ambient when you need rich L7 and the Envoy ecosystem; **nothing at all if you have fewer than ~20 services.**

Specific 2026 service-mesh percentages ("50%+ of new Istio installs ambient," "40–60% network overhead reduction," the 18%→8% decline) come from low-quality SEO domains — **UNVERIFIED**.

**Orchestration vs choreography, and the durable-execution shift.** This is the genuine emerging default and the best-sourced forward-looking finding in this brief. Thoughtworks Radar Vol 34 (April 2026) lists **"Ignoring durability in agent workflows" as a Hold/Caution anti-pattern**, stating that it produces systems that work in development but fail in production, that complex workflows running for days or weeks require durability, and naming **Temporal, Restate and Golem** as durable computing platforms, plus LangGraph and Pydantic AI as frameworks with native support. Their guidance: start with your framework's native durable execution, reach for a standalone platform as workflows become more critical or complex.

Crucially, the Radar's framing is *agent* workflows — AI agents are what pulled durable execution into the mainstream, and the same primitive then serves sagas, payments, and long-running business processes. Kai Waehner positions durable execution engines as complementary to Kafka rather than competing: the log for decoupled event distribution, the engine for stateful multi-step business processes (https://www.kai-waehner.de/blog/2025/06/05/the-rise-of-the-durable-execution-engine-temporal-restate-in-an-event-driven-architecture-apache-kafka/). Practical split: **Temporal** = mature, proven at scale, heaviest ops; **Restate** = simpler ops, HTTP-native; **DBOS** = library-in-process persisting execution state to Postgres, zero new infrastructure. ("DBOS first, Temporal when you hit the wall" is a blogger's opinion, not measured guidance — **UNVERIFIED as consensus**.)

Choreography remains right for notification fan-out; **orchestration via a durable engine now wins for anything with compensations, timeouts, or human-in-the-loop**, because it makes the state machine explicit and debuggable instead of implicit in event topology.

## 4. Data architecture

**Database-per-service is a *coupling* rule, not a *deployment* rule.** The defensible version: one service owns one schema, no other service reads it directly. Whether that schema lives in a separate cluster is an operational cost question. Shared *tables* across services is the reliable path to a distributed monolith; a shared *instance* with strictly private schemas is often fine.

**Distributed transactions:** 2PC/XA remains effectively dead across service boundaries. The real options are saga with explicit compensations (business logic must be compensable — refunds, not rollbacks), or **collapsing the boundary so a local ACID transaction suffices**. The second option is under-considered and is what Prime Video effectively did.

**Postgres-as-everything** is the strongest data-layer trend. Tiger Data's "It's 2026, Just Use Postgres" maps seven workloads to extensions — full-text search (pg_textsearch), vector (pgvectorscale), time-series (TimescaleDB), documents (JSONB), cache (UNLOGGED tables), queues (pgmq), geospatial (PostGIS) — and argues consolidation moved from an architectural preference to a functional requirement in the AI era because teams need fast iteration. Their benchmark claims (pgvectorscale at 28× lower p95 latency and 16× higher throughput than Pinecone at 99% recall; customer figures of 350× faster queries, 66% cost cut) are **vendor-published — directionally credible, not independent**. Their acknowledged limits are the useful part and are honest: Elasticsearch for petabyte clustering and Kibana, Pinecone for multi-tenant sharding at billions of vectors, Kafka for event streaming across dozens of services with multi-DC replication, Redis for sub-millisecond and Lua (https://www.tigerdata.com/blog/its-2026-just-use-postgres). Working dividing line for vectors: Postgres-resident is right up to roughly low tens of millions.

**Lakehouse convergence is settled.** Thoughtworks Radar Vol 34 places **Apache Iceberg in Adopt**, noting it is supported by all major data platform providers — AWS (Athena, EMR, Redshift), Snowflake, Databricks, Google BigQuery — that its snapshot design gives serializable isolation, safe concurrent writes through optimistic concurrency, and version history with rollback, and recommending it as a default choice for organizations building modern data platforms. Engines: Spark most common, plus Trino, Flink, DuckDB. The Radar also flags **DuckLake** as an emerging simplification — metadata in a catalog database rather than file-based metadata structures — still early in maturity but a promising lightweight alternative.

## 5. A decision framework

### Split when you observe (any two or more)

1. **Two teams' release cadences are blocking each other** in the same deploy pipeline — the *only* first-class reason, per Newman: the goal of decomposition is **independent deployability**.
2. **Genuinely divergent scaling profiles** in one deployment unit (Segment's "handful of events per day" beside "thousands per second" is the textbook signature).
3. **A fault-isolation requirement with a real blast radius** — but note Segment paid exactly this to escape ops overhead, so price it honestly.
4. **Hard compliance/data-residency boundaries** requiring separate infrastructure and access control.
5. **A stable, well-understood boundary.** If the seam has moved twice in six months, it isn't a service.

### Do NOT split when

1. The motivation is code organization — that's a module. Shopify's whole point.
2. The proposed services **must deploy together** — Uber's "networked monolith," strictly worse than a monolith.
3. You'd need a distributed transaction for a core write path.
4. You lack the platform substrate (CI/CD, tracing, service catalog, on-call). Microservices bill you for platform engineering whether or not you budgeted it.
5. It's a prototype whose bottleneck you can't yet name — Cockcroft's Serverless-First then refactor.
6. Team count is one. Fowler's YAGNI applies directly.

**Conway's law is the actual sizing function.** Service count should track *team* count, not domain-diagram boxes. Uber's ~2,200 services classified into ~70 domains is the reconciliation: **the team-aligned unit is the domain, not the service** — services are internal implementation detail behind a domain gateway. Monzo at 1,500–2,800 services works because a central platform team owns migrations and automation, not because service count is virtuous. The corresponding trend name is InfoQ's **Socio-Technical Architecture (Early Adopter)**: complex software systems need to be designed around the people who will build, support, and evolve them (https://www.infoq.com/articles/architecture-trends-2025/). Also plan for churn: Uber's ~1.5-year microservice half-life means a 200-service estate implies ~100 migrations per 18 months as standing work.

### AI coding agents and architecture — the honest answer: no rigorous evidence yet

The argument that agents favour monoliths is mechanically plausible and widely asserted: an agent in a single repo can trace a call path from handler to business logic to query and see the blast radius, whereas a change spanning six repos with six pipelines and six contracts exceeds what any context window or tool loop reconstructs reliably. Cross-service refactors also require coordinated deploys agents cannot safely perform. But every source making this claim is an opinion post, there is **no controlled study, benchmark, or survey**, and several of these posts launder the fabricated "CNCF 42%" figure as their evidence base. **Flag as UNVERIFIED.**

Two things *are* verifiable and matter more: (a) Thoughtworks Vol 34 documents that architects' scarce attention has shifted almost entirely to AI systems, with durable execution and agent reliability displacing pattern debates — and separately cautions against "MCP by default" and against **monolithic agents**, favouring pipelines of more constrained agents with strong monitoring and control, i.e. the modularity argument is being replayed one level up inside agent systems; and (b) Tiger Data's argument that agents write standard SQL well and proprietary APIs badly, a real (if vendor-framed) force pushing toward Postgres consolidation.

A defensible position: **agents lower the cost of change *within* a boundary far more than they lower the cost of *crossing* boundaries**, which shifts the economics toward fewer, larger, well-modularized deployment units — but state this as reasoning, not measured fact.

## Bottom line

The modular monolith with enforced internal boundaries, one owned schema per module, a durable-execution engine for multi-step workflows, an event log only where multiple consumers genuinely need replay, and Postgres until it demonstrably breaks — extracted into services only where independent deployability, scaling divergence, or compliance forces it — is the current defensible default for the large majority of enterprise systems.

## Sources

**Primary / high-confidence**
- https://martinfowler.com/bliki/MonolithFirst.html · https://martinfowler.com/articles/microservices.html
- https://www.infoq.com/news/2020/05/monolith-decomposition-newman/ · https://www.theregister.com/2020/03/04/microservices_last_resort/
- https://www.infoq.com/news/2018/07/segment-microservices · https://changelog.com/podcast/312
- https://istio.io/latest/blog/2020/istiod/ · https://istio.io/latest/news/releases/1.5.x/announcing-1.5/
- https://istio.io/latest/blog/2024/ambient-reaches-ga/ · https://www.cncf.io/blog/2024/11/07/fast-secure-and-simple-istios-ambient-mode-reaches-general-availability-in-v1-24/
- https://www.uber.com/en-IN/blog/microservice-architecture/
- https://shopify.engineering/deconstructing-monolith-designing-software-maximizes-developer-productivity · https://shopify.engineering/shopify-monolith
- https://monzo.com/blog/we-built-network-isolation-for-1-500-services · https://www.infoq.com/news/2024/09/monzo-microservices-migrations
- https://www.thoughtworks.com/content/dam/thoughtworks/documents/radar/2026/04/tr_technology_radar_vol_34_en.pdf (Vol 34, April 2026 — read in full)
- https://www.infoq.com/articles/architecture-trends-2025/
- https://www.cncf.io/announcements/2026/01/20/kubernetes-established-as-the-de-facto-operating-system-for-ai-as-production-use-hits-82-in-2025-cncf-annual-cloud-native-survey/
- https://www.cncf.io/announcements/2024/01/25/cloud-native-computing-foundation-announces-the-graduation-of-cloudevents/ · https://cloudevents.io/
- https://www.apicur.io/blog/2026/06/18/apicurio-registry-joins-cncf
- https://adrianco.medium.com/so-many-bad-takes-what-is-there-to-learn-from-the-prime-video-microservices-to-monolith-story-4bd0970423d4
- https://www.thestack.technology/amazon-prime-video-microservices-monolith/ · https://www.thestack.technology/prime-video-monolith-architecture-debate-bad-takes-adrian-cockcroft/

**Vendor-published (interested party — directionally useful)**
- https://www.tigerdata.com/blog/its-2026-just-use-postgres
- https://www.automq.com/blog/kafka-alternatives-compared-2026 · https://www.automq.com/blog/top-7-diskless-kafka-object-storage-streaming-platforms-2026
- https://www.kai-waehner.de/blog/2025/06/05/the-rise-of-the-durable-execution-engine-temporal-restate-in-an-event-driven-architecture-apache-kafka/
- https://wundergraph.com/blog/graphql-vs-federation-vs-trpc-vs-rest-vs-grpc-vs-asyncapi-vs-webhooks
- https://www.conduktor.io/glossary/outbox-pattern-for-reliable-event-publishing · https://floriancourouge.com/en/blog/transactional-outbox-pattern-postgres-kafka-debezium

**Practitioner commentary**
- https://www.forbes.com/councils/forbestechcouncil/2025/11/26/event-driven-architecture-watch-out-for-these-pitfalls-and-drawbacks/
- https://www.boyney.io/blog/2024-11-25-five-open-source-standards
- https://blog.howardjohn.info/posts/past-present-future-istio-install/
- https://pauldjohnston.medium.com/prime-video-serverless-monoliths-bad-blog-posts-and-the-importance-of-definitions-f29aeca0af7d

## UNVERIFIED — do not cite downstream

Traced to AI-generated/SEO content, and either contradicted by or absent from the primary source it claims:

- "CNCF: 42% of orgs consolidating microservices"
- "Service mesh adoption fell 18% → 8%"
- "Neal Ford and Sam Newman declared 2026 the renaissance of the monolith"
- "90% of enterprise projects served by a modular monolith"
- GraphQL 25%/40% adoption figures and all npm/federation share numbers
- The "Jan 2026 case study: 93% faster, $18k→$2.4k, 45min→6min" and "microservices cost 3.75–6× monoliths"
- All 2026 service-mesh percentages (ambient install share, 40–60% overhead reduction)
- "AI agents reason better in monoliths" as *measured* fact
