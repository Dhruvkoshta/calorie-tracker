/**
 * Shared Domain Types for Calorie & Macro Tracker (CalorieFlow)
 */

export interface Env {
  DB?: any;
  AI?: any;
}

export interface UserSettings {
  daily_calorie_target: number | null;
  timezone: string;
  target_protein_g: number | null;
  target_carbs_g: number | null;
  target_fat_g: number | null;
  target_weight_kg: number | null;
  fasting_target_hours: number | null;
  updated_at: string;
}

export interface Meal {
  id: number;
  meal_type: string;
  food_name: string;
  amount: number;
  unit: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  calorie_source: string;
  notes: string;
  logged_at: string;
  local_date: string;
  created_at: string;
  updated_at: string;
}

export interface Preset {
  id: number;
  name: string;
  food_name: string;
  amount: number;
  unit: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  calorie_source: string;
  meal_type: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface WeightLog {
  id: number;
  date: string;
  weight_kg: number;
  notes: string | null;
  created_at: string;
}

export interface FastingSession {
  id: number;
  start_time: string;
  target_hours: number;
  end_time: string | null;
  is_active: number | boolean;
  fast_type: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface MacroSplit {
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

export interface DailySummary {
  local_date: string;
  date: string;
  daily_target: number;
  target: number;
  consumed: number;
  remaining: number;
  over_budget: boolean;
  over_target: number;
  meal_count: number;
  consumed_macros: MacroSplit;
  target_macros: MacroSplit;
  remaining_macros: MacroSplit;
  meals: Meal[];
}

export interface ReferenceFoodItem {
  unit: string;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  aliases: string[];
}

export interface FoodLookupResult {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}
