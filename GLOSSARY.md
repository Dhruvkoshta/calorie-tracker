# Calorie & Nutrition Tracker (CalorieFlow)

Personal nutrition, intermittent fasting, and body weight progression ecosystem integrating Hermes Agent (WhatsApp) and web dashboards.

## Language

### Surfaces & Interfaces

**Hermes Local Dashboard**:
The web interface served locally by the Hermes CLI at `http://127.0.0.1:9119` rendering the calorie tracker tab via `/api/plugins/calorie-tracker`.
_Avoid_: Local GUI, Hermes Web, Admin UI

**Cloudflare PWA Dashboard**:
The standalone mobile/web progressive web application served from Cloudflare Workers edge providing full-screen nutrition charts, camera capture, and live fasting timers.
_Avoid_: Edge app, remote website, web dashboard (ambiguous)

**WhatsApp Client**:
The messaging interface communicating with the user via Hermes Agent's WhatsApp bridge adapter to accept conversational food logs, audio transcriptions, and status commands.
_Avoid_: Bot chat, phone app

### Backend & Persistence

**Local SQLite Store**:
The on-device SQLite database located at `$HERMES_HOME/plugin-data/calorie_tracker/calories.db` used for local persistence by the Hermes plugin.
_Avoid_: Local cache, offline database

**Cloudflare D1 Store**:
The distributed SQL database (`hermes-calories-db`) hosted on Cloudflare Workers edge serving as cloud storage.
_Avoid_: Cloud DB, remote SQLite

**Hermes Plugin**:
The extension module registered into Hermes Agent (`hermes_plugin`) exposing calorie and nutrition tools to the agent runtime and mounting local dashboard routes.
_Avoid_: Skill, agent script

### Domain Concepts

**Meal Entry**:
A single logged food or beverage consumption record with portion, calories, macronutrient breakdown (protein, carbs, fat), timestamp, and local date.
_Avoid_: Food item, log item, dish

**Preset**:
A reusable, saved nutrition template with predefined portions, ingredients, and macro ratios for 1-tap logging.
_Avoid_: Recipe, staple, quick-add item

**Fasting Session**:
A timed period of voluntary food abstinence tracked with a designated start time, target duration, active state, and metabolic progression stage.
_Avoid_: Fast, timer window

**Weight Log**:
A dated record tracking body weight in kilograms, rolling weekly trends, and delta from target weight.
_Avoid_: Scale reading, weigh-in
