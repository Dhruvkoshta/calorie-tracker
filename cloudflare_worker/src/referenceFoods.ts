import type { FoodLookupResult, ReferenceFoodItem } from "./types";

export const REFERENCE_FOODS: Record<string, ReferenceFoodItem> = {
  egg: {
    unit: "large",
    kcal: 78,
    protein_g: 6.3,
    carbs_g: 0.6,
    fat_g: 5.3,
    aliases: ["eggs", "boiled egg", "fried egg"],
  },
  banana: {
    unit: "medium",
    kcal: 105,
    protein_g: 1.3,
    carbs_g: 27.0,
    fat_g: 0.3,
    aliases: ["bananas"],
  },
  apple: {
    unit: "medium",
    kcal: 95,
    protein_g: 0.5,
    carbs_g: 25.0,
    fat_g: 0.3,
    aliases: ["apples"],
  },
  orange: {
    unit: "medium",
    kcal: 62,
    protein_g: 1.2,
    carbs_g: 15.4,
    fat_g: 0.2,
    aliases: ["oranges"],
  },
  "chicken breast": {
    unit: "100g",
    kcal: 165,
    protein_g: 31.0,
    carbs_g: 0.0,
    fat_g: 3.6,
    aliases: ["grilled chicken breast", "chicken"],
  },
  "white rice": {
    unit: "cup",
    kcal: 205,
    protein_g: 4.2,
    carbs_g: 44.5,
    fat_g: 0.4,
    aliases: ["rice", "cooked white rice", "steamed rice"],
  },
  "brown rice": {
    unit: "cup",
    kcal: 218,
    protein_g: 4.5,
    carbs_g: 45.8,
    fat_g: 1.6,
    aliases: ["cooked brown rice"],
  },
  oats: {
    unit: "cup",
    kcal: 307,
    protein_g: 10.7,
    carbs_g: 54.8,
    fat_g: 5.3,
    aliases: ["oatmeal", "rolled oats"],
  },
  milk: {
    unit: "cup",
    kcal: 122,
    protein_g: 8.0,
    carbs_g: 12.0,
    fat_g: 4.8,
    aliases: ["whole milk", "glass of milk"],
  },
  almonds: {
    unit: "handful",
    kcal: 164,
    protein_g: 6.0,
    carbs_g: 6.1,
    fat_g: 14.2,
    aliases: ["almond", "28g almonds"],
  },
  "peanut butter": {
    unit: "tbsp",
    kcal: 94,
    protein_g: 4.0,
    carbs_g: 3.5,
    fat_g: 8.0,
    aliases: ["peanut-butter"],
  },
  "slice of bread": {
    unit: "slice",
    kcal: 79,
    protein_g: 2.7,
    carbs_g: 15.0,
    fat_g: 1.0,
    aliases: ["bread", "toast", "white bread"],
  },
  "greek yogurt": {
    unit: "cup",
    kcal: 130,
    protein_g: 17.0,
    carbs_g: 6.0,
    fat_g: 4.0,
    aliases: ["yogurt"],
  },
  salmon: {
    unit: "100g",
    kcal: 208,
    protein_g: 20.0,
    carbs_g: 0.0,
    fat_g: 13.0,
    aliases: ["grilled salmon", "baked salmon"],
  },
  avocado: {
    unit: "medium",
    kcal: 240,
    protein_g: 3.0,
    carbs_g: 12.8,
    fat_g: 22.0,
    aliases: ["whole avocado"],
  },
  potato: {
    unit: "medium",
    kcal: 160,
    protein_g: 4.3,
    carbs_g: 36.6,
    fat_g: 0.2,
    aliases: ["baked potato", "boiled potato"],
  },
  "olive oil": {
    unit: "tbsp",
    kcal: 119,
    protein_g: 0.0,
    carbs_g: 0.0,
    fat_g: 13.5,
    aliases: ["oil"],
  },
  "cheddar cheese": {
    unit: "slice",
    kcal: 113,
    protein_g: 7.0,
    carbs_g: 0.4,
    fat_g: 9.3,
    aliases: ["cheese"],
  },
};

/**
 * Look up calorie and macronutrient breakdown for a food item and portion.
 */
export function lookupReferenceFood(
  foodName: string,
  amount: number,
  _unit: string = "serving"
): FoodLookupResult | null {
  const foodClean = foodName.trim().toLowerCase();
  let matched: ReferenceFoodItem | null = null;

  for (const [name, data] of Object.entries(REFERENCE_FOODS)) {
    if (foodClean === name || data.aliases.includes(foodClean)) {
      matched = data;
      break;
    }
  }

  if (!matched) {
    return null;
  }

  const mult = Math.max(0.1, amount);
  return {
    calories: Math.round(matched.kcal * mult),
    protein_g: Number((matched.protein_g * mult).toFixed(1)),
    carbs_g: Number((matched.carbs_g * mult).toFixed(1)),
    fat_g: Number((matched.fat_g * mult).toFixed(1)),
  };
}
