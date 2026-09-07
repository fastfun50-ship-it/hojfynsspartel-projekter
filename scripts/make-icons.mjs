import sharp from "sharp";

async function icon(size, file) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
  <rect width="100%" height="100%" fill="#0B0B0B"/>
  <rect x="${size * 0.12}" y="${size * 0.12}" width="${size * 0.76}" height="${size * 0.76}" rx="${size * 0.12}" fill="#C4A574"/>
  <text x="50%" y="54%" text-anchor="middle" font-family="Arial,sans-serif" font-size="${Math.round(size * 0.28)}" font-weight="700" fill="#0B0B0B">HFS</text>
</svg>`;
  await sharp(Buffer.from(svg)).png().toFile(file);
  console.log("wrote", file);
}

await icon(192, "public/icons/icon-192.png");
await icon(512, "public/icons/icon-512.png");
