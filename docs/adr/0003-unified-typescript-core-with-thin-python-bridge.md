# 0003: Unified TypeScript Core with Thin Python Bridge

## Status
Accepted

## Context & Problem Statement
The calorie tracker operates across multiple language runtimes: Hermes Agent runs as a Python daemon, while Cloudflare Worker, Cloudflare D1 migrations, and the frontend PWA are built with TypeScript. Maintaining duplicate schemas, food reference databases, unit conversion math, and macro tracking logic across both Python and TypeScript leads to subtle logic drift, test overhead, and maintenance friction.

We needed a strategy to maintain a single canonical codebase for business logic while adhering to Hermes Agent's Python plugin architecture.

## Decision Drivers
* **Single source of domain logic**: Core models, validations, and database mutations should reside in one place.
* **End-to-end type safety**: Full TypeScript ergonomics across Worker, D1 schema, and frontend UI.
* **Hermes Agent compatibility**: Seamless registration with Hermes Agent's Python runtime (`register(ctx)`, tool definitions, and dispatch contracts).

## Considered Options
1. **Dual implementation in Python and TypeScript**: Maintaining full feature parity in both languages; prone to logic divergence and high maintenance cost.
2. **Pure Python service hosted externally**: Incompatible with Cloudflare Workers' edge execution runtime and loses native D1 database integration.
3. **Canonical TypeScript core on Cloudflare Worker with thin Python bridge (Chosen)**: Centralize domain logic in TypeScript on the Cloudflare Worker, and maintain a lightweight Python plugin (`hermes_plugin/`) solely to expose Hermes tools and proxy dashboard requests.

## Decision Outcome & Consequences

### Positive Consequences
* **Unified domain contracts**: TypeScript types (`types.ts`) and validation rules are canonical.
* **Streamlined Python plugin**: Python layer remains thin, declarative, and focused on Hermes runtime compliance.
* **Full edge benefits**: Leverages Cloudflare Worker edge performance and D1 SQLite dialect natively.

### Negative Consequences
* **Contract normalization layer**: The Python bridge must normalize slight variations between Worker JSON responses and Hermes tool output contracts (e.g. `_format_summary_dict`).
* **Offline schema maintenance**: Minimal local SQLite schema and baseline queries must still be maintained in Python for offline operation.
