export function formatMoneyMinor(
  amountMinor: number,
  currency: "BRL" | "USD",
  locale = "pt-BR",
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amountMinor / 100);
}
