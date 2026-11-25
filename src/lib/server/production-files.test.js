import assert from "node:assert/strict";
import test from "node:test";
import sharp from "sharp";
import { generateProductionFiles } from "./production-files.js";

const order = {
  order_number: 321,
  configuration: { width_mm: 100, height_mm: 80, material: "Matte vinyl" },
  quantity: 3,
};
const design = {
  name: "Run club",
  content: { text: "RUN CLUB", color: "#16a34a", font_size: 20 },
};
const product = { name: "Labels" };

test("generates valid PDF, 300 DPI PNG, and quantity-row CSV outputs", async () => {
  const files = await generateProductionFiles(order, design, product);

  assert.deepEqual(files.map((file) => file.type), ["pdf", "png", "csv"]);
  assert.equal(files[0].buffer.subarray(0, 4).toString("ascii"), "%PDF");
  assert.equal(files[1].buffer.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
  assert.equal(files[2].buffer.toString("utf8").split("\r\n").length, 4);
  assert.match(files[2].buffer.toString("utf8"), /RUN CLUB/);

  const imageMetadata = await sharp(files[1].buffer).metadata();
  assert.equal(imageMetadata.width, 1252);
  assert.equal(imageMetadata.height, 1016);
  assert.equal(imageMetadata.density, 300);
});

test("includes uploaded raster artwork in generated output", async () => {
  const artwork = await sharp({
    create: { width: 20, height: 10, channels: 3, background: "#ff0000" },
  }).png().toBuffer();

  const files = await generateProductionFiles(order, design, product, artwork);
  assert.equal(files.length, 3);
  assert.ok(files[0].buffer.length > 3000);
  assert.ok(files[1].buffer.length > 1000);
});

test("uses the production specification snapshotted on the order", async () => {
  const configuredOrder = {
    ...order,
    configuration: {
      ...order.configuration,
      production_spec: { bleed_mm: 6, dpi: 150 },
    },
  };
  const files = await generateProductionFiles(configuredOrder, design, product);
  const imageMetadata = await sharp(files[1].buffer).metadata();

  assert.equal(imageMetadata.width, 662);
  assert.equal(imageMetadata.height, 544);
  assert.equal(imageMetadata.density, 150);
});

test("rejects unsafe production template values", async () => {
  const configuredOrder = {
    ...order,
    configuration: {
      ...order.configuration,
      production_spec: { bleed_mm: 30, dpi: 300 },
    },
  };

  await assert.rejects(
    () => generateProductionFiles(configuredOrder, design, product),
    /bleed must be between 0 and 25 mm/i,
  );
});

test("rejects CSV jobs above its configured maximum", async () => {
  await assert.rejects(
    () => generateProductionFiles({ ...order, quantity: 50001 }, design, product),
    /limited to 50,000 units/,
  );
});
