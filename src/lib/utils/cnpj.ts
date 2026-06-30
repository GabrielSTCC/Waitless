const CNPJ_LENGTH = 14;

const REJECTED_SEQUENCES = new Set(
  Array.from({ length: 10 }, (_, i) => String(i).repeat(CNPJ_LENGTH)),
);

export function normalizeCnpj(value: string): string {
  return value.replace(/\D/g, "").slice(0, CNPJ_LENGTH);
}

export function formatCnpj(value: string): string {
  const digits = normalizeCnpj(value);
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8) {
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  }
  if (digits.length <= 12) {
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  }
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
}

function calcCnpjCheckDigit(digits: number[], weights: number[]): number {
  const sum = digits.reduce((acc, digit, index) => acc + digit * weights[index], 0);
  const remainder = sum % 11;
  return remainder < 2 ? 0 : 11 - remainder;
}

export function isValidCnpj(value: string): boolean {
  const digits = normalizeCnpj(value);
  if (digits.length !== CNPJ_LENGTH) return false;
  if (REJECTED_SEQUENCES.has(digits)) return false;

  const numbers = digits.split("").map(Number);
  const first = calcCnpjCheckDigit(numbers.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const second = calcCnpjCheckDigit(numbers.slice(0, 13), [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);

  return numbers[12] === first && numbers[13] === second;
}

export function validateCnpj(value: string): string | null {
  const digits = normalizeCnpj(value);
  if (!digits) return null;
  if (digits.length < CNPJ_LENGTH) return "CNPJ incompleto.";
  if (!isValidCnpj(digits)) return "CNPJ inválido.";
  return null;
}
