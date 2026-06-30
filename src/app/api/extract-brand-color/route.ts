import { NextRequest, NextResponse } from "next/server";

function rgbToHex(r: number, g: number, b: number) {
  return `#${[r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("")}`.toUpperCase();
}

function isBrandPixel(r: number, g: number, b: number, a: number) {
  if (a < 128) return false;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const sat = max - min;
  if (max > 240 && sat < 30) return false;
  if (sat < 15 && max > 160 && max < 240) return false;
  return sat > 40 || (r > 180 && g > 60 && b < 120);
}

export async function POST(request: NextRequest) {
  try {
    const { imageUrl } = await request.json();
    if (!imageUrl || typeof imageUrl !== "string") {
      return NextResponse.json({ error: "imageUrl obrigatório" }, { status: 400 });
    }

    const sharp = (await import("sharp")).default;
    const response = await fetch(imageUrl);
    if (!response.ok) {
      return NextResponse.json({ error: "Não foi possível baixar a imagem" }, { status: 400 });
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const { data } = await sharp(buffer)
      .resize(64, 64, { fit: "inside" })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const buckets = new Map<string, number>();
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];
      if (!isBrandPixel(r, g, b, a)) continue;
      const key = `${Math.round(r / 16)}-${Math.round(g / 16)}-${Math.round(b / 16)}`;
      buckets.set(key, (buckets.get(key) ?? 0) + 1);
    }

    let bestKey = "";
    let bestCount = 0;
    for (const [key, count] of buckets) {
      if (count > bestCount) {
        bestCount = count;
        bestKey = key;
      }
    }

    if (!bestKey) {
      return NextResponse.json({ color: "#FF6600" });
    }

    const [rr, gg, bb] = bestKey.split("-").map((n) => Number(n) * 16 + 8);
    return NextResponse.json({ color: rgbToHex(rr, gg, bb) });
  } catch {
    return NextResponse.json({ error: "Falha ao extrair cor" }, { status: 500 });
  }
}
