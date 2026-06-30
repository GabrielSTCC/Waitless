export const MIN_PASSWORD_LENGTH = 8;

const UPPERCASE_REGEX = /[A-Z]/;
const LOWERCASE_REGEX = /[a-z]/;
const NUMBER_REGEX = /[0-9]/;
const SPECIAL_REGEX = /[!@#$%^&*()_+\-=[\]{}|;:'",.<>?/\\]/;

export type PasswordRuleKey =
  | "minLength"
  | "uppercase"
  | "lowercase"
  | "number"
  | "special";

export const PASSWORD_RULE_ORDER: PasswordRuleKey[] = [
  "minLength",
  "uppercase",
  "lowercase",
  "number",
  "special",
];

const RULE_TESTS: Record<PasswordRuleKey, (password: string) => boolean> = {
  minLength: (password) => password.length >= MIN_PASSWORD_LENGTH,
  uppercase: (password) => UPPERCASE_REGEX.test(password),
  lowercase: (password) => LOWERCASE_REGEX.test(password),
  number: (password) => NUMBER_REGEX.test(password),
  special: (password) => SPECIAL_REGEX.test(password),
};

export function testPasswordRule(
  password: string,
  rule: PasswordRuleKey,
): boolean {
  return RULE_TESTS[rule](password);
}

export function getPasswordStrength(password: string): {
  passedRules: PasswordRuleKey[];
  failedRules: PasswordRuleKey[];
  score: number;
} {
  const passedRules: PasswordRuleKey[] = [];
  const failedRules: PasswordRuleKey[] = [];

  for (const rule of PASSWORD_RULE_ORDER) {
    if (RULE_TESTS[rule](password)) {
      passedRules.push(rule);
    } else {
      failedRules.push(rule);
    }
  }

  return {
    passedRules,
    failedRules,
    score: passedRules.length,
  };
}

export function validatePassword(password: string): {
  valid: boolean;
  errors: PasswordRuleKey[];
} {
  const { failedRules } = getPasswordStrength(password);
  return { valid: failedRules.length === 0, errors: failedRules };
}

export class PasswordValidationError extends Error {
  readonly errors: PasswordRuleKey[];

  constructor(errors: PasswordRuleKey[]) {
    super("PASSWORD_VALIDATION_FAILED");
    this.name = "PasswordValidationError";
    this.errors = errors;
  }
}

export function assertPasswordValid(password: string): void {
  const { valid, errors } = validatePassword(password);
  if (!valid) {
    throw new PasswordValidationError(errors);
  }
}

export function isPasswordValidationError(
  error: unknown,
): error is PasswordValidationError {
  return error instanceof PasswordValidationError;
}
