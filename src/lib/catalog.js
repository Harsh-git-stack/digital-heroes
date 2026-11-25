const PRODUCT_TINTS = [
  "bg-lime-300",
  "bg-orange-300",
  "bg-cyan-300",
  "bg-fuchsia-300",
  "bg-yellow-300",
  "bg-violet-300",
];

const PAPER_SIZES = {
  A3: { width: 297, height: 420 },
  A4: { width: 210, height: 297 },
  A5: { width: 148, height: 210 },
};

function positiveNumber(value, label) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${label} must be a positive number.`);
  }
  return parsed;
}

function dimensionsFromSizeLabel(label, index, sizes, baseSize) {
  const paperSize = PAPER_SIZES[label.trim().toUpperCase()];
  if (paperSize) return paperSize;

  const pair = label.match(/(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)/i);
  if (pair) return { width: Number(pair[1]), height: Number(pair[2]) };

  const singleSize = label.match(/(\d+(?:\.\d+)?)\s*mm/i);
  if (singleSize) {
    const firstSize = String(sizes[0]).match(/(\d+(?:\.\d+)?)\s*mm/i);
    const ratio = firstSize ? Number(singleSize[1]) / Number(firstSize[1]) : 1;
    return { width: baseSize.width * ratio, height: baseSize.height * ratio };
  }

  if (index === 0) return baseSize;
  return baseSize;
}

export function normalizeProductConfig(rawConfig, row = {}) {
  if (!rawConfig || typeof rawConfig !== "object" || Array.isArray(rawConfig)) {
    throw new Error("Product configuration must be a JSON object.");
  }

  const minSize = positiveNumber(rawConfig.dimensions?.min, "Minimum dimension");
  const maxSize = positiveNumber(rawConfig.dimensions?.max, "Maximum dimension");
  if (minSize > maxSize) throw new Error("Minimum dimension cannot exceed maximum dimension.");

  const baseSize = {
    width: positiveNumber(rawConfig.base_size?.width, "Base width"),
    height: positiveNumber(rawConfig.base_size?.height, "Base height"),
  };
  if (!Array.isArray(rawConfig.sizes) || rawConfig.sizes.length === 0) {
    throw new Error("Product configuration needs at least one size preset.");
  }
  if (!Array.isArray(rawConfig.materials) || rawConfig.materials.length === 0) {
    throw new Error("Product configuration needs at least one material.");
  }

  const sizes = rawConfig.sizes.map((size, index) => {
    const label = typeof size === "string" ? size.trim() : String(size?.label ?? "").trim();
    if (!label) throw new Error("Every size preset needs a label.");

    const dimensions = typeof size === "object" && size !== null
      ? { width: Number(size.width), height: Number(size.height) }
      : dimensionsFromSizeLabel(label, index, rawConfig.sizes, baseSize);

    return {
      label,
      width: positiveNumber(dimensions.width, `Width for ${label}`),
      height: positiveNumber(dimensions.height, `Height for ${label}`),
    };
  });

  const materials = rawConfig.materials.map((material) => {
    const label = typeof material === "string" ? material.trim() : String(material?.label ?? "").trim();
    if (!label) throw new Error("Every material needs a label.");
    const multiplier = positiveNumber(rawConfig.material_factors?.[label], `Price factor for ${label}`);
    return { label, multiplier };
  });

  const volumeDiscounts = Array.isArray(rawConfig.volume_discounts)
    ? rawConfig.volume_discounts.map((tier) => ({
      minimum: Math.floor(positiveNumber(tier?.minimum, "Discount quantity")),
      percent: Number(tier?.percent),
    })).sort((first, second) => first.minimum - second.minimum)
    : [];
  if (volumeDiscounts.some((tier) => !Number.isFinite(tier.percent) || tier.percent < 0 || tier.percent > 100)) {
    throw new Error("Volume discount percentages must be between 0 and 100.");
  }

  return {
    ...rawConfig,
    dimensions: { min: minSize, max: maxSize },
    base_size: baseSize,
    sizes,
    materials: materials.map((material) => material.label),
    material_factors: Object.fromEntries(materials.map((material) => [material.label, material.multiplier])),
    volume_discounts: volumeDiscounts,
    minSize,
    maxSize,
    base: positiveNumber(row.base_price ?? 1, "Base price"),
    volumeDiscountThreshold: Number(row.volume_discount_threshold ?? 100),
    discountPercent: Number(row.discount_percent ?? 10),
  };
}

export function normalizeProduct(row, index = 0) {
  const config = normalizeProductConfig(row.config, row);
  const materialMap = new Map(config.materials.map((label) => [
    label,
    { label, multiplier: config.material_factors[label] },
  ]));

  return {
    id: row.slug,
    databaseId: row.id,
    label: row.division,
    title: row.name,
    copy: row.description,
    base: config.base,
    tint: PRODUCT_TINTS[index % PRODUCT_TINTS.length],
    minSize: config.minSize,
    maxSize: config.maxSize,
    sizes: config.sizes,
    materials: [...materialMap.values()],
    volumeDiscounts: config.volume_discounts,
    volumeDiscountThreshold: config.volumeDiscountThreshold,
    discountPercent: config.discountPercent,
  };
}
