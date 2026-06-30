const MIN_SLUG_LENGTH = 2;
const MAX_SLUG_LENGTH = 80;

export function slugFromCompanyName(name: string): string {
  return name
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_SLUG_LENGTH);
}

export function validateCompanySlug(slug: string): void {
  if (!slug || slug.length < MIN_SLUG_LENGTH) {
    throw new InvalidCompanyNameError(
      "Nome do estabelecimento muito curto. Use pelo menos 2 letras ou números.",
    );
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new InvalidCompanyNameError(
      "Nome inválido. Use letras, números e espaços (ex.: Padaria do João).",
    );
  }
}

export class InvalidCompanyNameError extends Error {
  readonly code = "company/invalid-name";

  constructor(message: string) {
    super(message);
    this.name = "InvalidCompanyNameError";
  }
}

export class CompanyNameTakenError extends Error {
  readonly code = "company/name-already-in-use";

  constructor(public readonly slug: string) {
    super("Já existe um estabelecimento com este nome. Escolha outro.");
    this.name = "CompanyNameTakenError";
  }
}

export function getCompanyErrorMessage(error: unknown): string | null {
  if (error instanceof CompanyNameTakenError || error instanceof InvalidCompanyNameError) {
    return error.message;
  }
  const code = (error as { code?: string })?.code;
  if (code === "company/name-already-in-use") {
    return "Já existe um estabelecimento com este nome. Escolha outro.";
  }
  if (code === "company/invalid-name") {
    return "Nome do estabelecimento inválido. Use letras, números e espaços.";
  }
  return null;
}
