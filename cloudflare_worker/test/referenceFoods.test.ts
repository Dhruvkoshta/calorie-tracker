import test from "node:test";
import assert from "node:assert/strict";
import {
  lookupReferenceFood,
  findReferenceFood,
  estimateNutritionFromText,
  REFERENCE_FOODS,
} from "../src/referenceFoods.ts";

test("lookupReferenceFood finds exact matches", () => {
  const egg = lookupReferenceFood("egg", 1);
  assert.ok(egg);
  assert.equal(egg.calories, 78);
  assert.equal(egg.protein_g, 6.3);
  assert.equal(egg.carbs_g, 0.6);
  assert.equal(egg.fat_g, 5.3);

  const banana = lookupReferenceFood("banana", 2);
  assert.ok(banana);
  assert.equal(banana.calories, 210);
  assert.equal(banana.protein_g, 2.6);
});

test("lookupReferenceFood matches aliases", () => {
  const boiledEgg = lookupReferenceFood("boiled egg", 1);
  assert.ok(boiledEgg);
  assert.equal(boiledEgg.calories, 78);

  const chicken = lookupReferenceFood("grilled chicken breast", 2);
  assert.ok(chicken);
  assert.equal(chicken.calories, 330);
  assert.equal(chicken.protein_g, 62.0);
});

test("lookupReferenceFood handles case-insensitivity and whitespace", () => {
  const salmon = lookupReferenceFood("  SALMON  ", 1);
  assert.ok(salmon);
  assert.equal(salmon.calories, 208);
  assert.equal(salmon.protein_g, 20.0);
});

test("lookupReferenceFood returns null for unknown foods", () => {
  const unknown = lookupReferenceFood("dragonfruit smoothie bowl special", 1);
  assert.equal(unknown, null);
});

test("all REFERENCE_FOODS entries have valid macros and kcal", () => {
  for (const [name, item] of Object.entries(REFERENCE_FOODS)) {
    assert.ok(item.kcal > 0, `${name} must have positive kcal`);
    assert.ok(item.protein_g >= 0, `${name} protein must be non-negative`);
    assert.ok(item.carbs_g >= 0, `${name} carbs must be non-negative`);
    assert.ok(item.fat_g >= 0, `${name} fat must be non-negative`);
    assert.ok(Array.isArray(item.aliases), `${name} aliases must be an array`);
  }
});

test("lookupReferenceFood handles common unit scaling for grams vs 100g", () => {
  // 100g chicken breast (base: 165 kcal, 31g protein, 0g carb, 3.6g fat per 100g)
  const chicken100g = lookupReferenceFood("chicken breast", 100, "g");
  assert.ok(chicken100g);
  assert.equal(chicken100g.calories, 165);
  assert.equal(chicken100g.protein_g, 31.0);

  // 200g chicken breast -> scale 2.0
  const chicken200g = lookupReferenceFood("chicken breast", 200, "g");
  assert.ok(chicken200g);
  assert.equal(chicken200g.calories, 330);
  assert.equal(chicken200g.protein_g, 62.0);

  // 50g chicken breast -> scale 0.5
  const chicken50g = lookupReferenceFood("chicken breast", 50, "g");
  assert.ok(chicken50g);
  assert.equal(chicken50g.calories, 83);
  assert.equal(chicken50g.protein_g, 15.5);

  // 0.2 kg chicken breast -> scale 2.0
  const chickenKg = lookupReferenceFood("chicken breast", 0.2, "kg");
  assert.ok(chickenKg);
  assert.equal(chickenKg.calories, 330);

  // Salmon in grams (base: 208 kcal per 100g)
  const salmon150g = lookupReferenceFood("salmon", 150, "g");
  assert.ok(salmon150g);
  assert.equal(salmon150g.calories, 312);
  assert.equal(salmon150g.protein_g, 30.0);
});

test("lookupReferenceFood handles common unit scaling for slices", () => {
  // Slice of bread (79 kcal, 2.7g p, 15g c, 1.0g f per slice)
  const bread1Slice = lookupReferenceFood("bread", 1, "slice");
  assert.ok(bread1Slice);
  assert.equal(bread1Slice.calories, 79);

  const bread2Slices = lookupReferenceFood("slice of bread", 2, "slices");
  assert.ok(bread2Slices);
  assert.equal(bread2Slices.calories, 158);
  assert.equal(bread2Slices.protein_g, 5.4);

  // Bread in grams (30g per slice) -> 60g = 2 slices
  const bread60g = lookupReferenceFood("bread", 60, "g");
  assert.ok(bread60g);
  assert.equal(bread60g.calories, 158);

  // Cheddar cheese slices (113 kcal per slice)
  const cheese2Slices = lookupReferenceFood("cheddar cheese", 2, "slices");
  assert.ok(cheese2Slices);
  assert.equal(cheese2Slices.calories, 226);
  assert.equal(cheese2Slices.protein_g, 14.0);
});

test("lookupReferenceFood handles volume and spoon scaling", () => {
  // Peanut butter (94 kcal per tbsp)
  const pb2Tbsp = lookupReferenceFood("peanut butter", 2, "tbsp");
  assert.ok(pb2Tbsp);
  assert.equal(pb2Tbsp.calories, 188);

  // Rolled oats (307 kcal per cup)
  const oatsCup = lookupReferenceFood("oats", 1, "cup");
  assert.ok(oatsCup);
  assert.equal(oatsCup.calories, 307);
});

test("findReferenceFood matches foods from text queries", () => {
  const chicken = findReferenceFood("200g Grilled Chicken Breast");
  assert.ok(chicken);
  assert.equal(chicken.key, "chicken breast");

  const egg = findReferenceFood("2 boiled eggs");
  assert.ok(egg);
  assert.equal(egg.key, "egg");

  const rice = findReferenceFood("Cooked Rice Bowl");
  assert.ok(rice);
  assert.equal(rice.key, "white rice");

  const unknown = findReferenceFood("Dragonfruit Acai Bowl");
  assert.equal(unknown, null);
});

test("estimateNutritionFromText looks up REFERENCE_FOODS first and matches accurately", () => {
  // Chicken default portion
  const chicken = estimateNutritionFromText("Grilled Chicken Breast");
  assert.equal(chicken.food_name, "Grilled Chicken Breast");
  assert.equal(chicken.calories, 330);
  assert.equal(chicken.protein_g, 62.0);
  assert.equal(chicken.carbs_g, 0.0);
  assert.equal(chicken.fat_g, 7.2);
  assert.equal(chicken.confidence, 0.90);

  // Chicken with explicit amount scaling
  const chicken100 = estimateNutritionFromText("100g chicken breast");
  assert.equal(chicken100.calories, 165);
  assert.equal(chicken100.protein_g, 31.0);
  assert.equal(chicken100.amount, 100);
  assert.equal(chicken100.unit, "g");

  // Eggs with quantity
  const eggs = estimateNutritionFromText("2 boiled eggs");
  assert.equal(eggs.calories, 156);
  assert.equal(eggs.protein_g, 12.6);
  assert.equal(eggs.amount, 2);

  // Banana single fruit
  const banana = estimateNutritionFromText("Banana");
  assert.equal(banana.calories, 105);
  assert.equal(banana.protein_g, 1.3);

  // Bread with slices
  const bread = estimateNutritionFromText("2 slices of bread");
  assert.equal(bread.calories, 158);
  assert.equal(bread.protein_g, 5.4);
  assert.equal(bread.amount, 2);

  // Unknown food falls back to generic balanced meal
  const fallback = estimateNutritionFromText("Unknown Exotic Delight");
  assert.equal(fallback.calories, 380);
  assert.equal(fallback.protein_g, 24.0);
  assert.equal(fallback.carbs_g, 42.0);
  assert.equal(fallback.fat_g, 14.0);
  assert.equal(fallback.confidence, 0.75);
});
