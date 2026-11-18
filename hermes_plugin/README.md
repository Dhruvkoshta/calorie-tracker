# Calorie Tracker Plugin for Hermes Agent

A comprehensive personal calorie and macro tracking plugin for Hermes Agent with offline reference lookups, SQLite persistence under `$HERMES_HOME`, an interactive dashboard, and Cloudflare Worker cloud sync.

## Features
- **7 Chat Tools**: Log meals, view daily summaries, check rolling history, set targets, edit entries, delete entries, and sync with Cloudflare.
- **Full Macro Support**: Tracks Protein (g), Carbs (g), and Fat (g) alongside calories.
- **Database**: SQLite database with WAL mode at `~/.hermes/plugin-data/calorie_tracker/calories.db`.
- **Cloud Sync**: 1-click bidirectional sync to Cloudflare Workers (`https://hermes-calorie-tracker.dhruvkoshta04.workers.dev`).
- **Dashboard**: Integrated into Hermes Web UI at `/calories`.
