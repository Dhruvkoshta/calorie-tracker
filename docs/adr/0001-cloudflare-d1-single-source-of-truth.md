# 0001: Cloudflare D1 as Single Source of Truth

The calorie tracker ecosystem previously split state between local SQLite (`calories.db`) and Cloudflare D1 (`hermes-calories-db`), causing WhatsApp updates to diverge from dashboards. We decided that Cloudflare D1 is the sole authoritative database for all client surfaces (WhatsApp Hermes agent, Hermes local dashboard, and Cloudflare PWA), with local storage acting strictly as an offline-first read/write cache. This eliminates data desynchronization and guarantees real-time consistency across mobile and desktop interfaces.
