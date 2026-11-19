# 0002: Proxy Hermes Dashboard API to Cloudflare Worker

## Status
Accepted

## Context & Problem Statement
The Hermes local dashboard exposes FastAPI REST endpoints under `/api/plugins/calorie-tracker/`. Historically, these endpoints interacted directly with local SQLite on disk. As a result, modifications made via Cloudflare D1 (e.g. meals added via WhatsApp or the remote Cloudflare PWA) were invisible to the Hermes local dashboard without a manual sync.

We needed a mechanism to ensure the local desktop dashboard presents live data from Cloudflare D1 while maintaining compatibility when offline.

## Decision Drivers
* **Interface parity**: Guarantee identical data presentation between the Hermes desktop dashboard and Cloudflare PWA.
* **Logic consolidation**: Avoid duplicate domain logic (such as daily target calculations, macro percentages, and fasting stages) between Python and TypeScript.
* **Offline availability**: Preserve dashboard responsiveness when working offline or in air-gapped environments.

## Considered Options
1. **Direct SQLite queries with background polling sync**: Causes stale reads, background battery/CPU drain, and complicated synchronization edge cases.
2. **Direct D1 REST API calls from Python**: Bypasses the Cloudflare Worker application layer, requiring raw SQL query duplication in Python and breaking Worker-side validation rules.
3. **Authenticated reverse proxy in `plugin_api.py` to Cloudflare Worker with SQLite fallback (Chosen)**: FastAPI endpoints proxy requests directly to the Cloudflare Worker API when online, falling back to local SQLite if offline or on network failure.

## Decision Outcome & Consequences

### Positive Consequences
* **Live data consistency**: Changes made from mobile or web interfaces reflect immediately in the Hermes desktop dashboard.
* **Centralized validation**: Cloudflare Worker enforces meal validation, timezone boundaries, and macro calculations uniformly.
* **High reliability**: Unreachable network or worker failures trigger transparent fallback to local SQLite without crashing the UI.

### Negative Consequences
* **Network roundtrip**: Online requests incur network latency compared to local disk queries.
* **Proxy error handling**: Route handlers must maintain fallback branches and contract normalization for edge failure modes.
