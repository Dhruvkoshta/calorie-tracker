# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
Dhruv (personal fitness, nutrition, and wellness tracking; companion to daily habits across WhatsApp and mobile PWA).

## Product Purpose
Effortlessly log meals, track macronutrients, monitor intermittent fasting windows, and review body weight progression through frictionless WhatsApp messaging and a high-performance, mobile-first PWA dashboard.

## Positioning
An integrated personal nutrition ecosystem combining multimodal AI (Cloudflare Workers AI vision for instant photo-to-macro estimation) with low-friction WhatsApp chat and a fast, edge-hosted PWA dashboard backed by Cloudflare D1 as the single source of truth.

## Operating Context
- **WhatsApp Client**: Real-time conversational food logging, audio transcriptions, photo meal scanning, and status queries on the go.
- **Mobile PWA Dashboard**: Visual progress tracking (Apple Fitness-style radial calorie gauges, macro breakdown bars, fasting circular timer with metabolic milestone stages, interactive SVG weight trend curves).
- **Hermes Agent Runtime**: Local execution environment hosting the calorie tracker plugin and tools.
- **Cloudflare Edge**: Serverless API worker and D1 SQLite database providing global, low-latency data persistence and sync.

## Capabilities and Constraints
- **Core Capabilities**:
  - Meal entry logging with portion, unit, calories, and macronutrient split (Protein, Carbs, Fat).
  - 1-tap presets for user meal staples (e.g., Coffee, Protein Shake).
  - Intermittent fasting tracker with standard protocol presets (14:10, 16:8, 18:6, 20:4, OMAD) and smart auto-fasting from latest meal.
  - Weight progression logging with rolling 7-day average and trendline calculations.
  - Photo-to-macros image analysis via Cloudflare Workers AI (`@cf/meta/llama-3.2-11b-vision-instruct`).
- **Technical Constraints**:
  - Cloudflare D1 is the single source of truth; local SQLite acts as a synchronized cache.
  - Privacy-first: local nutrition data is kept private; cloud sync only occurs when explicitly authorized.
  - Lightweight, responsive, standalone PWA design without heavy frontend client frameworks.
  - Zero generic AI slop: distinctive typography, high contrast, purposeful visual hierarchy.

## Brand Commitments
- **Name**: CalorieFlow / Hermes Calorie & Macro Tracker.
- **Voice**: Clean, encouraging, direct, data-dense without clutter.
- **Visual Aesthetic**: Dark cosmic theme, high-contrast indicators, Apple Fitness-inspired activity ring aesthetics.

## Evidence on Hand
- Full-stack Cloudflare Worker implementation in `cloudflare_worker/src/index.ts` and `schema.sql`.
- Hermes Agent plugin implementation in `hermes_plugin/`.
- Hermes Agent skill definition in `skill/SKILL.md`.
- Architecture Decision Records in `docs/adr/0001-cloudflare-d1-single-source-of-truth.md`, `0002-proxy-dashboard-to-cloudflare-worker.md`, `0003-unified-typescript-core-with-thin-python-bridge.md`.
- Shared domain language defined in `GLOSSARY.md`.
- Comprehensive automated test suite in `tests/test_calorie_tracker.py`.

## Product Principles
1. **Frictionless Capture**: Logging a meal or check-in must take seconds via chat or single-tap presets—nutrition tracking fails if input is tedious.
2. **Actionable Visual Hierarchy**: Prioritize immediate energy balance and macro split at a glance over exhaustive tabular data.
3. **Edge Performance & Reliability**: Zero-lag load times on mobile, offline support via service worker, and D1 single-source-of-truth integrity.
4. **Physiological Accuracy**: Ground fasting stages and metabolic milestones in real physiological markers rather than arbitrary gamification.

## Accessibility & Inclusion
- High visual contrast for outdoor mobile readability.
- Clear semantic HTML elements, accessible form labels, and touch-target compliance (>= 48px).
- Reduced motion support (`prefers-reduced-motion`) for progress gauge and timer animations.
