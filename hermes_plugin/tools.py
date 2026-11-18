"""Hermes agent tool implementations for calorie_tracker.

Tools:
- calorie_log_meal: log a food item, quantity, calories & macros (or auto-estimate via reference/model).
- calorie_get_summary: view today's summary (target, consumed, remaining, macro breakdown, meal breakdown).
- calorie_get_history: view recent daily totals (up to 30 days).
- calorie_set_target: set or update daily calorie goal, macro targets, and/or timezone.
- calorie_edit_meal: edit or correct an existing meal entry (e.g. fix estimated calories/macros).
- calorie_delete_meal: remove a logged meal.
- calorie_export_data: export meal records and settings as JSON or CSV.
"""

from __future__ import annotations

import json
import os
from typing import Any, Optional
import urllib.parse
import urllib.request

from plugins.calorie_tracker import storage

CALORIE_LOG_MEAL_SCHEMA = {
    "type": "object",
    "properties": {
        "food_name": {
            "type": "string",
            "description": "Name of the food item or dish (e.g. 'banana', 'scrambled eggs', 'grilled salmon').",
        },
        "amount": {
            "type": "number",
            "description": "Portion quantity (e.g. 1, 1.5, 200). Must be greater than 0.",
        },
        "unit": {
            "type": "string",
            "description": "Unit of measurement (e.g. 'medium', 'large', 'slice', 'cup', 'g', 'oz', 'serving').",
        },
        "calories": {
            "type": "integer",
            "description": "Calorie count in kcal if known. If omitted, the system looks up or estimates it.",
        },
        "protein_g": {
            "type": "number",
            "description": "Protein in grams (optional). Auto-calculated if in reference database.",
        },
        "carbs_g": {
            "type": "number",
            "description": "Carbohydrates in grams (optional). Auto-calculated if in reference database.",
        },
        "fat_g": {
            "type": "number",
            "description": "Fat in grams (optional). Auto-calculated if in reference database.",
        },
        "is_estimated": {
            "type": "boolean",
            "description": "Set to true if the calories were estimated by the assistant rather than provided by the user.",
            "default": False,
        },
        "meal_type": {
            "type": "string",
            "enum": ["breakfast", "lunch", "dinner", "snack"],
            "description": "Meal category. Defaults to 'snack' if not specified.",
            "default": "snack",
        },
        "notes": {
            "type": "string",
            "description": "Optional notes or details (e.g. 'with olive oil and salt').",
        },
        "meal_time": {
            "type": "string",
            "description": "Optional ISO timestamp (e.g. '2026-11-15T12:30:00Z'). Defaults to current time.",
        },
    },
    "required": ["food_name", "amount", "unit"],
}

CALORIE_GET_SUMMARY_SCHEMA = {
    "type": "object",
    "properties": {
        "date": {
            "type": "string",
            "description": "Local date in 'YYYY-MM-DD' format. Defaults to today in user's configured timezone.",
        }
    },
}

CALORIE_GET_HISTORY_SCHEMA = {
    "type": "object",
    "properties": {
        "days": {
            "type": "integer",
            "description": "Number of days of history to retrieve (1 to 30). Default is 7.",
            "default": 7,
        }
    },
}

CALORIE_SET_TARGET_SCHEMA = {
    "type": "object",
    "properties": {
        "daily_calorie_target": {
            "type": "integer",
            "description": "Daily calorie goal in kcal (e.g. 2000). Set to a positive integer.",
        },
        "timezone": {
            "type": "string",
            "description": "User IANA timezone name (e.g. 'America/New_York', 'UTC', 'Asia/Kolkata', 'Europe/London').",
        },
        "target_protein_g": {
            "type": "number",
            "description": "Optional daily target protein in grams (e.g. 150).",
        },
        "target_carbs_g": {
            "type": "number",
            "description": "Optional daily target carbohydrates in grams (e.g. 200).",
        },
        "target_fat_g": {
            "type": "number",
            "description": "Optional daily target fat in grams (e.g. 65).",
        },
    },
}

CALORIE_EDIT_MEAL_SCHEMA = {
    "type": "object",
    "properties": {
        "meal_id": {
            "type": "integer",
            "description": "ID of the meal entry to update.",
        },
        "calories": {
            "type": "integer",
            "description": "Updated calorie count (e.g. correcting an estimate).",
        },
        "protein_g": {
            "type": "number",
            "description": "Updated protein in grams.",
        },
        "carbs_g": {
            "type": "number",
            "description": "Updated carbohydrates in grams.",
        },
        "fat_g": {
            "type": "number",
            "description": "Updated fat in grams.",
        },
        "food_name": {
            "type": "string",
            "description": "Updated food name.",
        },
        "amount": {
            "type": "number",
            "description": "Updated portion quantity.",
        },
        "unit": {
            "type": "string",
            "description": "Updated unit.",
        },
        "meal_type": {
            "type": "string",
            "enum": ["breakfast", "lunch", "dinner", "snack"],
            "description": "Updated meal category.",
        },
        "notes": {
            "type": "string",
            "description": "Updated notes.",
        },
    },
    "required": ["meal_id"],
}

CALORIE_DELETE_MEAL_SCHEMA = {
    "type": "object",
    "properties": {
        "meal_id": {
            "type": "integer",
            "description": "ID of the meal entry to delete.",
        }
    },
    "required": ["meal_id"],
}

CALORIE_EXPORT_DATA_SCHEMA = {
    "type": "object",
    "properties": {
        "format": {
            "type": "string",
            "enum": ["json", "csv"],
            "description": "Export format ('json' or 'csv'). Default is 'json'.",
            "default": "json",
        }
    },
}

CALORIE_SYNC_CLOUDFLARE_SCHEMA = {
    "type": "object",
    "properties": {
        "action": {
            "type": "string",
            "enum": ["push", "pull", "status"],
            "description": "Sync action: 'push' sends local meals/settings to Cloudflare Worker, 'pull' imports them from Worker to local SQLite, 'status' checks connectivity.",
            "default": "push",
        },
        "worker_url": {
            "type": "string",
            "description": "Cloudflare Worker base URL (default: 'https://hermes-calorie-tracker.dhruvkoshta04.workers.dev').",
            "default": "https://hermes-calorie-tracker.dhruvkoshta04.workers.dev",
        },
    },
}

CALORIE_SAVE_PRESET_SCHEMA = {
    "type": "object",
    "properties": {
        "name": {
            "type": "string",
            "description": "Unique preset name (e.g. 'Coffee', 'Morning Oats', 'Post-workout Shake').",
        },
        "food_name": {
            "type": "string",
            "description": "Food item or dish name. Defaults to the preset name if omitted.",
        },
        "amount": {
            "type": "number",
            "description": "Standard portion size (e.g. 1, 1.5, 250). Defaults to 1.0.",
            "default": 1.0,
        },
        "unit": {
            "type": "string",
            "description": "Serving unit (e.g. 'cup', 'serving', 'bowl', 'bottle'). Defaults to 'serving'.",
            "default": "serving",
        },
        "calories": {
            "type": "integer",
            "description": "Calorie count in kcal. If omitted, will be estimated or looked up from reference database.",
        },
        "protein_g": {
            "type": "number",
            "description": "Protein in grams (optional).",
        },
        "carbs_g": {
            "type": "number",
            "description": "Carbohydrates in grams (optional).",
        },
        "fat_g": {
            "type": "number",
            "description": "Fat in grams (optional).",
        },
        "is_estimated": {
            "type": "boolean",
            "description": "Set to true if calories/macros are estimated rather than exact manufacturer/user values.",
            "default": False,
        },
        "meal_type": {
            "type": "string",
            "enum": ["breakfast", "lunch", "dinner", "snack"],
            "description": "Default meal category. Defaults to 'snack'.",
            "default": "snack",
        },
        "notes": {
            "type": "string",
            "description": "Ingredient breakdown or recipe notes (e.g. '50 ml milk, 50 ml water, 1.5 tbsp sugar').",
        },
    },
    "required": ["name"],
}

CALORIE_LIST_PRESETS_SCHEMA = {
    "type": "object",
    "properties": {
        "query": {
            "type": "string",
            "description": "Optional search term to filter presets by name or ingredients.",
        },
    },
}

CALORIE_EDIT_PRESET_SCHEMA = {
    "type": "object",
    "properties": {
        "preset": {
            "type": "string",
            "description": "The name or ID of the preset to edit (e.g. 'Coffee' or '1').",
        },
        "name": {
            "type": "string",
            "description": "New name for the preset.",
        },
        "food_name": {
            "type": "string",
            "description": "Updated food/dish name.",
        },
        "amount": {
            "type": "number",
            "description": "Updated portion quantity.",
        },
        "unit": {
            "type": "string",
            "description": "Updated unit of measurement.",
        },
        "calories": {
            "type": "integer",
            "description": "Updated calorie count in kcal.",
        },
        "protein_g": {
            "type": "number",
            "description": "Updated protein in grams.",
        },
        "carbs_g": {
            "type": "number",
            "description": "Updated carbohydrates in grams.",
        },
        "fat_g": {
            "type": "number",
            "description": "Updated fat in grams.",
        },
        "is_estimated": {
            "type": "boolean",
            "description": "Whether the updated calories/macros are estimated.",
        },
        "meal_type": {
            "type": "string",
            "enum": ["breakfast", "lunch", "dinner", "snack"],
            "description": "Updated default meal category.",
        },
        "notes": {
            "type": "string",
            "description": "Updated notes or recipe ingredients.",
        },
    },
    "required": ["preset"],
}

CALORIE_DELETE_PRESET_SCHEMA = {
    "type": "object",
    "properties": {
        "preset": {
            "type": "string",
            "description": "The name or ID of the preset to delete.",
        },
    },
    "required": ["preset"],
}

CALORIE_LOG_PRESET_SCHEMA = {
    "type": "object",
    "properties": {
        "preset": {
            "type": "string",
            "description": "The name or ID of the saved preset to log (e.g. 'Coffee', 'Morning Oats'). Use when the user says 'add my coffee', 'log my coffee', etc.",
        },
        "servings": {
            "type": "number",
            "description": "Number of servings or portion multiplier (e.g. 1, 2, 0.5). Defaults to 1.0.",
            "default": 1.0,
        },
        "meal_type": {
            "type": "string",
            "enum": ["breakfast", "lunch", "dinner", "snack"],
            "description": "Override meal category. If omitted, uses the preset's default category.",
        },
        "notes": {
            "type": "string",
            "description": "Additional notes for this specific meal entry.",
        },
        "meal_time": {
            "type": "string",
            "description": "Optional ISO timestamp (e.g. '2026-11-15T12:30:00Z'). Defaults to current time.",
        },
    },
    "required": ["preset"],
}

CALORIE_LOG_WEIGHT_SCHEMA = {
    "type": "object",
    "properties": {
        "weight_kg": {
            "type": "number",
            "description": "Body weight in kilograms (e.g. 74.5, 68.2). Must be greater than 0.",
        },
        "date": {
            "type": "string",
            "description": "Optional date in 'YYYY-MM-DD' format. Defaults to today.",
        },
        "notes": {
            "type": "string",
            "description": "Optional notes (e.g. 'Morning fasted', 'Post-workout').",
        },
    },
    "required": ["weight_kg"],
}

CALORIE_GET_WEIGHT_HISTORY_SCHEMA = {
    "type": "object",
    "properties": {
        "days": {
            "type": "integer",
            "description": "Number of days/entries to retrieve (1 to 90). Default is 30.",
            "default": 30,
        }
    },
}

CALORIE_GET_FASTING_STATUS_SCHEMA = {
    "type": "object",
    "properties": {},
    "description": "Check current intermittent fasting status, elapsed hours/minutes, remaining time, and metabolic stage.",
}

CALORIE_START_FAST_SCHEMA = {
    "type": "object",
    "properties": {
        "target_hours": {
            "type": "number",
            "description": "Target fasting duration in hours (e.g. 16, 18, 20, 24). Default is 16.0.",
            "default": 16.0,
        },
        "fast_type": {
            "type": "string",
            "description": "Fasting protocol (e.g. '16:8', '18:6', '20:4', '14:10', '24h OMAD'). Default is '16:8'.",
            "default": "16:8",
        },
        "start_time": {
            "type": "string",
            "description": "Optional ISO timestamp when fast started. Defaults to current time.",
        },
        "notes": {
            "type": "string",
            "description": "Optional notes for this fast.",
        },
    },
}

CALORIE_END_FAST_SCHEMA = {
    "type": "object",
    "properties": {},
    "description": "End the active intermittent fasting window.",
}

CALORIE_ANALYZE_FOOD_PHOTO_SCHEMA = {
    "type": "object",
    "properties": {
        "food_description": {
            "type": "string",
            "description": "Description of the food in the photo (e.g. 'Grilled paneer bowl with quinoa and cucumber salad').",
        },
        "image_data": {
            "type": "string",
            "description": "Optional base64-encoded image string or local image path.",
        },
        "notes": {
            "type": "string",
            "description": "Optional context or ingredients spotted in the photo.",
        },
    },
    "required": ["food_description"],
}



class ToolResult(str):
    """Hermes tool return value: a JSON string that also provides mapping access.

    Satisfies Hermes's tool execution contract (must be a string or multimodal envelope)
    while preserving structured data access for agents, callers, and tests.
    """

    def __new__(cls, data: dict[str, Any]):
        text = json.dumps(data, indent=2, ensure_ascii=False)
        obj = super().__new__(cls, text)
        obj._data = data
        return obj

    def __getitem__(self, key: Any) -> Any:
        if isinstance(key, str):
            return self._data[key]
        return super().__getitem__(key)

    def get(self, key: str, default: Any = None) -> Any:
        return self._data.get(key, default)

    def __contains__(self, key: Any) -> bool:
        if isinstance(key, str) and key in self._data:
            return True
        return super().__contains__(key)

    def keys(self):
        return self._data.keys()

    def values(self):
        return self._data.values()

    def items(self):
        return self._data.items()

    def to_dict(self) -> dict[str, Any]:
        return self._data

    @property
    def data(self) -> dict[str, Any]:
        return self._data


def _result(payload: dict[str, Any]) -> ToolResult:
    """Wrap dictionary payload into a ToolResult string."""
    return ToolResult(payload)


DEFAULT_WORKER_URL = "https://hermes-calorie-tracker.dhruvkoshta04.workers.dev"


def _is_offline() -> bool:
    """Return True if offline/local test mode is explicitly requested."""
    return os.environ.get("HERMES_CALORIE_OFFLINE") == "1"


def _d1_request(
    endpoint: str,
    method: str = "GET",
    data: Optional[dict[str, Any]] = None,
    timeout: float = 12.0,
) -> dict[str, Any]:
    """Execute an HTTP request directly to the Cloudflare Worker D1 backend."""
    base_url = (os.environ.get("HERMES_CALORIE_WORKER_URL") or DEFAULT_WORKER_URL).rstrip("/")
    url = f"{base_url}{endpoint}"
    req_body = json.dumps(data).encode("utf-8") if data is not None else None
    headers = {
        "User-Agent": "HermesAgent/1.0",
        "Accept": "application/json",
    }
    if req_body is not None:
        headers["Content-Type"] = "application/json"

    req = urllib.request.Request(url, data=req_body, headers=headers, method=method)
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read().decode("utf-8"))


def handle_calorie_log_meal(args: dict[str, Any]) -> ToolResult:
    """Handler for calorie_log_meal tool."""
    food_name = args.get("food_name", "").strip()
    if not food_name:
        return _result({"error": "food_name is required"})

    amount = float(args.get("amount", 1))
    unit = str(args.get("unit", "serving")).strip()
    user_cals = args.get("calories")
    is_estimated = bool(args.get("is_estimated", False))
    meal_type = args.get("meal_type", "snack")
    notes = args.get("notes")
    meal_time = args.get("meal_time")
    prot = args.get("protein_g")
    carb = args.get("carbs_g")
    fat = args.get("fat_g")

    if user_cals is not None:
        cals = int(user_cals)
        source = "estimate" if is_estimated else "user"
    else:
        ref_food = storage.lookup_reference_food(food_name, amount, unit)
        if ref_food is not None:
            cals = ref_food["calories"]
            if prot is None:
                prot = ref_food["protein_g"]
            if carb is None:
                carb = ref_food["carbs_g"]
            if fat is None:
                fat = ref_food["fat_g"]
            source = "reference"
        else:
            return _result({
                "needs_clarification": True,
                "message": f"Could not determine calories for '{amount} {unit} {food_name}'. Please provide the calorie amount or a common reference quantity.",
            })

    if not _is_offline():
        try:
            payload: dict[str, Any] = {
                "food_name": food_name,
                "amount": amount,
                "unit": unit,
                "calories": cals,
                "protein_g": float(prot) if prot is not None else 0.0,
                "carbs_g": float(carb) if carb is not None else 0.0,
                "fat_g": float(fat) if fat is not None else 0.0,
                "calorie_source": source,
                "meal_type": meal_type,
                "notes": notes or "",
            }
            if meal_time:
                payload["logged_at"] = meal_time

            meal = _d1_request("/api/meals", method="POST", data=payload)
            target_date = meal.get("local_date")
            summary = _d1_request(f"/api/summary?date={target_date}" if target_date else "/api/summary")
            return _result({
                "status": "success",
                "logged_meal": meal,
                "daily_summary": {
                    "date": summary["date"],
                    "target": summary["target"],
                    "total_consumed": summary["consumed"],
                    "remaining": summary["remaining"],
                    "over_target": summary["over_target"],
                    "consumed_macros": summary["consumed_macros"],
                },
                "prompt_target": summary.get("target") is None,
            })
        except Exception:
            pass

    # Offline / local fallback
    conn = storage.get_connection()
    try:
        meal = storage.log_meal(
            conn,
            food_name=food_name,
            amount=amount,
            unit=unit,
            calories=cals,
            calorie_source=source,
            meal_type=meal_type,
            notes=notes,
            logged_at=meal_time,
            protein_g=prot,
            carbs_g=carb,
            fat_g=fat,
        )
        settings = storage.get_settings(conn)
        summary = storage.get_day_summary(conn, meal["local_date"])
        return _result({
            "status": "success",
            "logged_meal": meal,
            "daily_summary": {
                "date": summary["date"],
                "target": summary["target"],
                "total_consumed": summary["consumed"],
                "remaining": summary["remaining"],
                "over_target": summary["over_target"],
                "consumed_macros": summary["consumed_macros"],
            },
            "prompt_target": settings["daily_calorie_target"] is None,
        })
    finally:
        conn.close()


def handle_calorie_get_summary(args: dict[str, Any]) -> ToolResult:
    """Handler for calorie_get_summary tool."""
    date_str = args.get("date")
    if not _is_offline():
        try:
            path = f"/api/summary?date={date_str}" if date_str else "/api/summary"
            summary = _d1_request(path)
            return _result({
                "status": "success",
                "summary": summary,
                "prompt_target": summary.get("target") is None,
            })
        except Exception:
            pass

    conn = storage.get_connection()
    try:
        summary = storage.get_day_summary(conn, date_str)
        settings = storage.get_settings(conn)
        return _result({
            "status": "success",
            "summary": summary,
            "prompt_target": settings["daily_calorie_target"] is None,
        })
    finally:
        conn.close()


def handle_calorie_get_history(args: dict[str, Any]) -> ToolResult:
    """Handler for calorie_get_history tool."""
    days = min(max(1, int(args.get("days", 7))), 30)
    if not _is_offline():
        try:
            res = _d1_request(f"/api/history?days={days}")
            return _result({"status": "success", "days": days, "history": res.get("history", [])})
        except Exception:
            pass

    conn = storage.get_connection()
    try:
        history = storage.get_history(conn, days=days)
        return _result({"status": "success", "days": days, "history": history})
    finally:
        conn.close()


def handle_calorie_set_target(args: dict[str, Any]) -> ToolResult:
    """Handler for calorie_set_target tool."""
    target = args.get("daily_calorie_target")
    tz = args.get("timezone")
    target_p = args.get("target_protein_g")
    target_c = args.get("target_carbs_g")
    target_f = args.get("target_fat_g")

    if target is None and tz is None and target_p is None and target_c is None and target_f is None:
        return _result({"error": "Provide at least daily_calorie_target, macros, or timezone to update."})

    if not _is_offline():
        try:
            payload: dict[str, Any] = {}
            if target is not None:
                payload["daily_calorie_target"] = int(target)
            if tz is not None:
                payload["timezone"] = str(tz)
            if target_p is not None:
                payload["target_protein_g"] = float(target_p)
            if target_c is not None:
                payload["target_carbs_g"] = float(target_c)
            if target_f is not None:
                payload["target_fat_g"] = float(target_f)

            new_settings = _d1_request("/api/settings", method="PUT", data=payload)
            return _result({"status": "success", "settings": new_settings})
        except Exception:
            pass

    conn = storage.get_connection()
    try:
        new_settings = storage.update_settings(
            conn,
            daily_calorie_target=target,
            tz_name=tz,
            target_protein_g=target_p,
            target_carbs_g=target_c,
            target_fat_g=target_f,
        )
        return _result({"status": "success", "settings": new_settings})
    except Exception as exc:
        return _result({"error": str(exc)})
    finally:
        conn.close()


def handle_calorie_edit_meal(args: dict[str, Any]) -> ToolResult:
    """Handler for calorie_edit_meal tool."""
    meal_id = args.get("meal_id")
    if meal_id is None:
        return _result({"error": "meal_id is required"})

    if not _is_offline():
        try:
            payload = {k: v for k, v in args.items() if k != "meal_id" and v is not None}
            updated = _d1_request(f"/api/meals/{meal_id}", method="PUT", data=payload)
            target_date = updated.get("local_date")
            summary = _d1_request(f"/api/summary?date={target_date}" if target_date else "/api/summary")
            return _result({"status": "success", "updated_meal": updated, "daily_summary": summary})
        except Exception:
            pass

    conn = storage.get_connection()
    try:
        source = "user" if args.get("calories") is not None else None
        updated = storage.edit_meal(
            conn,
            meal_id=int(meal_id),
            food_name=args.get("food_name"),
            amount=args.get("amount"),
            unit=args.get("unit"),
            calories=args.get("calories"),
            protein_g=args.get("protein_g"),
            carbs_g=args.get("carbs_g"),
            fat_g=args.get("fat_g"),
            calorie_source=source,
            meal_type=args.get("meal_type"),
            notes=args.get("notes"),
        )
        if not updated:
            return _result({"error": f"Meal #{meal_id} not found."})
        summary = storage.get_day_summary(conn, updated["local_date"])
        return _result({"status": "success", "updated_meal": updated, "daily_summary": summary})
    finally:
        conn.close()


def handle_calorie_delete_meal(args: dict[str, Any]) -> ToolResult:
    """Handler for calorie_delete_meal tool."""
    meal_id = args.get("meal_id")
    if meal_id is None:
        return _result({"error": "meal_id is required"})

    if not _is_offline():
        try:
            meal = _d1_request(f"/api/meals/{meal_id}", method="GET")
            target_date = meal.get("local_date")
            _d1_request(f"/api/meals/{meal_id}", method="DELETE")
            summary = _d1_request(f"/api/summary?date={target_date}" if target_date else "/api/summary")
            return _result({"status": "success", "deleted_id": meal_id, "daily_summary": summary})
        except Exception:
            pass

    conn = storage.get_connection()
    try:
        existing = storage.get_meal(conn, int(meal_id))
        if not existing:
            return _result({"error": f"Meal #{meal_id} not found."})
        storage.delete_meal(conn, int(meal_id))
        summary = storage.get_day_summary(conn, existing["local_date"])
        return _result({"status": "success", "deleted_id": meal_id, "daily_summary": summary})
    finally:
        conn.close()


def handle_calorie_export_data(args: dict[str, Any]) -> ToolResult:
    """Handler for calorie_export_data tool."""
    fmt = args.get("format", "json")
    if not _is_offline():
        try:
            if fmt == "csv":
                base_url = (os.environ.get("HERMES_CALORIE_WORKER_URL") or DEFAULT_WORKER_URL).rstrip("/")
                req = urllib.request.Request(f"{base_url}/api/export?format=csv", headers={"User-Agent": "HermesAgent/1.0"})
                with urllib.request.urlopen(req, timeout=12) as resp:
                    data = resp.read().decode("utf-8")
            else:
                data = _d1_request("/api/export?format=json")
            return _result({"status": "success", "format": fmt, "content": data})
        except Exception:
            pass

    conn = storage.get_connection()
    try:
        data = storage.export_data(conn, format=fmt)
        return _result({"status": "success", "format": fmt, "content": data})
    finally:
        conn.close()


def handle_calorie_sync_cloudflare(args: dict[str, Any]) -> ToolResult:
    """Handler for calorie_sync_cloudflare tool."""
    action = args.get("action", "status")
    worker_url = (args.get("worker_url") or DEFAULT_WORKER_URL).rstrip("/")
    sync_url = f"{worker_url}/api/sync"

    conn = storage.get_connection()
    try:
        if action == "status":
            req = urllib.request.Request(f"{worker_url}/api/summary", headers={"User-Agent": "HermesAgent/1.0"})
            with urllib.request.urlopen(req, timeout=10) as resp:
                data = json.loads(resp.read().decode("utf-8"))
            return _result({
                "status": "connected",
                "message": "Cloudflare D1 is configured as the active primary database. All operations update Cloudflare D1 directly in real-time.",
                "worker_url": worker_url,
                "remote_summary": data,
            })
        elif action == "push":
            settings = storage.get_settings(conn)
            meals = storage.get_all_meals(conn)
            presets = storage.list_presets(conn)
            payload = json.dumps({"settings": settings, "meals": meals, "presets": presets}).encode("utf-8")
            req = urllib.request.Request(
                sync_url,
                data=payload,
                headers={"Content-Type": "application/json", "User-Agent": "HermesAgent/1.0"},
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=15) as resp:
                res_data = json.loads(resp.read().decode("utf-8"))
            return _result({
                "status": "success",
                "action": "push",
                "worker_url": worker_url,
                "pushed_meals_count": len(meals),
                "pushed_presets_count": len(presets),
                "remote_response": res_data,
            })
        elif action == "pull":
            req = urllib.request.Request(sync_url, headers={"User-Agent": "HermesAgent/1.0"})
            with urllib.request.urlopen(req, timeout=15) as resp:
                remote_data = json.loads(resp.read().decode("utf-8"))
            count = storage.import_data(conn, remote_data)
            return _result({
                "status": "success",
                "action": "pull",
                "worker_url": worker_url,
                "imported_meals_count": count,
            })
        else:
            return _result({"error": f"Unknown action: {action}"})
    except Exception as exc:
        return _result({"error": f"Sync failed: {exc}", "worker_url": worker_url})
    finally:
        conn.close()


def handle_calorie_save_preset(args: dict[str, Any]) -> ToolResult:
    """Handler for calorie_save_preset tool."""
    name = (args.get("name") or "").strip()
    if not name:
        return _result({"error": "Preset 'name' is required."})

    food_name = (args.get("food_name") or name).strip()
    amount = float(args.get("amount", 1.0))
    unit = str(args.get("unit", "serving")).strip()
    calories = args.get("calories")
    protein_g = args.get("protein_g")
    carbs_g = args.get("carbs_g")
    fat_g = args.get("fat_g")
    is_estimated = bool(args.get("is_estimated", False))
    meal_type = str(args.get("meal_type", "snack")).strip()
    notes = args.get("notes")

    if calories is not None:
        source = "estimate" if is_estimated else "user"
        cals_val = int(calories)
    else:
        ref = storage.lookup_reference_food(food_name, amount, unit)
        if ref:
            cals_val = ref["calories"]
            if protein_g is None:
                protein_g = ref["protein_g"]
            if carbs_g is None:
                carbs_g = ref["carbs_g"]
            if fat_g is None:
                fat_g = ref["fat_g"]
            source = "reference"
        else:
            return _result({"error": f"Could not determine calories for preset '{food_name}'. Please specify 'calories'."})

    if not _is_offline():
        try:
            payload = {
                "name": name,
                "food_name": food_name,
                "amount": amount,
                "unit": unit,
                "calories": cals_val,
                "protein_g": float(protein_g) if protein_g is not None else 0.0,
                "carbs_g": float(carbs_g) if carbs_g is not None else 0.0,
                "fat_g": float(fat_g) if fat_g is not None else 0.0,
                "calorie_source": source,
                "meal_type": meal_type,
                "notes": notes or "",
            }
            preset = _d1_request("/api/presets", method="POST", data=payload)
            return _result({
                "status": "success",
                "message": f"Saved preset '{preset['name']}' ({preset['calories']} kcal).",
                "preset": preset,
            })
        except Exception:
            pass

    conn = storage.get_connection()
    try:
        preset = storage.create_preset(
            conn,
            name=name,
            food_name=food_name,
            amount=amount,
            unit=unit,
            calories=cals_val,
            protein_g=float(protein_g) if protein_g is not None else None,
            carbs_g=float(carbs_g) if carbs_g is not None else None,
            fat_g=float(fat_g) if fat_g is not None else None,
            calorie_source=source,
            meal_type=meal_type,
            notes=notes,
        )
        return _result({
            "status": "success",
            "message": f"Saved preset '{preset['name']}' ({preset['calories']} kcal).",
            "preset": preset,
        })
    except ValueError as exc:
        return _result({"error": str(exc)})
    finally:
        conn.close()


def handle_calorie_list_presets(args: dict[str, Any]) -> ToolResult:
    """Handler for calorie_list_presets tool."""
    query = args.get("query")
    if not _is_offline():
        try:
            path = f"/api/presets?query={urllib.parse.quote(query)}" if query else "/api/presets"
            data = _d1_request(path)
            presets = data.get("presets", [])
            return _result({
                "status": "success",
                "count": len(presets),
                "presets": presets,
            })
        except Exception:
            pass

    conn = storage.get_connection()
    try:
        presets = storage.list_presets(conn, query=query)
        return _result({
            "status": "success",
            "count": len(presets),
            "presets": presets,
        })
    finally:
        conn.close()


def handle_calorie_edit_preset(args: dict[str, Any]) -> ToolResult:
    """Handler for calorie_edit_preset tool."""
    preset_ident = args.get("preset")
    if not preset_ident:
        return _result({"error": "'preset' (name or ID) is required."})

    if not _is_offline():
        try:
            payload = {k: v for k, v in args.items() if k != "preset" and v is not None}
            updated = _d1_request(f"/api/presets/{urllib.parse.quote(str(preset_ident))}", method="PUT", data=payload)
            return _result({
                "status": "success",
                "message": f"Updated preset '{updated.get('name', preset_ident)}'.",
                "preset": updated,
            })
        except Exception:
            pass

    conn = storage.get_connection()
    try:
        source = "estimate" if args.get("is_estimated") is True else (
            "user" if args.get("calories") is not None else None
        )
        updated = storage.edit_preset(
            conn,
            preset_id_or_name=preset_ident,
            name=args.get("name"),
            food_name=args.get("food_name"),
            amount=float(args["amount"]) if args.get("amount") is not None else None,
            unit=args.get("unit"),
            calories=int(args["calories"]) if args.get("calories") is not None else None,
            protein_g=float(args["protein_g"]) if args.get("protein_g") is not None else None,
            carbs_g=float(args["carbs_g"]) if args.get("carbs_g") is not None else None,
            fat_g=float(args["fat_g"]) if args.get("fat_g") is not None else None,
            calorie_source=source,
            meal_type=args.get("meal_type"),
            notes=args.get("notes"),
        )
        if not updated:
            return _result({"error": f"Preset '{preset_ident}' not found."})
        return _result({
            "status": "success",
            "message": f"Updated preset '{updated['name']}'.",
            "preset": updated,
        })
    except ValueError as exc:
        return _result({"error": str(exc)})
    finally:
        conn.close()


def handle_calorie_delete_preset(args: dict[str, Any]) -> ToolResult:
    """Handler for calorie_delete_preset tool."""
    preset_ident = args.get("preset")
    if not preset_ident:
        return _result({"error": "'preset' (name or ID) is required."})

    if not _is_offline():
        try:
            _d1_request(f"/api/presets/{urllib.parse.quote(str(preset_ident))}", method="DELETE")
            return _result({
                "status": "success",
                "deleted": True,
                "message": f"Deleted preset '{preset_ident}'.",
            })
        except Exception:
            pass

    conn = storage.get_connection()
    try:
        success = storage.delete_preset(conn, preset_ident)
        if not success:
            return _result({"error": f"Preset '{preset_ident}' not found."})
        return _result({
            "status": "success",
            "deleted": True,
            "message": f"Deleted preset '{preset_ident}'.",
        })
    finally:
        conn.close()


def handle_calorie_log_preset(args: dict[str, Any]) -> ToolResult:
    """Handler for calorie_log_preset tool."""
    preset_ident = args.get("preset")
    if not preset_ident:
        return _result({"error": "'preset' (name or ID) is required."})

    servings = float(args.get("servings", 1.0))
    meal_type = args.get("meal_type")
    notes = args.get("notes")
    meal_time = args.get("meal_time")

    if not _is_offline():
        try:
            payload: dict[str, Any] = {
                "preset": preset_ident,
                "servings": servings,
            }
            if meal_type:
                payload["meal_type"] = meal_type
            if notes:
                payload["notes"] = notes
            if meal_time:
                payload["logged_at"] = meal_time

            res = _d1_request("/api/presets/log", method="POST", data=payload)
            meal = res.get("meal", {})
            target_date = meal.get("local_date")
            summary = _d1_request(f"/api/summary?date={target_date}" if target_date else "/api/summary")
            return _result({
                "status": "success",
                "message": f"Logged {servings} serving(s) of preset '{preset_ident}' ({meal.get('calories')} kcal).",
                "meal": meal,
                "daily_summary": summary,
            })
        except Exception:
            pass

    conn = storage.get_connection()
    try:
        meal = storage.log_meal_from_preset(
            conn,
            preset_id_or_name=preset_ident,
            servings=servings,
            meal_type=meal_type,
            notes=notes,
            logged_at=meal_time,
        )
        summary = storage.get_day_summary(conn, local_date=meal["local_date"])
        return _result({
            "status": "success",
            "message": f"Logged {servings} serving(s) of preset '{preset_ident}' ({meal['calories']} kcal).",
            "meal": meal,
            "daily_summary": summary,
        })
    except ValueError as exc:
        return _result({"error": str(exc)})
    finally:
        conn.close()


def handle_calorie_log_weight(args: dict[str, Any]) -> ToolResult:
    """Handler for calorie_log_weight tool."""
    try:
        weight_kg = float(args.get("weight_kg", 0))
    except (ValueError, TypeError):
        return _result({"error": "weight_kg must be a valid positive number."})

    if weight_kg <= 0:
        return _result({"error": "weight_kg must be greater than 0."})

    date = args.get("date")
    notes = args.get("notes")

    if not _is_offline():
        try:
            payload = {"weight_kg": weight_kg}
            if date:
                payload["date"] = date
            if notes:
                payload["notes"] = notes
            res = _d1_request("/api/weight", method="POST", data=payload)
            return _result({
                "status": "success",
                "message": f"Recorded weight: {weight_kg} kg for {res.get('entry', {}).get('date', date or 'today')}.",
                "entry": res.get("entry"),
                "stats": res.get("stats"),
            })
        except Exception:
            pass

    conn = storage.get_connection()
    try:
        entry = storage.log_weight(conn, weight_kg=weight_kg, date=date, notes=notes)
        return _result({
            "status": "success",
            "message": f"Recorded weight: {weight_kg} kg for {entry['date']}.",
            "entry": entry,
        })
    except ValueError as exc:
        return _result({"error": str(exc)})
    finally:
        conn.close()


def handle_calorie_get_weight_history(args: dict[str, Any]) -> ToolResult:
    """Handler for calorie_get_weight_history tool."""
    days = int(args.get("days", 30))

    if not _is_offline():
        try:
            res = _d1_request(f"/api/weight?days={days}")
            return _result({
                "status": "success",
                "logs": res.get("logs", []),
                "stats": res.get("stats", {}),
            })
        except Exception:
            pass

    conn = storage.get_connection()
    try:
        logs = storage.get_weight_logs(conn, limit=days)
        latest = logs[-1]["weight_kg"] if logs else None
        first = logs[0]["weight_kg"] if logs else None
        change = round(latest - first, 2) if (latest is not None and first is not None) else 0.0
        return _result({
            "status": "success",
            "logs": logs,
            "stats": {
                "latest_weight": latest,
                "starting_weight": first,
                "net_change": change,
                "count": len(logs),
            },
        })
    finally:
        conn.close()


def handle_calorie_get_fasting_status(args: dict[str, Any]) -> ToolResult:
    """Handler for calorie_get_fasting_status tool."""
    if not _is_offline():
        try:
            res = _d1_request("/api/fasting")
            return _result({
                "status": "success",
                "fasting": res,
            })
        except Exception:
            pass

    conn = storage.get_connection()
    try:
        active = storage.get_active_fasting(conn)
        from datetime import UTC, datetime
        now = datetime.now(UTC)
        if active:
            start_dt = datetime.fromisoformat(active["start_time"].replace("Z", "+00:00"))
            elapsed_sec = max(0, int((now - start_dt).total_seconds()))
            target_sec = int(active["target_hours"] * 3600)
            rem_sec = max(0, target_sec - elapsed_sec)
            elapsed_hours = round(elapsed_sec / 3600, 1)
            stage = "Digestion / Blood sugar drop" if elapsed_hours < 12 else ("Fat Burning & Ketosis" if elapsed_hours < 16 else ("Autophagy" if elapsed_hours < 18 else "Deep Ketosis"))
            return _result({
                "status": "success",
                "fasting": {
                    "is_active": True,
                    "start_time": active["start_time"],
                    "target_hours": active["target_hours"],
                    "fast_type": active["fast_type"],
                    "elapsed_hours": elapsed_hours,
                    "remaining_hours": round(rem_sec / 3600, 1),
                    "is_completed": elapsed_sec >= target_sec,
                    "stage": stage,
                },
            })
        else:
            latest_meal = storage.get_latest_meal(conn)
            if latest_meal:
                meal_dt = datetime.fromisoformat(latest_meal["logged_at"].replace("Z", "+00:00"))
                elapsed_sec = max(0, int((now - meal_dt).total_seconds()))
                elapsed_hours = round(elapsed_sec / 3600, 1)
                rem_sec = max(0, int(16 * 3600) - elapsed_sec)
                stage = "Digestion / Blood sugar drop" if elapsed_hours < 12 else ("Fat Burning & Ketosis" if elapsed_hours < 16 else ("Autophagy" if elapsed_hours < 18 else "Deep Ketosis"))
                return _result({
                    "status": "success",
                    "fasting": {
                        "is_active": False,
                        "auto_tracked": True,
                        "last_meal": latest_meal["food_name"],
                        "last_meal_time": latest_meal["logged_at"],
                        "elapsed_hours": elapsed_hours,
                        "target_hours": 16.0,
                        "remaining_hours": round(rem_sec / 3600, 1),
                        "stage": stage,
                    },
                })
            return _result({
                "status": "success",
                "fasting": {
                    "is_active": False,
                    "message": "No active fast or logged meals yet.",
                },
            })
    finally:
        conn.close()


def handle_calorie_start_fast(args: dict[str, Any]) -> ToolResult:
    """Handler for calorie_start_fast tool."""
    target_hours = float(args.get("target_hours", 16.0))
    fast_type = str(args.get("fast_type", "16:8"))
    start_time = args.get("start_time")
    notes = args.get("notes")

    if not _is_offline():
        try:
            payload = {
                "target_hours": target_hours,
                "fast_type": fast_type,
            }
            if start_time:
                payload["start_time"] = start_time
            if notes:
                payload["notes"] = notes
            res = _d1_request("/api/fasting/start", method="POST", data=payload)
            return _result({
                "status": "success",
                "message": f"Started {fast_type} fast ({target_hours}h goal).",
                "session": res.get("session"),
            })
        except Exception:
            pass

    conn = storage.get_connection()
    try:
        session = storage.start_fasting(
            conn,
            target_hours=target_hours,
            fast_type=fast_type,
            start_time=start_time,
            notes=notes,
        )
        return _result({
            "status": "success",
            "message": f"Started {fast_type} fast ({target_hours}h goal).",
            "session": session,
        })
    except ValueError as exc:
        return _result({"error": str(exc)})
    finally:
        conn.close()


def handle_calorie_end_fast(args: dict[str, Any]) -> ToolResult:
    """Handler for calorie_end_fast tool."""
    if not _is_offline():
        try:
            res = _d1_request("/api/fasting/end", method="POST", data={})
            return _result({
                "status": "success",
                "message": "Fasting window ended.",
                "session": res.get("session"),
            })
        except Exception:
            pass

    conn = storage.get_connection()
    try:
        ended = storage.end_fasting(conn)
        if not ended:
            return _result({"message": "No active fast was running."})
        return _result({
            "status": "success",
            "message": "Fasting window ended.",
            "session": ended,
        })
    finally:
        conn.close()


def handle_calorie_analyze_food_photo(args: dict[str, Any]) -> ToolResult:
    """Handler for calorie_analyze_food_photo tool."""
    food_desc = args.get("food_description", "").strip()
    image_data = args.get("image_data")
    notes = args.get("notes", "")

    if not _is_offline() and (image_data or food_desc):
        try:
            payload = {"food_description": food_desc}
            if image_data:
                payload["image"] = image_data
            if notes:
                payload["notes"] = notes
            res = _d1_request("/api/analyze-food-photo", method="POST", data=payload)
            return _result(res)
        except Exception:
            pass

    # Fallback offline reference estimation
    ref = storage.lookup_reference_food(food_desc, 1.0, "serving")
    if ref:
        return _result({
            "success": True,
            "food_name": food_desc.title(),
            "amount": 1.0,
            "unit": ref.get("unit", "serving"),
            "calories": ref["calories"],
            "protein_g": ref["protein_g"],
            "carbs_g": ref["carbs_g"],
            "fat_g": ref["fat_g"],
            "notes": f"Estimated from reference ({notes})" if notes else "Estimated from reference database",
            "confidence": 0.85,
        })

    # Default reasonable generic estimation
    return _result({
        "success": True,
        "food_name": food_desc.title() or "Custom Meal",
        "amount": 1.0,
        "unit": "serving",
        "calories": 350,
        "protein_g": 20.0,
        "carbs_g": 35.0,
        "fat_g": 12.0,
        "notes": f"Estimated meal ({notes})" if notes else "Estimated portion based on visual description",
        "confidence": 0.70,
    })


