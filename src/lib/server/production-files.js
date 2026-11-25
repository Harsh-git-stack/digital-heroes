import { jsPDF } from "jspdf";
import sharp from "sharp";

const DEFAULT_BLEED_MM = 3;
const DEFAULT_DPI = 300;
const MAX_PNG_PIXELS = 40000000;
const MAX_CSV_QUANTITY = 50000;

function escapeXml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function csvCell(value) {
  const text = String(value ?? "");
  const safeText = /^[\s]*[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safeText.replace(/"/g, '""')}"`;
}

export async function generateProductionFiles(order, design, product, artworkBuffer) {
  const content = design.content ?? {};
  const config = order.configuration ?? content.configuration ?? {};
  const width = Number(config.width_mm);
  const height = Number(config.height_mm);
  const productionSpec = config.production_spec ?? {};
  const bleed = Number(productionSpec.bleed_mm ?? DEFAULT_BLEED_MM);
  const dpi = Number(productionSpec.dpi ?? DEFAULT_DPI);
  const quantity = Number(order.quantity);
  const material = String(config.material ?? "");
  const text = String(content.text ?? design.name ?? product.name ?? "Print design")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .slice(0, 200);
  const fontSize = Math.min(38, Math.max(12, Number(content.font_size) || 22));
  const x = Math.min(82, Math.max(18, Number(content.position?.x) || 50));
  const y = Math.min(82, Math.max(18, Number(content.position?.y) || 50));
  const rotation = Math.min(45, Math.max(-45, Number(content.position?.rotation) || 0));
  const color = /^#[0-9a-f]{6}$/i.test(content.color ?? "") ? content.color : "#111111";

  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    throw new Error("Order dimensions are missing or invalid.");
  }
  if (!Number.isFinite(bleed) || bleed < 0 || bleed > 25) {
    throw new Error("Production template bleed must be between 0 and 25 mm.");
  }
  if (!Number.isInteger(dpi) || dpi < 72 || dpi > 600) {
    throw new Error("Production template DPI must be a whole number between 72 and 600.");
  }
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_CSV_QUANTITY) {
    throw new Error(`CSV generation is limited to ${MAX_CSV_QUANTITY.toLocaleString("en-IN")} units per order.`);
  }

  const pixelWidth = Math.ceil(((width + bleed * 2) / 25.4) * dpi);
  const pixelHeight = Math.ceil(((height + bleed * 2) / 25.4) * dpi);
  if (pixelWidth * pixelHeight > MAX_PNG_PIXELS) {
    throw new Error(`This size is too large for a ${dpi} DPI PNG. Reduce the dimensions or use a lower-DPI production template.`);
  }
  const svgWidth = (pixelWidth * 72) / dpi;
  const svgHeight = (pixelHeight * 72) / dpi;

  const pageWidth = width + bleed * 2;
  const pageHeight = height + bleed * 2;
  let artworkMarkup = "";
  let pdfArtwork = null;
  if (artworkBuffer) {
    const artworkImage = sharp(artworkBuffer, { limitInputPixels: MAX_PNG_PIXELS });
    const artworkMetadata = await artworkImage.metadata();
    if (!artworkMetadata.width || !artworkMetadata.height) {
      throw new Error("Uploaded artwork could not be decoded as an image.");
    }

    const printableWidth = width * 0.82;
    const printableHeight = height * 0.82;
    const scale = Math.min(printableWidth / artworkMetadata.width, printableHeight / artworkMetadata.height);
    const artworkWidth = artworkMetadata.width * scale;
    const artworkHeight = artworkMetadata.height * scale;
    const artworkX = (pageWidth - artworkWidth) / 2;
    const artworkY = (pageHeight - artworkHeight) / 2;
    const artworkPng = await artworkImage.png().toBuffer();
    const artworkData = artworkPng.toString("base64");
    artworkMarkup = `<image href="data:image/png;base64,${artworkData}" x="${artworkX}" y="${artworkY}" width="${artworkWidth}" height="${artworkHeight}" preserveAspectRatio="none"/>`;
    pdfArtwork = { data: `data:image/png;base64,${artworkData}`, x: artworkX, y: artworkY, width: artworkWidth, height: artworkHeight };
  }

  const textX = bleed + (width * x) / 100;
  const textY = bleed + (height * y) / 100;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${svgWidth}px" height="${svgHeight}px" viewBox="0 0 ${pageWidth} ${pageHeight}">
<rect width="${pageWidth}" height="${pageHeight}" fill="#ffffff"/>
${artworkMarkup}
<text x="${textX}" y="${textY}" text-anchor="middle" dominant-baseline="middle" font-family="Arial, Helvetica, sans-serif" font-size="${(fontSize * 25.4) / 96}" font-weight="700" fill="${color}" transform="rotate(${rotation} ${textX} ${textY})">${escapeXml(text)}</text>
</svg>`;

  const pdf = new jsPDF({
    orientation: pageWidth > pageHeight ? "landscape" : "portrait",
    unit: "mm",
    format: [pageWidth, pageHeight],
    compress: true,
  });
  const rgb = color.slice(1).match(/.{2}/g).map((part) => Number.parseInt(part, 16));
  pdf.setFillColor(255, 255, 255);
  pdf.rect(0, 0, pageWidth, pageHeight, "F");
  if (pdfArtwork) {
    pdf.addImage(pdfArtwork.data, "PNG", pdfArtwork.x, pdfArtwork.y, pdfArtwork.width, pdfArtwork.height);
  }
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize((fontSize * 72) / 96);
  pdf.setTextColor(...rgb);
  pdf.text(text, textX, textY, {
    align: "center",
    angle: rotation,
    maxWidth: width * 0.8,
  });

  const pdfBuffer = Buffer.from(pdf.output("arraybuffer"));
  const pngBuffer = await sharp(Buffer.from(svg), {
    density: dpi,
    limitInputPixels: MAX_PNG_PIXELS,
  }).png({ compressionLevel: 9 }).withMetadata({ density: dpi }).toBuffer();

  const csvRows = [
    ["order_number", "item_number", "product", "design_text", "width_mm", "height_mm", "material"],
    ...Array.from({ length: quantity }, (_, index) => [
      order.order_number,
      index + 1,
      product.name,
      text,
      width,
      height,
      material,
    ]),
  ];
  const csvBuffer = Buffer.from(`\uFEFF${csvRows.map((row) => row.map(csvCell).join(",")).join("\r\n")}`, "utf8");
  const baseName = `PF-${order.order_number}`;

  return [
    { type: "pdf", contentType: "application/pdf", fileName: `${baseName}.pdf`, buffer: pdfBuffer },
    { type: "png", contentType: "image/png", fileName: `${baseName}.png`, buffer: pngBuffer },
    { type: "csv", contentType: "text/csv", fileName: `${baseName}.csv`, buffer: csvBuffer },
  ];
}
