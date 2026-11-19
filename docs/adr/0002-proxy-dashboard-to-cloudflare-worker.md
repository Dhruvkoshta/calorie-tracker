# 0002: Proxy Hermes Dashboard API to Cloudflare Worker

The Hermes local dashboard previously interfaced with local SQLite, leaving it oblivious to Cloudflare D1 modifications made via web or edge APIs. We decided to update `hermes_plugin/dashboard/plugin_api.py` to act as an authenticated reverse proxy to the Cloudflare Worker API. This ensures the Hermes local dashboard and Cloudflare PWA present identical, live data without maintaining duplicate database engines.
