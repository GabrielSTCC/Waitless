import { messages } from "@/lib/i18n/messages";
import type { Locale } from "@/lib/i18n/types";

interface MessageTree {
  [key: string]: string | MessageTree;
}

function getNestedValue(tree: MessageTree, key: string): string | undefined {
  const parts = key.split(".");
  let current: string | MessageTree | undefined = tree;
  for (const part of parts) {
    if (!current || typeof current === "string") return undefined;
    current = current[part];
  }
  return typeof current === "string" ? current : undefined;
}

export function createTranslator(locale: Locale, namespace?: string) {
  const dict = messages[locale] as MessageTree;

  return function t(
    key: string,
    params?: Record<string, string | number>,
  ): string {
    const fullKey = namespace ? `${namespace}.${key}` : key;
    const value = getNestedValue(dict, fullKey) ?? getNestedValue(dict, key);
    if (!value) return fullKey;

    if (!params) return value;
    return value.replace(/\{(\w+)\}/g, (_, name: string) =>
      String(params[name] ?? `{${name}}`),
    );
  };
}

export type Translator = ReturnType<typeof createTranslator>;
