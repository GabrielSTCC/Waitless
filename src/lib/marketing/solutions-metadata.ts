import type { Metadata } from "next";
import { messages } from "@/lib/i18n/messages";
import type { Locale } from "@/lib/i18n/types";
import {
  SOLUTION_HUB,
  SOLUTIONS,
  type SolutionId,
} from "@/lib/marketing/solutions";
import { getPublicAppBaseUrl } from "@/lib/utils/app-url";

function getSitemapBaseUrl(): string {
  const base = getPublicAppBaseUrl() || "https://www.waitless.solutions";
  if (base === "https://waitless.solutions") return "https://www.waitless.solutions";
  return base;
}

function getSolutionCopy(locale: Locale, solutionId: SolutionId) {
  return messages[locale].solutions[solutionId] as {
    metaTitle: string;
    metaDescription: string;
    faqQ1: string;
    faqA1: string;
    faqQ2: string;
    faqA2: string;
    faqQ3: string;
    faqA3: string;
    faqQ4: string;
    faqA4: string;
  };
}

function getHubCopy(locale: Locale) {
  return messages[locale].solutionsHub as {
    metaTitle: string;
    metaDescription: string;
  };
}

function buildAlternates(pathPt: string, pathEn: string, locale: Locale) {
  const base = getSitemapBaseUrl();
  const canonical = locale === "en" ? `${base}${pathEn}` : `${base}${pathPt}`;
  return {
    canonical,
    languages: {
      "pt-BR": `${base}${pathPt}`,
      en: `${base}${pathEn}`,
      "x-default": `${base}${pathPt}`,
    },
  };
}

export function buildSolutionMetadata(
  solutionId: SolutionId,
  locale: Locale,
): Metadata {
  const { pathPt, pathEn } = SOLUTIONS[solutionId];
  const copy = getSolutionCopy(locale, solutionId);

  return {
    title: copy.metaTitle,
    description: copy.metaDescription,
    alternates: buildAlternates(pathPt, pathEn, locale),
    openGraph: {
      title: copy.metaTitle,
      description: copy.metaDescription,
      type: "website",
      locale: locale === "en" ? "en_US" : "pt_BR",
      url: locale === "en" ? pathEn : pathPt,
    },
  };
}

export function buildHubMetadata(locale: Locale): Metadata {
  const copy = getHubCopy(locale);
  const { pathPt, pathEn } = SOLUTION_HUB;

  return {
    title: copy.metaTitle,
    description: copy.metaDescription,
    alternates: buildAlternates(pathPt, pathEn, locale),
    openGraph: {
      title: copy.metaTitle,
      description: copy.metaDescription,
      type: "website",
      locale: locale === "en" ? "en_US" : "pt_BR",
      url: locale === "en" ? pathEn : pathPt,
    },
  };
}

export function buildSolutionFaqJsonLd(
  solutionId: SolutionId,
  locale: Locale,
): Record<string, unknown> {
  const copy = getSolutionCopy(locale, solutionId);
  const base = getSitemapBaseUrl();
  const { pathPt, pathEn } = SOLUTIONS[solutionId];
  const url = locale === "en" ? `${base}${pathEn}` : `${base}${pathPt}`;

  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      { "@type": "Question", name: copy.faqQ1, acceptedAnswer: { "@type": "Answer", text: copy.faqA1 } },
      { "@type": "Question", name: copy.faqQ2, acceptedAnswer: { "@type": "Answer", text: copy.faqA2 } },
      { "@type": "Question", name: copy.faqQ3, acceptedAnswer: { "@type": "Answer", text: copy.faqA3 } },
      { "@type": "Question", name: copy.faqQ4, acceptedAnswer: { "@type": "Answer", text: copy.faqA4 } },
    ],
    url,
  };
}
