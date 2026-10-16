/**
 * Genera todos los recursos de marca a partir de los logos oficiales de design/assets.
 * Nunca redibuja el logo: solo recorta, escala y compone los PNG originales.
 *
 *   npm run brand
 *
 * Salidas:
 *   public/brand/rowe-logo-blanco.png · rowe-logo-negro.png   (copias exactas)
 *   public/brand/rowe-mark-{192,512}.png                       (símbolo para manifest/PWA)
 *   src/app/favicon.ico (16/32/48) · icon.png (512) · apple-icon.png (180)
 *   public/brand/og-default.png (1200×630): imagen para compartir por defecto (la del panel tiene prioridad)
 */
import { copyFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import pngToIco from "png-to-ico";

const ROOT = path.resolve(import.meta.dirname, "..");
const SRC_WHITE = path.join(ROOT, "design/assets/rowe-logo-blanco.png");
const SRC_BLACK = path.join(ROOT, "design/assets/rowe-logo-negro.png");
const PUBLIC_BRAND = path.join(ROOT, "public/brand");
const APP = path.join(ROOT, "src/app");

const BG = "#0A0A0A";
const REC = "#FF3B1F";

/** Columna donde termina la «O» (diafragma) y empieza la «W» en el PNG de 407 px. */
export const LOGO_SPLIT_X = 194;
/** Caja del diafragma dentro del PNG original. */
const APERTURE = { left: 93, top: 0, width: 100, height: 101 };

async function aperture(size: number): Promise<Buffer> {
  const d = Math.min(APERTURE.width, APERTURE.height);
  const circle = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${APERTURE.width}" height="${APERTURE.height}"><circle cx="${d / 2 - 0.5}" cy="${APERTURE.height / 2}" r="${d / 2 - 1}" fill="#fff"/></svg>`,
  );
  const masked = await sharp(SRC_WHITE).extract(APERTURE).png().toBuffer();
  const clean = await sharp(masked).composite([{ input: circle, blend: "dest-in" }]).png().toBuffer();
  return sharp(clean)
    .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
}

/** Símbolo blanco centrado sobre fondo negro, con el margen indicado (0–1). */
async function markTile(size: number, padding: number, radius = 0): Promise<Buffer> {
  const inner = Math.round(size * (1 - padding * 2));
  const mark = await aperture(inner);
  const mask = radius
    ? [{ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${radius}" fill="#fff"/></svg>`), blend: "dest-in" as const }]
    : [];
  const tile = await sharp({ create: { width: size, height: size, channels: 4, background: BG } })
    .composite([{ input: mark, gravity: "center" }])
    .png()
    .toBuffer();
  return mask.length ? sharp(tile).composite(mask).png().toBuffer() : tile;
}

async function ogImage(): Promise<Buffer> {
  const W = 1200;
  const H = 630;
  const logoW = 407; // tamaño nativo del PNG: sin reescalar, máxima nitidez
  const logo = await sharp(SRC_WHITE).png().toBuffer();
  const logoMeta = await sharp(logo).metadata();
  const logoH = logoMeta.height ?? 101;
  // Letterbox 2.39:1, marcas de encuadre y punto REC: el lenguaje visual de la web.
  const frameH = Math.round(W / 2.39);
  const top = Math.round((H - frameH) / 2);
  const m = 40; // margen de las marcas
  const c = 28; // longitud de cada marca
  const stroke = "rgba(237,234,228,0.8)";
  const corners = [
    `M${m} ${top + m + c}V${top + m}H${m + c}`,
    `M${W - m - c} ${top + m}H${W - m}V${top + m + c}`,
    `M${m} ${top + frameH - m - c}V${top + frameH - m}H${m + c}`,
    `M${W - m - c} ${top + frameH - m}H${W - m}V${top + frameH - m - c}`,
  ].join(" ");
  const logoX = Math.round((W - logoW) / 2) - 12;
  const logoY = Math.round((H - logoH) / 2);
  const overlay = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <defs><radialGradient id="g" cx="30%" cy="42%" r="60%"><stop offset="0" stop-color="#EDEAE4" stop-opacity="0.10"/><stop offset="1" stop-color="#EDEAE4" stop-opacity="0"/></radialGradient></defs>
    <rect x="0" y="${top}" width="${W}" height="${frameH}" fill="#171615"/>
    <rect x="0" y="${top}" width="${W}" height="${frameH}" fill="url(#g)"/>
    <path d="${corners}" stroke="${stroke}" stroke-width="1.5" fill="none"/>
    <circle cx="${logoX + logoW + 26}" cy="${logoY + logoH / 2}" r="9" fill="${REC}"/>
  </svg>`);
  return sharp({ create: { width: W, height: H, channels: 4, background: BG } })
    .composite([
      { input: overlay, left: 0, top: 0 },
      { input: logo, left: logoX, top: logoY },
    ])
    .png()
    .toBuffer();
}

async function main() {
  await mkdir(PUBLIC_BRAND, { recursive: true });
  await copyFile(SRC_WHITE, path.join(PUBLIC_BRAND, "rowe-logo-blanco.png"));
  await copyFile(SRC_BLACK, path.join(PUBLIC_BRAND, "rowe-logo-negro.png"));

  const icoSizes = await Promise.all([16, 32, 48].map((s) => markTile(s, 0.08)));
  await writeFile(path.join(APP, "favicon.ico"), await pngToIco(icoSizes));
  await writeFile(path.join(APP, "icon.png"), await markTile(512, 0.16, 96));
  await writeFile(path.join(APP, "apple-icon.png"), await markTile(180, 0.18));
  await writeFile(path.join(PUBLIC_BRAND, "rowe-mark-192.png"), await markTile(192, 0.16));
  await writeFile(path.join(PUBLIC_BRAND, "rowe-mark-512.png"), await markTile(512, 0.16));

  const og = await ogImage();
  await writeFile(path.join(PUBLIC_BRAND, "og-default.png"), og);

  console.log("✓ Recursos de marca generados");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
