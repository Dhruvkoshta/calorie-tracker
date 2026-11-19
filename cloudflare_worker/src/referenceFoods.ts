import type { FoodLookupResult, ReferenceFoodItem } from "./types";

export const REFERENCE_FOODS: Record<string, ReferenceFoodItem> = {
  egg: {
    unit: "large",
    kcal: 78,
    protein_g: 6.3,
    carbs_g: 0.6,
    fat_g: 5.3,
    aliases: ["eggs", "boiled egg", "fried egg", "omelette", "scrambled egg", "scrambled eggs"],
    displayName: "Eggs / Omelette",
    defaultAmount: 2,
    defaultUnit: "large",
    notes: "Whole eggs with complete amino acid profile.",
  },
  banana: {
    unit: "medium",
    kcal: 105,
    protein_g: 1.3,
    carbs_g: 27.0,
    fat_g: 0.3,
    aliases: ["bananas"],
    displayName: "Banana",
    defaultAmount: 1,
    defaultUnit: "medium",
    notes: "Potassium and energy-rich fruit.",
  },
  apple: {
    unit: "medium",
    kcal: 95,
    protein_g: 0.5,
    carbs_g: 25.0,
    fat_g: 0.3,
    aliases: ["apples"],
    displayName: "Fresh Apple",
    defaultAmount: 1,
    defaultUnit: "medium",
    notes: "Crisp apple rich in dietary fiber and vitamin C.",
  },
  orange: {
    unit: "medium",
    kcal: 62,
    protein_g: 1.2,
    carbs_g: 15.4,
    fat_g: 0.2,
    aliases: ["oranges"],
    displayName: "Orange",
    defaultAmount: 1,
    defaultUnit: "medium",
    notes: "Citrus fruit high in vitamin C.",
  },
  "chicken breast": {
    unit: "100g",
    kcal: 165,
    protein_g: 31.0,
    carbs_g: 0.0,
    fat_g: 3.6,
    aliases: [
      "grilled chicken breast",
      "chicken",
      "chicken breast fillet",
      "poultry",
      "grilled chicken",
      "chicken breast",
      "breast",
    ],
    displayName: "Grilled Chicken Breast",
    defaultAmount: 200,
    defaultUnit: "g",
    notes: "Lean poultry source high in protein.",
  },
  "white rice": {
    unit: "cup",
    kcal: 205,
    protein_g: 4.2,
    carbs_g: 44.5,
    fat_g: 0.4,
    aliases: ["rice", "cooked white rice", "steamed rice", "cooked rice", "rice bowl", "cooked rice bowl"],
    displayName: "Cooked Rice Bowl",
    defaultAmount: 1,
    defaultUnit: "cup",
    notes: "Complex carbohydrates energy source.",
  },
  "brown rice": {
    unit: "cup",
    kcal: 218,
    protein_g: 4.5,
    carbs_g: 45.8,
    fat_g: 1.6,
    aliases: ["cooked brown rice", "steamed brown rice"],
    displayName: "Brown Rice",
    defaultAmount: 1,
    defaultUnit: "cup",
    notes: "Whole grain brown rice with high dietary fiber.",
  },
  oats: {
    unit: "cup",
    kcal: 307,
    protein_g: 10.7,
    carbs_g: 54.8,
    fat_g: 5.3,
    aliases: ["oatmeal", "rolled oats", "oat", "porridge", "rolled oatmeal"],
    displayName: "Rolled Oatmeal",
    defaultAmount: 1,
    defaultUnit: "cup",
    notes: "High fiber beta-glucan oats.",
  },
  milk: {
    unit: "cup",
    kcal: 122,
    protein_g: 8.0,
    carbs_g: 12.0,
    fat_g: 4.8,
    aliases: ["whole milk", "glass of milk"],
    displayName: "Whole Milk",
    defaultAmount: 1,
    defaultUnit: "cup",
    notes: "Calcium and protein-rich dairy milk.",
  },
  almonds: {
    unit: "handful",
    kcal: 164,
    protein_g: 6.0,
    carbs_g: 6.1,
    fat_g: 14.2,
    aliases: ["almond", "28g almonds"],
    displayName: "Almonds",
    defaultAmount: 1,
    defaultUnit: "handful",
    notes: "Heart-healthy fats, vitamin E, and magnesium.",
  },
  "peanut butter": {
    unit: "tbsp",
    kcal: 94,
    protein_g: 4.0,
    carbs_g: 3.5,
    fat_g: 8.0,
    aliases: ["peanut-butter"],
    displayName: "Peanut Butter",
    defaultAmount: 1,
    defaultUnit: "tbsp",
    notes: "Nutrient-dense spread with protein and healthy fats.",
  },
  "slice of bread": {
    unit: "slice",
    kcal: 79,
    protein_g: 2.7,
    carbs_g: 15.0,
    fat_g: 1.0,
    aliases: ["bread", "toast", "white bread", "wheat bread", "slice bread"],
    displayName: "Bread / Toast",
    defaultAmount: 1,
    defaultUnit: "slice",
    notes: "Sliced bread carbohydrate energy source.",
  },
  "greek yogurt": {
    unit: "cup",
    kcal: 130,
    protein_g: 17.0,
    carbs_g: 6.0,
    fat_g: 4.0,
    aliases: ["yogurt", "curd"],
    displayName: "Greek Yogurt",
    defaultAmount: 1,
    defaultUnit: "cup",
    notes: "Probiotic and high-protein strained yogurt.",
  },
  salmon: {
    unit: "100g",
    kcal: 208,
    protein_g: 20.0,
    carbs_g: 0.0,
    fat_g: 13.0,
    aliases: ["grilled salmon", "baked salmon", "salmon fillet", "fish", "grilled salmon fillet"],
    displayName: "Grilled Salmon Fillet",
    defaultAmount: 150,
    defaultUnit: "g",
    notes: "Rich in Omega-3 fatty acids.",
  },
  avocado: {
    unit: "medium",
    kcal: 240,
    protein_g: 3.0,
    carbs_g: 12.8,
    fat_g: 22.0,
    aliases: ["whole avocado"],
    displayName: "Avocado",
    defaultAmount: 1,
    defaultUnit: "medium",
    notes: "Monounsaturated fats and potassium.",
  },
  potato: {
    unit: "medium",
    kcal: 160,
    protein_g: 4.3,
    carbs_g: 36.6,
    fat_g: 0.2,
    aliases: ["baked potato", "boiled potato"],
    displayName: "Baked Potato",
    defaultAmount: 1,
    defaultUnit: "medium",
    notes: "Starchy complex carbohydrate tuber.",
  },
  "olive oil": {
    unit: "tbsp",
    kcal: 119,
    protein_g: 0.0,
    carbs_g: 0.0,
    fat_g: 13.5,
    aliases: ["oil"],
    displayName: "Olive Oil",
    defaultAmount: 1,
    defaultUnit: "tbsp",
    notes: "Extra virgin olive oil rich in oleic acid.",
  },
  "cheddar cheese": {
    unit: "slice",
    kcal: 113,
    protein_g: 7.0,
    carbs_g: 0.4,
    fat_g: 9.3,
    aliases: ["cheese"],
    displayName: "Cheddar Cheese",
    defaultAmount: 1,
    defaultUnit: "slice",
    notes: "Aged dairy cheese with calcium and protein.",
  },
  coffee: {
    unit: "cup",
    kcal: 97,
    protein_g: 1.7,
    carbs_g: 20.5,
    fat_g: 1.0,
    aliases: ["brewed coffee", "latte", "cappuccino", "coffee with milk"],
    displayName: "Coffee",
    defaultAmount: 1,
    defaultUnit: "cup",
    notes: "Brewed coffee with milk and sugar.",
  },
  paneer: {
    unit: "100g",
    kcal: 265,
    protein_g: 18.3,
    carbs_g: 3.5,
    fat_g: 20.0,
    aliases: ["paneer dish", "cottage cheese"],
    displayName: "Paneer Dish",
    defaultAmount: 150,
    defaultUnit: "g",
    notes: "Fresh cottage cheese, rich in protein and healthy fats.",
  },
  salad: {
    unit: "bowl",
    kcal: 160,
    protein_g: 5.0,
    carbs_g: 12.0,
    fat_g: 10.0,
    aliases: ["garden salad", "greens salad", "garden greens salad", "mixed salad"],
    displayName: "Garden Greens Salad",
    defaultAmount: 1,
    defaultUnit: "bowl",
    notes: "Fresh vegetable salad with dressing.",
  },
  "protein shake": {
    unit: "glass",
    kcal: 280,
    protein_g: 32.0,
    carbs_g: 25.0,
    fat_g: 4.0,
    aliases: ["smoothie", "protein smoothie", "shake", "protein shake / smoothie"],
    displayName: "Protein Shake / Smoothie",
    defaultAmount: 1,
    defaultUnit: "glass",
    notes: "High protein nutrient shake.",
  },
};

/**
 * Computes scaling multiplier based on target portion amount and unit
 * against reference food unit definition.
 */
export function computeUnitMultiplier(
  foodKey: string,
  matched: ReferenceFoodItem,
  amount: number,
  unit: string = "serving"
): number {
  if (isNaN(amount) || amount <= 0) {
    return 0;
  }

  const u = (unit || "serving").trim().toLowerCase();
  const refU = matched.unit.trim().toLowerCase();

  // 1. Direct unit match
  if (u === refU) {
    return amount;
  }

  // 2. Generic serving / portion
  if (
    u === "serving" ||
    u === "servings" ||
    u === "portion" ||
    u === "portions" ||
    u === ""
  ) {
    return amount;
  }

  // 3. Unit normalizations
  const isGramUnit = u === "g" || u === "gram" || u === "grams";
  const isKgUnit = u === "kg" || u === "kgs" || u === "kilogram" || u === "kilograms";
  const is100gUnit = u === "100g" || u === "100 g" || u === "100gram" || u === "100 grams";
  const isOzUnit = u === "oz" || u === "ounce" || u === "ounces";
  const isSliceUnit = u === "slice" || u === "slices";
  const isCupUnit = u === "cup" || u === "cups" || u === "bowl" || u === "bowls";
  const isTbspUnit = u === "tbsp" || u === "tablespoon" || u === "tablespoons";
  const isTspUnit = u === "tsp" || u === "teaspoon" || u === "teaspoons";
  const isMlUnit = u === "ml" || u === "milliliter" || u === "milliliters";

  // 4. Reference food is per 100g (e.g. chicken breast, salmon, paneer)
  if (refU === "100g") {
    if (isGramUnit) {
      return amount / 100;
    }
    if (isKgUnit) {
      return (amount * 1000) / 100;
    }
    if (is100gUnit) {
      return amount;
    }
    if (isOzUnit) {
      return (amount * 28.3495) / 100;
    }
    if (isSliceUnit) {
      return (amount * 30) / 100;
    }
  }

  // 5. Reference food is per slice (e.g. bread, cheddar cheese)
  if (refU === "slice") {
    if (isSliceUnit || u === "piece" || u === "pieces") {
      return amount;
    }
    const gramsPerSlice =
      foodKey.includes("cheese") || matched.aliases.includes("cheese") ? 28 : 30;
    if (isGramUnit) {
      return amount / gramsPerSlice;
    }
    if (is100gUnit) {
      return (amount * 100) / gramsPerSlice;
    }
    if (isKgUnit) {
      return (amount * 1000) / gramsPerSlice;
    }
    if (isOzUnit) {
      return (amount * 28.3495) / gramsPerSlice;
    }
  }

  // 6. Reference food is per cup (e.g. rice, oats, milk, yogurt)
  if (refU === "cup") {
    if (isCupUnit) {
      return amount;
    }
    if (isTbspUnit) {
      return amount / 16;
    }
    if (isTspUnit) {
      return amount / 48;
    }
    if (isMlUnit) {
      return amount / 240;
    }
    if (isOzUnit || u === "fl oz") {
      return amount / 8;
    }
    if (isGramUnit) {
      const gramsPerCup = foodKey.includes("oat")
        ? 80
        : foodKey.includes("rice")
        ? 160
        : 240;
      return amount / gramsPerCup;
    }
    if (is100gUnit) {
      const gramsPerCup = foodKey.includes("oat")
        ? 80
        : foodKey.includes("rice")
        ? 160
        : 240;
      return (amount * 100) / gramsPerCup;
    }
  }

  // 7. Reference food is per tbsp (e.g. peanut butter, olive oil)
  if (refU === "tbsp") {
    if (isTbspUnit) {
      return amount;
    }
    if (isTspUnit) {
      return amount / 3;
    }
    if (isCupUnit) {
      return amount * 16;
    }
    if (isMlUnit) {
      return amount / 15;
    }
    if (isGramUnit) {
      return amount / 15;
    }
  }

  // 8. Piece / large / medium / bowl / glass / handful scaling
  if (
    refU === "large" ||
    refU === "medium" ||
    refU === "small" ||
    refU === "glass" ||
    refU === "bowl" ||
    refU === "handful"
  ) {
    if (
      u === refU ||
      u === "piece" ||
      u === "pieces" ||
      u === "whole" ||
      u === "item" ||
      u === "items"
    ) {
      return amount;
    }
    if (refU === "medium" && u === "large") return amount * 1.25;
    if (refU === "medium" && u === "small") return amount * 0.75;
    if (refU === "large" && u === "medium") return amount * 0.85;
    if (refU === "large" && u === "small") return amount * 0.7;
    if (refU === "handful") {
      if (isGramUnit) return amount / 28;
      if (is100gUnit) return (amount * 100) / 28;
      if (isOzUnit) return amount;
    }
    if (refU === "glass" && (u === "cup" || u === "cups" || isMlUnit)) {
      if (isMlUnit) return amount / 250;
      return amount;
    }
    if (refU === "bowl" && isCupUnit) {
      return amount;
    }
  }

  // Fallback: direct proportional scaling
  return Math.max(0.01, amount);
}

/**
 * Look up calorie and macronutrient breakdown for a food item and portion.
 * Handles common unit scaling (e.g. grams vs 100g, slices, cups, tablespoons).
 */
export function lookupReferenceFood(
  foodName: string,
  amount: number,
  unit: string = "serving"
): FoodLookupResult | null {
  const foodClean = foodName.trim().toLowerCase();
  let matchedKey: string | null = null;
  let matched: ReferenceFoodItem | null = null;

  for (const [name, data] of Object.entries(REFERENCE_FOODS)) {
    if (foodClean === name || data.aliases.includes(foodClean)) {
      matchedKey = name;
      matched = data;
      break;
    }
  }

  if (!matched || !matchedKey) {
    return null;
  }

  const mult = computeUnitMultiplier(matchedKey, matched, amount, unit);
  return {
    calories: Math.round(matched.kcal * mult),
    protein_g: Number((matched.protein_g * mult).toFixed(1)),
    carbs_g: Number((matched.carbs_g * mult).toFixed(1)),
    fat_g: Number((matched.fat_g * mult).toFixed(1)),
  };
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Find matching reference food from free-form text or description.
 * Checks exact match, aliases, and substring matches (prioritizing longest match).
 */
export function findReferenceFood(text: string): { key: string; item: ReferenceFoodItem } | null {
  const clean = text.trim().toLowerCase();
  if (!clean) return null;

  // 1. Direct exact or alias match
  for (const [name, data] of Object.entries(REFERENCE_FOODS)) {
    if (clean === name || data.aliases.includes(clean)) {
      return { key: name, item: data };
    }
  }

  // 2. Substring matching prioritizing longest matching keyword / alias
  const candidates: { key: string; item: ReferenceFoodItem; matchLen: number }[] = [];

  for (const [name, data] of Object.entries(REFERENCE_FOODS)) {
    const allTerms = [name, ...data.aliases];
    for (const term of allTerms) {
      const regex = new RegExp(`(?:^|[^a-z0-9])${escapeRegExp(term)}(?:$|[^a-z0-9])`, "i");
      if (regex.test(clean) || clean.includes(term)) {
        candidates.push({ key: name, item: data, matchLen: term.length });
        break;
      }
    }
  }

  if (candidates.length > 0) {
    candidates.sort((a, b) => b.matchLen - a.matchLen);
    return { key: candidates[0].key, item: candidates[0].item };
  }

  return null;
}

/**
 * Intelligent Heuristic Nutrition Estimator.
 * Looks up food in REFERENCE_FOODS first, falling back to a generic balanced meal.
 */
export function estimateNutritionFromText(text: string) {
  // 1. Look up food in REFERENCE_FOODS first
  const found = findReferenceFood(text);
  if (found) {
    const { key, item } = found;

    // Parse portion amount and unit if present in text
    let parsedAmount: number | null = null;
    let parsedUnit: string | null = null;

    // Matches e.g. "200g", "150 g", "2 slices", "1.5 tbsp", "1 cup", "2 large"
    const unitMatch = text.match(
      /(\d+(?:\.\d+)?)\s*(g|grams?|kg|slices?|cups?|bowls?|glasses?|large|medium|tbsp|tsp|pieces?|servings?|handfuls?)\b/i
    );
    if (unitMatch) {
      parsedAmount = parseFloat(unitMatch[1]);
      parsedUnit = unitMatch[2].toLowerCase();
    } else {
      // Matches leading number e.g. "2 eggs", "1 banana", "3 dates"
      const leadMatch = text.match(/^\s*(\d+(?:\.\d+)?)\s+/);
      if (leadMatch) {
        parsedAmount = parseFloat(leadMatch[1]);
      }
    }

    const amount = parsedAmount ?? item.defaultAmount ?? (item.unit === "100g" ? 150 : 1);
    const unit = parsedUnit ?? item.defaultUnit ?? item.unit;

    const lookup = lookupReferenceFood(key, amount, unit);
    if (lookup) {
      return {
        food_name: item.displayName || key.replace(/\b\w/g, (c) => c.toUpperCase()),
        amount,
        unit,
        calories: lookup.calories,
        protein_g: lookup.protein_g,
        carbs_g: lookup.carbs_g,
        fat_g: lookup.fat_g,
        notes: item.notes || `Estimated from reference database (${key}).`,
        confidence: 0.90,
      };
    }
  }

  // 2. Generic balanced meal fallback
  return {
    food_name: text.length > 3 ? text.trim().slice(0, 40) : "Mixed Meal",
    amount: 1,
    unit: "serving",
    calories: 380,
    protein_g: 24.0,
    carbs_g: 42.0,
    fat_g: 14.0,
    notes: "Estimated macro composition based on typical balanced meal proportions.",
    confidence: 0.75,
  };
}
