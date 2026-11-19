# 0001: Cloudflare D1 as Single Source of Truth

## Status
Accepted

## Context & Problem Statement
The calorie tracker ecosystem previously split state between local SQLite (`calories.db` on host machine) and Cloudflare D1 (`hermes-calories-db` at the edge). Meals logged through mobile surfaces (WhatsApp Hermes agent) or the web PWA were recorded in one datastore, while entries logged via the local Hermes CLI or local dashboard were written to SQLite. This caused state divergence, sync conflicts, and stale dashboard views.

We needed a unified storage architecture that guarantees consistency across mobile and desktop interfaces without requiring manual two-way sync.

## Decision Drivers
* **Real-time consistency**: Instant visibility of logged meals across WhatsApp Hermes agent, Hermes local dashboard, and the Cloudflare PWA.
* **Edge performance**: Global low-latency database queries via Cloudflare Edge and D1.
* **Low operational overhead**: Serverless SQL without managing persistent self-hosted database infrastructure.
* **Offline resilience**: Graceful degradation when network connectivity is lost or during offline local development.

## Considered Options
1. **Dual writes with periodic two-way synchronization**: Complex merge reconciliation, clock skew risks, and high potential for duplicate meals or lost updates.
2. **Local SQLite as primary with cloud backup / export only**: Fails to provide real-time updates to mobile web and WhatsApp when the host machine is offline or asleep.
3. **Cloudflare D1 as authoritative single source of truth with local SQLite as cache / offline fallback (Chosen)**: Clean architectural boundary where D1 holds authoritative state and local storage acts strictly as an offline-first read/write cache.

## Decision Outcome & Consequences

### Positive Consequences
* **Unified state**: All client surfaces query and mutate the same authoritative database.
* **Elimination of sync conflicts**: No need for complex bidirectional conflict resolution.
* **Immediate availability**: Meals logged via WhatsApp or web are instantly visible on the dashboard.

### Negative Consequences
* **Network dependency**: Active internet connection required for live updates (mitigated by transparent local SQLite fallback).
* **API latency**: Incurs HTTP roundtrip latency compared to local SQLite reads (mitigated by Cloudflare edge caching and short timeouts).
* **Credential management**: Requires distribution and secure handling of Cloudflare Worker URLs and auth tokens.
