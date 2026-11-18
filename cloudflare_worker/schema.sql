CREATE TABLE IF NOT EXISTS user_settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    daily_calorie_target INTEGER,
    timezone TEXT NOT NULL DEFAULT 'UTC',
    target_protein_g REAL,
    target_carbs_g REAL,
    target_fat_g REAL,
    target_weight_kg REAL,
    fasting_target_hours REAL DEFAULT 16.0,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS meals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    meal_type TEXT NOT NULL,
    food_name TEXT NOT NULL,
    amount REAL NOT NULL,
    unit TEXT NOT NULL,
    calories INTEGER NOT NULL,
    protein_g REAL NOT NULL DEFAULT 0.0,
    carbs_g REAL NOT NULL DEFAULT 0.0,
    fat_g REAL NOT NULL DEFAULT 0.0,
    calorie_source TEXT NOT NULL CHECK (calorie_source IN ('user', 'reference', 'estimate')),
    notes TEXT,
    logged_at TEXT NOT NULL,
    local_date TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_meals_local_date ON meals (local_date);
CREATE INDEX IF NOT EXISTS idx_meals_logged_at ON meals (logged_at);

CREATE TABLE IF NOT EXISTS presets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    food_name TEXT NOT NULL,
    amount REAL NOT NULL,
    unit TEXT NOT NULL,
    calories INTEGER NOT NULL,
    protein_g REAL NOT NULL DEFAULT 0.0,
    carbs_g REAL NOT NULL DEFAULT 0.0,
    fat_g REAL NOT NULL DEFAULT 0.0,
    calorie_source TEXT NOT NULL,
    meal_type TEXT NOT NULL DEFAULT 'snack',
    notes TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS weight_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL UNIQUE,
    weight_kg REAL NOT NULL,
    notes TEXT,
    created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_weight_logs_date ON weight_logs (date);

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
);
CREATE INDEX IF NOT EXISTS idx_fasting_active ON fasting_sessions (is_active);

