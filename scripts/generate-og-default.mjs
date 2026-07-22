import sharp from "sharp";
import fs from "fs";
import path from "path";

const W = 1200;
const H = 630;
const logoPath = path.join("public", "logo-copy.jpeg");
const outPath = path.join("public", "og-default.jpg");

const logo = await sharp(logoPath).resize(280, 280, { fit: "inside" }).toBuffer();
const logoMeta = await sharp(logo).metadata();
const logoW = logoMeta.width ?? 280;
const logoH = logoMeta.height ?? 280;

const svg = Buffer.from(`
<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#3d322c"/>
      <stop offset="100%" stop-color="#2f2622"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#g)"/>
  <text x="600" y="480" text-anchor="middle" font-family="Georgia, serif" font-size="56" fill="#f5f0ea">Bohosaaz</text>
  <text x="600" y="530" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" fill="#d4c4b0">Meaningful gifting · Noida &amp; Delhi NCR</text>
</svg>
`);

await sharp(svg)
  .composite([
    {
      input: logo,
      top: Math.round(90 + (280 - logoH) / 2),
      left: Math.round((W - logoW) / 2),
    },
  ])
  .jpeg({ quality: 90 })
  .toFile(outPath);

const meta = await sharp(outPath).metadata();
console.log(
  `Created ${outPath} ${meta.width}x${meta.height} ${fs.statSync(outPath).size} bytes`
);
