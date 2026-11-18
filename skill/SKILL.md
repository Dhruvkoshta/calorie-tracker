---
name: calorie-tracker
description: Always use when Dhruv logs meals, drinks, snacks, checks calories, manages macros, or tracks daily nutrition.
version: 1.0.0
author: Dhruv Kumar Koshta & Hermes Agent
license: MIT
platforms: [linux, macos, windows]
metadata:
  hermes:
    tags: [calories, nutrition, diet, health, food, macros]
    related_skills: []
---

# Calorie & Nutrition Management

Always use the built-in `calorie_tracker` plugin tools for logging and managing meals, daily calories, and macros. Keep nutrition data local; never call `calorie_sync_cloudflare` or another remote export/sync unless Dhruv explicitly asks for that transfer. Never use bash/terminal/SQL or a second database to log, edit, delete, or set goals, and never refuse to track food.

## Tool Usage Guide

1. **Logging Food & Drinks**:
   - Call `calorie_log_meal` with `food_name`, `amount`, and `unit`.
   - Specify `meal_type` (`breakfast`, `lunch`, `dinner`, `snack`).
   - If the user provides specific calories or macros (protein_g, carbs_g, fat_g), include them (`is_estimated=False`).
   - If calories are omitted, the plugin first checks its offline reference database; an unrecognized food may return `needs_clarification` rather than estimate automatically. For a reasonably clear recipe, estimate from the stated ingredients and quantities, mark it `is_estimated=True`, and record assumptions in notes. Ask briefly when missing details would make the estimate misleading.
   - If ambiguous portions are mentioned (e.g. "I had pizza"), clarify the quantity or estimate reasonable defaults while noting the assumption.

2. **Checking Summaries & Budgets**:
   - Call `calorie_get_summary` to see total calories consumed, remaining budget, and macro split (Protein, Carbs, Fat in grams).

3. **History & Trends**:
   - Call `calorie_get_history` (default 7 days, up to 30 days) to review trends.

4. **Setting Goals**:
   - Call `calorie_set_target` to configure daily calorie target (kcal), protein (g), carbs (g), fat (g), or timezone.

5. **Modifications & Deletions**:
   - Call `calorie_edit_meal` to adjust portion or nutritional values.
   - Call `calorie_delete_meal` with `meal_id` if a meal was logged by mistake.

6. **Meal & Recipe Presets (Quick-Add)**:
   - For a new recipe, call `calorie_save_preset` with its name, serving size, calories, estimate flag, and ingredient details in `notes`; then call `calorie_list_presets` and confirm the saved record.
   - If Dhruv asks both to save a preset and add it today, save and verify it first, then call `calorie_log_preset` exactly once and verify the day summary. Do not also call `calorie_log_meal` for that same serving.
   - For a known preset, use `calorie_log_preset` (e.g. `preset="Coffee"`, default one serving); if it is not found, list presets and save it before trying to log it.
   - To update or delete recipes, call `calorie_edit_preset` or `calorie_delete_preset`, then read back with `calorie_list_presets`.

7. **Dashboard & Privacy**:
   - Prefer the authenticated local dashboard for viewing and editing nutrition data.
   - A request to log or manage food does not authorize cloud sync. Call `calorie_sync_cloudflare` only when Dhruv explicitly asks to transfer data; clarify push vs. pull if the direction is not clear.

8. **Availability, Writes & Verification**:
   - After a meal/preset/target write, read back through the plugin: use the day summary for meals and targets, and the preset list for presets.
   - A tool can fail while returning its result even after the handler may have committed the write. Do not retry a write blindly, because that can duplicate a meal; read back first. If read-back also fails, report that the result is unverified and repair/reload the plugin rather than using direct SQL or scripts.
   - If plugin tools are missing in a messaging session, check `hermes plugins list` and `hermes tools list --platform <platform>`, then start a fresh session with `/reset`. After plugin code changes, use `/restart`, wait for reconnection, then `/reset`; never bypass approvals or use `--yolo`.

9. **Photo to Macros (WhatsApp & Chat Image Logging)**:
   - When Dhruv sends a photo of food, meal, snack, or drink on WhatsApp (or asks to estimate a meal image):
     1. Analyze the photo visually, identify the components, ingredients, and portion size.
     2. Calculate estimated calories (kcal) and macronutrient split: Protein (g), Carbs (g), and Fat (g).
     3. Immediately call `calorie_log_meal` with `food_name`, `amount`, `unit`, `calories`, `protein_g`, `carbs_g`, `fat_g`, `is_estimated=True`, and detail the estimated ingredients in `notes`.
     4. Respond with a concise, beautifully structured WhatsApp message:
        - 🍽️ *Dish Name* (~estimated portion)
        - ⚡ Calories: `X kcal`
        - 📊 Macros: `Xg Protein` • `Xg Carbs` • `Xg Fat`
        - 🎯 Remaining daily budget
        - Friendly note that he can adjust portion or values anytime.

10. **Weight Tracking & Progression**:
    - When Dhruv logs body weight (e.g. "Weighed 74.2 kg this morning", "Log my weight 73.8 kg"):
      - Call `calorie_log_weight` with `weight_kg`, optional `date`, and optional `notes`.
      - Confirm the recorded weight and report change since previous weigh-in.
    - When Dhruv asks about weight progress (e.g. "What's my weight trend?", "How much have I lost?"):
      - Call `calorie_get_weight_history` and present current weight, starting weight, net change, and weekly trendline.

11. **Intermittent Fasting Window**:
    - When Dhruv asks about fasting (e.g. "How long have I been fasting?", "Fast status", "Is my eating window open?"):
      - Call `calorie_get_fasting_status`.
      - Report elapsed hours/minutes, remaining time until the target window completes, and current metabolic phase (e.g. Glycogen Depletion, Fat Burning / Ketosis, Cellular Autophagy, Deep Ketosis).
    - When Dhruv asks to start a fast (e.g. "Start my 16:8 fast", "Start fasting now"):
      - Call `calorie_start_fast` with `target_hours` (default 16.0) and `fast_type`.
    - When Dhruv ends a fast (e.g. "Broke my fast", "End fast"):
      - Call `calorie_end_fast`.

