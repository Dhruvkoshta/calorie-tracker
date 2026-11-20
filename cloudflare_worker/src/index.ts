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
export type { Env };
export { estimateNutritionFromText };
import { INDEX_HTML } from "./dashboardHtml";

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
    await db.prepare(`
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
      )
    `).run();
    await db.prepare(`
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
      )
    `).run();
    await db.prepare(`
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
      )
    `).run();
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS weight_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL UNIQUE,
        weight_kg REAL NOT NULL,
        notes TEXT,
        created_at TEXT NOT NULL
      )
    `).run();
    await db.prepare(`
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
    `).run();
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
          stage = { name: "Cellular Autophagy", desc: "Cellular cleansing & recycling of damaged proteins", color: "purple", range: "16 - 18h" };
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
            stage = { name: "Cellular Autophagy", desc: "Autophagy & repair in progress", color: "purple", range: "16 - 18h" };
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

