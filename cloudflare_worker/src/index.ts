/**
 * Hermes Calorie & Macro Tracker - Cloudflare Worker
 *
 * Full-stack serverless deployment:
 * - Serves responsive, modern dark-mode Calorie & Macro Tracker Web App with PWA installability.
 * - REST API with macro breakdown (Protein, Carbs, Fat) and daily energy balance calculation.
 * - Persistent Cloudflare D1 database (env.DB) with seamless in-memory fallback.
 * - AI Photo-to-Macros (/api/analyze-food-photo) using Cloudflare Workers AI Llama 3.2 Vision.
 * - Intermittent Fasting (/api/fasting) with live countdown timer and metabolic stages.
 * - Weight Progression (/api/weight) with interactive SVG curve chart and trend metrics.
 * - Presets API (/api/presets) for one-tap quick logging of saved recipes.
 * - Bidirectional sync endpoint (/api/sync) to import/export with local Hermes agent.
 */

import type {
  Env,
  UserSettings,
  Meal,
  Preset,
  WeightLog,
  FastingSession,
  DailySummary,
} from "./types";
import {
  lookupReferenceFood,
  findReferenceFood,
  estimateNutritionFromText,
  REFERENCE_FOODS,
} from "./referenceFoods";
import { COMPILED_CSS } from "./styles";
export type { Env };
export { estimateNutritionFromText };

// In-memory state fallback when D1 is not bound or initializing
let inMemSettings: UserSettings = {
  daily_calorie_target: 2000,
  timezone: "UTC",
  target_protein_g: 140,
  target_carbs_g: 200,
  target_fat_g: 65,
  target_weight_kg: 72.0,
  fasting_target_hours: 16.0,
  updated_at: new Date().toISOString(),
};

let inMemMeals: Meal[] = [
  {
    id: 1,
    meal_type: "snack",
    food_name: "Coffee",
    amount: 1,
    unit: "serving",
    calories: 97,
    protein_g: 1.7,
    carbs_g: 20.5,
    fat_g: 1.0,
    calorie_source: "estimate",
    notes: "50 ml milk, 50 ml water, 1.5 tbsp sugar. Estimated (97 kcal).",
    logged_at: new Date().toISOString(),
    local_date: new Date().toISOString().split("T")[0],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

let inMemPresets: Preset[] = [
  {
    id: 1,
    name: "Coffee",
    food_name: "Coffee",
    amount: 1,
    unit: "serving",
    calories: 97,
    protein_g: 1.7,
    carbs_g: 20.5,
    fat_g: 1.0,
    calorie_source: "estimate",
    meal_type: "snack",
    notes: "50 ml milk, 50 ml water, 1.5 tbsp sugar. Estimated (97 kcal).",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

let inMemWeightLogs: WeightLog[] = [
  {
    id: 1,
    date: new Date(Date.now() - 86400000 * 2).toISOString().split("T")[0],
    weight_kg: 75.2,
    notes: "Baseline morning",
    created_at: new Date().toISOString(),
  },
  {
    id: 2,
    date: new Date(Date.now() - 86400000).toISOString().split("T")[0],
    weight_kg: 74.8,
    notes: "Post-workout",
    created_at: new Date().toISOString(),
  },
  {
    id: 3,
    date: new Date().toISOString().split("T")[0],
    weight_kg: 74.4,
    notes: "Morning fasted",
    created_at: new Date().toISOString(),
  },
];

let inMemFastingSessions: FastingSession[] = [
  {
    id: 1,
    start_time: new Date(Date.now() - 14 * 3600 * 1000).toISOString(),
    target_hours: 16.0,
    end_time: null,
    is_active: 1,
    fast_type: "16:8",
    notes: "Daily fasting window",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

let nextMealId = 2;
let nextPresetId = 2;
let nextWeightId = 4;
let nextFastingId = 2;

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}

// D1 Database Helpers
async function d1Init(db: any) {
  if (!db) return;
  try {
    await db.exec(`
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
        calorie_source TEXT NOT NULL,
        notes TEXT,
        logged_at TEXT NOT NULL,
        local_date TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
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
    `);
  } catch (err) {
    console.error("D1 init error:", err);
  }
}

async function d1GetSettings(db: any): Promise<UserSettings> {
  if (!db) return inMemSettings;
  try {
    const row = await db.prepare("SELECT * FROM user_settings WHERE id = 1").first();
    if (row) {
      return {
        daily_calorie_target: row.daily_calorie_target,
        timezone: row.timezone || "UTC",
        target_protein_g: row.target_protein_g,
        target_carbs_g: row.target_carbs_g,
        target_fat_g: row.target_fat_g,
        target_weight_kg: row.target_weight_kg ?? null,
        fasting_target_hours: row.fasting_target_hours ?? 16.0,
        updated_at: row.updated_at,
      };
    }
  } catch (err) {
    console.error("d1GetSettings error:", err);
  }
  return inMemSettings;
}

async function d1SaveSettings(db: any, settings: Partial<UserSettings>): Promise<UserSettings> {
  const merged = { ...inMemSettings, ...settings, updated_at: new Date().toISOString() };
  inMemSettings = merged;
  if (db) {
    try {
      await db.prepare(`
        INSERT INTO user_settings (id, daily_calorie_target, timezone, target_protein_g, target_carbs_g, target_fat_g, target_weight_kg, fasting_target_hours, updated_at)
        VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          daily_calorie_target=excluded.daily_calorie_target,
          timezone=excluded.timezone,
          target_protein_g=excluded.target_protein_g,
          target_carbs_g=excluded.target_carbs_g,
          target_fat_g=excluded.target_fat_g,
          target_weight_kg=excluded.target_weight_kg,
          fasting_target_hours=excluded.fasting_target_hours,
          updated_at=excluded.updated_at
      `).bind(
        merged.daily_calorie_target,
        merged.timezone,
        merged.target_protein_g,
        merged.target_carbs_g,
        merged.target_fat_g,
        merged.target_weight_kg,
        merged.fasting_target_hours,
        merged.updated_at
      ).run();
    } catch (err) {
      console.error("d1SaveSettings error:", err);
    }
  }
  return merged;
}

async function d1GetMeals(db: any, date?: string): Promise<Meal[]> {
  if (!db) {
    if (date) return inMemMeals.filter((m) => m.local_date === date);
    return inMemMeals;
  }
  try {
    let query = "SELECT * FROM meals";
    const params: any[] = [];
    if (date) {
      query += " WHERE local_date = ?";
      params.push(date);
    }
    query += " ORDER BY logged_at ASC";
    const { results } = await db.prepare(query).bind(...params).all();
    return (results || []) as Meal[];
  } catch (err) {
    console.error("d1GetMeals error:", err);
    return inMemMeals;
  }
}

async function d1AddMeal(db: any, meal: Omit<Meal, "id">): Promise<Meal> {
  const now = new Date().toISOString();
  if (!db) {
    const newMeal: Meal = {
      ...meal,
      id: nextMealId++,
      created_at: now,
      updated_at: now,
    };
    inMemMeals.push(newMeal);
    return newMeal;
  }
  const result = await db.prepare(`
    INSERT INTO meals (meal_type, food_name, amount, unit, calories, protein_g, carbs_g, fat_g, calorie_source, notes, logged_at, local_date, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    meal.meal_type,
    meal.food_name,
    meal.amount,
    meal.unit,
    meal.calories,
    meal.protein_g || 0,
    meal.carbs_g || 0,
    meal.fat_g || 0,
    meal.calorie_source || "user",
    meal.notes || null,
    meal.logged_at || now,
    meal.local_date || now.split("T")[0],
    now,
    now
  ).run();
  const id = result.meta?.last_row_id;
  const created = await db.prepare("SELECT * FROM meals WHERE id = ?").bind(id).first();
  return (created || { ...meal, id, created_at: now, updated_at: now }) as Meal;
}

async function d1UpdateMeal(db: any, id: number, updates: Partial<Meal>): Promise<Meal | null> {
  const now = new Date().toISOString();
  if (!db) {
    const idx = inMemMeals.findIndex((m) => m.id === id);
    if (idx === -1) return null;
    inMemMeals[idx] = { ...inMemMeals[idx], ...updates, updated_at: now };
    return inMemMeals[idx];
  }
  const existing = await db.prepare("SELECT * FROM meals WHERE id = ?").bind(id).first();
  if (!existing) return null;
  const merged = { ...existing, ...updates, updated_at: now };
  await db.prepare(`
    UPDATE meals SET
      meal_type = ?, food_name = ?, amount = ?, unit = ?, calories = ?,
      protein_g = ?, carbs_g = ?, fat_g = ?, calorie_source = ?, notes = ?,
      logged_at = ?, local_date = ?, updated_at = ?
    WHERE id = ?
  `).bind(
    merged.meal_type,
    merged.food_name,
    merged.amount,
    merged.unit,
    merged.calories,
    merged.protein_g,
    merged.carbs_g,
    merged.fat_g,
    merged.calorie_source,
    merged.notes,
    merged.logged_at,
    merged.local_date,
    now,
    id
  ).run();
  return (await db.prepare("SELECT * FROM meals WHERE id = ?").bind(id).first()) as Meal;
}

async function d1DeleteMeal(db: any, id: number): Promise<boolean> {
  if (!db) {
    const idx = inMemMeals.findIndex((m) => m.id === id);
    if (idx === -1) return false;
    inMemMeals.splice(idx, 1);
    return true;
  }
  const result = await db.prepare("DELETE FROM meals WHERE id = ?").bind(id).run();
  return (result.meta?.changes ?? 0) > 0;
}

async function d1GetPresets(db: any, query?: string): Promise<Preset[]> {
  if (!db) {
    if (query) {
      const q = query.toLowerCase();
      return inMemPresets.filter((p) => p.name.toLowerCase().includes(q) || p.food_name.toLowerCase().includes(q));
    }
    return inMemPresets;
  }
  try {
    let sql = "SELECT * FROM presets";
    const params: any[] = [];
    if (query) {
      sql += " WHERE name LIKE ? OR food_name LIKE ?";
      const p = `%${query}%`;
      params.push(p, p);
    }
    sql += " ORDER BY name ASC";
    const { results } = await db.prepare(sql).bind(...params).all();
    return (results || []) as Preset[];
  } catch (err) {
    console.error("d1GetPresets error:", err);
    return inMemPresets;
  }
}

async function d1SavePreset(db: any, preset: Omit<Preset, "id" | "created_at" | "updated_at">): Promise<Preset> {
  const now = new Date().toISOString();
  if (!db) {
    const idx = inMemPresets.findIndex((p) => p.name.toLowerCase() === preset.name.toLowerCase());
    if (idx >= 0) {
      inMemPresets[idx] = { ...inMemPresets[idx], ...preset, updated_at: now };
      return inMemPresets[idx];
    }
    const newP: Preset = { ...preset, id: nextPresetId++, created_at: now, updated_at: now };
    inMemPresets.push(newP);
    return newP;
  }
  await db.prepare(`
    INSERT INTO presets (name, food_name, amount, unit, calories, protein_g, carbs_g, fat_g, calorie_source, meal_type, notes, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(name) DO UPDATE SET
      food_name = excluded.food_name,
      amount = excluded.amount,
      unit = excluded.unit,
      calories = excluded.calories,
      protein_g = excluded.protein_g,
      carbs_g = excluded.carbs_g,
      fat_g = excluded.fat_g,
      calorie_source = excluded.calorie_source,
      meal_type = excluded.meal_type,
      notes = excluded.notes,
      updated_at = excluded.updated_at
  `).bind(
    preset.name,
    preset.food_name || preset.name,
    preset.amount || 1.0,
    preset.unit || "serving",
    preset.calories,
    preset.protein_g || 0.0,
    preset.carbs_g || 0.0,
    preset.fat_g || 0.0,
    preset.calorie_source || "user",
    preset.meal_type || "snack",
    preset.notes || null,
    now,
    now
  ).run();
  const created = await db.prepare("SELECT * FROM presets WHERE name = ?").bind(preset.name).first();
  return created as Preset;
}

async function d1DeletePreset(db: any, nameOrId: string | number): Promise<boolean> {
  if (!db) {
    const idx = inMemPresets.findIndex((p) => (typeof nameOrId === "number" ? p.id === nameOrId : p.name.toLowerCase() === nameOrId.toLowerCase()));
    if (idx === -1) return false;
    inMemPresets.splice(idx, 1);
    return true;
  }
  let result;
  if (typeof nameOrId === "number" || !isNaN(Number(nameOrId))) {
    result = await db.prepare("DELETE FROM presets WHERE id = ?").bind(Number(nameOrId)).run();
  } else {
    result = await db.prepare("DELETE FROM presets WHERE name = ? COLLATE NOCASE").bind(String(nameOrId)).run();
  }
  return (result.meta?.changes ?? 0) > 0;
}

// Weight Progression D1 Helpers
async function d1GetWeightLogs(db: any, limit = 30): Promise<WeightLog[]> {
  if (!db) return inMemWeightLogs.slice(-limit);
  try {
    const { results } = await db.prepare("SELECT * FROM weight_logs ORDER BY date ASC LIMIT ?").bind(limit).all();
    return (results || []) as WeightLog[];
  } catch (err) {
    console.error("d1GetWeightLogs error:", err);
    return inMemWeightLogs;
  }
}

async function d1AddWeightLog(db: any, date: string, weightKg: number, notes?: string): Promise<WeightLog> {
  const now = new Date().toISOString();
  if (!db) {
    const idx = inMemWeightLogs.findIndex((w) => w.date === date);
    if (idx >= 0) {
      inMemWeightLogs[idx] = { ...inMemWeightLogs[idx], weight_kg: weightKg, notes: notes || null };
      return inMemWeightLogs[idx];
    }
    const newLog: WeightLog = { id: nextWeightId++, date, weight_kg: weightKg, notes: notes || null, created_at: now };
    inMemWeightLogs.push(newLog);
    return newLog;
  }
  await db.prepare(`
    INSERT INTO weight_logs (date, weight_kg, notes, created_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(date) DO UPDATE SET weight_kg = excluded.weight_kg, notes = excluded.notes
  `).bind(date, weightKg, notes || null, now).run();
  const row = await db.prepare("SELECT * FROM weight_logs WHERE date = ?").bind(date).first();
  return row as WeightLog;
}

async function d1DeleteWeightLog(db: any, id: number): Promise<boolean> {
  if (!db) {
    const idx = inMemWeightLogs.findIndex((w) => w.id === id);
    if (idx === -1) return false;
    inMemWeightLogs.splice(idx, 1);
    return true;
  }
  const res = await db.prepare("DELETE FROM weight_logs WHERE id = ?").bind(id).run();
  return (res.meta?.changes ?? 0) > 0;
}

// Intermittent Fasting D1 Helpers
async function d1GetActiveFasting(db: any): Promise<FastingSession | null> {
  if (!db) return inMemFastingSessions.find((s) => s.is_active) || null;
  try {
    const row = await db.prepare("SELECT * FROM fasting_sessions WHERE is_active = 1 ORDER BY id DESC LIMIT 1").first();
    return row as FastingSession | null;
  } catch (err) {
    console.error("d1GetActiveFasting error:", err);
    return null;
  }
}

async function d1StartFasting(db: any, startTime: string, targetHours: number, fastType: string, notes?: string): Promise<FastingSession> {
  const now = new Date().toISOString();
  if (!db) {
    inMemFastingSessions.forEach((s) => { s.is_active = 0; s.updated_at = now; });
    const sess: FastingSession = {
      id: nextFastingId++,
      start_time: startTime || now,
      target_hours: targetHours,
      end_time: null,
      is_active: 1,
      fast_type: fastType,
      notes: notes || null,
      created_at: now,
      updated_at: now,
    };
    inMemFastingSessions.push(sess);
    return sess;
  }
  await db.prepare("UPDATE fasting_sessions SET is_active = 0, updated_at = ? WHERE is_active = 1").bind(now).run();
  const res = await db.prepare(`
    INSERT INTO fasting_sessions (start_time, target_hours, end_time, is_active, fast_type, notes, created_at, updated_at)
    VALUES (?, ?, NULL, 1, ?, ?, ?, ?)
  `).bind(startTime || now, targetHours, fastType, notes || null, now, now).run();
  const id = res.meta?.last_row_id;
  const created = await db.prepare("SELECT * FROM fasting_sessions WHERE id = ?").bind(id).first();
  return created as FastingSession;
}

async function d1EndFasting(db: any, id?: number): Promise<FastingSession | null> {
  const now = new Date().toISOString();
  if (!db) {
    const active = inMemFastingSessions.find((s) => s.is_active);
    if (!active) return null;
    active.is_active = 0;
    active.end_time = now;
    active.updated_at = now;
    return active;
  }
  const active = await d1GetActiveFasting(db);
  if (!active) return null;
  const targetId = id || active.id;
  await db.prepare("UPDATE fasting_sessions SET is_active = 0, end_time = ?, updated_at = ? WHERE id = ?").bind(now, now, targetId).run();
  return (await db.prepare("SELECT * FROM fasting_sessions WHERE id = ?").bind(targetId).first()) as FastingSession;
}

async function d1GetLatestMeal(db: any): Promise<Meal | null> {
  if (!db) return inMemMeals.length > 0 ? inMemMeals[inMemMeals.length - 1] : null;
  try {
    const row = await db.prepare("SELECT * FROM meals ORDER BY logged_at DESC LIMIT 1").first();
    return row as Meal | null;
  } catch (err) {
    return null;
  }
}



export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    await d1Init(env.DB);
    const url = new URL(request.url);

    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
      });
    }

    // PWA Web App Manifest
    if (url.pathname === "/manifest.json" || url.pathname === "/manifest.webmanifest") {
      const manifest = {
        name: "Hermes Calorie & Macro Tracker",
        short_name: "Hermes Diet",
        description: "AI-powered Calorie, Macro, Fasting & Weight Progression Tracker",
        start_url: "/",
        display: "standalone",
        background_color: "#090A0F",
        theme_color: "#090A0F",
        orientation: "portrait",
        icons: [
          {
            src: "/icon-192.png",
            sizes: "192x192",
            type: "image/svg+xml",
            purpose: "any maskable"
          },
          {
            src: "/icon-512.png",
            sizes: "512x512",
            type: "image/svg+xml",
            purpose: "any maskable"
          }
        ]
      };
      return new Response(JSON.stringify(manifest), {
        headers: {
          "Content-Type": "application/manifest+json",
          "Cache-Control": "public, max-age=86400",
        },
      });
    }

    // PWA Service Worker
    if (url.pathname === "/sw.js") {
      const swCode = `
const CACHE_NAME = 'hermes-pwa-v3';
self.addEventListener('install', (e) => {
  self.skipWaiting();
});
self.addEventListener('activate', (e) => {
  e.waitUntil(clients.claim());
});
self.addEventListener('fetch', (e) => {
  if (e.request.url.includes('/api/')) return;
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});
`;
      return new Response(swCode, {
        headers: { "Content-Type": "application/javascript" },
      });
    }

    // App Icons (Vector SVG served with SVG mime type)
    if (url.pathname === "/icon-192.png" || url.pathname === "/icon-512.png") {
      const svgIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <radialGradient id="grad" cx="50%" cy="30%" r="70%">
      <stop offset="0%" stop-color="#1E2336"/>
      <stop offset="100%" stop-color="#090A0F"/>
    </radialGradient>
    <linearGradient id="glow" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#F43F5E"/>
      <stop offset="50%" stop-color="#38BDF8"/>
      <stop offset="100%" stop-color="#34D399"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="128" fill="url(#grad)"/>
  <rect x="16" y="16" width="480" height="480" rx="112" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="4"/>
  <circle cx="256" cy="256" r="140" fill="none" stroke="url(#glow)" stroke-width="24" stroke-dasharray="600 200" stroke-linecap="round"/>
  <path d="M280 160 L200 280 L250 280 L230 352 L312 232 L262 232 Z" fill="#FFFFFF"/>
</svg>`;
      return new Response(svgIcon, {
        headers: { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=604800" },
      });
    }

    // --- Settings API ---
    if (url.pathname === "/api/settings") {
      if (request.method === "GET") {
        const settings = await d1GetSettings(env.DB);
        return json(settings);
      }
      if (request.method === "PUT") {
        const body: any = await request.json();
        const updated = await d1SaveSettings(env.DB, body);
        return json(updated);
      }
    }

    // --- Daily Summary API ---
    if (url.pathname === "/api/summary") {
      const date = url.searchParams.get("date") || new Date().toISOString().split("T")[0];
      const settings = await d1GetSettings(env.DB);
      const meals = await d1GetMeals(env.DB, date);

      const consumed = meals.reduce((sum, m) => sum + (m.calories || 0), 0);
      const target = settings.daily_calorie_target ?? 2000;
      const remaining = Math.max(0, target - consumed);
      const over_budget = consumed > target;

      const consumed_macros = meals.reduce(
        (acc, m) => ({
          protein_g: Number((acc.protein_g + (m.protein_g || 0)).toFixed(1)),
          carbs_g: Number((acc.carbs_g + (m.carbs_g || 0)).toFixed(1)),
          fat_g: Number((acc.fat_g + (m.fat_g || 0)).toFixed(1)),
        }),
        { protein_g: 0, carbs_g: 0, fat_g: 0 }
      );

      const target_macros = {
        protein_g: settings.target_protein_g ?? 140,
        carbs_g: settings.target_carbs_g ?? 200,
        fat_g: settings.target_fat_g ?? 65,
      };

      const remaining_macros = {
        protein_g: Math.max(0, Number((target_macros.protein_g - consumed_macros.protein_g).toFixed(1))),
        carbs_g: Math.max(0, Number((target_macros.carbs_g - consumed_macros.carbs_g).toFixed(1))),
        fat_g: Math.max(0, Number((target_macros.fat_g - consumed_macros.fat_g).toFixed(1))),
      };

      return json({
        local_date: date,
        date: date,
        daily_target: target,
        target: target,
        consumed,
        remaining,
        over_budget,
        over_target: over_budget ? consumed - target : 0,
        meal_count: meals.length,
        consumed_macros,
        target_macros,
        remaining_macros,
        meals,
      });
    }

    // --- Reference Food Lookup API ---
    if (url.pathname === "/api/reference-food") {
      const name = url.searchParams.get("name") || "";
      const amount = parseFloat(url.searchParams.get("amount") || "1.0");
      const unit = url.searchParams.get("unit") || "serving";
      const lookup = lookupReferenceFood(name, isNaN(amount) ? 1.0 : amount, unit);
      if (lookup) {
        return json({ found: true, food_name: name, amount, unit, ...lookup });
      }
      return json({ found: false, message: `No reference food found for '${name}'` }, 404);
    }

    // --- Meals API ---
    if (url.pathname === "/api/meals") {
      if (request.method === "GET") {
        const date = url.searchParams.get("date");
        const meals = await d1GetMeals(env.DB, date || undefined);
        return json(meals);
      }
      if (request.method === "POST") {
        const body: any = await request.json();
        // If calories or macros are omitted, attempt reference lookup
        if (body.calories === undefined || body.calories === null) {
          const ref = lookupReferenceFood(body.food_name || "", body.amount || 1.0, body.unit || "serving");
          if (ref) {
            body.calories = ref.calories;
            if (body.protein_g === undefined || body.protein_g === null) body.protein_g = ref.protein_g;
            if (body.carbs_g === undefined || body.carbs_g === null) body.carbs_g = ref.carbs_g;
            if (body.fat_g === undefined || body.fat_g === null) body.fat_g = ref.fat_g;
            if (!body.calorie_source) body.calorie_source = "reference";
          }
        }
        const meal = await d1AddMeal(env.DB, body);
        return json(meal, 201);
      }
    }

    // --- History API ---
    if (url.pathname === "/api/history") {
      const days = parseInt(url.searchParams.get("days") || "7");
      const meals = await d1GetMeals(env.DB);
      const byDate: Record<string, { calories: number; protein_g: number; carbs_g: number; fat_g: number; count: number }> = {};
      meals.forEach((m) => {
        if (!byDate[m.local_date]) {
          byDate[m.local_date] = { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, count: 0 };
        }
        byDate[m.local_date].calories += m.calories;
        byDate[m.local_date].protein_g += m.protein_g || 0;
        byDate[m.local_date].carbs_g += m.carbs_g || 0;
        byDate[m.local_date].fat_g += m.fat_g || 0;
        byDate[m.local_date].count += 1;
      });
      const history = Object.keys(byDate)
        .sort()
        .slice(-days)
        .map((date) => ({
          date,
          ...byDate[date],
        }));
      return json({ days, history });
    }

    // --- Single Meal API: /api/meals/:id ---
    const mealMatch = url.pathname.match(/^\/api\/meals\/(\d+)$/);
    if (mealMatch) {
      const id = parseInt(mealMatch[1]);
      if (request.method === "GET") {
        const meals = await d1GetMeals(env.DB);
        const m = meals.find((x) => x.id === id);
        return m ? json(m) : json({ error: "Meal not found" }, 404);
      }
      if (request.method === "PUT") {
        const body: any = await request.json();
        const updated = await d1UpdateMeal(env.DB, id, body);
        return updated ? json(updated) : json({ error: "Meal not found" }, 404);
      }
      if (request.method === "DELETE") {
        const deleted = await d1DeleteMeal(env.DB, id);
        return json({ deleted });
      }
    }

    // --- Presets API ---
    if (url.pathname === "/api/presets") {
      if (request.method === "GET") {
        const q = url.searchParams.get("query") || undefined;
        const presets = await d1GetPresets(env.DB, q);
        return json({ presets });
      }
      if (request.method === "POST") {
        const body: any = await request.json();
        const preset = await d1SavePreset(env.DB, body);
        return json({ preset }, 201);
      }
    }

    const presetMatch = url.pathname.match(/^\/api\/presets\/(.+)$/);
    if (presetMatch && !url.pathname.startsWith("/api/presets/log")) {
      const ident = decodeURIComponent(presetMatch[1]);
      if (request.method === "GET") {
        const presets = await d1GetPresets(env.DB);
        const p = presets.find((x) => x.name.toLowerCase() === ident.toLowerCase() || String(x.id) === ident);
        return p ? json({ preset: p }) : json({ error: "Preset not found" }, 404);
      }
      if (request.method === "PUT") {
        const body: any = await request.json();
        const preset = await d1SavePreset(env.DB, { ...body, name: ident });
        return json({ preset });
      }
      if (request.method === "DELETE") {
        const deleted = await d1DeletePreset(env.DB, ident);
        return json({ deleted });
      }
    }

    if (url.pathname === "/api/presets/log" && request.method === "POST") {
      const body: any = await request.json();
      const presetIdent = body.preset;
      const servings = parseFloat(body.servings || 1.0);
      const presets = await d1GetPresets(env.DB);
      const p = presets.find((x) => x.name.toLowerCase() === String(presetIdent).toLowerCase() || String(x.id) === String(presetIdent));
      if (!p) {
        return json({ error: `Preset '${presetIdent}' not found` }, 404);
      }
      const meal = await d1AddMeal(env.DB, {
        meal_type: body.meal_type || p.meal_type,
        food_name: p.food_name,
        amount: Number((p.amount * servings).toFixed(2)),
        unit: p.unit,
        calories: Math.round(p.calories * servings),
        protein_g: Number((p.protein_g * servings).toFixed(1)),
        carbs_g: Number((p.carbs_g * servings).toFixed(1)),
        fat_g: Number((p.fat_g * servings).toFixed(1)),
        calorie_source: p.calorie_source,
        notes: body.notes ? `${body.notes} (${p.notes || ''})` : (p.notes || ''),
        logged_at: body.logged_at || new Date().toISOString(),
        local_date: (body.logged_at || new Date().toISOString()).split("T")[0],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      return json({ status: "success", meal }, 201);
    }

    // --- Photo-to-Macros AI API ---
    if (url.pathname === "/api/analyze-food-photo" && request.method === "POST") {
      try {
        const body: any = await request.json();
        let base64 = body.image || "";
        const foodDesc = body.food_description || "";
        const notes = body.notes || "";

        if (base64.includes(",")) {
          base64 = base64.split(",")[1];
        }

        let aiResult: any = null;

        // Try Cloudflare Workers AI Vision Model if available
        if (env.AI && base64) {
          try {
            const binStr = atob(base64);
            const bytes = new Uint8Array(binStr.length);
            for (let i = 0; i < binStr.length; i++) {
              bytes[i] = binStr.charCodeAt(i);
            }

            const prompt = `You are an expert nutritionist and visual food analyst.
Carefully inspect this food photograph.
User context / hint: "${foodDesc || notes || 'None'}".
Estimate the food dish name, serving portion, calories (kcal), and macros (protein_g, carbs_g, fat_g in grams).
Return STRICTLY valid JSON with no markdown wrapping and NO other text, matching this format:
{"food_name": "Dish Name", "amount": 1, "unit": "serving", "calories": 350, "protein_g": 25.0, "carbs_g": 35.0, "fat_g": 12.0, "notes": "Identified ingredients and assumptions", "confidence": 0.88}`;

            const aiResp: any = await env.AI.run("@cf/meta/llama-3.2-11b-vision-instruct", {
              image: Array.from(bytes),
              prompt,
              max_tokens: 512,
            });

            const text = aiResp?.response || "";
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              aiResult = JSON.parse(jsonMatch[0]);
            }
          } catch (e) {
            console.error("Workers AI vision error:", e);
          }
        }

        // Fallback to heuristic parser
        if (!aiResult) {
          aiResult = estimateNutritionFromText(foodDesc || notes || "Healthy balanced meal");
        }

        return json({ success: true, ...aiResult });
      } catch (err: any) {
        return json({ success: false, error: err.message || "Failed to analyze photo" }, 400);
      }
    }

    // --- Weight Progression API ---
    if (url.pathname === "/api/weight") {
      if (request.method === "GET") {
        const limit = parseInt(url.searchParams.get("days") || "30");
        const logs = await d1GetWeightLogs(env.DB, limit);
        const settings = await d1GetSettings(env.DB);
        const latest = logs.length > 0 ? logs[logs.length - 1].weight_kg : null;
        const starting = logs.length > 0 ? logs[0].weight_kg : null;
        const netChange = (latest !== null && starting !== null) ? Number((latest - starting).toFixed(1)) : 0.0;
        const recent7 = logs.slice(-7);
        const avg7 = recent7.length > 0 ? Number((recent7.reduce((s, l) => s + l.weight_kg, 0) / recent7.length).toFixed(1)) : latest;

        return json({
          logs,
          stats: {
            latest_weight: latest,
            starting_weight: starting,
            target_weight: settings.target_weight_kg || null,
            net_change: netChange,
            weekly_average: avg7,
            total_entries: logs.length,
          },
        });
      }
      if (request.method === "POST") {
        const body: any = await request.json();
        const weightKg = parseFloat(body.weight_kg);
        if (isNaN(weightKg) || weightKg <= 0) {
          return json({ error: "weight_kg must be greater than 0" }, 400);
        }
        const date = body.date || new Date().toISOString().split("T")[0];
        const entry = await d1AddWeightLog(env.DB, date, weightKg, body.notes);
        const logs = await d1GetWeightLogs(env.DB, 30);
        const latest = logs.length > 0 ? logs[logs.length - 1].weight_kg : weightKg;
        const starting = logs.length > 0 ? logs[0].weight_kg : weightKg;
        const netChange = Number((latest - starting).toFixed(1));

        return json({
          status: "success",
          entry,
          stats: { latest_weight: latest, starting_weight: starting, net_change: netChange },
        }, 201);
      }
    }

    const weightMatch = url.pathname.match(/^\/api\/weight\/(\d+)$/);
    if (weightMatch && request.method === "DELETE") {
      const id = parseInt(weightMatch[1]);
      const deleted = await d1DeleteWeightLog(env.DB, id);
      return json({ deleted });
    }

    // --- Intermittent Fasting API ---
    if (url.pathname === "/api/fasting") {
      const active = await d1GetActiveFasting(env.DB);
      const now = Date.now();

      if (active) {
        const startMs = new Date(active.start_time).getTime();
        const elapsedSec = Math.max(0, Math.floor((now - startMs) / 1000));
        const targetSec = active.target_hours * 3600;
        const remainingSec = Math.max(0, targetSec - elapsedSec);
        const elapsedHours = Number((elapsedSec / 3600).toFixed(1));
        const progressPct = Math.min(100, Math.round((elapsedSec / targetSec) * 100));

        let stage = { name: "Blood Sugar Drop", desc: "Insulin falling, glycogen depleting", color: "sky", range: "0 - 12h" };
        if (elapsedHours >= 18) {
          stage = { name: "Deep Ketosis", desc: "Peak metabolic flexibility & autophagy", color: "rose", range: "18h+" };
        } else if (elapsedHours >= 16) {
          stage = { name: "Cellular Autophagy", desc: "Cellular cleansing & recycling of damaged proteins", color: "teal", range: "16 - 18h" };
        } else if (elapsedHours >= 12) {
          stage = { name: "Fat Burning & Ketosis", desc: "Lipolysis active, body burning stored fat", color: "amber", range: "12 - 16h" };
        }

        return json({
          is_active: true,
          session: active,
          start_time: active.start_time,
          target_hours: active.target_hours,
          fast_type: active.fast_type,
          elapsed_seconds: elapsedSec,
          remaining_seconds: remainingSec,
          elapsed_hours: elapsedHours,
          progress_pct: progressPct,
          is_completed: elapsedSec >= targetSec,
          stage,
        });
      } else {
        // Smart auto-fasting from latest meal
        const latestMeal = await d1GetLatestMeal(env.DB);
        if (latestMeal) {
          const startMs = new Date(latestMeal.logged_at).getTime();
          const elapsedSec = Math.max(0, Math.floor((now - startMs) / 1000));
          const targetSec = 16 * 3600;
          const remainingSec = Math.max(0, targetSec - elapsedSec);
          const elapsedHours = Number((elapsedSec / 3600).toFixed(1));
          const progressPct = Math.min(100, Math.round((elapsedSec / targetSec) * 100));

          let stage = { name: "Blood Sugar Drop", desc: "Insulin falling, glycogen depleting", color: "sky", range: "0 - 12h" };
          if (elapsedHours >= 18) {
            stage = { name: "Deep Ketosis", desc: "Peak metabolic flexibility", color: "rose", range: "18h+" };
          } else if (elapsedHours >= 16) {
            stage = { name: "Cellular Autophagy", desc: "Autophagy & repair in progress", color: "teal", range: "16 - 18h" };
          } else if (elapsedHours >= 12) {
            stage = { name: "Fat Burning & Ketosis", desc: "Lipolysis active, burning stored fat", color: "amber", range: "12 - 16h" };
          }

          return json({
            is_active: false,
            auto_tracked: true,
            last_meal: latestMeal.food_name,
            start_time: latestMeal.logged_at,
            target_hours: 16.0,
            fast_type: "16:8 (Auto)",
            elapsed_seconds: elapsedSec,
            remaining_seconds: remainingSec,
            elapsed_hours: elapsedHours,
            progress_pct: progressPct,
            is_completed: elapsedSec >= targetSec,
            stage,
          });
        }
        return json({
          is_active: false,
          auto_tracked: false,
          message: "No active fast or logged meals yet.",
        });
      }
    }

    if (url.pathname === "/api/fasting/start" && request.method === "POST") {
      const body: any = await request.json();
      const targetHours = parseFloat(body.target_hours || 16.0);
      const fastType = body.fast_type || "16:8";
      const startTime = body.start_time || new Date().toISOString();
      const session = await d1StartFasting(env.DB, startTime, targetHours, fastType, body.notes);
      return json({ status: "success", session }, 201);
    }

    if (url.pathname === "/api/fasting/end" && request.method === "POST") {
      const session = await d1EndFasting(env.DB);
      return json({ status: "success", session });
    }

    // --- Bidirectional Sync Endpoint ---
    if (url.pathname === "/api/sync") {
      if (request.method === "GET") {
        const settings = await d1GetSettings(env.DB);
        const meals = await d1GetMeals(env.DB);
        const presets = await d1GetPresets(env.DB);
        const weight_logs = await d1GetWeightLogs(env.DB);
        return json({ settings, meals, presets, weight_logs });
      }
      if (request.method === "POST") {
        const body: any = await request.json();
        if (body.settings) await d1SaveSettings(env.DB, body.settings);
        if (Array.isArray(body.meals) && env.DB) {
          for (const m of body.meals) await d1AddMeal(env.DB, m);
        }
        if (Array.isArray(body.presets) && env.DB) {
          for (const p of body.presets) await d1SavePreset(env.DB, p);
        }
        return json({ synced: true });
      }
    }

    // --- Serve Web Application HTML ---
    return new Response(INDEX_HTML, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  },
};

const INDEX_HTML = `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  <title>Hermes Calorie & Nutrition</title>
  
  <!-- PWA Meta -->
  <link rel="manifest" href="/manifest.json">
  <meta name="theme-color" content="#090A0F">
  <meta name="mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <meta name="apple-mobile-web-app-title" content="Hermes Diet">
  <link rel="apple-touch-icon" href="/icon-192.png">

  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;600&display=swap" rel="stylesheet">
  <style>
    ${COMPILED_CSS}
    :root {
      --bg-canvas: #090A0F;
      --bg-card: #12141C;
      --bg-card-hover: #161824;
      --bg-elevated: #181B26;
      --border-subtle: rgba(255, 255, 255, 0.07);
      --border-hover: rgba(255, 255, 255, 0.14);
      --bevel-light: inset 0 1px 0 0 rgba(255, 255, 255, 0.08);
    }
    body {
      background-color: var(--bg-canvas);
      color: #F1F5F9;
      font-family: 'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
      -webkit-font-smoothing: antialiased;
      -webkit-tap-highlight-color: transparent;
      text-wrap: pretty;
    }
    h1, h2, h3, h4 {
      text-wrap: balance;
    }
    .tabular-num {
      font-variant-numeric: tabular-nums;
      font-feature-settings: "tnum" 1;
    }
    .surface-card {
      background-color: var(--bg-card);
      border: 1px solid var(--border-subtle);
      box-shadow: var(--bevel-light), 0 4px 24px -2px rgba(0, 0, 0, 0.5);
    }
    .surface-elevated {
      background-color: var(--bg-elevated);
      border: 1px solid var(--border-subtle);
    }
    .scrollbar-none::-webkit-scrollbar { display: none; }
    .scrollbar-none { -ms-overflow-style: none; scrollbar-width: none; }
    .animate-pop {
      animation: popIn 0.22s cubic-bezier(0.16, 1, 0.3, 1);
    }
    @keyframes popIn {
      from { transform: scale(0.97) translateY(4px); opacity: 0; }
      to { transform: scale(1) translateY(0); opacity: 1; }
    }
    @keyframes laserScan {
      0% { top: 0%; opacity: 0.8; }
      50% { opacity: 1; }
      100% { top: 100%; opacity: 0.8; }
    }
    .laser-line {
      position: absolute;
      left: 0; right: 0; height: 3px;
      background: linear-gradient(90deg, transparent, #38BDF8, #34D399, transparent);
      box-shadow: 0 0 16px #38BDF8, 0 0 28px #34D399;
      animation: laserScan 2s infinite ease-in-out;
    }
    @media (prefers-reduced-motion: reduce) {
      *, ::before, ::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
        scroll-behavior: auto !important;
      }
      .laser-line { display: none !important; }
    }
  </style>
</head>
<body class="min-h-screen pb-28 selection:bg-rose-500/30 selection:text-white">

  <!-- Ambient background glow top -->
  <div class="fixed inset-x-0 top-0 h-96 bg-[radial-gradient(ellipse_at_top,rgba(56,189,248,0.06),transparent_70%)] pointer-events-none z-0"></div>

  <!-- Toast Notification Container -->
  <div id="toast-container" class="fixed bottom-6 right-4 sm:right-6 z-50 flex flex-col gap-2 pointer-events-none" aria-live="polite"></div>

  <!-- Header -->
  <header class="sticky top-0 z-40 border-b border-white/[0.06] bg-[#090A0F]/85 backdrop-blur-xl">
    <div class="max-w-2xl md:max-w-4xl mx-auto px-4 h-16 flex items-center justify-between gap-2 relative z-10">
      
      <!-- Brand & Sync Status Pill -->
      <div class="flex items-center gap-2.5">
        <div class="w-8 h-8 rounded-xl bg-gradient-to-tr from-rose-500/20 via-sky-500/20 to-emerald-500/20 border border-white/10 flex items-center justify-center text-sm font-black shadow-inner">
          ⚡
        </div>
        <div>
          <div class="flex items-center gap-2">
            <h1 class="text-sm font-extrabold tracking-tight text-white">Calorie<span class="text-rose-400">Flow</span></h1>
            <button id="btn-sync-pill" class="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.06] hover:border-emerald-500/30 transition active:scale-95" title="Click to refresh / sync" aria-label="Sync with Hermes Agent">
              <span class="relative flex h-1.5 w-1.5">
                <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span class="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
              </span>
              <span id="sync-pill-text" class="text-[10px] font-medium text-slate-400">Hermes Live</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Right Header Actions: PWA Install + Date + Settings -->
      <div class="flex items-center gap-1.5">
        
        <!-- PWA Install Button (Dynamic) -->
        <button id="btn-pwa-install" class="hidden items-center gap-1.5 px-2.5 py-1 rounded-xl bg-gradient-to-r from-rose-500/20 to-sky-500/20 border border-rose-500/30 text-rose-300 hover:text-white text-xs font-semibold shadow-sm transition active:scale-95">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
          <span>Install</span>
        </button>

        <!-- Date Switcher -->
        <div id="date-switcher-wrap" class="flex items-center bg-[#12141C] border border-white/[0.07] rounded-xl p-0.5 shadow-inner">
          <button id="btn-prev-day" class="min-w-[40px] min-h-[40px] flex items-center justify-center p-2 text-slate-400 hover:text-white rounded-lg transition" title="Previous Day" aria-label="Previous day">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
          </button>
          <div class="relative px-2 flex items-center">
            <span id="date-display-label" class="text-xs font-semibold text-slate-200 cursor-pointer select-none tabular-num">Today</span>
            <input type="date" id="date-input" class="absolute inset-0 opacity-0 cursor-pointer w-full">
          </div>
          <button id="btn-next-day" class="min-w-[40px] min-h-[40px] flex items-center justify-center p-2 text-slate-400 hover:text-white rounded-lg transition" title="Next Day" aria-label="Next day">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
          </button>
        </div>

        <!-- Settings Gear -->
        <button id="btn-open-settings" class="min-w-[40px] min-h-[40px] flex items-center justify-center p-2 text-slate-400 hover:text-white bg-[#12141C] border border-white/[0.07] rounded-xl transition hover:border-white/20 active:scale-95" title="Settings & Goals" aria-label="Settings and Goals">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
        </button>
      </div>
    </div>

    <!-- Segmented Navigation Tabs -->
    <div class="max-w-2xl md:max-w-4xl mx-auto px-4 pb-2">
      <nav role="tablist" aria-label="Sections" class="grid grid-cols-4 gap-1 p-1 bg-[#12141C] border border-white/[0.07] rounded-xl text-xs font-semibold shadow-inner">
        <button id="tab-intake" role="tab" aria-selected="true" aria-controls="view-intake" class="tab-btn min-h-[44px] py-2 rounded-lg text-white bg-white/[0.08] transition flex items-center justify-center gap-1.5 shadow-sm" data-tab="intake">
          <span aria-hidden="true">🍽️</span>
          <span class="inline">Intake</span>
        </button>
        <button id="tab-photo" role="tab" aria-selected="false" aria-controls="view-photo" class="tab-btn min-h-[44px] py-2 rounded-lg text-slate-400 hover:text-white transition flex items-center justify-center gap-1.5" data-tab="photo">
          <span aria-hidden="true">📸</span>
          <span class="inline">Photo AI</span>
        </button>
        <button id="tab-fasting" role="tab" aria-selected="false" aria-controls="view-fasting" class="tab-btn min-h-[44px] py-2 rounded-lg text-slate-400 hover:text-white transition flex items-center justify-center gap-1.5" data-tab="fasting">
          <span aria-hidden="true">⏳</span>
          <span class="inline">Fasting</span>
        </button>
        <button id="tab-weight" role="tab" aria-selected="false" aria-controls="view-weight" class="tab-btn min-h-[44px] py-2 rounded-lg text-slate-400 hover:text-white transition flex items-center justify-center gap-1.5" data-tab="weight">
          <span aria-hidden="true">⚖️</span>
          <span class="inline">Weight</span>
        </button>
      </nav>
    </div>
  </header>

  <!-- Main Container -->
  <main class="max-w-2xl md:max-w-4xl mx-auto px-4 pt-4 relative z-10">

    <!-- ======================================================== -->
    <!-- TAB 1: INTAKE & MACROS                                  -->
    <!-- ======================================================== -->
    <div id="view-intake" role="tabpanel" aria-labelledby="tab-intake" class="space-y-4">
      
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <!-- Energy Balance Radial Hero Card -->
        <section class="surface-card rounded-2xl p-5 relative overflow-hidden">
          <div class="flex items-center justify-between mb-4">
            <div class="flex items-center gap-2">
              <span class="text-[11px] font-bold uppercase tracking-wider text-slate-400">Energy Balance</span>
              <span id="target-pill-display" class="px-2 py-0.5 rounded-full text-[11px] font-mono bg-white/[0.04] text-slate-300 border border-white/[0.06]">Target: 2,000 kcal</span>
            </div>
            <span id="budget-status-pill" class="text-[11px] font-semibold text-emerald-400 flex items-center gap-1">
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              <span id="budget-status-text">On Track</span>
            </span>
          </div>

          <div class="flex items-center justify-between gap-4">
            <!-- Circular Ring Gauge -->
            <div class="relative w-36 h-36 flex-shrink-0 flex items-center justify-center">
              <svg class="w-36 h-36 -rotate-90 transform" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="50" stroke="rgba(255,255,255,0.06)" stroke-width="10" fill="none"/>
                <circle id="calorie-gauge-circle" cx="60" cy="60" r="50" stroke="#38BDF8" stroke-width="10" stroke-linecap="round" fill="none" stroke-dasharray="314" stroke-dashoffset="314" class="transition-all duration-700 ease-out"/>
              </svg>
              <div class="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span id="hero-remaining-val" class="text-2xl font-black tracking-tight text-white tabular-num">--</span>
                <span id="hero-remaining-lbl" class="text-[9px] uppercase tracking-wider font-bold text-slate-400">Remaining</span>
              </div>
            </div>

            <!-- Right Column Breakdown -->
            <div class="flex-1 space-y-3">
              <div class="flex items-baseline justify-between border-b border-white/[0.06] pb-2">
                <span class="text-xs font-semibold text-slate-400">Eaten</span>
                <div class="text-right">
                  <span id="hero-eaten-val" class="text-lg font-bold text-slate-100 tabular-num">0</span>
                  <span class="text-[10px] text-slate-400">kcal</span>
                </div>
              </div>
              <div class="flex items-baseline justify-between border-b border-white/[0.06] pb-2">
                <span class="text-xs font-semibold text-slate-400">Budget</span>
                <div class="text-right">
                  <span id="hero-budget-val" class="text-lg font-bold text-slate-100 tabular-num">2,000</span>
                  <span class="text-[10px] text-slate-400">kcal</span>
                </div>
              </div>
              <div class="pt-1">
                <div class="flex justify-between text-[11px] text-slate-400 mb-1">
                  <span id="hero-pct-val">0% consumed</span>
                  <span id="hero-over-badge" class="hidden text-rose-400 font-semibold">Over Budget</span>
                </div>
                <div class="w-full h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                  <div id="hero-progress-bar" class="h-full bg-gradient-to-r from-sky-400 to-rose-400 rounded-full transition-all duration-500" style="width: 0%"></div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- Macronutrients Split Card -->
        <section class="surface-card rounded-2xl p-5">
          <div class="flex items-center justify-between mb-3">
            <span class="text-[11px] font-bold uppercase tracking-wider text-slate-400">Macronutrients Split</span>
            <span id="macro-pct-ratio" class="text-[10px] font-mono text-slate-400">P: 0% • C: 0% • F: 0%</span>
          </div>

          <div class="space-y-3">
            <!-- Protein Bar -->
            <div>
              <div class="flex justify-between text-xs font-semibold mb-1">
                <span class="flex items-center gap-1.5 text-sky-400">
                  <span class="w-2 h-2 rounded-full bg-sky-400"></span>Protein
                </span>
                <span class="tabular-num text-slate-200"><span id="macro-p-consumed">0</span> / <span id="macro-p-target">140</span>g</span>
              </div>
              <div class="w-full h-2 rounded-full bg-white/[0.06] overflow-hidden">
                <div id="macro-p-bar" class="h-full bg-sky-400 rounded-full transition-all duration-500" style="width: 0%"></div>
              </div>
              <div class="flex justify-between text-[10px] text-slate-400 mt-0.5">
                <span id="macro-p-left">140g left</span>
                <span id="macro-p-pct">0%</span>
              </div>
            </div>

            <!-- Carbs Bar -->
            <div>
              <div class="flex justify-between text-xs font-semibold mb-1">
                <span class="flex items-center gap-1.5 text-amber-400">
                  <span class="w-2 h-2 rounded-full bg-amber-400"></span>Carbs
                </span>
                <span class="tabular-num text-slate-200"><span id="macro-c-consumed">0</span> / <span id="macro-c-target">200</span>g</span>
              </div>
              <div class="w-full h-2 rounded-full bg-white/[0.06] overflow-hidden">
                <div id="macro-c-bar" class="h-full bg-amber-400 rounded-full transition-all duration-500" style="width: 0%"></div>
              </div>
              <div class="flex justify-between text-[10px] text-slate-400 mt-0.5">
                <span id="macro-c-left">200g left</span>
                <span id="macro-c-pct">0%</span>
              </div>
            </div>

            <!-- Fat Bar -->
            <div>
              <div class="flex justify-between text-xs font-semibold mb-1">
                <span class="flex items-center gap-1.5 text-rose-400">
                  <span class="w-2 h-2 rounded-full bg-rose-400"></span>Fat
                </span>
                <span class="tabular-num text-slate-200"><span id="macro-f-consumed">0</span> / <span id="macro-f-target">65</span>g</span>
              </div>
              <div class="w-full h-2 rounded-full bg-white/[0.06] overflow-hidden">
                <div id="macro-f-bar" class="h-full bg-rose-400 rounded-full transition-all duration-500" style="width: 0%"></div>
              </div>
              <div class="flex justify-between text-[10px] text-slate-400 mt-0.5">
                <span id="macro-f-left">65g left</span>
                <span id="macro-f-pct">0%</span>
              </div>
            </div>
          </div>
        </section>
      </div>

      <!-- One-Tap Staples & Quick Log Presets Carousel -->
      <section class="space-y-2">
        <div class="flex items-center justify-between">
          <span class="text-[11px] font-bold uppercase tracking-wider text-slate-400">One-Tap Staples & Presets</span>
          <button id="btn-open-preset-modal" class="text-xs text-sky-400 hover:text-sky-300 font-semibold flex items-center gap-1 transition">
            <span>+ New Preset</span>
          </button>
        </div>
        <div id="presets-carousel" class="flex gap-2.5 overflow-x-auto pb-1 scrollbar-none">
          <!-- Populated dynamically via JS -->
        </div>
      </section>

      <!-- Chronological Meal Timeline -->
      <section class="space-y-3">
        <div class="flex items-center justify-between">
          <span class="text-[11px] font-bold uppercase tracking-wider text-slate-400">Today's Meals (<span id="meal-count-pill">0</span>)</span>
          <button id="btn-open-meal-modal" class="px-3 py-1 rounded-xl bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white text-xs font-bold shadow-md shadow-rose-500/20 active:scale-95 transition flex items-center gap-1.5">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
            <span>Log Meal</span>
          </button>
        </div>
        <div id="meals-list" class="space-y-2">
          <!-- Populated dynamically via JS -->
        </div>
      </section>
    </div>

    <!-- ======================================================== -->
    <!-- TAB 2: PHOTO TO MACROS AI                               -->
    <!-- ======================================================== -->
    <div id="view-photo" role="tabpanel" aria-labelledby="tab-photo" class="hidden space-y-4">
      
      <section class="surface-card rounded-2xl p-5 relative overflow-hidden">
        <div class="flex items-center justify-between mb-2">
          <div class="flex items-center gap-2">
            <span class="text-lg">📸</span>
            <h2 class="text-sm font-bold text-white">Visual Food AI Scanner</h2>
          </div>
          <span class="px-2 py-0.5 rounded-full text-[10px] font-mono bg-sky-500/10 text-sky-400 border border-sky-500/20">Llama 3.2 Vision</span>
        </div>
        <p class="text-xs text-slate-400 mb-4">Snap or upload a meal photo. AI detects food items, portions, calories, and macros in real-time.</p>

        <!-- Dropzone / Camera Area -->
        <div id="photo-dropzone" class="border-2 border-dashed border-white/10 hover:border-sky-500/40 rounded-2xl p-6 text-center cursor-pointer transition bg-white/[0.02] relative overflow-hidden group">
          <input type="file" id="photo-file-input" accept="image/*" capture="environment" class="hidden">
          
          <div id="photo-empty-state" class="space-y-3">
            <div class="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-sky-500/20 to-emerald-500/20 border border-white/10 flex items-center justify-center text-2xl group-hover:scale-105 transition">
              📷
            </div>
            <div>
              <p class="text-sm font-bold text-slate-200">Take Photo or Upload Image</p>
              <p class="text-[11px] text-slate-400 mt-0.5">Supports Camera, JPG, PNG, WebP • Drag & Drop</p>
            </div>
            <button type="button" class="px-4 py-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.12] border border-white/[0.08] text-xs font-semibold text-white transition pointer-events-none">
              Choose Meal Photo
            </button>
          </div>

          <!-- Preview & Scanning Animation -->
          <div id="photo-preview-state" class="hidden relative max-w-sm mx-auto rounded-xl overflow-hidden shadow-2xl border border-white/10">
            <img id="photo-preview-img" src="" alt="Food Preview" class="w-full max-h-64 object-cover rounded-xl">
            <div id="photo-laser" class="laser-line hidden"></div>
            <div id="photo-analyzing-overlay" class="hidden absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center gap-2">
              <div class="w-8 h-8 rounded-full border-2 border-sky-400 border-t-transparent animate-spin"></div>
              <span class="text-xs font-bold text-sky-300">Analyzing Nutrition...</span>
            </div>
          </div>
        </div>

        <!-- Optional Context Input -->
        <div class="mt-3 flex gap-2">
          <input type="text" id="photo-hint-input" placeholder="Optional notes (e.g. 200g chicken with brown rice)" class="flex-1 px-3 py-2 text-xs rounded-xl surface-elevated text-white placeholder-slate-500 focus:outline-none focus:border-sky-500/50">
          <button id="btn-reanalyze-photo" class="px-3 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.10] border border-white/[0.08] text-xs font-semibold text-slate-300 transition active:scale-95">
            Scan
          </button>
        </div>
      </section>

      <!-- AI Analysis Result Card -->
      <section id="photo-result-card" class="hidden surface-card rounded-2xl p-5 space-y-4 animate-pop">
        <div class="flex items-center justify-between border-b border-white/[0.06] pb-3">
          <div>
            <span class="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Analysis Complete</span>
            <input type="text" id="detected-food-name" class="text-base font-extrabold text-white bg-transparent border-b border-transparent focus:border-sky-400 focus:outline-none w-full mt-0.5">
          </div>
          <div class="text-right">
            <span id="detected-calories" class="text-xl font-black text-rose-400 tabular-num">0</span>
            <span class="text-xs text-slate-400">kcal</span>
          </div>
        </div>

        <!-- Macro Breakdown Badges -->
        <div class="grid grid-cols-3 gap-2">
          <div class="surface-elevated p-2.5 rounded-xl text-center">
            <span class="text-[10px] font-semibold text-sky-400 uppercase">Protein</span>
            <div class="flex items-center justify-center gap-0.5 mt-0.5">
              <input type="number" id="detected-protein" step="0.1" class="w-12 text-center text-sm font-bold text-white bg-transparent focus:outline-none">
              <span class="text-[10px] text-slate-400">g</span>
            </div>
          </div>
          <div class="surface-elevated p-2.5 rounded-xl text-center">
            <span class="text-[10px] font-semibold text-amber-400 uppercase">Carbs</span>
            <div class="flex items-center justify-center gap-0.5 mt-0.5">
              <input type="number" id="detected-carbs" step="0.1" class="w-12 text-center text-sm font-bold text-white bg-transparent focus:outline-none">
              <span class="text-[10px] text-slate-400">g</span>
            </div>
          </div>
          <div class="surface-elevated p-2.5 rounded-xl text-center">
            <span class="text-[10px] font-semibold text-rose-400 uppercase">Fat</span>
            <div class="flex items-center justify-center gap-0.5 mt-0.5">
              <input type="number" id="detected-fat" step="0.1" class="w-12 text-center text-sm font-bold text-white bg-transparent focus:outline-none">
              <span class="text-[10px] text-slate-400">g</span>
            </div>
          </div>
        </div>

        <!-- Portion & Category Controls -->
        <div class="grid grid-cols-3 gap-2">
          <div>
            <label class="text-[10px] font-semibold text-slate-400">Amount</label>
            <input type="number" id="detected-amount" step="0.1" class="w-full mt-1 px-2.5 py-1.5 text-xs rounded-xl surface-elevated text-white focus:outline-none">
          </div>
          <div>
            <label class="text-[10px] font-semibold text-slate-400">Unit</label>
            <input type="text" id="detected-unit" class="w-full mt-1 px-2.5 py-1.5 text-xs rounded-xl surface-elevated text-white focus:outline-none">
          </div>
          <div>
            <label class="text-[10px] font-semibold text-slate-400">Meal</label>
            <select id="detected-meal-type" class="w-full mt-1 px-2 py-1.5 text-xs rounded-xl surface-elevated text-white focus:outline-none">
              <option value="lunch">Lunch</option>
              <option value="breakfast">Breakfast</option>
              <option value="dinner">Dinner</option>
              <option value="snack">Snack</option>
            </select>
          </div>
        </div>

        <div>
          <label class="text-[10px] font-semibold text-slate-400">AI Estimation Notes</label>
          <textarea id="detected-notes" rows="2" class="w-full mt-1 px-3 py-2 text-xs rounded-xl surface-elevated text-slate-300 focus:outline-none"></textarea>
        </div>

        <!-- Actions: Log to Today or Save as Preset -->
        <div class="flex gap-2 pt-1">
          <button id="btn-log-detected-meal" class="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white text-xs font-bold shadow-lg shadow-emerald-500/20 active:scale-95 transition flex items-center justify-center gap-1.5">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
            <span>Log to Today</span>
          </button>
          <button id="btn-save-detected-preset" class="px-4 py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.10] border border-white/[0.08] text-xs font-semibold text-slate-200 transition active:scale-95">
            Save Preset
          </button>
        </div>
      </section>
    </div>

    <!-- ======================================================== -->
    <!-- TAB 3: INTERMITTENT FASTING WINDOW                      -->
    <!-- ======================================================== -->
    <div id="view-fasting" role="tabpanel" aria-labelledby="tab-fasting" class="hidden space-y-4">
      
      <!-- Fasting Hero Ring & Timer -->
      <section class="surface-card rounded-2xl p-6 text-center relative overflow-hidden">
        
        <!-- Status Pill -->
        <div class="flex items-center justify-between mb-4">
          <span class="text-[11px] font-bold uppercase tracking-wider text-slate-400">Intermittent Fasting</span>
          <span id="fasting-state-badge" class="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-teal-500/15 text-teal-300 border border-teal-500/30 flex items-center gap-1.5">
            <span class="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse"></span>
            <span id="fasting-state-text">Fasting</span>
          </span>
        </div>

        <!-- Radial Fasting Timer -->
        <div class="relative w-44 h-44 mx-auto my-2 flex items-center justify-center">
          <svg class="w-44 h-44 -rotate-90 transform" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="50" stroke="rgba(255,255,255,0.06)" stroke-width="8" fill="none"/>
            <circle id="fasting-gauge-circle" cx="60" cy="60" r="50" stroke="#14B8A6" stroke-width="8" stroke-linecap="round" fill="none" stroke-dasharray="314" stroke-dashoffset="314" class="transition-all duration-700 ease-out"/>
          </svg>
          <div class="absolute inset-0 flex flex-col items-center justify-center">
            <span id="fasting-timer-countdown" class="text-2xl font-black font-mono tracking-tight text-white tabular-num">00:00:00</span>
            <span id="fasting-timer-sublabel" class="text-[10px] uppercase font-bold text-slate-400 mt-1">Elapsed</span>
          </div>
        </div>

        <!-- Target & Time Details -->
        <div class="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-white/[0.06] text-left">
          <div class="surface-elevated p-3 rounded-xl">
            <span class="text-[10px] font-semibold text-slate-400">Target Duration</span>
            <p id="fasting-target-display" class="text-sm font-bold text-white mt-0.5">16 Hours (16:8)</p>
          </div>
          <div class="surface-elevated p-3 rounded-xl">
            <span class="text-[10px] font-semibold text-slate-400">Remaining</span>
            <p id="fasting-remaining-display" class="text-sm font-bold text-teal-300 mt-0.5">--</p>
          </div>
        </div>

        <!-- Fasting Controls -->
        <div class="flex gap-2 mt-4">
          <button id="btn-toggle-fast" class="flex-1 py-3 px-4 min-h-[44px] rounded-xl bg-gradient-to-r from-sky-500 to-indigo-500 hover:from-sky-600 hover:to-indigo-600 text-white text-xs font-bold shadow-lg shadow-sky-500/20 active:scale-95 transition flex items-center justify-center">
            Start Fast
          </button>
          <button id="btn-edit-fast-time" class="px-4 py-3 min-h-[44px] rounded-xl bg-white/[0.06] hover:bg-white/[0.10] border border-white/[0.08] text-xs font-semibold text-slate-300 transition active:scale-95 flex items-center justify-center">
            Adjust Start
          </button>
        </div>
      </section>

      <!-- Protocol Preset Selector -->
      <section class="surface-card rounded-2xl p-5 space-y-3">
        <span class="text-[11px] font-bold uppercase tracking-wider text-slate-400">Fasting Protocols</span>
        <div class="grid grid-cols-4 gap-2">
          <button class="fasting-preset-btn min-h-[44px] py-2 px-1 rounded-xl surface-elevated text-center hover:border-sky-500/40 transition active:scale-95" data-hours="14" data-type="14:10">
            <span class="block text-xs font-black text-white">14:10</span>
            <span class="block text-[9px] text-slate-400">Gentle</span>
          </button>
          <button class="fasting-preset-btn min-h-[44px] py-2 px-1 rounded-xl surface-elevated border-sky-500/50 bg-sky-500/10 text-center hover:border-sky-500/40 transition active:scale-95" data-hours="16" data-type="16:8">
            <span class="block text-xs font-black text-white">16:8</span>
            <span class="block text-[9px] text-sky-300">Classic</span>
          </button>
          <button class="fasting-preset-btn min-h-[44px] py-2 px-1 rounded-xl surface-elevated text-center hover:border-sky-500/40 transition active:scale-95" data-hours="18" data-type="18:6">
            <span class="block text-xs font-black text-white">18:6</span>
            <span class="block text-[9px] text-slate-400">Focused</span>
          </button>
          <button class="fasting-preset-btn min-h-[44px] py-2 px-1 rounded-xl surface-elevated text-center hover:border-sky-500/40 transition active:scale-95" data-hours="20" data-type="20:4">
            <span class="block text-xs font-black text-white">20:4</span>
            <span class="block text-[9px] text-slate-400">Warrior</span>
          </button>
        </div>
      </section>

      <!-- Metabolic Milestones -->
      <section class="surface-card rounded-2xl p-5 space-y-3">
        <span class="text-[11px] font-bold uppercase tracking-wider text-slate-400">Metabolic Milestones</span>
        <div class="space-y-2 text-xs">
          <div id="milestone-1" class="surface-elevated p-3.5 rounded-xl flex items-center justify-between border border-sky-500/25 bg-sky-500/[0.04]">
            <div class="flex items-start gap-2.5">
              <span class="w-2 h-2 rounded-full bg-sky-400 mt-1 flex-shrink-0"></span>
              <div>
                <span class="font-bold text-white">0–12 Hours: Blood Sugar Stabilization</span>
                <p class="text-[11px] text-slate-400 mt-0.5">Insulin falls, glycogen depletes, liver energy reset</p>
              </div>
            </div>
            <span class="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-sky-500/15 text-sky-400 border border-sky-500/30">Glycogen</span>
          </div>
          <div id="milestone-2" class="surface-elevated p-3.5 rounded-xl flex items-center justify-between border border-amber-500/25 bg-amber-500/[0.04]">
            <div class="flex items-start gap-2.5">
              <span class="w-2 h-2 rounded-full bg-amber-400 mt-1 flex-shrink-0"></span>
              <div>
                <span class="font-bold text-white">12–16 Hours: Fat Burning & Ketosis</span>
                <p class="text-[11px] text-slate-400 mt-0.5">Lipolysis accelerates, burning stored adipose tissue</p>
              </div>
            </div>
            <span class="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">Fat Burn</span>
          </div>
          <div id="milestone-3" class="surface-elevated p-3.5 rounded-xl flex items-center justify-between border border-teal-500/25 bg-teal-500/[0.04]">
            <div class="flex items-start gap-2.5">
              <span class="w-2 h-2 rounded-full bg-teal-400 mt-1 flex-shrink-0"></span>
              <div>
                <span class="font-bold text-white">16–18 Hours: Cellular Autophagy</span>
                <p class="text-[11px] text-slate-400 mt-0.5">Cells recycle damaged organelles and proteins</p>
              </div>
            </div>
            <span class="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-teal-500/15 text-teal-400 border border-teal-500/30">Autophagy</span>
          </div>
          <div id="milestone-4" class="surface-elevated p-3.5 rounded-xl flex items-center justify-between border border-rose-500/25 bg-rose-500/[0.04]">
            <div class="flex items-start gap-2.5">
              <span class="w-2 h-2 rounded-full bg-rose-400 mt-1 flex-shrink-0"></span>
              <div>
                <span class="font-bold text-white">18+ Hours: Deep Ketosis & HGH</span>
                <p class="text-[11px] text-slate-400 mt-0.5">Elevated growth hormone, profound cellular renewal</p>
              </div>
            </div>
            <span class="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">Deep Ketosis</span>
          </div>
        </div>
      </section>
    </div>

    <!-- ======================================================== -->
    <!-- TAB 4: WEIGHT PROGRESSION                               -->
    <!-- ======================================================== -->
    <div id="view-weight" role="tabpanel" aria-labelledby="tab-weight" class="hidden space-y-4">
      
      <!-- Key Weight Stats Card -->
      <section class="surface-card rounded-2xl p-5">
        <div class="flex items-center justify-between mb-4">
          <span class="text-[11px] font-bold uppercase tracking-wider text-slate-400">Body Weight Tracker</span>
          <button id="btn-open-weight-modal" class="px-3 py-1 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-xs font-bold shadow-md shadow-emerald-500/20 active:scale-95 transition flex items-center gap-1.5">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
            <span>Log Weight</span>
          </button>
        </div>

        <div class="grid grid-cols-3 gap-2 text-center">
          <div class="surface-elevated p-3 rounded-xl">
            <span class="text-[10px] font-semibold text-slate-400 uppercase">Current</span>
            <div class="mt-0.5">
              <span id="weight-stat-latest" class="text-lg font-black text-white tabular-num">--</span>
              <span class="text-[10px] text-slate-400">kg</span>
            </div>
          </div>
          <div class="surface-elevated p-3 rounded-xl">
            <span class="text-[10px] font-semibold text-slate-400 uppercase">Net Change</span>
            <div class="mt-0.5">
              <span id="weight-stat-change" class="text-lg font-black text-emerald-400 tabular-num">0.0</span>
              <span class="text-[10px] text-slate-400">kg</span>
            </div>
          </div>
          <div class="surface-elevated p-3 rounded-xl">
            <span class="text-[10px] font-semibold text-slate-400 uppercase">Goal</span>
            <div class="mt-0.5">
              <span id="weight-stat-target" class="text-lg font-black text-sky-400 tabular-num">--</span>
              <span class="text-[10px] text-slate-400">kg</span>
            </div>
          </div>
        </div>
      </section>

      <!-- Interactive SVG Weight Curve Chart -->
      <section class="surface-card rounded-2xl p-5 space-y-3">
        <div class="flex items-center justify-between">
          <span class="text-[11px] font-bold uppercase tracking-wider text-slate-400">Weight Progression Trend</span>
          <span id="weight-trend-label" class="text-xs font-semibold text-slate-400">30-Day Trend</span>
        </div>

        <div class="relative w-full h-48 surface-elevated rounded-xl p-3 flex flex-col justify-between overflow-hidden">
          <svg id="weight-chart-svg" class="w-full h-full overflow-visible" viewBox="0 0 400 150" preserveAspectRatio="none">
            <!-- Dynamic SVG elements rendered via JS -->
          </svg>
        </div>
      </section>

      <!-- Weight Logs History -->
      <section class="surface-card rounded-2xl p-5 space-y-3">
        <span class="text-[11px] font-bold uppercase tracking-wider text-slate-400">Weigh-In History</span>
        <div id="weight-history-list" class="space-y-2">
          <!-- Populated dynamically via JS -->
        </div>
      </section>
    </div>

  </main>

  <!-- ======================================================== -->
  <!-- MODALS                                                   -->
  <!-- ======================================================== -->

  <!-- Add / Edit Meal Modal -->
  <div id="meal-modal" role="dialog" aria-modal="true" aria-labelledby="meal-modal-title" class="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm hidden flex items-center justify-center p-4">
    <div class="surface-card rounded-2xl w-full max-w-md p-5 space-y-4 animate-pop">
      <div class="flex items-center justify-between">
        <h3 id="meal-modal-title" class="text-sm font-bold text-white">Log Meal</h3>
        <button id="btn-close-meal-modal" aria-label="Close meal dialog" class="text-slate-400 hover:text-white text-lg font-bold">×</button>
      </div>
      <form id="form-meal" class="space-y-3">
        <input type="hidden" id="meal-edit-id">
        <div>
          <label for="meal-food-name" class="text-[11px] font-semibold text-slate-400">Food Name</label>
          <input type="text" id="meal-food-name" required placeholder="e.g. Scrambled Eggs with Toast" class="w-full mt-1 px-3 py-2 text-xs rounded-xl surface-elevated text-white focus:outline-none focus:border-rose-500">
        </div>
        <div class="grid grid-cols-3 gap-2">
          <div>
            <label for="meal-amount" class="text-[11px] font-semibold text-slate-400">Amount</label>
            <input type="number" id="meal-amount" step="0.1" value="1" required class="w-full mt-1 px-3 py-2 text-xs rounded-xl surface-elevated text-white focus:outline-none">
          </div>
          <div>
            <label for="meal-unit" class="text-[11px] font-semibold text-slate-400">Unit</label>
            <input type="text" id="meal-unit" value="serving" required class="w-full mt-1 px-3 py-2 text-xs rounded-xl surface-elevated text-white focus:outline-none">
          </div>
          <div>
            <label for="meal-type" class="text-[11px] font-semibold text-slate-400">Meal Type</label>
            <select id="meal-type" class="w-full mt-1 px-2.5 py-2 text-xs rounded-xl surface-elevated text-white focus:outline-none">
              <option value="breakfast">Breakfast</option>
              <option value="lunch">Lunch</option>
              <option value="dinner">Dinner</option>
              <option value="snack">Snack</option>
            </select>
          </div>
        </div>
        <div>
          <label for="meal-calories" class="text-[11px] font-semibold text-slate-400">Calories (kcal)</label>
          <input type="number" id="meal-calories" required placeholder="e.g. 350" class="w-full mt-1 px-3 py-2 text-xs rounded-xl surface-elevated text-white focus:outline-none">
        </div>
        <div class="grid grid-cols-3 gap-2">
          <div>
            <label for="meal-protein" class="text-[11px] font-semibold text-sky-400">Protein (g)</label>
            <input type="number" id="meal-protein" step="0.1" placeholder="0" class="w-full mt-1 px-3 py-2 text-xs rounded-xl surface-elevated text-white focus:outline-none">
          </div>
          <div>
            <label for="meal-carbs" class="text-[11px] font-semibold text-amber-400">Carbs (g)</label>
            <input type="number" id="meal-carbs" step="0.1" placeholder="0" class="w-full mt-1 px-3 py-2 text-xs rounded-xl surface-elevated text-white focus:outline-none">
          </div>
          <div>
            <label for="meal-fat" class="text-[11px] font-semibold text-rose-400">Fat (g)</label>
            <input type="number" id="meal-fat" step="0.1" placeholder="0" class="w-full mt-1 px-3 py-2 text-xs rounded-xl surface-elevated text-white focus:outline-none">
          </div>
        </div>
        <div>
          <label for="meal-notes" class="text-[11px] font-semibold text-slate-400">Notes / Ingredients</label>
          <input type="text" id="meal-notes" placeholder="Optional notes" class="w-full mt-1 px-3 py-2 text-xs rounded-xl surface-elevated text-white focus:outline-none">
        </div>
        <div class="flex gap-2 pt-2">
          <button type="submit" class="flex-1 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold transition shadow-md">Save Meal</button>
          <button type="button" id="btn-cancel-meal-modal" class="px-4 py-2.5 rounded-xl bg-white/[0.06] text-xs font-semibold text-slate-300">Cancel</button>
        </div>
      </form>
    </div>
  </div>

  <!-- Log Weight Modal -->
  <div id="weight-modal" role="dialog" aria-modal="true" aria-labelledby="weight-modal-title" class="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm hidden flex items-center justify-center p-4">
    <div class="surface-card rounded-2xl w-full max-w-sm p-5 space-y-4 animate-pop">
      <div class="flex items-center justify-between">
        <h3 id="weight-modal-title" class="text-sm font-bold text-white">Record Body Weight</h3>
        <button id="btn-close-weight-modal" aria-label="Close weight dialog" class="text-slate-400 hover:text-white text-lg font-bold">×</button>
      </div>
      <form id="form-weight" class="space-y-3">
        <div>
          <label for="input-weight-kg" class="text-[11px] font-semibold text-slate-400">Weight (kg)</label>
          <input type="number" id="input-weight-kg" step="0.1" required placeholder="e.g. 74.5" class="w-full mt-1 px-3 py-2 text-sm font-bold rounded-xl surface-elevated text-white focus:outline-none focus:border-emerald-500">
        </div>
        <div>
          <label for="input-weight-date" class="text-[11px] font-semibold text-slate-400">Date</label>
          <input type="date" id="input-weight-date" required class="w-full mt-1 px-3 py-2 text-xs rounded-xl surface-elevated text-white focus:outline-none">
        </div>
        <div>
          <label for="input-weight-notes" class="text-[11px] font-semibold text-slate-400">Notes</label>
          <input type="text" id="input-weight-notes" placeholder="e.g. Morning fasted" class="w-full mt-1 px-3 py-2 text-xs rounded-xl surface-elevated text-white focus:outline-none">
        </div>
        <div class="flex gap-2 pt-2">
          <button type="submit" class="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold transition">Save Weight</button>
          <button type="button" id="btn-cancel-weight-modal" class="px-4 py-2.5 rounded-xl bg-white/[0.06] text-xs font-semibold text-slate-300">Cancel</button>
        </div>
      </form>
    </div>
  </div>

  <!-- Settings & Targets Modal -->
  <div id="settings-modal" role="dialog" aria-modal="true" aria-labelledby="settings-modal-title" class="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm hidden flex items-center justify-center p-4">
    <div class="surface-card rounded-2xl w-full max-w-md p-5 space-y-4 animate-pop">
      <div class="flex items-center justify-between">
        <h3 id="settings-modal-title" class="text-sm font-bold text-white">Tracker Settings & Goals</h3>
        <button id="btn-close-settings" aria-label="Close settings dialog" class="text-slate-400 hover:text-white text-lg font-bold">×</button>
      </div>
      <form id="form-settings" class="space-y-3">
        <div>
          <label for="setting-target" class="text-[11px] font-semibold text-slate-400">Daily Calorie Target (kcal)</label>
          <input type="number" id="setting-target" value="2000" class="w-full mt-1 px-3 py-2 text-xs rounded-xl surface-elevated text-white focus:outline-none">
        </div>
        <div class="grid grid-cols-3 gap-2">
          <div>
            <label for="setting-protein" class="text-[11px] font-semibold text-sky-400">Protein (g)</label>
            <input type="number" id="setting-protein" value="140" class="w-full mt-1 px-3 py-2 text-xs rounded-xl surface-elevated text-white focus:outline-none">
          </div>
          <div>
            <label for="setting-carbs" class="text-[11px] font-semibold text-amber-400">Carbs (g)</label>
            <input type="number" id="setting-carbs" value="200" class="w-full mt-1 px-3 py-2 text-xs rounded-xl surface-elevated text-white focus:outline-none">
          </div>
          <div>
            <label for="setting-fat" class="text-[11px] font-semibold text-rose-400">Fat (g)</label>
            <input type="number" id="setting-fat" value="65" class="w-full mt-1 px-3 py-2 text-xs rounded-xl surface-elevated text-white focus:outline-none">
          </div>
        </div>
        <div class="grid grid-cols-2 gap-2">
          <div>
            <label for="setting-weight-goal" class="text-[11px] font-semibold text-slate-400">Goal Weight (kg)</label>
            <input type="number" id="setting-weight-goal" step="0.1" placeholder="e.g. 70.0" class="w-full mt-1 px-3 py-2 text-xs rounded-xl surface-elevated text-white focus:outline-none">
          </div>
          <div>
            <label for="setting-fasting-target" class="text-[11px] font-semibold text-teal-400">Fasting Goal (hours)</label>
            <input type="number" id="setting-fasting-target" step="1" value="16" class="w-full mt-1 px-3 py-2 text-xs rounded-xl surface-elevated text-white focus:outline-none">
          </div>
        </div>
        <div>
          <label for="setting-tz" class="text-[11px] font-semibold text-slate-400">Timezone</label>
          <input type="text" id="setting-tz" value="UTC" class="w-full mt-1 px-3 py-2 text-xs rounded-xl surface-elevated text-white focus:outline-none">
        </div>
        <div class="flex gap-2 pt-2">
          <button type="submit" class="flex-1 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold transition">Save Settings</button>
          <button type="button" id="btn-cancel-settings" class="px-4 py-2.5 rounded-xl bg-white/[0.06] text-xs font-semibold text-slate-300">Cancel</button>
        </div>
      </form>
    </div>
  </div>

  <!-- PWA iOS Instructions Modal -->
  <div id="pwa-ios-modal" role="dialog" aria-modal="true" aria-labelledby="pwa-ios-title" class="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm hidden flex items-center justify-center p-4">
    <div class="surface-card rounded-2xl w-full max-w-sm p-5 space-y-4 animate-pop text-center">
      <div class="w-12 h-12 mx-auto rounded-2xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-2xl">
        📲
      </div>
      <div>
        <h3 id="pwa-ios-title" class="text-base font-bold text-white">Install on iPhone / iPad</h3>
        <p class="text-xs text-slate-400 mt-1">To install CalorieFlow as a standalone native app on your home screen:</p>
      </div>
      <div class="surface-elevated p-3 rounded-xl text-xs text-left space-y-2 text-slate-300">
        <p class="flex items-center gap-2"><span>1.</span> Tap the <strong>Share</strong> button <span class="px-1.5 py-0.5 rounded bg-white/10 text-white font-mono">⎋</span> at the bottom of Safari.</p>
        <p class="flex items-center gap-2"><span>2.</span> Scroll down and tap <strong>Add to Home Screen</strong> <span class="px-1.5 py-0.5 rounded bg-white/10 text-white font-mono">⊞</span>.</p>
        <p class="flex items-center gap-2"><span>3.</span> Tap <strong>Add</strong> in the top right corner.</p>
      </div>
      <button id="btn-close-pwa-ios" class="w-full py-2.5 rounded-xl bg-white/[0.1] text-xs font-bold text-white hover:bg-white/[0.15] transition">Got it!</button>
    </div>
  </div>

  <!-- ======================================================== -->
  <!-- CLIENT JAVASCRIPT                                        -->
  <!-- ======================================================== -->
  <script>
    // State
    let currentDate = new Date().toISOString().split("T")[0];
    let summaryData = null;
    let weightData = null;
    let fastingData = null;
    let fastingInterval = null;
    let deferredPwaPrompt = null;
    let activeTab = "intake";

    // PWA Service Worker Registration
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch(err => console.log('SW registration failed:', err));
      });
    }

    // PWA Install Prompt Handler
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPwaPrompt = e;
      const installBtn = document.getElementById("btn-pwa-install");
      if (installBtn) installBtn.classList.remove("hidden");
    });

    document.getElementById("btn-pwa-install").onclick = async () => {
      if (deferredPwaPrompt) {
        deferredPwaPrompt.prompt();
        const { outcome } = await deferredPwaPrompt.userChoice;
        if (outcome === 'accepted') {
          showToast("App installed successfully! 🎉", "success");
        }
        deferredPwaPrompt = null;
        document.getElementById("btn-pwa-install").classList.add("hidden");
      } else {
        // Detect iOS
        const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
        if (isIos) {
          document.getElementById("pwa-ios-modal").classList.remove("hidden");
        } else {
          showToast("App already installed or browser does not support prompt", "info");
        }
      }
    };

    document.getElementById("btn-close-pwa-ios").onclick = () => {
      document.getElementById("pwa-ios-modal").classList.add("hidden");
    };

    // Tab Switching
    const tabBtns = document.querySelectorAll(".tab-btn");
    const views = {
      intake: document.getElementById("view-intake"),
      photo: document.getElementById("view-photo"),
      fasting: document.getElementById("view-fasting"),
      weight: document.getElementById("view-weight")
    };

    tabBtns.forEach(btn => {
      btn.onclick = () => {
        const tab = btn.dataset.tab;
        switchTab(tab);
      };
    });

    function switchTab(tab) {
      activeTab = tab;
      tabBtns.forEach(b => {
        const isSel = b.dataset.tab === tab;
        b.setAttribute("aria-selected", isSel ? "true" : "false");
        if (isSel) {
          b.className = "tab-btn py-1.5 rounded-lg text-white bg-white/[0.08] transition flex items-center justify-center gap-1.5 shadow-sm";
        } else {
          b.className = "tab-btn py-1.5 rounded-lg text-slate-400 hover:text-white transition flex items-center justify-center gap-1.5";
        }
      });
      Object.keys(views).forEach(k => {
        if (k === tab) views[k].classList.remove("hidden");
        else views[k].classList.add("hidden");
      });

      // Header controls context
      const dateWrap = document.getElementById("date-switcher-wrap");
      if (tab === "intake") dateWrap.classList.remove("hidden");
      else dateWrap.classList.add("hidden");

      if (tab === "fasting") loadFastingData();
      if (tab === "weight") loadWeightData();
    }

    // Date Switcher
    const dateInput = document.getElementById("date-input");
    const dateDisplayLabel = document.getElementById("date-display-label");
    dateInput.value = currentDate;

    function updateDateLabel() {
      const today = new Date().toISOString().split("T")[0];
      const yest = new Date(Date.now() - 86400000).toISOString().split("T")[0];
      const tomo = new Date(Date.now() + 86400000).toISOString().split("T")[0];
      if (currentDate === today) dateDisplayLabel.innerText = "Today";
      else if (currentDate === yest) dateDisplayLabel.innerText = "Yesterday";
      else if (currentDate === tomo) dateDisplayLabel.innerText = "Tomorrow";
      else dateDisplayLabel.innerText = currentDate;
    }

    document.getElementById("btn-prev-day").onclick = () => {
      const d = new Date(currentDate + "T12:00:00");
      d.setDate(d.getDate() - 1);
      currentDate = d.toISOString().split("T")[0];
      dateInput.value = currentDate;
      updateDateLabel();
      loadData();
    };

    document.getElementById("btn-next-day").onclick = () => {
      const d = new Date(currentDate + "T12:00:00");
      d.setDate(d.getDate() + 1);
      currentDate = d.toISOString().split("T")[0];
      dateInput.value = currentDate;
      updateDateLabel();
      loadData();
    };

    dateInput.onchange = (e) => {
      currentDate = e.target.value;
      updateDateLabel();
      loadData();
    };

    // Load Main Intake Data
    async function loadData() {
      try {
        const res = await fetch('/api/summary?date=' + currentDate);
        summaryData = await res.json();
        renderSummary();
        renderMeals();
        loadPresets();
      } catch (err) {
        showToast("Error loading tracker data", "error");
      }
    }

    function renderSummary() {
      if (!summaryData) return;
      const target = summaryData.daily_target || 2000;
      const eaten = summaryData.consumed || 0;
      const remaining = summaryData.remaining || 0;
      const overBudget = summaryData.over_budget;
      const pct = Math.min(100, Math.round((eaten / target) * 100));

      document.getElementById("target-pill-display").innerText = "Target: " + target.toLocaleString() + " kcal";
      document.getElementById("hero-budget-val").innerText = target.toLocaleString();
      document.getElementById("hero-eaten-val").innerText = eaten.toLocaleString();
      document.getElementById("hero-remaining-val").innerText = (overBudget ? "+" + (eaten - target) : remaining).toLocaleString();
      document.getElementById("hero-remaining-lbl").innerText = overBudget ? "Over Budget" : "Remaining";
      document.getElementById("hero-pct-val").innerText = pct + "% consumed";

      const circle = document.getElementById("calorie-gauge-circle");
      const circum = 2 * Math.PI * 50; // 314
      const offset = circum - (pct / 100) * circum;
      circle.style.strokeDashoffset = offset;
      circle.style.stroke = overBudget ? "#F43F5E" : (pct > 85 ? "#34D399" : "#38BDF8");

      document.getElementById("hero-progress-bar").style.width = pct + "%";
      const statusPill = document.getElementById("budget-status-text");
      statusPill.innerText = overBudget ? "Over Target" : (pct >= 85 ? "Optimal" : "On Track");
      statusPill.className = overBudget ? "text-rose-400" : (pct >= 85 ? "text-emerald-400" : "text-sky-400");

      // Macros
      const cm = summaryData.consumed_macros;
      const tm = summaryData.target_macros;
      const rm = summaryData.remaining_macros;

      document.getElementById("macro-p-consumed").innerText = cm.protein_g;
      document.getElementById("macro-p-target").innerText = tm.protein_g;
      document.getElementById("macro-p-left").innerText = rm.protein_g + "g left";
      const pPct = Math.min(100, Math.round((cm.protein_g / tm.protein_g) * 100)) || 0;
      document.getElementById("macro-p-bar").style.width = pPct + "%";
      document.getElementById("macro-p-pct").innerText = pPct + "%";

      document.getElementById("macro-c-consumed").innerText = cm.carbs_g;
      document.getElementById("macro-c-target").innerText = tm.carbs_g;
      document.getElementById("macro-c-left").innerText = rm.carbs_g + "g left";
      const cPct = Math.min(100, Math.round((cm.carbs_g / tm.carbs_g) * 100)) || 0;
      document.getElementById("macro-c-bar").style.width = cPct + "%";
      document.getElementById("macro-c-pct").innerText = cPct + "%";

      document.getElementById("macro-f-consumed").innerText = cm.fat_g;
      document.getElementById("macro-f-target").innerText = tm.fat_g;
      document.getElementById("macro-f-left").innerText = rm.fat_g + "g left";
      const fPct = Math.min(100, Math.round((cm.fat_g / tm.fat_g) * 100)) || 0;
      document.getElementById("macro-f-bar").style.width = fPct + "%";
      document.getElementById("macro-f-pct").innerText = fPct + "%";

      const totalMacroGrams = (cm.protein_g + cm.carbs_g + cm.fat_g) || 1;
      const pRatio = Math.round((cm.protein_g / totalMacroGrams) * 100);
      const cRatio = Math.round((cm.carbs_g / totalMacroGrams) * 100);
      const fRatio = Math.round((cm.fat_g / totalMacroGrams) * 100);
      document.getElementById("macro-pct-ratio").innerText = "P: " + pRatio + "% • C: " + cRatio + "% • F: " + fRatio + "%";
    }

    function renderMeals() {
      const list = document.getElementById("meals-list");
      list.innerHTML = "";
      const meals = summaryData?.meals || [];
      document.getElementById("meal-count-pill").innerText = meals.length;

      if (meals.length === 0) {
        list.innerHTML = '<div class="surface-card p-6 rounded-2xl text-center text-xs text-slate-400">No meals logged for this date. Tap "+ Log Meal" or take a photo to add one!</div>';
        return;
      }

      meals.forEach(m => {
        const item = document.createElement("div");
        item.className = "surface-card rounded-2xl p-4 flex items-center justify-between gap-3 group hover:border-white/20 transition";
        item.innerHTML = \`
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <span class="px-2 py-0.5 rounded-full text-[9px] uppercase font-bold tracking-wider bg-white/[0.04] text-slate-300 border border-white/[0.06]">\${m.meal_type}</span>
              <h4 class="text-xs font-bold text-white truncate">\${m.food_name}</h4>
            </div>
            <div class="flex items-center gap-3 text-[11px] text-slate-400 mt-1">
              <span>\${m.amount} \${m.unit}</span>
              <span>•</span>
              <span class="text-sky-300">\${m.protein_g}P</span>
              <span class="text-amber-300">\${m.carbs_g}C</span>
              <span class="text-rose-300">\${m.fat_g}F</span>
              \${m.notes ? '<span class="text-slate-500 truncate max-w-[120px]">(' + m.notes + ')</span>' : ''}
            </div>
          </div>
          <div class="flex items-center gap-3 flex-shrink-0">
            <div class="text-right">
              <span class="text-sm font-black text-white tabular-num">\${m.calories}</span>
              <span class="text-[10px] text-slate-400">kcal</span>
            </div>
            <button class="btn-del-meal min-w-[44px] min-h-[44px] flex items-center justify-center p-2 text-slate-500 hover:text-rose-400 transition" data-id="\${m.id}" aria-label="Delete meal \${m.food_name}">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
            </button>
          </div>
        \`;
        list.appendChild(item);
      });

      document.querySelectorAll(".btn-del-meal").forEach(b => {
        b.onclick = async (e) => {
          e.stopPropagation();
          const id = b.dataset.id;
          if (confirm("Delete this meal entry?")) {
            await fetch('/api/meals/' + id, { method: 'DELETE' });
            showToast("Meal removed", "info");
            loadData();
          }
        };
      });
    }

    async function loadPresets() {
      try {
        const res = await fetch('/api/presets');
        const data = await res.json();
        const carousel = document.getElementById("presets-carousel");
        carousel.innerHTML = "";
        (data.presets || []).forEach(p => {
          const card = document.createElement("button");
          card.className = "flex-shrink-0 px-3.5 py-2.5 rounded-xl surface-card hover:border-sky-500/40 text-left transition active:scale-95 group";
          card.innerHTML = \`
            <div class="flex items-center gap-1.5">
              <span class="text-xs">⚡</span>
              <span class="text-xs font-bold text-white group-hover:text-sky-300 transition">\${p.name}</span>
            </div>
            <div class="text-[10px] text-slate-400 mt-0.5">
              <span class="font-bold text-slate-200">\${p.calories} kcal</span> • \${p.protein_g}g P
            </div>
          \`;
          card.onclick = async () => {
            await fetch('/api/presets/log', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ preset: p.name })
            });
            showToast("Logged " + p.name + "! ⚡", "success");
            loadData();
          };
          carousel.appendChild(card);
        });
      } catch (e) {
        console.error(e);
      }
    }

    // Photo AI Handling
    const dropzone = document.getElementById("photo-dropzone");
    const fileInput = document.getElementById("photo-file-input");
    const previewState = document.getElementById("photo-preview-state");
    const emptyState = document.getElementById("photo-empty-state");
    const previewImg = document.getElementById("photo-preview-img");
    const laser = document.getElementById("photo-laser");
    const analyzingOverlay = document.getElementById("photo-analyzing-overlay");
    const resultCard = document.getElementById("photo-result-card");
    let currentPhotoBase64 = null;

    dropzone.onclick = () => fileInput.click();

    fileInput.onchange = (e) => {
      const file = e.target.files[0];
      if (file) handlePhotoFile(file);
    };

    dropzone.ondragover = (e) => { e.preventDefault(); dropzone.classList.add("border-sky-500"); };
    dropzone.ondragleave = () => dropzone.classList.remove("border-sky-500");
    dropzone.ondrop = (e) => {
      e.preventDefault();
      dropzone.classList.remove("border-sky-500");
      if (e.dataTransfer.files[0]) handlePhotoFile(e.dataTransfer.files[0]);
    };

    function handlePhotoFile(file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const maxDim = 1024;
          let w = img.width;
          let h = img.height;
          if (w > maxDim || h > maxDim) {
            if (w > h) {
              h = Math.round((h * maxDim) / w);
              w = maxDim;
            } else {
              w = Math.round((w * maxDim) / h);
              h = maxDim;
            }
          }
          const canvas = document.createElement("canvas");
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, w, h);
          currentPhotoBase64 = canvas.toDataURL("image/jpeg", 0.85);
          previewImg.src = currentPhotoBase64;
          emptyState.classList.add("hidden");
          previewState.classList.remove("hidden");
          analyzeCurrentPhoto();
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    }

    async function analyzeCurrentPhoto() {
      if (!currentPhotoBase64) return;
      laser.classList.remove("hidden");
      analyzingOverlay.classList.remove("hidden");
      resultCard.classList.add("hidden");

      try {
        const hint = document.getElementById("photo-hint-input").value;
        const res = await fetch("/api/analyze-food-photo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            image: currentPhotoBase64,
            food_description: hint
          })
        });
        const data = await res.json();
        if (data.success) {
          document.getElementById("detected-food-name").value = data.food_name || "Detected Meal";
          document.getElementById("detected-calories").innerText = data.calories || 0;
          document.getElementById("detected-protein").value = data.protein_g || 0;
          document.getElementById("detected-carbs").value = data.carbs_g || 0;
          document.getElementById("detected-fat").value = data.fat_g || 0;
          document.getElementById("detected-amount").value = data.amount || 1;
          document.getElementById("detected-unit").value = data.unit || "serving";
          document.getElementById("detected-notes").value = data.notes || "";
          resultCard.classList.remove("hidden");
          showToast("Photo analyzed! ✨", "success");
        } else {
          showToast("Failed to analyze: " + (data.error || "Unknown"), "error");
        }
      } catch (err) {
        showToast("AI Vision analysis failed", "error");
      } finally {
        laser.classList.add("hidden");
        analyzingOverlay.classList.add("hidden");
      }
    }

    document.getElementById("btn-reanalyze-photo").onclick = analyzeCurrentPhoto;

    document.getElementById("btn-log-detected-meal").onclick = async () => {
      const payload = {
        food_name: document.getElementById("detected-food-name").value,
        calories: parseInt(document.getElementById("detected-calories").innerText) || 0,
        protein_g: parseFloat(document.getElementById("detected-protein").value) || 0,
        carbs_g: parseFloat(document.getElementById("detected-carbs").value) || 0,
        fat_g: parseFloat(document.getElementById("detected-fat").value) || 0,
        amount: parseFloat(document.getElementById("detected-amount").value) || 1,
        unit: document.getElementById("detected-unit").value || "serving",
        meal_type: document.getElementById("detected-meal-type").value || "lunch",
        notes: document.getElementById("detected-notes").value,
        calorie_source: "estimate",
        logged_at: new Date().toISOString(),
        local_date: currentDate
      };

      try {
        await fetch("/api/meals", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        showToast("Meal logged from photo! 📸", "success");
        switchTab("intake");
        loadData();
      } catch (e) {
        showToast("Error saving meal", "error");
      }
    };

    document.getElementById("btn-save-detected-preset").onclick = async () => {
      const name = prompt("Enter preset name:", document.getElementById("detected-food-name").value);
      if (!name) return;
      const payload = {
        name,
        food_name: document.getElementById("detected-food-name").value,
        calories: parseInt(document.getElementById("detected-calories").innerText) || 0,
        protein_g: parseFloat(document.getElementById("detected-protein").value) || 0,
        carbs_g: parseFloat(document.getElementById("detected-carbs").value) || 0,
        fat_g: parseFloat(document.getElementById("detected-fat").value) || 0,
        amount: parseFloat(document.getElementById("detected-amount").value) || 1,
        unit: document.getElementById("detected-unit").value || "serving",
        meal_type: document.getElementById("detected-meal-type").value || "snack",
        notes: document.getElementById("detected-notes").value
      };
      await fetch("/api/presets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      showToast("Saved preset '" + name + "'! 🔖", "success");
      loadPresets();
    };

    // Intermittent Fasting Handling
    async function loadFastingData() {
      try {
        const res = await fetch("/api/fasting");
        fastingData = await res.json();
        renderFasting();
      } catch (e) {
        console.error("Failed to load fasting data:", e);
      }
    }

    function renderFasting() {
      if (!fastingData) return;
      const isActive = fastingData.is_active;
      const autoTracked = fastingData.auto_tracked;
      const stateBadge = document.getElementById("fasting-state-badge");
      const stateText = document.getElementById("fasting-state-text");
      const toggleBtn = document.getElementById("btn-toggle-fast");

      if (isActive) {
        stateBadge.className = "px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-teal-500/15 text-teal-300 border border-teal-500/30 flex items-center gap-1.5";
        stateText.innerText = "Fasting Active";
        toggleBtn.innerText = "End Fast";
        toggleBtn.className = "flex-1 py-3 px-4 min-h-[44px] rounded-xl bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white text-xs font-bold transition flex items-center justify-center";
      } else if (autoTracked) {
        stateBadge.className = "px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-sky-500/15 text-sky-300 border border-sky-500/30 flex items-center gap-1.5";
        stateText.innerText = "Auto-Fasting (Last Meal)";
        toggleBtn.innerText = "Start Manual Fast";
        toggleBtn.className = "flex-1 py-3 px-4 min-h-[44px] rounded-xl bg-gradient-to-r from-sky-500 to-indigo-500 hover:from-sky-600 hover:to-indigo-600 text-white text-xs font-bold transition flex items-center justify-center";
      } else {
        stateBadge.className = "px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5";
        stateText.innerText = "Eating Window Open";
        toggleBtn.innerText = "Start Fast";
        toggleBtn.className = "flex-1 py-3 px-4 min-h-[44px] rounded-xl bg-gradient-to-r from-sky-500 to-indigo-500 hover:from-sky-600 hover:to-indigo-600 text-white text-xs font-bold transition flex items-center justify-center";
      }

      document.getElementById("fasting-target-display").innerText = (fastingData.target_hours || 16) + " Hours (" + (fastingData.fast_type || "16:8") + ")";
      updateFastingTimer();

      if (!fastingInterval) {
        fastingInterval = setInterval(() => {
          if (activeTab === "fasting" && document.visibilityState === "visible") {
            updateFastingTimer();
          }
        }, 1000);
      }
    }

    function updateFastingTimer() {
      if (!fastingData || !fastingData.start_time) {
        document.getElementById("fasting-timer-countdown").innerText = "00:00:00";
        return;
      }
      const startMs = new Date(fastingData.start_time).getTime();
      const elapsedSec = Math.max(0, Math.floor((Date.now() - startMs) / 1000));
      const targetSec = (fastingData.target_hours || 16) * 3600;
      const remSec = Math.max(0, targetSec - elapsedSec);

      const h = Math.floor(elapsedSec / 3600).toString().padStart(2, '0');
      const m = Math.floor((elapsedSec % 3600) / 60).toString().padStart(2, '0');
      const s = Math.floor(elapsedSec % 60).toString().padStart(2, '0');
      document.getElementById("fasting-timer-countdown").innerText = \`\${h}:\${m}:\${s}\`;

      const remH = Math.floor(remSec / 3600);
      const remM = Math.floor((remSec % 3600) / 60);
      document.getElementById("fasting-remaining-display").innerText = remSec === 0 ? "Goal reached! 🏆" : \`\${remH}h \${remM}m left\`;

      const pct = Math.min(100, Math.round((elapsedSec / targetSec) * 100));
      const circle = document.getElementById("fasting-gauge-circle");
      const circum = 2 * Math.PI * 50; // 314
      circle.style.strokeDashoffset = circum - (pct / 100) * circum;
      circle.style.stroke = pct >= 100 ? "#34D399" : "#14B8A6";
    }

    document.getElementById("btn-toggle-fast").onclick = async () => {
      if (fastingData?.is_active) {
        if (confirm("End your active fasting window?")) {
          await fetch("/api/fasting/end", { method: "POST" });
          showToast("Fast completed! 🏁", "success");
          loadFastingData();
        }
      } else {
        await fetch("/api/fasting/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ target_hours: 16.0, fast_type: "16:8" })
        });
        showToast("Fasting window started! ⏱️", "success");
        loadFastingData();
      }
    };

    document.querySelectorAll(".fasting-preset-btn").forEach(b => {
      b.onclick = async () => {
        const hours = parseFloat(b.dataset.hours);
        const type = b.dataset.type;
        await fetch("/api/fasting/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ target_hours: hours, fast_type: type })
        });
        showToast("Set fast to " + type + " (" + hours + "h)! ⏳", "success");
        loadFastingData();
      };
    });

    document.getElementById("btn-edit-fast-time").onclick = async () => {
      const cur = fastingData?.start_time ? new Date(fastingData.start_time).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16);
      const val = prompt("Enter fast start datetime (YYYY-MM-DDTHH:MM):", cur);
      if (val) {
        await fetch("/api/fasting/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            start_time: new Date(val).toISOString(),
            target_hours: fastingData?.target_hours || 16.0
          })
        });
        showToast("Fast start time updated! ⏱️", "success");
        loadFastingData();
      }
    };

    // Weight Progression Handling
    async function loadWeightData() {
      try {
        const res = await fetch("/api/weight");
        weightData = await res.json();
        renderWeight();
      } catch (e) {
        console.error(e);
      }
    }

    function renderWeight() {
      if (!weightData) return;
      const stats = weightData.stats || {};
      const logs = weightData.logs || [];

      document.getElementById("weight-stat-latest").innerText = stats.latest_weight ?? "--";
      document.getElementById("weight-stat-change").innerText = (stats.net_change > 0 ? "+" : "") + stats.net_change;
      document.getElementById("weight-stat-target").innerText = stats.target_weight ?? "--";

      renderWeightChart(logs);
      renderWeightHistory(logs);
    }

    function renderWeightChart(logs) {
      const svg = document.getElementById("weight-chart-svg");
      svg.innerHTML = "";
      if (logs.length < 2) {
        svg.innerHTML = '<text x="200" y="75" fill="#64748B" font-size="12" text-anchor="middle">Log at least 2 weigh-ins to see progression curve.</text>';
        return;
      }

      const weights = logs.map(l => l.weight_kg);
      const minW = Math.min(...weights) - 0.5;
      const maxW = Math.max(...weights) + 0.5;
      const rangeW = maxW - minW || 1;

      const width = 400;
      const height = 150;
      const padding = 20;

      const points = logs.map((l, i) => {
        const x = padding + (i / (logs.length - 1)) * (width - 2 * padding);
        const y = height - padding - ((l.weight_kg - minW) / rangeW) * (height - 2 * padding);
        return { x, y, weight: l.weight_kg, date: l.date };
      });

      // Area under curve
      const areaPath = \`M \${points[0].x} \${height - padding} L \` + points.map(p => \`\${p.x} \${p.y}\`).join(" L ") + \` L \${points[points.length-1].x} \${height - padding} Z\`;
      const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
      defs.innerHTML = \`
        <linearGradient id="weightGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#10B981" stop-opacity="0.3"/>
          <stop offset="100%" stop-color="#10B981" stop-opacity="0.0"/>
        </linearGradient>
      \`;
      svg.appendChild(defs);

      const area = document.createElementNS("http://www.w3.org/2000/svg", "path");
      area.setAttribute("d", areaPath);
      area.setAttribute("fill", "url(#weightGrad)");
      svg.appendChild(area);

      // Line
      const linePath = "M " + points.map(p => \`\${p.x} \${p.y}\`).join(" L ");
      const line = document.createElementNS("http://www.w3.org/2000/svg", "path");
      line.setAttribute("d", linePath);
      line.setAttribute("fill", "none");
      line.setAttribute("stroke", "#10B981");
      line.setAttribute("stroke-width", "3");
      line.setAttribute("stroke-linecap", "round");
      svg.appendChild(line);

      // Data Points
      points.forEach(p => {
        const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        dot.setAttribute("cx", p.x);
        dot.setAttribute("cy", p.y);
        dot.setAttribute("r", "4");
        dot.setAttribute("fill", "#090A0F");
        dot.setAttribute("stroke", "#10B981");
        dot.setAttribute("stroke-width", "2.5");
        
        const title = document.createElementNS("http://www.w3.org/2000/svg", "title");
        title.textContent = \`\${p.date}: \${p.weight} kg\`;
        dot.appendChild(title);
        svg.appendChild(dot);
      });
    }

    function renderWeightHistory(logs) {
      const list = document.getElementById("weight-history-list");
      list.innerHTML = "";
      if (logs.length === 0) {
        list.innerHTML = '<p class="text-xs text-slate-500">No weight records logged yet.</p>';
        return;
      }
      [...logs].reverse().forEach(w => {
        const row = document.createElement("div");
        row.className = "surface-elevated p-3 rounded-xl flex items-center justify-between";
        row.innerHTML = \`
          <div>
            <span class="text-xs font-bold text-white">\${w.date}</span>
            \${w.notes ? '<p class="text-[10px] text-slate-400">' + w.notes + '</p>' : ''}
          </div>
          <div class="flex items-center gap-3">
            <span class="text-sm font-black text-white tabular-num">\${w.weight_kg} kg</span>
            <button class="btn-del-weight min-w-[44px] min-h-[44px] flex items-center justify-center p-2 text-slate-500 hover:text-rose-400 transition" data-id="\${w.id}" aria-label="Delete weight record from \${w.date}">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
            </button>
          </div>
        \`;
        list.appendChild(row);
      });

      document.querySelectorAll(".btn-del-weight").forEach(b => {
        b.onclick = async () => {
          if (confirm("Delete weight record?")) {
            await fetch("/api/weight/" + b.dataset.id, { method: "DELETE" });
            showToast("Weight record deleted", "info");
            loadWeightData();
          }
        };
      });
    }

    // Weight Modal
    const weightModal = document.getElementById("weight-modal");
    document.getElementById("btn-open-weight-modal").onclick = () => {
      document.getElementById("input-weight-date").value = currentDate;
      weightModal.classList.remove("hidden");
    };
    document.getElementById("btn-close-weight-modal").onclick = () => weightModal.classList.add("hidden");
    document.getElementById("btn-cancel-weight-modal").onclick = () => weightModal.classList.add("hidden");

    document.getElementById("form-weight").onsubmit = async (e) => {
      e.preventDefault();
      const payload = {
        weight_kg: parseFloat(document.getElementById("input-weight-kg").value),
        date: document.getElementById("input-weight-date").value,
        notes: document.getElementById("input-weight-notes").value
      };
      await fetch("/api/weight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      weightModal.classList.add("hidden");
      showToast("Logged " + payload.weight_kg + " kg! ⚖️", "success");
      loadWeightData();
    };

    // Meal Modal
    const mealModal = document.getElementById("meal-modal");
    document.getElementById("btn-open-meal-modal").onclick = () => {
      document.getElementById("form-meal").reset();
      document.getElementById("meal-edit-id").value = "";
      document.getElementById("meal-modal-title").innerText = "Log Meal";
      mealModal.classList.remove("hidden");
    };
    document.getElementById("btn-close-meal-modal").onclick = () => mealModal.classList.add("hidden");
    document.getElementById("btn-cancel-meal-modal").onclick = () => mealModal.classList.add("hidden");

    document.getElementById("form-meal").onsubmit = async (e) => {
      e.preventDefault();
      const payload = {
        food_name: document.getElementById("meal-food-name").value,
        amount: parseFloat(document.getElementById("meal-amount").value),
        unit: document.getElementById("meal-unit").value,
        meal_type: document.getElementById("meal-type").value,
        calories: parseInt(document.getElementById("meal-calories").value),
        protein_g: parseFloat(document.getElementById("meal-protein").value) || 0,
        carbs_g: parseFloat(document.getElementById("meal-carbs").value) || 0,
        fat_g: parseFloat(document.getElementById("meal-fat").value) || 0,
        notes: document.getElementById("meal-notes").value,
        calorie_source: "user",
        logged_at: new Date().toISOString(),
        local_date: currentDate
      };
      await fetch("/api/meals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      mealModal.classList.add("hidden");
      showToast("Meal logged! 🥗", "success");
      loadData();
    };

    // Settings Modal
    const settingsModal = document.getElementById("settings-modal");
    document.getElementById("btn-open-settings").onclick = async () => {
      const res = await fetch("/api/settings");
      const s = await res.json();
      document.getElementById("setting-target").value = s.daily_calorie_target || 2000;
      document.getElementById("setting-protein").value = s.target_protein_g || 140;
      document.getElementById("setting-carbs").value = s.target_carbs_g || 200;
      document.getElementById("setting-fat").value = s.target_fat_g || 65;
      document.getElementById("setting-weight-goal").value = s.target_weight_kg || "";
      document.getElementById("setting-fasting-target").value = s.fasting_target_hours || 16;
      document.getElementById("setting-tz").value = s.timezone || "UTC";
      settingsModal.classList.remove("hidden");
    };
    document.getElementById("btn-close-settings").onclick = () => settingsModal.classList.add("hidden");
    document.getElementById("btn-cancel-settings").onclick = () => settingsModal.classList.add("hidden");

    document.getElementById("form-settings").onsubmit = async (e) => {
      e.preventDefault();
      const payload = {
        daily_calorie_target: parseInt(document.getElementById("setting-target").value) || null,
        target_protein_g: parseFloat(document.getElementById("setting-protein").value) || null,
        target_carbs_g: parseFloat(document.getElementById("setting-carbs").value) || null,
        target_fat_g: parseFloat(document.getElementById("setting-fat").value) || null,
        target_weight_kg: parseFloat(document.getElementById("setting-weight-goal").value) || null,
        fasting_target_hours: parseFloat(document.getElementById("setting-fasting-target").value) || 16.0,
        timezone: document.getElementById("setting-tz").value.trim() || "UTC",
      };
      await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      settingsModal.classList.add("hidden");
      showToast("Targets & goals updated! 🎯", "success");
      loadData();
    };

    // Sync button
    document.getElementById("btn-sync-pill").onclick = async () => {
      showToast("Syncing with Hermes Agent...", "info");
      await loadData();
      showToast("Data up to date! ⚡", "success");
    };

    // Toast
    function showToast(message, type = "success") {
      const container = document.getElementById("toast-container");
      const toast = document.createElement("div");
      toast.className = "pointer-events-auto px-3.5 py-2 rounded-xl surface-card text-xs font-semibold shadow-xl flex items-center gap-2 animate-pop " +
        (type === "error" ? "border-rose-500/50 text-rose-300" : (type === "info" ? "border-sky-500/50 text-sky-300" : "border-emerald-500/50 text-emerald-300"));
      toast.innerHTML = (type === "error" ? "⚠️" : (type === "info" ? "ℹ️" : "✨")) + " " + message;
      container.appendChild(toast);
      setTimeout(() => {
        toast.style.opacity = "0";
        toast.style.transform = "translateY(8px)";
        toast.style.transition = "all 0.3s ease";
        setTimeout(() => toast.remove(), 300);
      }, 2500);
    }

    // Escape key closes modals
    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        document.querySelectorAll('[role="dialog"]:not(.hidden)').forEach(modal => {
          modal.classList.add("hidden");
        });
      }
    });

    // Init
    updateDateLabel();
    loadData();
  </script>
</body>
</html>
`;
