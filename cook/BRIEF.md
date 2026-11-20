# Brief: CalorieFlow Dashboard UI/UX Overhaul

Target: Redesign and elevate the CalorieFlow health and nutrition dashboard for best-in-class UI/UX across mobile and desktop. Stack: TypeScript, Cloudflare Workers, Tailwind CSS, SVG/HTML5, Vanilla JS.
References: Benchmark quality modern dark fitness dashboards (Apple Health, MacroFactor, Linear aesthetic).
Bar: composition 9.5/10, typography & hierarchy 9.5/10, color & contrast 9.5/10, interactive feel & micro-UX 9.5/10, responsiveness & layout density 9.5/10.
Calibration offset: none yet.
Rules: Zero breaking API changes (all 13 endpoints, SQLite schema & D1 database bindings preserved). Lightweight, self-contained, no heavy runtime bloat. Slop ban list enforced (no awkward purple cliches, no low-contrast gray-on-dark, no broken scaling).
Time: cap 2h. Started: 2026-11-20 08:46 UTC.
Usage: standard window.
Hardware: Chromium preview browser & Cloudflare Workers runtime.
Deliverable: Fully redesigned, responsive, accessible, tactile dashboard in `cloudflare_worker/src/index.ts`, verified with preview screenshots and unit tests.
Permissions: download no, push no, publish no (until user approves).
User's words: "/cook improve this dashboard deign for best ui ux expreris"
