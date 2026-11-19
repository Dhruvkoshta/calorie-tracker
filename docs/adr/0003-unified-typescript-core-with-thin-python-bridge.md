# 0003: Unified TypeScript Core with Thin Python Bridge

To unify data contracts, eliminate dual-language drift, and support TypeScript end-to-end, all domain models, validation schemas, and database operations reside in TypeScript within the Cloudflare Worker and shared TS modules. We decided to maintain a thin, declarative Python shim (`__init__.py` and HTTP client) solely to satisfy Hermes Agent's Python plugin registration contract. This gives full TypeScript ergonomics and type safety without breaking Hermes runtime compatibility.
