import { readFileSync } from "node:fs";
import { join } from "node:path";
import { extractPdfText } from "./pdf-text";
import { parseHyundaiPriceText, parseKiaPriceText } from "./parse-price-pdf";

const samples = join(import.meta.dir, "../out/pdf-samples");

const santafe = join(samples, "santafe-2026-price.pdf");
const sorento = join(samples, "price_sorento.pdf");

if (exists(santafe)) {
  const { text } = await extractPdfText(new Uint8Array(readFileSync(santafe)));
  const table = parseHyundaiPriceText(text, {
    carName: "싼타페",
    carEngName: "santafe",
  });
  console.log("hyundai santafe trims", table.trims);
  if (table.trims.length < 3) throw new Error("expected >=3 hyundai trims");
  if (table.trims[0]!.basePrice < 30_000_000) throw new Error("price too low");
} else {
  console.warn("skip hyundai sample — run curl download first");
}

if (exists(sorento)) {
  const { text } = await extractPdfText(new Uint8Array(readFileSync(sorento)));
  const table = parseKiaPriceText(text, { slug: "sorento" });
  console.log("kia sorento trims", table.trims.slice(0, 8));
  if (table.trims.length < 3) throw new Error("expected >=3 kia trims");
} else {
  console.warn("skip kia sample");
}

console.log("ok");

function exists(p: string) {
  try {
    readFileSync(p);
    return true;
  } catch {
    return false;
  }
}
