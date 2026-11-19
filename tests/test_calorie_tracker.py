"""Tests for the calorie_tracker plugin:
- Schema migrations (v1 -> v2) & persistence across restarts
- Daily calorie target, macro targets & timezone configuration
- Timezone day boundaries
- Estimates vs user-entered vs reference calorie & macro sources
- Calorie totals, macro breakdown, remaining balance, and over-budget calculation
- Edit/delete meals and chat/API two-way parity
- JSON and CSV exports
- Dashboard FastAPI router endpoints
"""

import json
from pathlib import Path
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from plugins.calorie_tracker import storage, tools
from plugins.calorie_tracker.dashboard.plugin_api import router as dashboard_router


@pytest.fixture(autouse=True)
def isolated_hermes_home(tmp_path, monkeypatch):
    """Isolate HERMES_HOME for test runs."""
    monkeypatch.setenv("HERMES_HOME", str(tmp_path))
    monkeypatch.setenv("HERMES_CALORIE_OFFLINE", "1")
    yield tmp_path


def test_schema_init_and_persistence(tmp_path):
    """Test that schema migrations run and tables persist across connections."""
    conn = storage.get_connection()
    cur = conn.execute("SELECT MAX(version) FROM schema_migrations")
    assert cur.fetchone()[0] == 4

    # Verify tables exist
    cur = conn.execute("SELECT name FROM sqlite_master WHERE type='table'")
    tables = {r[0] for r in cur.fetchall()}
    assert "schema_migrations" in tables
    assert "user_settings" in tables
    assert "meals" in tables
    assert "presets" in tables
    assert "weight_logs" in tables
    assert "fasting_sessions" in tables

    # Verify macro columns exist
    cur = conn.execute("PRAGMA table_info(meals)")
    meal_cols = {col[1] for col in cur.fetchall()}
    assert "protein_g" in meal_cols
    assert "carbs_g" in meal_cols
    assert "fat_g" in meal_cols

    # Insert a meal with macros
    m = storage.log_meal(
        conn,
        food_name="Apple",
        amount=1,
        unit="medium",
        calories=95,
        protein_g=0.5,
        carbs_g=25.0,
        fat_g=0.3,
        calorie_source="user",
        meal_type="breakfast",
    )
    assert m["id"] is not None
    conn.close()

    # Reconnect and verify data persists
    conn2 = storage.get_connection()
    m2 = storage.get_meal(conn2, m["id"])
    assert m2 is not None
    assert m2["food_name"] == "Apple"
    assert m2["calories"] == 95
    assert m2["protein_g"] == 0.5
    assert m2["carbs_g"] == 25.0
    assert m2["fat_g"] == 0.3
    assert m2["calorie_source"] == "user"
    conn2.close()


def test_settings_and_timezone_validation():
    """Test setting and updating target calories, macros, and timezone."""
    conn = storage.get_connection()

    # Initial settings
    s = storage.get_settings(conn)
    assert "timezone" in s
    assert s["daily_calorie_target"] is None

    # Update valid settings with macro goals
    updated = storage.update_settings(
        conn,
        daily_calorie_target=2200,
        tz_name="America/New_York",
        target_protein_g=160,
        target_carbs_g=220,
        target_fat_g=70,
    )
    assert updated["daily_calorie_target"] == 2200
    assert updated["timezone"] == "America/New_York"
    assert updated["target_protein_g"] == 160.0
    assert updated["target_carbs_g"] == 220.0
    assert updated["target_fat_g"] == 70.0

    # Reject invalid timezone
    with pytest.raises(ValueError, match="Invalid IANA timezone"):
        storage.update_settings(conn, tz_name="Fake/Timezone")

    # Reject non-positive target
    with pytest.raises(ValueError, match="positive integer"):
        storage.update_settings(conn, daily_calorie_target=-50)

    conn.close()


def test_timezone_day_boundaries():
    """Test that meal timestamps partition correctly into local dates depending on timezone."""
    conn = storage.get_connection()

    # Set timezone to UTC
    storage.update_settings(conn, daily_calorie_target=2000, tz_name="UTC")

    # Log a meal at 2026-11-15T23:30:00Z
    ts_utc = "2026-11-15T23:30:00Z"
    m_utc = storage.log_meal(
        conn,
        food_name="Late Snack",
        amount=1,
        unit="serving",
        calories=200,
        calorie_source="user",
        logged_at=ts_utc,
    )
    assert m_utc["local_date"] == "2026-11-15"

    # In Asia/Kolkata (UTC+5:30), 23:30 UTC on 2026-11-15 is 05:00 on 2026-11-16
    storage.update_settings(conn, tz_name="Asia/Kolkata")
    m_kolkata = storage.log_meal(
        conn,
        food_name="Early Chai",
        amount=1,
        unit="cup",
        calories=120,
        calorie_source="user",
        logged_at=ts_utc,
    )
    assert m_kolkata["local_date"] == "2026-11-16"

    # Verify date queries return only meals matching that local date
    meals_15th = storage.get_meals_for_date(conn, "2026-11-15")
    assert any(m["id"] == m_utc["id"] for m in meals_15th)
    assert not any(m["id"] == m_kolkata["id"] for m in meals_15th)

    meals_16th = storage.get_meals_for_date(conn, "2026-11-16")
    assert any(m["id"] == m_kolkata["id"] for m in meals_16th)

    conn.close()


def test_calorie_totals_and_macro_breakdown():
    """Test daily summary calculations: target, consumed, macros, remaining, and over-budget."""
    conn = storage.get_connection()
    storage.update_settings(
        conn,
        daily_calorie_target=1800,
        tz_name="UTC",
        target_protein_g=140,
        target_carbs_g=180,
        target_fat_g=60,
    )

    test_date = "2026-11-15"
    # Log Breakfast: 450 kcal, 25g P, 50g C, 15g F
    storage.log_meal(
        conn,
        food_name="Eggs and toast",
        amount=1,
        unit="plate",
        calories=450,
        protein_g=25.0,
        carbs_g=50.0,
        fat_g=15.0,
        calorie_source="user",
        meal_type="breakfast",
        logged_at="2026-11-15T08:00:00Z",
    )
    # Log Lunch: 750 kcal, 55g P, 60g C, 22g F
    storage.log_meal(
        conn,
        food_name="Chicken salad",
        amount=1,
        unit="bowl",
        calories=750,
        protein_g=55.0,
        carbs_g=60.0,
        fat_g=22.0,
        calorie_source="user",
        meal_type="lunch",
        logged_at="2026-11-15T13:00:00Z",
    )

    sum1 = storage.get_day_summary(conn, test_date)
    assert sum1["target"] == 1800
    assert sum1["consumed"] == 1200
    assert sum1["remaining"] == 600
    assert sum1["over_target"] == 0
    assert sum1["consumed_macros"]["protein_g"] == 80.0
    assert sum1["consumed_macros"]["carbs_g"] == 110.0
    assert sum1["consumed_macros"]["fat_g"] == 37.0
    assert sum1["breakdown"]["breakfast"] == 450
    assert sum1["breakdown"]["lunch"] == 750

    # Log Dinner that puts user over budget: 800 kcal (total 2000 kcal)
    storage.log_meal(
        conn,
        food_name="Steak and potatoes",
        amount=1,
        unit="plate",
        calories=800,
        protein_g=60.0,
        carbs_g=45.0,
        fat_g=30.0,
        calorie_source="user",
        meal_type="dinner",
        logged_at="2026-11-15T19:30:00Z",
    )

    sum2 = storage.get_day_summary(conn, test_date)
    assert sum2["consumed"] == 2000
    assert sum2["remaining"] == -200
    assert sum2["over_target"] == 200
    assert sum2["consumed_macros"]["protein_g"] == 140.0
    assert sum2["consumed_macros"]["carbs_g"] == 155.0
    assert sum2["consumed_macros"]["fat_g"] == 67.0
    assert sum2["breakdown"]["dinner"] == 800
    assert sum2["meal_count"] == 3

    conn.close()


def test_calorie_sources_and_clarification():
    """Test handling of user calories, reference lookup (with macros), estimates, and ambiguous entries."""
    # 1. User specified calories & macros
    res1 = tools.handle_calorie_log_meal({
        "food_name": "Protein Bar",
        "amount": 1,
        "unit": "bar",
        "calories": 210,
        "protein_g": 20.0,
        "carbs_g": 22.0,
        "fat_g": 7.0,
        "is_estimated": False,
    })
    assert res1["status"] == "success"
    assert res1["logged_meal"]["calorie_source"] == "user"
    assert res1["logged_meal"]["calories"] == 210
    assert res1["logged_meal"]["protein_g"] == 20.0

    # 2. Reference food lookup with auto-calculated macros (e.g. 2 bananas)
    res2 = tools.handle_calorie_log_meal({
        "food_name": "banana",
        "amount": 2,
        "unit": "medium",
    })
    assert res2["status"] == "success"
    assert res2["logged_meal"]["calorie_source"] == "reference"
    assert res2["logged_meal"]["calories"] == 210  # 105 * 2
    assert res2["logged_meal"]["carbs_g"] == 54.0  # 27 * 2

    # 3. LLM estimate explicitly badged
    res3 = tools.handle_calorie_log_meal({
        "food_name": "grilled salmon with asparagus",
        "amount": 1,
        "unit": "plate",
        "calories": 420,
        "protein_g": 35.0,
        "is_estimated": True,
    })
    assert res3["status"] == "success"
    assert res3["logged_meal"]["calorie_source"] == "estimate"
    assert res3["logged_meal"]["calories"] == 420

    # 4. Ambiguous unknown food without calories asks for clarification
    res4 = tools.handle_calorie_log_meal({
        "food_name": "mystery casserole",
        "amount": 1,
        "unit": "bowl",
    })
    assert res4.get("needs_clarification") is True
    assert "mystery casserole" in res4["message"]


def test_edit_and_delete_meals():
    """Test editing meal details and correcting calorie and macro estimates."""
    log_res = tools.handle_calorie_log_meal({
        "food_name": "Smoothie",
        "amount": 1,
        "unit": "glass",
        "calories": 300,
        "protein_g": 10.0,
        "is_estimated": True,
    })
    meal_id = log_res["logged_meal"]["id"]
    assert log_res["logged_meal"]["calorie_source"] == "estimate"

    # User corrects the estimate to 240 kcal & 15g protein
    edit_res = tools.handle_calorie_edit_meal({
        "meal_id": meal_id,
        "calories": 240,
        "protein_g": 15.0,
        "notes": "Made with almond milk",
    })
    assert edit_res["status"] == "success"
    assert edit_res["updated_meal"]["calories"] == 240
    assert edit_res["updated_meal"]["protein_g"] == 15.0
    assert edit_res["updated_meal"]["calorie_source"] == "user"
    assert edit_res["updated_meal"]["notes"] == "Made with almond milk"

    # Delete meal
    del_res = tools.handle_calorie_delete_meal({"meal_id": meal_id})
    assert del_res["status"] == "success"
    assert del_res["deleted_id"] == meal_id

    # Verify meal no longer exists
    conn = storage.get_connection()
    assert storage.get_meal(conn, meal_id) is None
    conn.close()


def test_export_data():
    """Test JSON and CSV exports with macro columns."""
    conn = storage.get_connection()
    storage.update_settings(conn, daily_calorie_target=2100, tz_name="UTC")
    storage.log_meal(
        conn,
        food_name="Greek Yogurt",
        amount=1,
        unit="cup",
        calories=130,
        protein_g=17.0,
        carbs_g=6.0,
        fat_g=4.0,
        calorie_source="reference",
        meal_type="snack",
    )

    # JSON export
    json_out = storage.export_data(conn, format="json")
    data = json.loads(json_out)
    assert data["settings"]["daily_calorie_target"] == 2100
    assert len(data["meals"]) >= 1
    assert data["meals"][0]["food_name"] == "Greek Yogurt"
    assert data["meals"][0]["protein_g"] == 17.0

    # CSV export
    csv_out = storage.export_data(conn, format="csv")
    assert "id,local_date,logged_at" in csv_out
    assert "protein_g,carbs_g,fat_g" in csv_out
    assert "Greek Yogurt" in csv_out

    conn.close()


def test_dashboard_api_integration():
    """Test dashboard FastAPI router endpoints and two-way parity with chat tools."""
    app = FastAPI()
    app.include_router(dashboard_router, prefix="/api/plugins/calorie-tracker")
    client = TestClient(app)

    # 1. Configure settings with macro targets via API
    put_settings = client.put(
        "/api/plugins/calorie-tracker/settings",
        json={
            "daily_calorie_target": 2500,
            "timezone": "Europe/London",
            "target_protein_g": 170.0,
            "target_carbs_g": 240.0,
            "target_fat_g": 75.0,
        },
    )
    assert put_settings.status_code == 200
    assert put_settings.json()["daily_calorie_target"] == 2500
    assert put_settings.json()["timezone"] == "Europe/London"
    assert put_settings.json()["target_protein_g"] == 170.0

    # Verify tool sees updated settings
    sum_res = tools.handle_calorie_get_summary({})
    assert sum_res["summary"]["target"] == 2500
    assert sum_res["summary"]["timezone"] == "Europe/London"
    assert sum_res["summary"]["target_macros"]["protein_g"] == 170.0

    # 2. Log meal with macros via API
    post_meal = client.post(
        "/api/plugins/calorie-tracker/meals",
        json={
            "food_name": "Oatmeal with berries",
            "amount": 1,
            "unit": "bowl",
            "calories": 350,
            "protein_g": 12.0,
            "carbs_g": 60.0,
            "fat_g": 6.0,
            "calorie_source": "user",
            "meal_type": "breakfast",
        },
    )
    assert post_meal.status_code == 200
    meal_data = post_meal.json()
    meal_id = meal_data["id"]
    assert meal_data["calories"] == 350
    assert meal_data["protein_g"] == 12.0

    # 3. Edit meal via tool and confirm API reflects it
    tools.handle_calorie_edit_meal({"meal_id": meal_id, "calories": 400, "protein_g": 15.0})

    get_meals = client.get("/api/plugins/calorie-tracker/meals?date=" + meal_data["local_date"])
    assert get_meals.status_code == 200
    m = next(item for item in get_meals.json()["meals"] if item["id"] == meal_id)
    assert m["calories"] == 400
    assert m["protein_g"] == 15.0

    # 4. Summary endpoint verification with macros
    summary_resp = client.get("/api/plugins/calorie-tracker/summary?date=" + meal_data["local_date"])
    assert summary_resp.status_code == 200
    s_data = summary_resp.json()
    assert s_data["consumed"] >= 400
    assert s_data["consumed_macros"]["protein_g"] >= 15.0
    assert s_data["remaining"] == 2500 - s_data["consumed"]

    # 5. History endpoint
    hist_resp = client.get("/api/plugins/calorie-tracker/history?days=3")
    assert hist_resp.status_code == 200
    assert len(hist_resp.json()) == 3

    # 6. Delete via API
    del_resp = client.delete(f"/api/plugins/calorie-tracker/meals/{meal_id}")
    assert del_resp.status_code == 200
    assert del_resp.json()["deleted"] is True


def test_cloudflare_sync_tool(monkeypatch):
    """Test calorie_sync_cloudflare push and pull functionality with mocked HTTP responses."""
    import io
    from unittest.mock import MagicMock

    conn = storage.get_connection()
    storage.log_meal(
        conn,
        food_name="Protein Shake",
        amount=1,
        unit="bottle",
        calories=200,
        protein_g=30.0,
        carbs_g=5.0,
        fat_g=2.0,
        calorie_source="user",
        meal_type="snack",
    )

    # Mock urllib.request.urlopen for push
    mock_push_resp = MagicMock()
    mock_push_resp.read.return_value = json.dumps({"synced": True, "meals_count": 1}).encode("utf-8")
    mock_push_resp.__enter__.return_value = mock_push_resp

    # Mock urllib.request.urlopen for pull
    mock_pull_resp = MagicMock()
    mock_pull_resp.read.return_value = json.dumps({
        "settings": {"daily_calorie_target": 2200, "timezone": "UTC", "target_protein_g": 160.0},
        "meals": [{
            "id": 99,
            "meal_type": "dinner",
            "food_name": "Salmon Fillet",
            "amount": 1,
            "unit": "fillet",
            "calories": 400,
            "protein_g": 35.0,
            "carbs_g": 0.0,
            "fat_g": 22.0,
            "calorie_source": "user",
            "notes": "pan seared",
            "logged_at": "2026-11-15T19:00:00Z",
            "local_date": "2026-11-15",
            "created_at": "2026-11-15T19:00:00Z",
            "updated_at": "2026-11-15T19:00:00Z",
        }]
    }).encode("utf-8")
    mock_pull_resp.__enter__.return_value = mock_pull_resp

    def fake_urlopen(req, timeout=None):
        if req.get_method() == "POST":
            return mock_push_resp
        return mock_pull_resp

    monkeypatch.setattr("urllib.request.urlopen", fake_urlopen)

    # Test push
    push_res = tools.handle_calorie_sync_cloudflare({"action": "push"})
    assert push_res["status"] == "success"
    assert push_res["action"] == "push"
    assert push_res["pushed_meals_count"] >= 1

    # Test pull
    pull_res = tools.handle_calorie_sync_cloudflare({"action": "pull"})
    assert pull_res["status"] == "success"
    assert pull_res["action"] == "pull"
    assert pull_res["imported_meals_count"] == 1

    # Verify pulled meal exists in local database
    pulled = storage.get_meal(conn, 99)
    assert pulled is not None
    assert pulled["food_name"] == "Salmon Fillet"
    assert pulled["protein_g"] == 35.0

    # Verify settings updated
    settings = storage.get_settings(conn)
    assert settings["daily_calorie_target"] == 2200
    assert settings["target_protein_g"] == 160.0
    conn.close()


def test_preset_schema_v3_and_seed_coffee():
    """Test schema v3 migration and seeded 'Coffee' preset."""
    conn = storage.get_connection()

    # Migration v3 verified
    cur = conn.execute("SELECT MAX(version) FROM schema_migrations")
    assert cur.fetchone()[0] >= 3

    # Seeded Coffee preset verified
    coffee = storage.get_preset(conn, "Coffee")
    assert coffee is not None
    assert coffee["name"] == "Coffee"
    assert coffee["food_name"] == "Coffee"
    assert coffee["amount"] == 1.0
    assert coffee["unit"] == "serving"
    assert coffee["calories"] == 97
    assert coffee["calorie_source"] == "estimate"
    assert coffee["protein_g"] == 1.7
    assert coffee["carbs_g"] == 20.5
    assert coffee["fat_g"] == 1.0
    assert "50 ml milk" in coffee["notes"]
    assert "50 ml water" in coffee["notes"]
    assert "1.5 tbsp sugar" in coffee["notes"]

    conn.close()

    # Persistence check across connections
    conn2 = storage.get_connection()
    coffee2 = storage.get_preset(conn2, "Coffee")
    assert coffee2 is not None
    assert coffee2["calories"] == 97
    assert coffee2["calorie_source"] == "estimate"
    conn2.close()


def test_preset_crud_operations():
    """Test creating, listing, editing, and deleting meal/recipe presets."""
    conn = storage.get_connection()

    # 1. Create a custom preset
    res = tools.handle_calorie_save_preset({
        "name": "Protein Smoothie",
        "food_name": "Whey and Berry Smoothie",
        "amount": 1,
        "unit": "glass",
        "calories": 280,
        "protein_g": 32.0,
        "carbs_g": 25.0,
        "fat_g": 4.0,
        "meal_type": "breakfast",
        "notes": "1 scoop whey, 100g frozen berries, almond milk",
    })
    assert res["status"] == "success"
    p = res["preset"]
    assert p["name"] == "Protein Smoothie"
    assert p["calories"] == 280
    assert p["calorie_source"] == "user"

    # 2. List presets
    list_res = tools.handle_calorie_list_presets({})
    assert list_res["status"] == "success"
    names = [x["name"] for x in list_res["presets"]]
    assert "Coffee" in names
    assert "Protein Smoothie" in names

    # Filter by query
    filter_res = tools.handle_calorie_list_presets({"query": "Smoothie"})
    assert len(filter_res["presets"]) == 1
    assert filter_res["presets"][0]["name"] == "Protein Smoothie"

    # 3. Edit preset
    edit_res = tools.handle_calorie_edit_preset({
        "preset": "Protein Smoothie",
        "calories": 300,
        "protein_g": 35.0,
        "notes": "1 scoop whey, 120g frozen berries, almond milk",
    })
    assert edit_res["status"] == "success"
    assert edit_res["preset"]["calories"] == 300
    assert edit_res["preset"]["protein_g"] == 35.0

    # 4. Delete preset
    del_res = tools.handle_calorie_delete_preset({"preset": "Protein Smoothie"})
    assert del_res["status"] == "success"
    assert del_res["deleted"] is True

    # Verify deleted
    assert storage.get_preset(conn, "Protein Smoothie") is None
    # Coffee should still exist
    assert storage.get_preset(conn, "Coffee") is not None

    conn.close()


def test_preset_to_meal_logging_and_totals():
    """Test quick-logging meals from presets, scaling servings, and verifying summary/history totals."""
    conn = storage.get_connection()
    storage.update_settings(
        conn,
        daily_calorie_target=2000,
        tz_name="UTC",
        target_protein_g=150.0,
        target_carbs_g=200.0,
        target_fat_g=65.0,
    )

    # 1. Quick-log Coffee preset (1 serving)
    log_res = tools.handle_calorie_log_preset({"preset": "Coffee"})
    assert log_res["status"] == "success"
    meal = log_res["meal"]
    assert meal["food_name"] == "Coffee"
    assert meal["calories"] == 97
    assert meal["calorie_source"] == "estimate"
    assert meal["protein_g"] == 1.7
    assert meal["carbs_g"] == 20.5
    assert meal["fat_g"] == 1.0
    assert "50 ml milk" in meal["notes"]

    # Verify daily summary immediately updated
    summary = log_res["daily_summary"]
    assert summary["target"] == 2000
    assert summary["consumed"] == 97
    assert summary["remaining"] == 1903
    assert summary["over_target"] == 0
    assert summary["consumed_macros"]["protein_g"] == 1.7
    assert summary["consumed_macros"]["carbs_g"] == 20.5
    assert summary["consumed_macros"]["fat_g"] == 1.0

    # 2. Create another preset and log 2 servings
    storage.create_preset(
        conn,
        name="Oat Bowl",
        food_name="Rolled Oats with Honey",
        amount=1.0,
        unit="bowl",
        calories=300,
        protein_g=10.0,
        carbs_g=50.0,
        fat_g=5.0,
        calorie_source="user",
        meal_type="breakfast",
        notes="Rolled oats, 1 tbsp honey",
    )

    log_res2 = tools.handle_calorie_log_preset({
        "preset": "Oat Bowl",
        "servings": 2.0,
        "meal_type": "breakfast",
    })
    assert log_res2["status"] == "success"
    meal2 = log_res2["meal"]
    assert meal2["amount"] == 2.0
    assert meal2["calories"] == 600
    assert meal2["protein_g"] == 20.0
    assert meal2["carbs_g"] == 100.0
    assert meal2["fat_g"] == 10.0

    # Total consumed should now be 97 + 600 = 697 kcal
    sum_res = tools.handle_calorie_get_summary({})
    assert sum_res["summary"]["consumed"] == 697
    assert sum_res["summary"]["remaining"] == 1303
    assert sum_res["summary"]["consumed_macros"]["protein_g"] == 21.7
    assert sum_res["summary"]["consumed_macros"]["carbs_g"] == 120.5
    assert sum_res["summary"]["consumed_macros"]["fat_g"] == 11.0

    # Verify history totals
    hist_res = tools.handle_calorie_get_history({"days": 7})
    today_hist = hist_res["history"][-1]
    assert today_hist["consumed"] == 697
    assert today_hist["meal_count"] == 2

    conn.close()


def test_dashboard_presets_api():
    """Test dashboard presets REST endpoints: GET, POST, PUT, DELETE, and quick-add POST /log."""
    app = FastAPI()
    app.include_router(dashboard_router, prefix="/api/plugins/calorie-tracker")
    client = TestClient(app)

    # 1. GET /presets - contains initial Coffee preset
    resp = client.get("/api/plugins/calorie-tracker/presets")
    assert resp.status_code == 200
    presets = resp.json()
    assert any(p["name"] == "Coffee" and p["calories"] == 97 for p in presets)

    # 2. POST /presets - create new preset
    create_resp = client.post(
        "/api/plugins/calorie-tracker/presets",
        json={
            "name": "Greek Yogurt Bowl",
            "food_name": "Greek Yogurt with Berries",
            "amount": 1.0,
            "unit": "bowl",
            "calories": 200,
            "protein_g": 18.0,
            "carbs_g": 22.0,
            "fat_g": 2.5,
            "meal_type": "snack",
            "notes": "1 cup greek yogurt + 50g blueberries",
        },
    )
    assert create_resp.status_code == 200
    new_preset = create_resp.json()
    p_id = new_preset["id"]
    assert new_preset["name"] == "Greek Yogurt Bowl"

    # 3. PUT /presets/{id} - edit preset
    edit_resp = client.put(
        f"/api/plugins/calorie-tracker/presets/{p_id}",
        json={"calories": 220, "protein_g": 20.0},
    )
    assert edit_resp.status_code == 200
    assert edit_resp.json()["calories"] == 220
    assert edit_resp.json()["protein_g"] == 20.0

    # 4. POST /presets/{id}/log - quick log from dashboard
    log_resp = client.post(
        f"/api/plugins/calorie-tracker/presets/{p_id}/log",
        json={"servings": 1.0},
    )
    assert log_resp.status_code == 200
    logged_meal = log_resp.json()["meal"]
    assert logged_meal["calories"] == 220
    assert logged_meal["food_name"] == "Greek Yogurt with Berries"
    assert log_resp.json()["summary"]["consumed"] >= 220

    # 5. DELETE /presets/{id}
    del_resp = client.delete(f"/api/plugins/calorie-tracker/presets/{p_id}")
    assert del_resp.status_code == 200
    assert del_resp.json()["deleted"] is True

    # 6. Verify deleted
    get_del = client.get(f"/api/plugins/calorie-tracker/presets/{p_id}")
    assert get_del.status_code == 404


def test_registered_plugin_runtime_contract():
    """Regression test: verify all calorie_tracker tools conform to Hermes's runtime return contract.

    Handlers must return a string (not a raw dict) so registry.dispatch does not fail with
    'Tool handler returned unsupported result type: dict'.
    Covers preset listing, quick-log, daily summary, and goal setting through real registry dispatch.
    """
    from tools.registry import registry
    from plugins.calorie_tracker import register as register_plugin

    class MockPluginContext:
        def register_tool(self, name, toolset, schema, handler, emoji="", description=""):
            registry.register(
                name=name,
                toolset=toolset,
                schema=schema,
                handler=handler,
                emoji=emoji,
                description=description,
                override=True,
            )

    register_plugin(MockPluginContext())

    # 1. Preset listing through registered plugin runtime
    list_raw = registry.dispatch("calorie_list_presets", {})
    assert isinstance(list_raw, str)
    assert "Tool handler returned unsupported result type" not in list_raw
    list_data = json.loads(list_raw)
    assert list_data["status"] == "success"
    assert list_data["count"] >= 1
    assert any(p["name"] == "Coffee" and p["calories"] == 97 for p in list_data["presets"])

    # 2. Quick-log through registered plugin runtime
    log_raw = registry.dispatch("calorie_log_preset", {"preset": "Coffee"})
    assert isinstance(log_raw, str)
    assert "Tool handler returned unsupported result type" not in log_raw
    log_data = json.loads(log_raw)
    assert log_data["status"] == "success"
    assert log_data["meal"]["food_name"] == "Coffee"
    assert log_data["meal"]["calories"] == 97
    assert log_data["daily_summary"]["consumed"] == 97

    # 3. Daily summary through registered plugin runtime
    sum_raw = registry.dispatch("calorie_get_summary", {})
    assert isinstance(sum_raw, str)
    assert "Tool handler returned unsupported result type" not in sum_raw
    sum_data = json.loads(sum_raw)
    assert sum_data["status"] == "success"
    assert sum_data["summary"]["consumed"] == 97
    assert sum_data["summary"]["consumed_macros"]["protein_g"] == 1.7
    assert sum_data["summary"]["consumed_macros"]["carbs_g"] == 20.5
    assert sum_data["summary"]["consumed_macros"]["fat_g"] == 1.0

    # 4. Save custom preset through registered runtime
    save_raw = registry.dispatch("calorie_save_preset", {
        "name": "Matcha Latte",
        "calories": 140,
        "protein_g": 6.0,
        "carbs_g": 18.0,
        "fat_g": 4.5,
    })
    assert isinstance(save_raw, str)
    assert "Tool handler returned unsupported result type" not in save_raw
    save_data = json.loads(save_raw)
    assert save_data["status"] == "success"
    assert save_data["preset"]["name"] == "Matcha Latte"


def test_weight_logging_and_history():
    """Test calorie_log_weight and calorie_get_weight_history tools."""
    # Log first weight entry
    res1 = tools.handle_calorie_log_weight({
        "weight_kg": 75.0,
        "date": "2026-11-15",
        "notes": "Morning weigh-in",
    })
    assert res1["status"] == "success"
    assert res1["entry"]["weight_kg"] == 75.0
    assert res1["entry"]["date"] == "2026-11-15"

    # Log second weight entry (today)
    res2 = tools.handle_calorie_log_weight({
        "weight_kg": 74.2,
        "date": "2026-11-16",
        "notes": "Post-run",
    })
    assert res2["status"] == "success"
    assert res2["entry"]["weight_kg"] == 74.2

    # Get weight history
    history = tools.handle_calorie_get_weight_history({"days": 7})
    assert history["status"] == "success"
    assert len(history["logs"]) == 2
    assert history["stats"]["latest_weight"] == 74.2
    assert history["stats"]["starting_weight"] == 75.0
    assert history["stats"]["net_change"] == -0.8


def test_intermittent_fasting_lifecycle():
    """Test calorie_get_fasting_status, calorie_start_fast, and calorie_end_fast tools."""
    # Check initial status (before manual start)
    status1 = tools.handle_calorie_get_fasting_status({})
    assert status1["status"] == "success"

    # Start 16:8 fast
    start_res = tools.handle_calorie_start_fast({
        "target_hours": 16.0,
        "fast_type": "16:8",
        "notes": "Started after dinner",
    })
    assert start_res["status"] == "success"
    assert start_res["session"]["target_hours"] == 16.0
    assert start_res["session"]["fast_type"] == "16:8"
    assert start_res["session"]["is_active"] is True

    # Check status during active fast
    status2 = tools.handle_calorie_get_fasting_status({})
    assert status2["status"] == "success"
    assert status2["fasting"]["is_active"] is True
    assert status2["fasting"]["target_hours"] == 16.0
    assert "stage" in status2["fasting"]

    # End fast
    end_res = tools.handle_calorie_end_fast({})
    assert end_res["status"] == "success"
    assert end_res["session"]["is_active"] is False
    assert end_res["session"]["end_time"] is not None


def test_calorie_analyze_food_photo_tool():
    """Test calorie_analyze_food_photo estimation tool."""
    res = tools.handle_calorie_analyze_food_photo({
        "food_description": "Banana",
        "notes": "1 medium yellow banana",
    })
    assert res["success"] is True
    assert res["food_name"] == "Banana"
    assert res["calories"] == 105
    assert res["carbs_g"] == 27.0


def test_new_tools_plugin_runtime_contract():
    """Verify all new tools comply with the string/multimodal return contract."""
    from plugins.calorie_tracker import register

    class MockContext:
        def __init__(self):
            self.tools = {}

        def register_tool(self, name, toolset, schema, handler, emoji, description):
            self.tools[name] = handler

        def dispatch(self, name, args):
            handler = self.tools[name]
            res = handler(args)
            if not isinstance(res, str):
                raise TypeError(f"Tool handler returned unsupported result type: {type(res).__name__}")
            return res

    ctx = MockContext()
    register(ctx)

    assert "calorie_log_weight" in ctx.tools
    assert "calorie_get_weight_history" in ctx.tools
    assert "calorie_get_fasting_status" in ctx.tools
    assert "calorie_start_fast" in ctx.tools
    assert "calorie_end_fast" in ctx.tools
    assert "calorie_analyze_food_photo" in ctx.tools

    # Dispatch weight tool
    w_raw = ctx.dispatch("calorie_log_weight", {"weight_kg": 73.8, "notes": "Fasted"})
    assert isinstance(w_raw, str)
    assert json.loads(w_raw)["status"] == "success"

    # Dispatch fasting tool
    f_raw = ctx.dispatch("calorie_get_fasting_status", {})
    assert isinstance(f_raw, str)
    assert json.loads(f_raw)["status"] == "success"


def test_format_summary_dict_contract_normalization():
    """Test _format_summary_dict normalizes various Cloudflare Worker response formats."""
    from plugins.calorie_tracker.tools import _format_summary_dict

    # 1. Standard Cloudflare Worker response format
    cf_standard = {
        "local_date": "2026-11-19",
        "daily_target": 2200,
        "consumed": 1600,
        "remaining": 600,
        "over_budget": False,
        "over_target": 0,
        "consumed_macros": {"protein_g": 120.0, "carbs_g": 180.0, "fat_g": 50.0},
    }
    norm1 = _format_summary_dict(cf_standard)
    assert norm1["date"] == "2026-11-19"
    assert norm1["target"] == 2200
    assert norm1["total_consumed"] == 1600
    assert norm1["consumed"] == 1600
    assert norm1["remaining"] == 600
    assert norm1["over_target"] == 0
    assert norm1["over_budget"] is False
    assert norm1["consumed_macros"]["protein_g"] == 120.0

    # 2. Worker response with missing remaining (should be derived from daily_target - consumed)
    cf_missing_remaining = {
        "local_date": "2026-11-19",
        "daily_target": 2000,
        "consumed": 1400,
    }
    norm2 = _format_summary_dict(cf_missing_remaining)
    assert norm2["date"] == "2026-11-19"
    assert norm2["target"] == 2000
    assert norm2["total_consumed"] == 1400
    assert norm2["remaining"] == 600
    assert norm2["over_target"] == 0
    assert norm2["over_budget"] is False

    # 3. Worker response with over_budget=True and missing remaining & over_target
    cf_over_budget = {
        "local_date": "2026-11-19",
        "daily_target": 2000,
        "consumed": 2450,
        "over_budget": True,
    }
    norm3 = _format_summary_dict(cf_over_budget)
    assert norm3["date"] == "2026-11-19"
    assert norm3["target"] == 2000
    assert norm3["total_consumed"] == 2450
    assert norm3["remaining"] == 0
    assert norm3["over_target"] == 450
    assert norm3["over_budget"] is True

    # 4. Local SQLite / legacy format with date & target instead of local_date & daily_target
    local_summary = {
        "date": "2026-11-18",
        "target": 1800,
        "consumed": 1950,
        "remaining": 0,
        "over_target": 150,
    }
    norm4 = _format_summary_dict(local_summary)
    assert norm4["date"] == "2026-11-18"
    assert norm4["target"] == 1800
    assert norm4["total_consumed"] == 1950
    assert norm4["remaining"] == 0
    assert norm4["over_target"] == 150
    assert norm4["over_budget"] is True

    # 5. Untargeted day (target is None)
    untargeted = {
        "local_date": "2026-11-19",
        "consumed": 420,
    }
    norm5 = _format_summary_dict(untargeted)
    assert norm5["date"] == "2026-11-19"
    assert norm5["target"] is None
    assert norm5["total_consumed"] == 420
    assert norm5["remaining"] is None
    assert norm5["over_target"] == 0
    assert norm5["over_budget"] is False
    assert norm5["consumed_macros"] == {"protein_g": 0.0, "carbs_g": 0.0, "fat_g": 0.0}


def test_dashboard_api_d1_proxying_online(monkeypatch):
    """Test Cloudflare D1 proxying behavior in hermes_plugin/dashboard/plugin_api.py when online."""
    app = FastAPI()
    app.include_router(dashboard_router, prefix="/api/plugins/calorie-tracker")
    client = TestClient(app)

    # Disable offline mode
    monkeypatch.setattr(tools, "_is_offline", lambda: False)

    mock_d1_calls = []

    def fake_d1_request(path, method="GET", data=None, timeout=10.0):
        mock_d1_calls.append({"path": path, "method": method, "data": data})
        if path == "/api/settings" and method == "GET":
            return {
                "daily_calorie_target": 2300,
                "timezone": "Europe/Paris",
                "target_protein_g": 160.0,
                "target_carbs_g": 210.0,
                "target_fat_g": 70.0,
            }
        elif path == "/api/settings" and method == "PUT":
            return {
                "daily_calorie_target": data.get("daily_calorie_target", 2300),
                "timezone": data.get("timezone", "Europe/Paris"),
            }
        elif path.startswith("/api/summary"):
            return {
                "local_date": "2026-11-19",
                "daily_target": 2300,
                "consumed": 850,
                "remaining": 1450,
                "over_budget": False,
                "over_target": 0,
            }
        elif path.startswith("/api/meals") and method == "GET":
            return [
                {
                    "id": 88,
                    "food_name": "Croissant",
                    "amount": 1,
                    "unit": "piece",
                    "calories": 260,
                    "local_date": "2026-11-19",
                }
            ]
        elif path == "/api/meals" and method == "POST":
            return {
                "id": 89,
                "food_name": data.get("food_name"),
                "calories": data.get("calories"),
                "local_date": "2026-11-19",
            }
        elif path.startswith("/api/presets") and method == "GET":
            return {
                "presets": [
                    {"id": "p1", "name": "Espresso", "calories": 5}
                ]
            }
        return {}

    monkeypatch.setattr(tools, "_d1_request", fake_d1_request)

    # 1. GET /settings proxied to D1
    resp_settings = client.get("/api/plugins/calorie-tracker/settings")
    assert resp_settings.status_code == 200
    assert resp_settings.json()["daily_calorie_target"] == 2300
    assert resp_settings.json()["timezone"] == "Europe/Paris"
    assert any(c["path"] == "/api/settings" and c["method"] == "GET" for c in mock_d1_calls)

    # 2. PUT /settings proxied to D1
    resp_put_settings = client.put(
        "/api/plugins/calorie-tracker/settings",
        json={"daily_calorie_target": 2400, "timezone": "Europe/London"},
    )
    assert resp_put_settings.status_code == 200
    assert resp_put_settings.json()["daily_calorie_target"] == 2400
    assert any(c["path"] == "/api/settings" and c["method"] == "PUT" for c in mock_d1_calls)

    # 3. GET /summary proxied to D1 and normalized (date and target aliases)
    resp_summary = client.get("/api/plugins/calorie-tracker/summary?date=2026-11-19")
    assert resp_summary.status_code == 200
    sum_data = resp_summary.json()
    assert sum_data["date"] == "2026-11-19"
    assert sum_data["target"] == 2300
    assert sum_data["consumed"] == 850
    assert sum_data["remaining"] == 1450

    # 4. GET /meals proxied to D1
    resp_meals = client.get("/api/plugins/calorie-tracker/meals?date=2026-11-19")
    assert resp_meals.status_code == 200
    meals_data = resp_meals.json()
    assert meals_data["date"] == "2026-11-19"
    assert len(meals_data["meals"]) == 1
    assert meals_data["meals"][0]["food_name"] == "Croissant"

    # 5. POST /meals proxied to D1
    resp_create_meal = client.post(
        "/api/plugins/calorie-tracker/meals",
        json={
            "food_name": "Latte",
            "amount": 1,
            "unit": "cup",
            "calories": 150,
            "protein_g": 8.0,
            "carbs_g": 12.0,
            "fat_g": 6.0,
        },
    )
    assert resp_create_meal.status_code == 200
    assert resp_create_meal.json()["id"] == 89
    assert resp_create_meal.json()["food_name"] == "Latte"

    # 6. GET /presets proxied to D1
    resp_presets = client.get("/api/plugins/calorie-tracker/presets")
    assert resp_presets.status_code == 200
    assert any(p["name"] == "Espresso" for p in resp_presets.json())


def test_dashboard_api_d1_proxying_offline_fallback(monkeypatch):
    """Test Cloudflare D1 proxying fallback to local SQLite when offline or on network failure."""
    app = FastAPI()
    app.include_router(dashboard_router, prefix="/api/plugins/calorie-tracker")
    client = TestClient(app)

    # Populate local SQLite with baseline data
    conn = storage.get_connection()
    storage.update_settings(
        conn,
        daily_calorie_target=1900,
        tz_name="America/Chicago",
        target_protein_g=130.0,
    )
    meal = storage.log_meal(
        conn,
        food_name="Offline Oatmeal",
        amount=1,
        unit="bowl",
        calories=300,
        protein_g=10.0,
        carbs_g=50.0,
        fat_g=5.0,
        calorie_source="user",
        meal_type="breakfast",
        logged_at="2026-11-19T08:00:00Z",
    )
    conn.close()

    # --- Scenario A: Explicit offline mode (HERMES_CALORIE_OFFLINE = "1") ---
    monkeypatch.setattr(tools, "_is_offline", lambda: True)

    def fail_if_called(*args, **kwargs):
        raise AssertionError("D1 network request should not be called in offline mode!")

    monkeypatch.setattr(tools, "_d1_request", fail_if_called)

    # Verify GET /settings hits local SQLite
    res_set = client.get("/api/plugins/calorie-tracker/settings")
    assert res_set.status_code == 200
    assert res_set.json()["daily_calorie_target"] == 1900
    assert res_set.json()["timezone"] == "America/Chicago"

    # Verify GET /summary hits local SQLite
    res_sum = client.get("/api/plugins/calorie-tracker/summary?date=2026-11-19")
    assert res_sum.status_code == 200
    assert res_sum.json()["consumed"] == 300
    assert res_sum.json()["remaining"] == 1600

    # Verify GET /meals hits local SQLite
    res_meals = client.get("/api/plugins/calorie-tracker/meals?date=2026-11-19")
    assert res_meals.status_code == 200
    assert len(res_meals.json()["meals"]) >= 1
    assert res_meals.json()["meals"][0]["food_name"] == "Offline Oatmeal"

    # --- Scenario B: Online mode but D1 network failure (transparent fallback) ---
    monkeypatch.setattr(tools, "_is_offline", lambda: False)

    def network_error(*args, **kwargs):
        raise RuntimeError("Cloudflare Edge connection timed out (504 Gateway Timeout)")

    monkeypatch.setattr(tools, "_d1_request", network_error)

    # 1. GET /settings catches error and falls back to local SQLite
    res_err_set = client.get("/api/plugins/calorie-tracker/settings")
    assert res_err_set.status_code == 200
    assert res_err_set.json()["daily_calorie_target"] == 1900

    # 2. PUT /settings updates local SQLite upon D1 network failure
    res_err_put = client.put(
        "/api/plugins/calorie-tracker/settings",
        json={"daily_calorie_target": 2100},
    )
    assert res_err_put.status_code == 200
    assert res_err_put.json()["daily_calorie_target"] == 2100

    # 3. GET /summary falls back to local SQLite
    res_err_sum = client.get("/api/plugins/calorie-tracker/summary?date=2026-11-19")
    assert res_err_sum.status_code == 200
    assert res_err_sum.json()["target"] == 2100

    # 4. POST /meals logs meal to local SQLite upon D1 network failure
    res_err_meal = client.post(
        "/api/plugins/calorie-tracker/meals",
        json={
            "food_name": "Fallback Apple",
            "amount": 1,
            "unit": "medium",
            "calories": 95,
        },
    )
    assert res_err_meal.status_code == 200
    created = res_err_meal.json()
    assert created["food_name"] == "Fallback Apple"
    assert created["calories"] == 95

    # Confirm created meal is in local SQLite
    conn = storage.get_connection()
    persisted = storage.get_meal(conn, created["id"])
    assert persisted is not None
    assert persisted["food_name"] == "Fallback Apple"
    conn.close()

    # 5. GET /presets falls back to local SQLite
    res_err_presets = client.get("/api/plugins/calorie-tracker/presets")
    assert res_err_presets.status_code == 200
    assert any(p["name"] == "Coffee" for p in res_err_presets.json())



