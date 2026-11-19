"""Calorie Tracker Dashboard Backend API.

Endpoints mounted under /api/plugins/calorie-tracker/
(matches manifest.json "name": "calorie-tracker").
Proxies all operations directly to Cloudflare D1 Worker as the Single Source of Truth,
with transparent fallback to local SQLite when offline.
"""

from __future__ import annotations

import logging
from typing import Optional
from fastapi import APIRouter, HTTPException, Query, Response
from pydantic import BaseModel, Field

from plugins.calorie_tracker import storage, tools

log = logging.getLogger(__name__)

router = APIRouter()


class UpdateSettingsPayload(BaseModel):
    daily_calorie_target: Optional[int] = Field(None, description="Daily goal in kcal")
    timezone: Optional[str] = Field(None, description="IANA timezone name")
    target_protein_g: Optional[float] = Field(None, description="Target protein in grams")
    target_carbs_g: Optional[float] = Field(None, description="Target carbohydrates in grams")
    target_fat_g: Optional[float] = Field(None, description="Target fat in grams")
    target_weight_kg: Optional[float] = Field(None, description="Target body weight in kg")
    fasting_target_hours: Optional[float] = Field(None, description="Target fast duration in hours")


class CreateMealPayload(BaseModel):
    food_name: str
    amount: float = Field(..., gt=0)
    unit: str
    calories: Optional[int] = Field(None, ge=0)
    protein_g: Optional[float] = Field(None, ge=0)
    carbs_g: Optional[float] = Field(None, ge=0)
    fat_g: Optional[float] = Field(None, ge=0)
    calorie_source: Optional[str] = "user"
    meal_type: Optional[str] = "snack"
    notes: Optional[str] = None
    logged_at: Optional[str] = None


class EditMealPayload(BaseModel):
    food_name: Optional[str] = None
    amount: Optional[float] = Field(None, gt=0)
    unit: Optional[str] = None
    calories: Optional[int] = Field(None, ge=0)
    protein_g: Optional[float] = Field(None, ge=0)
    carbs_g: Optional[float] = Field(None, ge=0)
    fat_g: Optional[float] = Field(None, ge=0)
    calorie_source: Optional[str] = None
    meal_type: Optional[str] = None
    notes: Optional[str] = None
    logged_at: Optional[str] = None


class CreatePresetPayload(BaseModel):
    name: str
    food_name: Optional[str] = None
    amount: float = Field(1.0, gt=0)
    unit: str = "serving"
    calories: Optional[int] = Field(None, ge=0)
    protein_g: Optional[float] = Field(None, ge=0)
    carbs_g: Optional[float] = Field(None, ge=0)
    fat_g: Optional[float] = Field(None, ge=0)
    calorie_source: Optional[str] = None
    meal_type: Optional[str] = "snack"
    notes: Optional[str] = None


class EditPresetPayload(BaseModel):
    name: Optional[str] = None
    food_name: Optional[str] = None
    amount: Optional[float] = Field(None, gt=0)
    unit: Optional[str] = None
    calories: Optional[int] = Field(None, ge=0)
    protein_g: Optional[float] = Field(None, ge=0)
    carbs_g: Optional[float] = Field(None, ge=0)
    fat_g: Optional[float] = Field(None, ge=0)
    calorie_source: Optional[str] = None
    meal_type: Optional[str] = None
    notes: Optional[str] = None


class LogPresetPayload(BaseModel):
    servings: float = Field(1.0, gt=0)
    meal_type: Optional[str] = None
    notes: Optional[str] = None
    logged_at: Optional[str] = None


@router.get("/settings")
def get_settings_endpoint():
    """Get current daily calorie target, macro targets, and timezone."""
    if not tools._is_offline():
        try:
            return tools._d1_request("/api/settings")
        except Exception as err:
            log.warning("D1 GET /api/settings failed: %s. Falling back to local SQLite.", err)

    conn = storage.get_connection()
    try:
        return storage.get_settings(conn)
    finally:
        conn.close()


@router.put("/settings")
def update_settings_endpoint(payload: UpdateSettingsPayload):
    """Update calorie target, macro targets, and/or timezone."""
    if not tools._is_offline():
        try:
            data = {k: v for k, v in payload.dict().items() if v is not None}
            return tools._d1_request("/api/settings", method="PUT", data=data)
        except Exception as err:
            log.warning("D1 PUT /api/settings failed: %s. Falling back to local SQLite.", err)

    conn = storage.get_connection()
    try:
        return storage.update_settings(
            conn,
            daily_calorie_target=payload.daily_calorie_target,
            tz_name=payload.timezone,
            target_protein_g=payload.target_protein_g,
            target_carbs_g=payload.target_carbs_g,
            target_fat_g=payload.target_fat_g,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    finally:
        conn.close()


@router.get("/summary")
def get_summary_endpoint(date: Optional[str] = Query(None, description="YYYY-MM-DD in user timezone")):
    """Get day's calorie and macro summary (target, consumed, remaining/over, breakdown)."""
    if not tools._is_offline():
        try:
            path = f"/api/summary?date={date}" if date else "/api/summary"
            summary = tools._d1_request(path)
            # Ensure compatibility with both local dashboard expectations
            if "date" not in summary:
                summary["date"] = summary.get("local_date")
            if "target" not in summary:
                summary["target"] = summary.get("daily_target")
            return summary
        except Exception as err:
            log.warning("D1 GET /api/summary failed: %s. Falling back to local SQLite.", err)

    conn = storage.get_connection()
    try:
        return storage.get_day_summary(conn, local_date=date)
    finally:
        conn.close()


@router.get("/meals")
def get_meals_endpoint(date: Optional[str] = Query(None, description="YYYY-MM-DD")):
    """Get list of meals logged on a given date."""
    if not tools._is_offline():
        try:
            path = f"/api/meals?date={date}" if date else "/api/meals"
            meals = tools._d1_request(path)
            target_date = date
            if not target_date:
                summary = tools._d1_request("/api/summary")
                target_date = summary.get("local_date") or summary.get("date")
            return {"date": target_date, "meals": meals}
        except Exception as err:
            log.warning("D1 GET /api/meals failed: %s. Falling back to local SQLite.", err)

    conn = storage.get_connection()
    try:
        if not date:
            summary = storage.get_day_summary(conn)
            date = summary["date"]
        meals = storage.get_meals_for_date(conn, local_date=date)
        return {"date": date, "meals": meals}
    finally:
        conn.close()


@router.post("/meals")
def create_meal_endpoint(payload: CreateMealPayload):
    """Log a new meal with calories and macros."""
    cals = payload.calories
    prot = payload.protein_g
    carb = payload.carbs_g
    fat = payload.fat_g
    source = payload.calorie_source or "user"

    if cals is None:
        ref_food = storage.lookup_reference_food(payload.food_name, payload.amount, payload.unit)
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
            raise HTTPException(
                status_code=400,
                detail=f"Calories missing and no standard reference for '{payload.amount} {payload.unit} {payload.food_name}'.",
            )

    if not tools._is_offline():
        try:
            data = {
                "food_name": payload.food_name,
                "amount": payload.amount,
                "unit": payload.unit,
                "calories": cals,
                "protein_g": prot or 0.0,
                "carbs_g": carb or 0.0,
                "fat_g": fat or 0.0,
                "calorie_source": source,
                "meal_type": payload.meal_type or "snack",
                "notes": payload.notes or "",
            }
            if payload.logged_at:
                data["logged_at"] = payload.logged_at
            return tools._d1_request("/api/meals", method="POST", data=data)
        except HTTPException:
            raise
        except Exception as err:
            log.warning("D1 POST /api/meals failed: %s. Falling back to local SQLite.", err)

    conn = storage.get_connection()
    try:
        meal = storage.log_meal(
            conn,
            food_name=payload.food_name,
            amount=payload.amount,
            unit=payload.unit,
            calories=cals,
            protein_g=prot,
            carbs_g=carb,
            fat_g=fat,
            calorie_source=source,
            meal_type=payload.meal_type or "snack",
            notes=payload.notes,
            logged_at=payload.logged_at,
        )
        return meal
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    finally:
        conn.close()


@router.put("/meals/{meal_id}")
def edit_meal_endpoint(meal_id: int, payload: EditMealPayload):
    """Edit an existing meal."""
    if not tools._is_offline():
        try:
            data = {k: v for k, v in payload.dict().items() if v is not None}
            if payload.calories is not None and "calorie_source" not in data:
                data["calorie_source"] = "user"
            return tools._d1_request(f"/api/meals/{meal_id}", method="PUT", data=data)
        except Exception as err:
            log.warning("D1 PUT /api/meals/%s failed: %s. Falling back to local SQLite.", meal_id, err)

    conn = storage.get_connection()
    try:
        source = payload.calorie_source
        if payload.calories is not None and source is None:
            source = "user"

        updated = storage.edit_meal(
            conn,
            meal_id=meal_id,
            food_name=payload.food_name,
            amount=payload.amount,
            unit=payload.unit,
            calories=payload.calories,
            protein_g=payload.protein_g,
            carbs_g=payload.carbs_g,
            fat_g=payload.fat_g,
            calorie_source=source,
            meal_type=payload.meal_type,
            notes=payload.notes,
            logged_at=payload.logged_at,
        )
        if not updated:
            raise HTTPException(status_code=404, detail="Meal not found")
        return updated
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    finally:
        conn.close()


@router.delete("/meals/{meal_id}")
def delete_meal_endpoint(meal_id: int):
    """Delete a meal entry."""
    if not tools._is_offline():
        try:
            return tools._d1_request(f"/api/meals/{meal_id}", method="DELETE")
        except Exception as err:
            log.warning("D1 DELETE /api/meals/%s failed: %s. Falling back to local SQLite.", meal_id, err)

    conn = storage.get_connection()
    try:
        success = storage.delete_meal(conn, meal_id=meal_id)
        if not success:
            raise HTTPException(status_code=404, detail="Meal not found")
        return {"deleted": True, "id": meal_id}
    finally:
        conn.close()


@router.get("/history")
def get_history_endpoint(days: int = Query(7, ge=1, le=30)):
    """Get historical day summaries."""
    if not tools._is_offline():
        try:
            res = tools._d1_request(f"/api/history?days={days}")
            return res.get("history", [])
        except Exception as err:
            log.warning("D1 GET /api/history failed: %s. Falling back to local SQLite.", err)

    conn = storage.get_connection()
    try:
        return storage.get_history(conn, days=days)
    finally:
        conn.close()


@router.get("/export")
def export_endpoint(format: str = Query("json", pattern="^(json|csv)$")):
    """Export all calorie tracker data as JSON or CSV."""
    conn = storage.get_connection()
    try:
        if not tools._is_offline():
            try:
                sync_data = tools._d1_request("/api/sync")
                if sync_data and isinstance(sync_data, dict):
                    storage.import_data(conn, sync_data)
            except Exception as err:
                log.warning("D1 GET /api/sync failed during export: %s. Using local records.", err)

        data = storage.export_data(conn, format=format)
        media_type = "text/csv" if format == "csv" else "application/json"
        return Response(content=data, media_type=media_type)
    finally:
        conn.close()


@router.get("/presets")
def list_presets_endpoint(query: Optional[str] = Query(None)):
    """List all saved presets, optionally filtered by query."""
    if not tools._is_offline():
        try:
            path = f"/api/presets?query={query}" if query else "/api/presets"
            res = tools._d1_request(path)
            return res.get("presets", [])
        except Exception as err:
            log.warning("D1 GET /api/presets failed: %s. Falling back to local SQLite.", err)

    conn = storage.get_connection()
    try:
        return storage.list_presets(conn, query=query)
    finally:
        conn.close()


@router.post("/presets")
def create_preset_endpoint(payload: CreatePresetPayload):
    """Save a new meal/recipe preset."""
    if not tools._is_offline():
        try:
            data = {k: v for k, v in payload.dict().items() if v is not None}
            res = tools._d1_request("/api/presets", method="POST", data=data)
            return res.get("preset", res)
        except Exception as err:
            log.warning("D1 POST /api/presets failed: %s. Falling back to local SQLite.", err)

    conn = storage.get_connection()
    try:
        return storage.create_preset(
            conn,
            name=payload.name,
            food_name=payload.food_name,
            amount=payload.amount,
            unit=payload.unit,
            calories=payload.calories,
            protein_g=payload.protein_g,
            carbs_g=payload.carbs_g,
            fat_g=payload.fat_g,
            calorie_source=payload.calorie_source,
            meal_type=payload.meal_type or "snack",
            notes=payload.notes,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    finally:
        conn.close()


@router.get("/presets/{preset_id}")
def get_preset_endpoint(preset_id: str):
    """Get a preset by ID or name."""
    if not tools._is_offline():
        try:
            res = tools._d1_request(f"/api/presets/{preset_id}")
            return res.get("preset", res)
        except Exception as err:
            log.warning("D1 GET /api/presets/%s failed: %s. Falling back to local SQLite.", preset_id, err)

    conn = storage.get_connection()
    try:
        p = storage.get_preset(conn, preset_id)
        if not p:
            raise HTTPException(status_code=404, detail="Preset not found")
        return p
    finally:
        conn.close()


@router.put("/presets/{preset_id}")
def edit_preset_endpoint(preset_id: str, payload: EditPresetPayload):
    """Edit an existing preset."""
    if not tools._is_offline():
        try:
            data = {k: v for k, v in payload.dict().items() if v is not None}
            res = tools._d1_request(f"/api/presets/{preset_id}", method="PUT", data=data)
            return res.get("preset", res)
        except Exception as err:
            log.warning("D1 PUT /api/presets/%s failed: %s. Falling back to local SQLite.", preset_id, err)

    conn = storage.get_connection()
    try:
        updated = storage.edit_preset(
            conn,
            preset_id_or_name=preset_id,
            name=payload.name,
            food_name=payload.food_name,
            amount=payload.amount,
            unit=payload.unit,
            calories=payload.calories,
            protein_g=payload.protein_g,
            carbs_g=payload.carbs_g,
            fat_g=payload.fat_g,
            calorie_source=payload.calorie_source,
            meal_type=payload.meal_type,
            notes=payload.notes,
        )
        if not updated:
            raise HTTPException(status_code=404, detail="Preset not found")
        return updated
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    finally:
        conn.close()


@router.delete("/presets/{preset_id}")
def delete_preset_endpoint(preset_id: str):
    """Delete a preset."""
    if not tools._is_offline():
        try:
            return tools._d1_request(f"/api/presets/{preset_id}", method="DELETE")
        except Exception as err:
            log.warning("D1 DELETE /api/presets/%s failed: %s. Falling back to local SQLite.", preset_id, err)

    conn = storage.get_connection()
    try:
        success = storage.delete_preset(conn, preset_id)
        if not success:
            raise HTTPException(status_code=404, detail="Preset not found")
        return {"deleted": True, "preset": preset_id}
    finally:
        conn.close()


@router.post("/presets/{preset_id}/log")
def log_preset_endpoint(preset_id: str, payload: Optional[LogPresetPayload] = None):
    """Quick-log a meal from a saved preset."""
    servings = payload.servings if payload else 1.0
    meal_type = payload.meal_type if payload else None
    notes = payload.notes if payload else None
    logged_at = payload.logged_at if payload else None

    if not tools._is_offline():
        try:
            data = {
                "preset": preset_id,
                "servings": servings,
            }
            if meal_type:
                data["meal_type"] = meal_type
            if notes:
                data["notes"] = notes
            if logged_at:
                data["logged_at"] = logged_at
            res = tools._d1_request("/api/presets/log", method="POST", data=data)
            meal = res.get("meal")
            summary = tools._d1_request(f"/api/summary?date={meal['local_date']}")
            return {"meal": meal, "summary": summary}
        except Exception as err:
            log.warning("D1 POST /api/presets/%s/log failed: %s. Falling back to local SQLite.", preset_id, err)

    conn = storage.get_connection()
    try:
        meal = storage.log_meal_from_preset(
            conn,
            preset_id_or_name=preset_id,
            servings=servings,
            meal_type=meal_type,
            notes=notes,
            logged_at=logged_at,
        )
        summary = storage.get_day_summary(conn, local_date=meal["local_date"])
        return {"meal": meal, "summary": summary}
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    finally:
        conn.close()
