import assert from "node:assert/strict";
import test from "node:test";
import { normalizeProduct } from "./catalog.js";

test("normalizes catalog rows into storefront product options", () => {
  const product = normalizeProduct({
    id: "product-id",
    slug: "race",
    division: "Race & Event Numbers",
    name: "Race Numbers",
    description: "Variable-data event numbers.",
    base_price: "18.00",
    volume_discount_threshold: 100,
    discount_percent: 10,
    config: {
      sizes: ["A5", "A4", "A3"],
      materials: ["Tyvek", "Synthetic paper"],
      base_size: { width: 148, height: 210 },
      dimensions: { min: 80, max: 600 },
      material_factors: { Tyvek: 1, "Synthetic paper": 1.2 },
      volume_discounts: [{ minimum: 100, percent: 10 }, { minimum: 500, percent: 18 }],
    },
  });

  assert.equal(product.id, "race");
  assert.equal(product.databaseId, "product-id");
  assert.deepEqual(product.sizes[1], { label: "A4", width: 210, height: 297 });
  assert.deepEqual(product.materials[1], { label: "Synthetic paper", multiplier: 1.2 });
  assert.equal(product.volumeDiscounts[1].percent, 18);
});

test("rejects products with a material missing its server price factor", () => {
  assert.throws(() => normalizeProduct({
    id: "product-id",
    slug: "broken",
    division: "Other",
    name: "Broken product",
    description: "",
    base_price: 10,
    config: {
      sizes: [{ label: "Standard", width: 100, height: 100 }],
      materials: ["Unpriced stock"],
      base_size: { width: 100, height: 100 },
      dimensions: { min: 10, max: 1000 },
      material_factors: {},
    },
  }), /price factor for Unpriced stock must be a positive number/i);
});
