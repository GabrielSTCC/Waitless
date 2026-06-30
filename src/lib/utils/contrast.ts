function hexToRgb(hex: string): [number, number, number] | null {
  const normalized = hex.replace("#", "");
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return null;
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  return [r, g, b];
}

function relativeLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

export function contrastRatio(colorA: string, colorB: string): number | null {
  const rgbA = hexToRgb(colorA);
  const rgbB = hexToRgb(colorB);
  if (!rgbA || !rgbB) return null;

  const lumA = relativeLuminance(...rgbA);
  const lumB = relativeLuminance(...rgbB);
  const lighter = Math.max(lumA, lumB);
  const darker = Math.min(lumA, lumB);
  return (lighter + 0.05) / (darker + 0.05);
}

export function validateAccentContrast(
  accentColor: string,
  onPrimary = "#FFFFFF",
  minRatio = 4.5,
): { valid: boolean; ratio: number | null; message?: string } {
  const ratio = contrastRatio(accentColor, onPrimary);
  if (ratio === null) {
    return { valid: false, ratio: null, message: "Cor inválida. Use formato #RRGGBB." };
  }
  if (ratio < minRatio) {
    return {
      valid: false,
      ratio,
      message: `Contraste insuficiente (${ratio.toFixed(2)}:1). Mínimo ${minRatio}:1 para texto sobre o botão.`,
    };
  }
  return { valid: true, ratio };
}
