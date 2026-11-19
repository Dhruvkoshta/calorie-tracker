import test from "node:test";
import assert from "node:assert/strict";
import { lookupReferenceFood, REFERENCE_FOODS } from "../src/referenceFoods.ts";

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
