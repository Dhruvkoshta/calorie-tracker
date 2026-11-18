"""Hermes Calorie Tracker Plugin.

Provides chat food logging tools and web dashboard integration.
"""

from __future__ import annotations

import logging
from plugins.calorie_tracker.tools import (
    CALORIE_LOG_MEAL_SCHEMA,
    CALORIE_GET_SUMMARY_SCHEMA,
    CALORIE_GET_HISTORY_SCHEMA,
    CALORIE_SET_TARGET_SCHEMA,
    CALORIE_EDIT_MEAL_SCHEMA,
    CALORIE_DELETE_MEAL_SCHEMA,
    CALORIE_EXPORT_DATA_SCHEMA,
    CALORIE_SYNC_CLOUDFLARE_SCHEMA,
    CALORIE_SAVE_PRESET_SCHEMA,
    CALORIE_LIST_PRESETS_SCHEMA,
    CALORIE_EDIT_PRESET_SCHEMA,
    CALORIE_DELETE_PRESET_SCHEMA,
    CALORIE_LOG_PRESET_SCHEMA,
    CALORIE_LOG_WEIGHT_SCHEMA,
    CALORIE_GET_WEIGHT_HISTORY_SCHEMA,
    CALORIE_GET_FASTING_STATUS_SCHEMA,
    CALORIE_START_FAST_SCHEMA,
    CALORIE_END_FAST_SCHEMA,
    CALORIE_ANALYZE_FOOD_PHOTO_SCHEMA,
    handle_calorie_log_meal,
    handle_calorie_get_summary,
    handle_calorie_get_history,
    handle_calorie_set_target,
    handle_calorie_edit_meal,
    handle_calorie_delete_meal,
    handle_calorie_export_data,
    handle_calorie_sync_cloudflare,
    handle_calorie_save_preset,
    handle_calorie_list_presets,
    handle_calorie_edit_preset,
    handle_calorie_delete_preset,
    handle_calorie_log_preset,
    handle_calorie_log_weight,
    handle_calorie_get_weight_history,
    handle_calorie_get_fasting_status,
    handle_calorie_start_fast,
    handle_calorie_end_fast,
    handle_calorie_analyze_food_photo,
)

logger = logging.getLogger(__name__)

_TOOLS = (
    ("calorie_log_meal", CALORIE_LOG_MEAL_SCHEMA, handle_calorie_log_meal, "🥗"),
    ("calorie_get_summary", CALORIE_GET_SUMMARY_SCHEMA, handle_calorie_get_summary, "📊"),
    ("calorie_get_history", CALORIE_GET_HISTORY_SCHEMA, handle_calorie_get_history, "📈"),
    ("calorie_set_target", CALORIE_SET_TARGET_SCHEMA, handle_calorie_set_target, "🎯"),
    ("calorie_edit_meal", CALORIE_EDIT_MEAL_SCHEMA, handle_calorie_edit_meal, "✏️"),
    ("calorie_delete_meal", CALORIE_DELETE_MEAL_SCHEMA, handle_calorie_delete_meal, "🗑️"),
    ("calorie_export_data", CALORIE_EXPORT_DATA_SCHEMA, handle_calorie_export_data, "💾"),
    ("calorie_sync_cloudflare", CALORIE_SYNC_CLOUDFLARE_SCHEMA, handle_calorie_sync_cloudflare, "☁️"),
    ("calorie_save_preset", CALORIE_SAVE_PRESET_SCHEMA, handle_calorie_save_preset, "🔖"),
    ("calorie_list_presets", CALORIE_LIST_PRESETS_SCHEMA, handle_calorie_list_presets, "📋"),
    ("calorie_edit_preset", CALORIE_EDIT_PRESET_SCHEMA, handle_calorie_edit_preset, "📝"),
    ("calorie_delete_preset", CALORIE_DELETE_PRESET_SCHEMA, handle_calorie_delete_preset, "❌"),
    ("calorie_log_preset", CALORIE_LOG_PRESET_SCHEMA, handle_calorie_log_preset, "⚡"),
    ("calorie_log_weight", CALORIE_LOG_WEIGHT_SCHEMA, handle_calorie_log_weight, "⚖️"),
    ("calorie_get_weight_history", CALORIE_GET_WEIGHT_HISTORY_SCHEMA, handle_calorie_get_weight_history, "📉"),
    ("calorie_get_fasting_status", CALORIE_GET_FASTING_STATUS_SCHEMA, handle_calorie_get_fasting_status, "⏳"),
    ("calorie_start_fast", CALORIE_START_FAST_SCHEMA, handle_calorie_start_fast, "⏱️"),
    ("calorie_end_fast", CALORIE_END_FAST_SCHEMA, handle_calorie_end_fast, "🏁"),
    ("calorie_analyze_food_photo", CALORIE_ANALYZE_FOOD_PHOTO_SCHEMA, handle_calorie_analyze_food_photo, "📸"),
)


def register(ctx) -> None:
    """Register calorie tracker tools with the Hermes agent."""
    for name, schema, handler, emoji in _TOOLS:
        ctx.register_tool(
            name=name,
            toolset="calorie_tracker",
            schema=schema,
            handler=handler,
            emoji=emoji,
            description=schema.get("description", ""),
        )
    logger.info("calorie_tracker plugin registered %d tools", len(_TOOLS))
