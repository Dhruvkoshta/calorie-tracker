"""Calorie tracker persistent SQLite storage under $HERMES_HOME/plugin-data/calorie_tracker/.

Features:
- Schema migrations table (version tracked).
- Durable SQLite with WAL, busy_timeout, foreign_keys.
- Local timezone, daily calorie target, and macro targets (protein, carbs, fat in grams).
- Meal entries with meal_type, food_name, amount, unit, calories, macros (protein_g, carbs_g, fat_g),
  calorie_source ('user', 'reference', 'estimate'), timestamp (ISO UTC), and local_date (YYYY-MM-DD in user's timezone).
- Offline reference database for staples with macro breakdown.
- JSON & CSV export.
"""

from __future__ import annotations

import csv
import io
import json
import logging
import sqlite3
import zoneinfo
from datetime import UTC, datetime
from typing import Any, Optional

from plugins.plugin_storage import plugin_db

log = logging.getLogger(__name__)

DB_NAME = "calories.db"
CURRENT_SCHEMA_VERSION = 4

# Standard reference calorie guide with macro breakdown (kcal, protein_g, carbs_g, fat_g per serving)
REFERENCE_FOODS: dict[str, dict[str, Any]] = {
    "egg": {"unit": "large", "kcal": 78, "protein_g": 6.3, "carbs_g": 0.6, "fat_g": 5.3, "aliases": ["eggs", "boiled egg", "fried egg"]},
    "banana": {"unit": "medium", "kcal": 105, "protein_g": 1.3, "carbs_g": 27.0, "fat_g": 0.3, "aliases": ["bananas"]},
    "apple": {"unit": "medium", "kcal": 95, "protein_g": 0.5, "carbs_g": 25.0, "fat_g": 0.3, "aliases": ["apples"]},
    "orange": {"unit": "medium", "kcal": 62, "protein_g": 1.2, "carbs_g": 15.4, "fat_g": 0.2, "aliases": ["oranges"]},
    "chicken breast": {"unit": "100g", "kcal": 165, "protein_g": 31.0, "carbs_g": 0.0, "fat_g": 3.6, "aliases": ["grilled chicken breast", "chicken"]},
    "white rice": {"unit": "cup", "kcal": 205, "protein_g": 4.2, "carbs_g": 44.5, "fat_g": 0.4, "aliases": ["rice", "cooked white rice", "steamed rice"]},
    "brown rice": {"unit": "cup", "kcal": 218, "protein_g": 4.5, "carbs_g": 45.8, "fat_g": 1.6, "aliases": ["cooked brown rice"]},
    "oats": {"unit": "cup", "kcal": 307, "protein_g": 10.7, "carbs_g": 54.8, "fat_g": 5.3, "aliases": ["oatmeal", "rolled oats"]},
    "milk": {"unit": "cup", "kcal": 122, "protein_g": 8.0, "carbs_g": 12.0, "fat_g": 4.8, "aliases": ["whole milk", "glass of milk"]},
    "almonds": {"unit": "handful", "kcal": 164, "protein_g": 6.0, "carbs_g": 6.1, "fat_g": 14.2, "aliases": ["almond", "28g almonds"]},
    "peanut butter": {"unit": "tbsp", "kcal": 94, "protein_g": 4.0, "carbs_g": 3.5, "fat_g": 8.0, "aliases": ["peanut-butter"]},
    "slice of bread": {"unit": "slice", "kcal": 79, "protein_g": 2.7, "carbs_g": 15.0, "fat_g": 1.0, "aliases": ["bread", "toast", "white bread"]},
    "greek yogurt": {"unit": "cup", "kcal": 130, "protein_g": 17.0, "carbs_g": 6.0, "fat_g": 4.0, "aliases": ["yogurt"]},
    "salmon": {"unit": "100g", "kcal": 208, "protein_g": 20.0, "carbs_g": 0.0, "fat_g": 13.0, "aliases": ["grilled salmon", "baked salmon"]},
    "avocado": {"unit": "medium", "kcal": 240, "protein_g": 3.0, "carbs_g": 12.8, "fat_g": 22.0, "aliases": ["whole avocado"]},
    "potato": {"unit": "medium", "kcal": 160, "protein_g": 4.3, "carbs_g": 36.6, "fat_g": 0.2, "aliases": ["baked potato", "boiled potato"]},
    "olive oil": {"unit": "tbsp", "kcal": 119, "protein_g": 0.0, "carbs_g": 0.0, "fat_g": 13.5, "aliases": ["oil"]},
    "cheddar cheese": {"unit": "slice", "kcal": 113, "protein_g": 7.0, "carbs_g": 0.4, "fat_g": 9.3, "aliases": ["cheese"]},
}


def lookup_reference_food(food_name: str, amount: float, unit: str) -> Optional[dict[str, Any]]:
    """Look up calorie and macro estimate from local offline reference database if found."""
    food_clean = food_name.strip().lower()
    matched_entry = None

    for name, data in REFERENCE_FOODS.items():
        if food_clean == name or food_clean in data.get("aliases", []):
            matched_entry = data
            break

    if not matched_entry:
        return None

    # Calculate proportion
    mult = max(0.1, float(amount))
    return {
        "calories": round(matched_entry["kcal"] * mult),
        "protein_g": round(matched_entry.get("protein_g", 0.0) * mult, 1),
        "carbs_g": round(matched_entry.get("carbs_g", 0.0) * mult, 1),
        "fat_g": round(matched_entry.get("fat_g", 0.0) * mult, 1),
    }


def lookup_reference_calories(food_name: str, amount: float, unit: str) -> Optional[int]:
    """Look up calorie count only from reference database."""
    res = lookup_reference_food(food_name, amount, unit)
    return res["calories"] if res else None


def get_default_timezone() -> str:
    """Detect local timezone or fall back to UTC."""
    try:
        tz = datetime.now().astimezone().tzinfo
        if tz:
            tz_str = str(tz)
            zoneinfo.ZoneInfo(tz_str)
            return tz_str
    except Exception:
        pass
    return "UTC"


def get_connection() -> sqlite3.Connection:
    """Get SQLite connection and run migrations."""
    conn = plugin_db("calorie_tracker", DB_NAME)
    init_schema(conn)
    return conn


def init_schema(conn: sqlite3.Connection) -> None:
    """Apply schema migrations."""
    with conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS schema_migrations (
                version INTEGER PRIMARY KEY,
                applied_at TEXT NOT NULL
            )
            """
        )

        cur = conn.execute("SELECT MAX(version) FROM schema_migrations")
        row = cur.fetchone()
        current_version = row[0] if (row and row[0] is not None) else 0

        if current_version < 1:
            log.info("Applying calorie_tracker schema migration v1")
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS user_settings (
                    id INTEGER PRIMARY KEY CHECK (id = 1),
                    daily_calorie_target INTEGER,
                    timezone TEXT NOT NULL DEFAULT 'UTC',
                    updated_at TEXT NOT NULL
                )
                """
            )
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS meals (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    meal_type TEXT NOT NULL,
                    food_name TEXT NOT NULL,
                    amount REAL NOT NULL,
                    unit TEXT NOT NULL,
                    calories INTEGER NOT NULL,
                    calorie_source TEXT NOT NULL CHECK (calorie_source IN ('user', 'reference', 'estimate')),
                    notes TEXT,
                    logged_at TEXT NOT NULL,
                    local_date TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                )
                """
            )
            conn.execute("CREATE INDEX IF NOT EXISTS idx_meals_local_date ON meals (local_date)")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_meals_logged_at ON meals (logged_at)")

            conn.execute(
                "INSERT INTO schema_migrations (version, applied_at) VALUES (1, ?)",
                (datetime.now(UTC).isoformat(),),
            )
            current_version = 1

        if current_version < 2:
            log.info("Applying calorie_tracker schema migration v2 (macros)")
            # Add macro target columns to user_settings
            cur = conn.execute("PRAGMA table_info(user_settings)")
            settings_cols = {col[1] for col in cur.fetchall()}
            if "target_protein_g" not in settings_cols:
                conn.execute("ALTER TABLE user_settings ADD COLUMN target_protein_g REAL")
            if "target_carbs_g" not in settings_cols:
                conn.execute("ALTER TABLE user_settings ADD COLUMN target_carbs_g REAL")
            if "target_fat_g" not in settings_cols:
                conn.execute("ALTER TABLE user_settings ADD COLUMN target_fat_g REAL")

            # Add macro columns to meals
            cur = conn.execute("PRAGMA table_info(meals)")
            meal_cols = {col[1] for col in cur.fetchall()}
            if "protein_g" not in meal_cols:
                conn.execute("ALTER TABLE meals ADD COLUMN protein_g REAL NOT NULL DEFAULT 0.0")
            if "carbs_g" not in meal_cols:
                conn.execute("ALTER TABLE meals ADD COLUMN carbs_g REAL NOT NULL DEFAULT 0.0")
            if "fat_g" not in meal_cols:
                conn.execute("ALTER TABLE meals ADD COLUMN fat_g REAL NOT NULL DEFAULT 0.0")

            conn.execute(
                "INSERT INTO schema_migrations (version, applied_at) VALUES (2, ?)",
                (datetime.now(UTC).isoformat(),),
            )
            current_version = 2

        if current_version < 3:
            log.info("Applying calorie_tracker schema migration v3 (presets)")
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS presets (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL UNIQUE COLLATE NOCASE,
                    food_name TEXT NOT NULL,
                    amount REAL NOT NULL,
                    unit TEXT NOT NULL,
                    calories INTEGER NOT NULL,
                    protein_g REAL NOT NULL DEFAULT 0.0,
                    carbs_g REAL NOT NULL DEFAULT 0.0,
                    fat_g REAL NOT NULL DEFAULT 0.0,
                    calorie_source TEXT NOT NULL CHECK (calorie_source IN ('user', 'reference', 'estimate')),
                    meal_type TEXT NOT NULL DEFAULT 'snack',
                    notes TEXT,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                )
                """
            )
            conn.execute("CREATE INDEX IF NOT EXISTS idx_presets_name ON presets (name COLLATE NOCASE)")

            # Seed initial preset "Coffee" for 1 serving: 50 ml milk, 50 ml water, 1.5 tbsp sugar; estimated 97 kcal
            cur = conn.execute("SELECT id FROM presets WHERE name = 'Coffee' COLLATE NOCASE")
            if not cur.fetchone():
                now_iso = datetime.now(UTC).isoformat()
                conn.execute(
                    """
                    INSERT INTO presets (
                        name, food_name, amount, unit, calories, protein_g, carbs_g, fat_g,
                        calorie_source, meal_type, notes, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        "Coffee",
                        "Coffee",
                        1.0,
                        "serving",
                        97,
                        1.7,
                        20.5,
                        1.0,
                        "estimate",
                        "snack",
                        "50 ml milk, 50 ml water, 1.5 tbsp sugar. Estimated using built-in milk reference (~25 kcal, 1.7g protein, 2.5g carbs, 1.0g fat) and typical sugar calories (~72 kcal, 18g carbs). Coffee and water contribute negligible calories.",
                        now_iso,
                        now_iso,
                    ),
                )

            conn.execute(
                "INSERT INTO schema_migrations (version, applied_at) VALUES (3, ?)",
                (datetime.now(UTC).isoformat(),),
            )
            current_version = 3

        if current_version < 4:
            log.info("Applying calorie_tracker schema migration v4 (weight_logs and fasting_sessions)")
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS weight_logs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    date TEXT NOT NULL UNIQUE,
                    weight_kg REAL NOT NULL,
                    notes TEXT,
                    created_at TEXT NOT NULL
                )
                """
            )
            conn.execute("CREATE INDEX IF NOT EXISTS idx_weight_logs_date ON weight_logs (date)")
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS fasting_sessions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    start_time TEXT NOT NULL,
                    target_hours REAL NOT NULL DEFAULT 16.0,
                    end_time TEXT,
                    is_active INTEGER NOT NULL DEFAULT 1,
                    fast_type TEXT NOT NULL DEFAULT '16:8',
                    notes TEXT,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                )
                """
            )
            conn.execute("CREATE INDEX IF NOT EXISTS idx_fasting_active ON fasting_sessions (is_active)")
            try:
                conn.execute("ALTER TABLE user_settings ADD COLUMN target_weight_kg REAL")
            except sqlite3.OperationalError:
                pass
            try:
                conn.execute("ALTER TABLE user_settings ADD COLUMN fasting_target_hours REAL DEFAULT 16.0")
            except sqlite3.OperationalError:
                pass
            conn.execute(
                "INSERT INTO schema_migrations (version, applied_at) VALUES (4, ?)",
                (datetime.now(UTC).isoformat(),),
            )
            current_version = 4


def get_settings(conn: sqlite3.Connection) -> dict[str, Any]:
    """Retrieve user settings, creating defaults if not set."""
    cur = conn.execute(
        """
        SELECT daily_calorie_target, timezone, target_protein_g, target_carbs_g, target_fat_g, updated_at,
               target_weight_kg, fasting_target_hours
        FROM user_settings WHERE id = 1
        """
    )
    row = cur.fetchone()
    if not row:
        default_tz = get_default_timezone()
        now_iso = datetime.now(UTC).isoformat()
        with conn:
            conn.execute(
                """
                INSERT INTO user_settings (id, daily_calorie_target, timezone, target_protein_g, target_carbs_g, target_fat_g, updated_at, target_weight_kg, fasting_target_hours)
                VALUES (1, NULL, ?, NULL, NULL, NULL, ?, NULL, 16.0)
                """,
                (default_tz, now_iso),
            )
        return {
            "daily_calorie_target": None,
            "timezone": default_tz,
            "target_protein_g": None,
            "target_carbs_g": None,
            "target_fat_g": None,
            "target_weight_kg": None,
            "fasting_target_hours": 16.0,
            "updated_at": now_iso,
        }

    return {
        "daily_calorie_target": row[0],
        "timezone": row[1] or "UTC",
        "target_protein_g": row[2],
        "target_carbs_g": row[3],
        "target_fat_g": row[4],
        "updated_at": row[5],
        "target_weight_kg": row[6] if len(row) > 6 else None,
        "fasting_target_hours": row[7] if len(row) > 7 and row[7] is not None else 16.0,
    }


def update_settings(
    conn: sqlite3.Connection,
    daily_calorie_target: Optional[int] = None,
    tz_name: Optional[str] = None,
    target_protein_g: Optional[float] = None,
    target_carbs_g: Optional[float] = None,
    target_fat_g: Optional[float] = None,
    target_weight_kg: Optional[float] = None,
    fasting_target_hours: Optional[float] = None,
) -> dict[str, Any]:
    """Update target calories, macros, and/or timezone."""
    current = get_settings(conn)
    new_target = daily_calorie_target if daily_calorie_target is not None else current["daily_calorie_target"]
    new_tz = tz_name if tz_name is not None else current["timezone"]
    new_protein = target_protein_g if target_protein_g is not None else current["target_protein_g"]
    new_carbs = target_carbs_g if target_carbs_g is not None else current["target_carbs_g"]
    new_fat = target_fat_g if target_fat_g is not None else current["target_fat_g"]
    new_weight = target_weight_kg if target_weight_kg is not None else current.get("target_weight_kg")
    new_fasting = fasting_target_hours if fasting_target_hours is not None else current.get("fasting_target_hours", 16.0)

    # Validate timezone
    try:
        zoneinfo.ZoneInfo(new_tz)
    except Exception as exc:
        raise ValueError(f"Invalid IANA timezone name: {new_tz!r}") from exc

    if new_target is not None and int(new_target) <= 0:
        raise ValueError("Daily calorie target must be a positive integer.")

    now_iso = datetime.now(UTC).isoformat()
    with conn:
        conn.execute(
            """
            INSERT INTO user_settings (id, daily_calorie_target, timezone, target_protein_g, target_carbs_g, target_fat_g, updated_at, target_weight_kg, fasting_target_hours)
            VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                daily_calorie_target = excluded.daily_calorie_target,
                timezone = excluded.timezone,
                target_protein_g = excluded.target_protein_g,
                target_carbs_g = excluded.target_carbs_g,
                target_fat_g = excluded.target_fat_g,
                updated_at = excluded.updated_at,
                target_weight_kg = excluded.target_weight_kg,
                fasting_target_hours = excluded.fasting_target_hours
            """,
            (
                int(new_target) if new_target is not None else None,
                new_tz,
                float(new_protein) if new_protein is not None else None,
                float(new_carbs) if new_carbs is not None else None,
                float(new_fat) if new_fat is not None else None,
                now_iso,
                float(new_weight) if new_weight is not None else None,
                float(new_fasting) if new_fasting is not None else 16.0,
            ),
        )
    return {
        "daily_calorie_target": new_target,
        "timezone": new_tz,
        "target_protein_g": new_protein,
        "target_carbs_g": new_carbs,
        "target_fat_g": new_fat,
        "target_weight_kg": new_weight,
        "fasting_target_hours": new_fasting,
        "updated_at": now_iso,
    }


def get_local_date_for_timestamp(utc_dt: datetime, tz_name: str) -> str:
    """Format local YYYY-MM-DD for a UTC datetime under tz_name."""
    try:
        zi = zoneinfo.ZoneInfo(tz_name)
    except Exception:
        zi = zoneinfo.ZoneInfo("UTC")
    local_dt = utc_dt.astimezone(zi)
    return local_dt.strftime("%Y-%m-%d")


def log_meal(
    conn: sqlite3.Connection,
    food_name: str,
    amount: float,
    unit: str,
    calories: int,
    calorie_source: str = "user",
    meal_type: str = "snack",
    notes: Optional[str] = None,
    logged_at: Optional[str] = None,
    protein_g: Optional[float] = None,
    carbs_g: Optional[float] = None,
    fat_g: Optional[float] = None,
) -> dict[str, Any]:
    """Log a meal entry with calories and macro nutrients."""
    if amount <= 0:
        raise ValueError("Amount must be greater than 0.")
    if calories < 0:
        raise ValueError("Calories cannot be negative.")
    if calorie_source not in ("user", "reference", "estimate"):
        raise ValueError(f"Invalid calorie_source: {calorie_source}")

    settings = get_settings(conn)
    tz_name = settings["timezone"]

    now_utc = datetime.now(UTC)
    if logged_at:
        try:
            dt = datetime.fromisoformat(logged_at)
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=UTC)
            logged_utc = dt.astimezone(UTC)
        except Exception:
            logged_utc = now_utc
    else:
        logged_utc = now_utc

    logged_iso = logged_utc.isoformat()
    local_date = get_local_date_for_timestamp(logged_utc, tz_name)
    now_iso = now_utc.isoformat()

    valid_types = ("breakfast", "lunch", "dinner", "snack")
    clean_type = meal_type.lower().strip()
    if clean_type not in valid_types:
        clean_type = "snack"

    prot = float(protein_g) if protein_g is not None else 0.0
    carb = float(carbs_g) if carbs_g is not None else 0.0
    fat = float(fat_g) if fat_g is not None else 0.0

    with conn:
        cur = conn.execute(
            """
            INSERT INTO meals (
                meal_type, food_name, amount, unit, calories, protein_g, carbs_g, fat_g,
                calorie_source, notes, logged_at, local_date, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                clean_type,
                food_name.strip(),
                float(amount),
                unit.strip(),
                int(calories),
                prot,
                carb,
                fat,
                calorie_source,
                notes or "",
                logged_iso,
                local_date,
                now_iso,
                now_iso,
            ),
        )
        meal_id = cur.lastrowid

    return get_meal(conn, meal_id)


def get_meal(conn: sqlite3.Connection, meal_id: int) -> Optional[dict[str, Any]]:
    """Retrieve a single meal by ID."""
    cur = conn.execute(
        """
        SELECT id, meal_type, food_name, amount, unit, calories, protein_g, carbs_g, fat_g,
               calorie_source, notes, logged_at, local_date, created_at, updated_at
        FROM meals WHERE id = ?
        """,
        (meal_id,),
    )
    row = cur.fetchone()
    if not row:
        return None
    return {
        "id": row[0],
        "meal_type": row[1],
        "food_name": row[2],
        "amount": row[3],
        "unit": row[4],
        "calories": row[5],
        "protein_g": round(row[6] or 0.0, 1),
        "carbs_g": round(row[7] or 0.0, 1),
        "fat_g": round(row[8] or 0.0, 1),
        "calorie_source": row[9],
        "notes": row[10],
        "logged_at": row[11],
        "local_date": row[12],
        "created_at": row[13],
        "updated_at": row[14],
    }


def edit_meal(
    conn: sqlite3.Connection,
    meal_id: int,
    food_name: Optional[str] = None,
    amount: Optional[float] = None,
    unit: Optional[str] = None,
    calories: Optional[int] = None,
    protein_g: Optional[float] = None,
    carbs_g: Optional[float] = None,
    fat_g: Optional[float] = None,
    calorie_source: Optional[str] = None,
    meal_type: Optional[str] = None,
    notes: Optional[str] = None,
    logged_at: Optional[str] = None,
) -> Optional[dict[str, Any]]:
    """Edit an existing meal."""
    existing = get_meal(conn, meal_id)
    if not existing:
        return None

    settings = get_settings(conn)
    tz_name = settings["timezone"]

    new_food = food_name.strip() if food_name is not None else existing["food_name"]
    new_amount = float(amount) if amount is not None else existing["amount"]
    new_unit = unit.strip() if unit is not None else existing["unit"]
    new_calories = int(calories) if calories is not None else existing["calories"]
    new_protein = float(protein_g) if protein_g is not None else existing["protein_g"]
    new_carbs = float(carbs_g) if carbs_g is not None else existing["carbs_g"]
    new_fat = float(fat_g) if fat_g is not None else existing["fat_g"]
    new_source = calorie_source if calorie_source is not None else existing["calorie_source"]
    new_notes = notes if notes is not None else existing["notes"]

    if meal_type is not None:
        clean_type = meal_type.lower().strip()
        new_meal_type = clean_type if clean_type in ("breakfast", "lunch", "dinner", "snack") else existing["meal_type"]
    else:
        new_meal_type = existing["meal_type"]

    if logged_at is not None:
        try:
            dt = datetime.fromisoformat(logged_at)
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=UTC)
            logged_utc = dt.astimezone(UTC)
            new_logged_at = logged_utc.isoformat()
            new_local_date = get_local_date_for_timestamp(logged_utc, tz_name)
        except Exception:
            new_logged_at = existing["logged_at"]
            new_local_date = existing["local_date"]
    else:
        new_logged_at = existing["logged_at"]
        new_local_date = existing["local_date"]

    now_iso = datetime.now(UTC).isoformat()

    with conn:
        conn.execute(
            """
            UPDATE meals SET
                meal_type = ?,
                food_name = ?,
                amount = ?,
                unit = ?,
                calories = ?,
                protein_g = ?,
                carbs_g = ?,
                fat_g = ?,
                calorie_source = ?,
                notes = ?,
                logged_at = ?,
                local_date = ?,
                updated_at = ?
            WHERE id = ?
            """,
            (
                new_meal_type,
                new_food,
                new_amount,
                new_unit,
                new_calories,
                new_protein,
                new_carbs,
                new_fat,
                new_source,
                new_notes,
                new_logged_at,
                new_local_date,
                now_iso,
                meal_id,
            ),
        )

    return get_meal(conn, meal_id)


def delete_meal(conn: sqlite3.Connection, meal_id: int) -> bool:
    """Delete a meal by ID."""
    with conn:
        cur = conn.execute("DELETE FROM meals WHERE id = ?", (meal_id,))
        return cur.rowcount > 0


def get_meals_for_date(conn: sqlite3.Connection, local_date: str) -> list[dict[str, Any]]:
    """Get all meals logged on a specific local date (YYYY-MM-DD), ordered by logged_at."""
    cur = conn.execute(
        """
        SELECT id, meal_type, food_name, amount, unit, calories, protein_g, carbs_g, fat_g,
               calorie_source, notes, logged_at, local_date, created_at, updated_at
        FROM meals WHERE local_date = ?
        ORDER BY logged_at ASC, id ASC
        """,
        (local_date,),
    )
    rows = cur.fetchall()
    return [
        {
            "id": r[0],
            "meal_type": r[1],
            "food_name": r[2],
            "amount": r[3],
            "unit": r[4],
            "calories": r[5],
            "protein_g": round(r[6] or 0.0, 1),
            "carbs_g": round(r[7] or 0.0, 1),
            "fat_g": round(r[8] or 0.0, 1),
            "calorie_source": r[9],
            "notes": r[10],
            "logged_at": r[11],
            "local_date": r[12],
            "created_at": r[13],
            "updated_at": r[14],
        }
        for r in rows
    ]


def get_day_summary(conn: sqlite3.Connection, local_date: Optional[str] = None) -> dict[str, Any]:
    """Calculate target, consumed, remaining/over, and macro breakdown for a local date."""
    settings = get_settings(conn)
    tz_name = settings["timezone"]

    if not local_date:
        now_utc = datetime.now(UTC)
        local_date = get_local_date_for_timestamp(now_utc, tz_name)

    meals = get_meals_for_date(conn, local_date)
    total_consumed = sum(m["calories"] for m in meals)
    total_protein = round(sum(m["protein_g"] for m in meals), 1)
    total_carbs = round(sum(m["carbs_g"] for m in meals), 1)
    total_fat = round(sum(m["fat_g"] for m in meals), 1)

    target = settings["daily_calorie_target"]

    remaining = None
    over_budget = 0
    if target is not None:
        remaining = target - total_consumed
        if remaining < 0:
            over_budget = abs(remaining)

    by_type = {"breakfast": 0, "lunch": 0, "dinner": 0, "snack": 0}
    for m in meals:
        mt = m["meal_type"]
        if mt in by_type:
            by_type[mt] += m["calories"]
        else:
            by_type["snack"] += m["calories"]

    return {
        "date": local_date,
        "timezone": tz_name,
        "target": target,
        "consumed": total_consumed,
        "remaining": remaining,
        "over_target": over_budget,
        "target_macros": {
            "protein_g": settings["target_protein_g"],
            "carbs_g": settings["target_carbs_g"],
            "fat_g": settings["target_fat_g"],
        },
        "consumed_macros": {
            "protein_g": total_protein,
            "carbs_g": total_carbs,
            "fat_g": total_fat,
        },
        "meal_count": len(meals),
        "breakdown": by_type,
        "meals": meals,
    }


def get_history(conn: sqlite3.Connection, days: int = 7) -> list[dict[str, Any]]:
    """Return day summaries for the last N local days up to today."""
    settings = get_settings(conn)
    tz_name = settings["timezone"]

    now_utc = datetime.now(UTC)
    try:
        zi = zoneinfo.ZoneInfo(tz_name)
    except Exception:
        zi = zoneinfo.ZoneInfo("UTC")

    local_today = now_utc.astimezone(zi).date()

    history = []
    from datetime import timedelta

    for i in range(days - 1, -1, -1):
        d_str = (local_today - timedelta(days=i)).strftime("%Y-%m-%d")
        summary = get_day_summary(conn, d_str)
        history.append(
            {
                "date": summary["date"],
                "target": summary["target"],
                "consumed": summary["consumed"],
                "remaining": summary["remaining"],
                "over_target": summary["over_target"],
                "consumed_macros": summary["consumed_macros"],
                "meal_count": summary["meal_count"],
            }
        )
    return history


def get_all_meals(conn: sqlite3.Connection) -> list[dict[str, Any]]:
    """Return all meals sorted by logged_at ASC."""
    cur = conn.execute(
        """
        SELECT id, meal_type, food_name, amount, unit, calories, protein_g, carbs_g, fat_g,
               calorie_source, notes, logged_at, local_date, created_at, updated_at
        FROM meals ORDER BY logged_at ASC
        """
    )
    rows = cur.fetchall()
    return [
        {
            "id": r[0],
            "meal_type": r[1],
            "food_name": r[2],
            "amount": r[3],
            "unit": r[4],
            "calories": r[5],
            "protein_g": round(r[6] or 0.0, 1),
            "carbs_g": round(r[7] or 0.0, 1),
            "fat_g": round(r[8] or 0.0, 1),
            "calorie_source": r[9],
            "notes": r[10],
            "logged_at": r[11],
            "local_date": r[12],
            "created_at": r[13],
            "updated_at": r[14],
        }
        for r in rows
    ]


def import_data(conn: sqlite3.Connection, data: dict[str, Any]) -> int:
    """Import settings, meals, and presets (e.g. synced from Cloudflare or export). Returns count of meals imported."""
    settings = data.get("settings")
    if settings and isinstance(settings, dict):
        update_settings(
            conn,
            daily_calorie_target=settings.get("daily_calorie_target"),
            tz_name=settings.get("timezone"),
            target_protein_g=settings.get("target_protein_g"),
            target_carbs_g=settings.get("target_carbs_g"),
            target_fat_g=settings.get("target_fat_g"),
        )
    meals = data.get("meals") or []
    count = 0
    with conn:
        for m in meals:
            conn.execute(
                """
                INSERT INTO meals (
                    id, meal_type, food_name, amount, unit, calories,
                    protein_g, carbs_g, fat_g, calorie_source, notes,
                    logged_at, local_date, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    meal_type=excluded.meal_type,
                    food_name=excluded.food_name,
                    amount=excluded.amount,
                    unit=excluded.unit,
                    calories=excluded.calories,
                    protein_g=excluded.protein_g,
                    carbs_g=excluded.carbs_g,
                    fat_g=excluded.fat_g,
                    calorie_source=excluded.calorie_source,
                    notes=excluded.notes,
                    logged_at=excluded.logged_at,
                    local_date=excluded.local_date,
                    updated_at=excluded.updated_at
                """,
                (
                    m.get("id"),
                    m.get("meal_type", "snack"),
                    m.get("food_name", "Unknown"),
                    m.get("amount", 1.0),
                    m.get("unit", "serving"),
                    m.get("calories", 0),
                    m.get("protein_g", 0.0),
                    m.get("carbs_g", 0.0),
                    m.get("fat_g", 0.0),
                    m.get("calorie_source", "user"),
                    m.get("notes"),
                    m.get("logged_at", datetime.now(UTC).isoformat()),
                    m.get("local_date", datetime.now(UTC).strftime("%Y-%m-%d")),
                    m.get("created_at", datetime.now(UTC).isoformat()),
                    m.get("updated_at", datetime.now(UTC).isoformat()),
                ),
            )
            count += 1

        presets = data.get("presets") or []
        for p in presets:
            if p.get("name"):
                conn.execute(
                    """
                    INSERT INTO presets (
                        name, food_name, amount, unit, calories,
                        protein_g, carbs_g, fat_g, calorie_source, meal_type,
                        notes, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT(name) DO UPDATE SET
                        food_name=excluded.food_name,
                        amount=excluded.amount,
                        unit=excluded.unit,
                        calories=excluded.calories,
                        protein_g=excluded.protein_g,
                        carbs_g=excluded.carbs_g,
                        fat_g=excluded.fat_g,
                        calorie_source=excluded.calorie_source,
                        meal_type=excluded.meal_type,
                        notes=excluded.notes,
                        updated_at=excluded.updated_at
                    """,
                    (
                        p.get("name"),
                        p.get("food_name", p.get("name")),
                        p.get("amount", 1.0),
                        p.get("unit", "serving"),
                        p.get("calories", 0),
                        p.get("protein_g", 0.0),
                        p.get("carbs_g", 0.0),
                        p.get("fat_g", 0.0),
                        p.get("calorie_source", "user"),
                        p.get("meal_type", "snack"),
                        p.get("notes", ""),
                        p.get("created_at", datetime.now(UTC).isoformat()),
                        p.get("updated_at", datetime.now(UTC).isoformat()),
                    ),
                )
    return count


def export_data(conn: sqlite3.Connection, format: str = "json") -> str:
    """Export all settings, meal data, and presets as JSON or CSV."""
    settings = get_settings(conn)
    meals = get_all_meals(conn)
    presets = list_presets(conn)

    if format.lower() == "csv":
        output = io.StringIO()
        fieldnames = [
            "id",
            "local_date",
            "logged_at",
            "meal_type",
            "food_name",
            "amount",
            "unit",
            "calories",
            "protein_g",
            "carbs_g",
            "fat_g",
            "calorie_source",
            "notes",
        ]
        writer = csv.DictWriter(output, fieldnames=fieldnames, extrasaction="ignore")
        writer.writeheader()
        for m in meals:
            writer.writerow(m)
        return output.getvalue()

    return json.dumps({"settings": settings, "meals": meals, "presets": presets}, indent=2)


def create_preset(
    conn: sqlite3.Connection,
    name: str,
    food_name: Optional[str] = None,
    amount: float = 1.0,
    unit: str = "serving",
    calories: Optional[int] = None,
    protein_g: Optional[float] = None,
    carbs_g: Optional[float] = None,
    fat_g: Optional[float] = None,
    calorie_source: Optional[str] = None,
    meal_type: str = "snack",
    notes: Optional[str] = None,
) -> dict[str, Any]:
    """Create a new reusable meal or recipe preset."""
    name_clean = name.strip()
    if not name_clean:
        raise ValueError("Preset name cannot be empty.")
    if amount <= 0:
        raise ValueError("Amount must be greater than 0.")

    target_food = (food_name or name_clean).strip()
    cals = calories
    source = calorie_source

    if cals is None:
        ref_food = lookup_reference_food(target_food, amount, unit)
        if ref_food:
            cals = ref_food["calories"]
            if protein_g is None:
                protein_g = ref_food["protein_g"]
            if carbs_g is None:
                carbs_g = ref_food["carbs_g"]
            if fat_g is None:
                fat_g = ref_food["fat_g"]
            if not source:
                source = "reference"
        else:
            raise ValueError(f"Calories missing and no standard reference found for '{amount} {unit} {target_food}'.")

    if cals < 0:
        raise ValueError("Calories cannot be negative.")

    if not source:
        source = "user"
    elif source not in ("user", "reference", "estimate"):
        raise ValueError(f"Invalid calorie_source: {source}")

    valid_types = ("breakfast", "lunch", "dinner", "snack")
    clean_type = meal_type.lower().strip()
    if clean_type not in valid_types:
        clean_type = "snack"

    prot = float(protein_g) if protein_g is not None else 0.0
    carb = float(carbs_g) if carbs_g is not None else 0.0
    fat = float(fat_g) if fat_g is not None else 0.0

    now_iso = datetime.now(UTC).isoformat()
    with conn:
        cur = conn.execute(
            """
            INSERT INTO presets (
                name, food_name, amount, unit, calories, protein_g, carbs_g, fat_g,
                calorie_source, meal_type, notes, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                name_clean,
                target_food,
                float(amount),
                unit.strip(),
                int(cals),
                prot,
                carb,
                fat,
                source,
                clean_type,
                notes or "",
                now_iso,
                now_iso,
            ),
        )
        preset_id = cur.lastrowid

    res = get_preset(conn, preset_id)
    if not res:
        raise RuntimeError("Failed to read back newly created preset.")
    return res


def get_preset(conn: sqlite3.Connection, preset_id_or_name: int | str) -> Optional[dict[str, Any]]:
    """Retrieve a preset by its ID or case-insensitive name."""
    if isinstance(preset_id_or_name, int) or (isinstance(preset_id_or_name, str) and preset_id_or_name.strip().isdigit()):
        cur = conn.execute(
            """
            SELECT id, name, food_name, amount, unit, calories, protein_g, carbs_g, fat_g,
                   calorie_source, meal_type, notes, created_at, updated_at
            FROM presets WHERE id = ? OR name = ? COLLATE NOCASE
            """,
            (int(preset_id_or_name), str(preset_id_or_name).strip()),
        )
    else:
        cur = conn.execute(
            """
            SELECT id, name, food_name, amount, unit, calories, protein_g, carbs_g, fat_g,
                   calorie_source, meal_type, notes, created_at, updated_at
            FROM presets WHERE name = ? COLLATE NOCASE
            """,
            (str(preset_id_or_name).strip(),),
        )

    row = cur.fetchone()
    if not row:
        return None
    return {
        "id": row[0],
        "name": row[1],
        "food_name": row[2],
        "amount": row[3],
        "unit": row[4],
        "calories": row[5],
        "protein_g": row[6],
        "carbs_g": row[7],
        "fat_g": row[8],
        "calorie_source": row[9],
        "meal_type": row[10],
        "notes": row[11],
        "created_at": row[12],
        "updated_at": row[13],
    }


def list_presets(conn: sqlite3.Connection, query: Optional[str] = None) -> list[dict[str, Any]]:
    """List all saved presets, optionally filtered by name or food."""
    if query:
        pattern = f"%{query.strip()}%"
        cur = conn.execute(
            """
            SELECT id, name, food_name, amount, unit, calories, protein_g, carbs_g, fat_g,
                   calorie_source, meal_type, notes, created_at, updated_at
            FROM presets
            WHERE name LIKE ? OR food_name LIKE ?
            ORDER BY name COLLATE NOCASE ASC
            """,
            (pattern, pattern),
        )
    else:
        cur = conn.execute(
            """
            SELECT id, name, food_name, amount, unit, calories, protein_g, carbs_g, fat_g,
                   calorie_source, meal_type, notes, created_at, updated_at
            FROM presets
            ORDER BY name COLLATE NOCASE ASC
            """
        )

    presets = []
    for row in cur.fetchall():
        presets.append({
            "id": row[0],
            "name": row[1],
            "food_name": row[2],
            "amount": row[3],
            "unit": row[4],
            "calories": row[5],
            "protein_g": row[6],
            "carbs_g": row[7],
            "fat_g": row[8],
            "calorie_source": row[9],
            "meal_type": row[10],
            "notes": row[11],
            "created_at": row[12],
            "updated_at": row[13],
        })
    return presets


def edit_preset(
    conn: sqlite3.Connection,
    preset_id_or_name: int | str,
    name: Optional[str] = None,
    food_name: Optional[str] = None,
    amount: Optional[float] = None,
    unit: Optional[str] = None,
    calories: Optional[int] = None,
    protein_g: Optional[float] = None,
    carbs_g: Optional[float] = None,
    fat_g: Optional[float] = None,
    calorie_source: Optional[str] = None,
    meal_type: Optional[str] = None,
    notes: Optional[str] = None,
) -> Optional[dict[str, Any]]:
    """Edit an existing preset."""
    existing = get_preset(conn, preset_id_or_name)
    if not existing:
        return None

    new_name = name.strip() if name is not None else existing["name"]
    new_food = food_name.strip() if food_name is not None else existing["food_name"]
    new_amount = float(amount) if amount is not None else existing["amount"]
    new_unit = unit.strip() if unit is not None else existing["unit"]
    new_cals = int(calories) if calories is not None else existing["calories"]
    new_protein = float(protein_g) if protein_g is not None else existing["protein_g"]
    new_carbs = float(carbs_g) if carbs_g is not None else existing["carbs_g"]
    new_fat = float(fat_g) if fat_g is not None else existing["fat_g"]
    new_source = calorie_source if calorie_source is not None else existing["calorie_source"]
    new_type = meal_type.lower().strip() if meal_type is not None else existing["meal_type"]
    new_notes = notes if notes is not None else existing["notes"]

    if new_amount <= 0:
        raise ValueError("Amount must be greater than 0.")
    if new_cals < 0:
        raise ValueError("Calories cannot be negative.")
    if new_source not in ("user", "reference", "estimate"):
        raise ValueError(f"Invalid calorie_source: {new_source}")
    if new_type not in ("breakfast", "lunch", "dinner", "snack"):
        new_type = "snack"

    now_iso = datetime.now(UTC).isoformat()
    with conn:
        conn.execute(
            """
            UPDATE presets SET
                name = ?, food_name = ?, amount = ?, unit = ?, calories = ?,
                protein_g = ?, carbs_g = ?, fat_g = ?, calorie_source = ?,
                meal_type = ?, notes = ?, updated_at = ?
            WHERE id = ?
            """,
            (
                new_name,
                new_food,
                new_amount,
                new_unit,
                new_cals,
                new_protein,
                new_carbs,
                new_fat,
                new_source,
                new_type,
                new_notes,
                now_iso,
                existing["id"],
            ),
        )

    return get_preset(conn, existing["id"])


def delete_preset(conn: sqlite3.Connection, preset_id_or_name: int | str) -> bool:
    """Delete a preset by ID or name."""
    existing = get_preset(conn, preset_id_or_name)
    if not existing:
        return False
    with conn:
        conn.execute("DELETE FROM presets WHERE id = ?", (existing["id"],))
    return True


def log_meal_from_preset(
    conn: sqlite3.Connection,
    preset_id_or_name: int | str,
    servings: float = 1.0,
    meal_type: Optional[str] = None,
    notes: Optional[str] = None,
    logged_at: Optional[str] = None,
) -> dict[str, Any]:
    """Quick-log a meal from a saved preset, scaling by servings."""
    if servings <= 0:
        raise ValueError("Servings must be greater than 0.")

    preset = get_preset(conn, preset_id_or_name)
    if not preset:
        raise ValueError(f"Preset '{preset_id_or_name}' not found.")

    scaled_amount = round(preset["amount"] * servings, 2)
    scaled_calories = round(preset["calories"] * servings)
    scaled_protein = round(preset["protein_g"] * servings, 1)
    scaled_carbs = round(preset["carbs_g"] * servings, 1)
    scaled_fat = round(preset["fat_g"] * servings, 1)

    chosen_type = meal_type or preset["meal_type"]
    p_notes = preset.get("notes") or ""
    if notes and p_notes:
        combined_notes = f"{notes} ({p_notes})"
    elif notes:
        combined_notes = notes
    else:
        combined_notes = p_notes

    return log_meal(
        conn,
        food_name=preset["food_name"],
        amount=scaled_amount,
        unit=preset["unit"],
        calories=scaled_calories,
        protein_g=scaled_protein,
        carbs_g=scaled_carbs,
        fat_g=scaled_fat,
        calorie_source=preset["calorie_source"],
        meal_type=chosen_type,
        notes=combined_notes,
        logged_at=logged_at,
    )


# ---------------------------------------------------------------------------
# Weight Progression Storage
# ---------------------------------------------------------------------------


def log_weight(
    conn: sqlite3.Connection,
    weight_kg: float,
    date: Optional[str] = None,
    notes: Optional[str] = None,
) -> dict[str, Any]:
    """Record body weight for a given date (defaults to today in user's timezone)."""
    if weight_kg <= 0:
        raise ValueError("Weight in kg must be greater than 0.")

    if not date:
        settings = get_settings(conn)
        tz = zoneinfo.ZoneInfo(settings["timezone"])
        date = datetime.now(tz).strftime("%Y-%m-%d")

    now_iso = datetime.now(UTC).isoformat()
    with conn:
        conn.execute(
            """
            INSERT INTO weight_logs (date, weight_kg, notes, created_at)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(date) DO UPDATE SET
                weight_kg = excluded.weight_kg,
                notes = excluded.notes
            """,
            (date, float(weight_kg), notes, now_iso),
        )

    cur = conn.execute("SELECT id, date, weight_kg, notes, created_at FROM weight_logs WHERE date = ?", (date,))
    row = cur.fetchone()
    return {
        "id": row[0],
        "date": row[1],
        "weight_kg": row[2],
        "notes": row[3],
        "created_at": row[4],
    }


def get_weight_logs(conn: sqlite3.Connection, limit: int = 30) -> list[dict[str, Any]]:
    """Retrieve recent weight logs ordered chronologically."""
    cur = conn.execute(
        """
        SELECT id, date, weight_kg, notes, created_at
        FROM weight_logs
        ORDER BY date ASC
        LIMIT ?
        """,
        (max(1, limit),),
    )
    return [
        {
            "id": r[0],
            "date": r[1],
            "weight_kg": r[2],
            "notes": r[3],
            "created_at": r[4],
        }
        for r in cur.fetchall()
    ]


def delete_weight_log(conn: sqlite3.Connection, log_id: int) -> bool:
    """Delete a weight entry by ID."""
    with conn:
        cur = conn.execute("DELETE FROM weight_logs WHERE id = ?", (log_id,))
        return cur.rowcount > 0


# ---------------------------------------------------------------------------
# Intermittent Fasting Storage
# ---------------------------------------------------------------------------


def get_active_fasting(conn: sqlite3.Connection) -> Optional[dict[str, Any]]:
    """Retrieve the currently active fasting session, if any."""
    cur = conn.execute(
        """
        SELECT id, start_time, target_hours, end_time, is_active, fast_type, notes, created_at, updated_at
        FROM fasting_sessions
        WHERE is_active = 1
        ORDER BY id DESC
        LIMIT 1
        """
    )
    row = cur.fetchone()
    if not row:
        return None
    return {
        "id": row[0],
        "start_time": row[1],
        "target_hours": row[2],
        "end_time": row[3],
        "is_active": bool(row[4]),
        "fast_type": row[5],
        "notes": row[6],
        "created_at": row[7],
        "updated_at": row[8],
    }


def start_fasting(
    conn: sqlite3.Connection,
    target_hours: float = 16.0,
    fast_type: str = "16:8",
    start_time: Optional[str] = None,
    notes: Optional[str] = None,
) -> dict[str, Any]:
    """Start or reset an active fasting session."""
    if target_hours <= 0:
        raise ValueError("Target fasting hours must be greater than 0.")

    now_iso = datetime.now(UTC).isoformat()
    fast_start = start_time or now_iso

    with conn:
        # End any prior active fasts
        conn.execute("UPDATE fasting_sessions SET is_active = 0, updated_at = ? WHERE is_active = 1", (now_iso,))
        cur = conn.execute(
            """
            INSERT INTO fasting_sessions (start_time, target_hours, end_time, is_active, fast_type, notes, created_at, updated_at)
            VALUES (?, ?, NULL, 1, ?, ?, ?, ?)
            """,
            (fast_start, float(target_hours), fast_type, notes, now_iso, now_iso),
        )
        session_id = cur.lastrowid

    return {
        "id": session_id,
        "start_time": fast_start,
        "target_hours": float(target_hours),
        "end_time": None,
        "is_active": True,
        "fast_type": fast_type,
        "notes": notes,
        "created_at": now_iso,
        "updated_at": now_iso,
    }


def end_fasting(conn: sqlite3.Connection, session_id: Optional[int] = None) -> Optional[dict[str, Any]]:
    """End the active fasting session."""
    active = get_active_fasting(conn)
    if not active:
        return None

    target_id = session_id or active["id"]
    now_iso = datetime.now(UTC).isoformat()
    with conn:
        conn.execute(
            "UPDATE fasting_sessions SET is_active = 0, end_time = ?, updated_at = ? WHERE id = ?",
            (now_iso, now_iso, target_id),
        )

    active["is_active"] = False
    active["end_time"] = now_iso
    active["updated_at"] = now_iso
    return active


def get_latest_meal(conn: sqlite3.Connection) -> Optional[dict[str, Any]]:
    """Get the most recently logged meal for auto-fast calculation."""
    cur = conn.execute(
        """
        SELECT id, meal_type, food_name, amount, unit, calories, protein_g, carbs_g, fat_g, logged_at
        FROM meals
        ORDER BY logged_at DESC
        LIMIT 1
        """
    )
    row = cur.fetchone()
    if not row:
        return None
    return {
        "id": row[0],
        "meal_type": row[1],
        "food_name": row[2],
        "amount": row[3],
        "unit": row[4],
        "calories": row[5],
        "protein_g": row[6],
        "carbs_g": row[7],
        "fat_g": row[8],
        "logged_at": row[9],
    }

