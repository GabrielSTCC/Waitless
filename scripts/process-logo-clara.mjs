import sharp from "sharp";

/** Remove apenas fundo cinza fantasma — preserva branco e laranja intactos */
function isBackground(r, g, b, a) {
  if (a < 5) return true;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const saturation = max - min;

  // Preserva elementos da logo
  if (min > 180 && saturation < 80) return false;
  if (r > 140 && g > 30 && b < 160 && r > g) return false;

  // Cinza neutro semi-opaco do Photoroom
  if (saturation < 25 && max >= 170 && max < 252) return true;

  // Franja quase invisível fora da logo
  if (a < 50 && saturation < 50 && max < 252) return true;

  return false;
}

const input = process.argv[2] ?? "Modelo/LogoClara-Photoroom.png";
const output = process.argv[3] ?? "public/logo-clara-photoroom.png";

const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });

for (let i = 0; i < data.length; i += 4) {
  const r = data[i];
  const g = data[i + 1];
  const b = data[i + 2];
  const a = data[i + 3];
  if (isBackground(r, g, b, a)) {
    data[i] = 0;
    data[i + 1] = 0;
    data[i + 2] = 0;
    data[i + 3] = 0;
  }
}

await sharp(data, {
  raw: { width: info.width, height: info.height, channels: 4 },
})
  .trim({ threshold: 10 })
  .png()
  .toFile(output);

const trimmedMeta = await sharp(output).metadata();

console.log(
  `Processed ${input} -> ${output} (${info.width}x${info.height} -> ${trimmedMeta.width}x${trimmedMeta.height})`,
);
