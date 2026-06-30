export type SolutionId = "clinica" | "salao" | "restaurante";

export type KeywordGroup = "clinica" | "salao" | "restaurante" | "geral";

export type KeywordLink = {
  labelKey: string;
  group: KeywordGroup;
  hrefPt: string;
  hrefEn: string;
  solutionId?: SolutionId;
};

export const SOLUTION_HUB = {
  pathPt: "/solucoes",
  pathEn: "/solutions",
  sitemapPriority: 0.8,
} as const;

export const SOLUTIONS: Record<
  SolutionId,
  {
    id: SolutionId;
    pathPt: string;
    pathEn: string;
    sitemapPriority: number;
    primaryKeywords: { pt: string[]; en: string[] };
  }
> = {
  clinica: {
    id: "clinica",
    pathPt: "/fila-de-espera-clinica",
    pathEn: "/clinic-waiting-queue",
    sitemapPriority: 0.85,
    primaryKeywords: {
      pt: ["fila de espera clínica", "sala de espera digital", "gestão de pacientes"],
      en: ["clinic waiting queue", "digital waiting room", "patient queue management"],
    },
  },
  salao: {
    id: "salao",
    pathPt: "/fila-de-espera-salao",
    pathEn: "/salon-waiting-queue",
    sitemapPriority: 0.85,
    primaryKeywords: {
      pt: ["fila salão de beleza", "lista de espera barbearia", "fila cabeleireiro"],
      en: ["salon waiting list", "barbershop queue", "walk-in salon queue"],
    },
  },
  restaurante: {
    id: "restaurante",
    pathPt: "/fila-de-espera-restaurante",
    pathEn: "/restaurant-waiting-queue",
    sitemapPriority: 0.85,
    primaryKeywords: {
      pt: ["fila restaurante", "lista de espera mesa", "fila digital lanchonete"],
      en: ["restaurant waitlist", "table waiting list", "digital restaurant queue"],
    },
  },
};

export const KEYWORD_LINKS: KeywordLink[] = [
  {
    labelKey: "clinicaFila",
    group: "clinica",
    hrefPt: SOLUTIONS.clinica.pathPt,
    hrefEn: SOLUTIONS.clinica.pathEn,
    solutionId: "clinica",
  },
  {
    labelKey: "clinicaSala",
    group: "clinica",
    hrefPt: SOLUTIONS.clinica.pathPt,
    hrefEn: SOLUTIONS.clinica.pathEn,
    solutionId: "clinica",
  },
  {
    labelKey: "clinicaPacientes",
    group: "clinica",
    hrefPt: SOLUTIONS.clinica.pathPt,
    hrefEn: SOLUTIONS.clinica.pathEn,
    solutionId: "clinica",
  },
  {
    labelKey: "clinicaConsultorio",
    group: "clinica",
    hrefPt: SOLUTIONS.clinica.pathPt,
    hrefEn: SOLUTIONS.clinica.pathEn,
    solutionId: "clinica",
  },
  {
    labelKey: "salaoFila",
    group: "salao",
    hrefPt: SOLUTIONS.salao.pathPt,
    hrefEn: SOLUTIONS.salao.pathEn,
    solutionId: "salao",
  },
  {
    labelKey: "salaoBarbearia",
    group: "salao",
    hrefPt: SOLUTIONS.salao.pathPt,
    hrefEn: SOLUTIONS.salao.pathEn,
    solutionId: "salao",
  },
  {
    labelKey: "salaoWalkIn",
    group: "salao",
    hrefPt: SOLUTIONS.salao.pathPt,
    hrefEn: SOLUTIONS.salao.pathEn,
    solutionId: "salao",
  },
  {
    labelKey: "salaoEstetica",
    group: "salao",
    hrefPt: SOLUTIONS.salao.pathPt,
    hrefEn: SOLUTIONS.salao.pathEn,
    solutionId: "salao",
  },
  {
    labelKey: "restauranteFila",
    group: "restaurante",
    hrefPt: SOLUTIONS.restaurante.pathPt,
    hrefEn: SOLUTIONS.restaurante.pathEn,
    solutionId: "restaurante",
  },
  {
    labelKey: "restauranteMesa",
    group: "restaurante",
    hrefPt: SOLUTIONS.restaurante.pathPt,
    hrefEn: SOLUTIONS.restaurante.pathEn,
    solutionId: "restaurante",
  },
  {
    labelKey: "restauranteLanchonete",
    group: "restaurante",
    hrefPt: SOLUTIONS.restaurante.pathPt,
    hrefEn: SOLUTIONS.restaurante.pathEn,
    solutionId: "restaurante",
  },
  {
    labelKey: "restauranteLista",
    group: "restaurante",
    hrefPt: SOLUTIONS.restaurante.pathPt,
    hrefEn: SOLUTIONS.restaurante.pathEn,
    solutionId: "restaurante",
  },
  {
    labelKey: "geralFilaDigital",
    group: "geral",
    hrefPt: "/",
    hrefEn: "/",
  },
  {
    labelKey: "geralListaDigital",
    group: "geral",
    hrefPt: "/",
    hrefEn: "/",
  },
  {
    labelKey: "geralGestao",
    group: "geral",
    hrefPt: "/",
    hrefEn: "/",
  },
  {
    labelKey: "geralWhatsapp",
    group: "geral",
    hrefPt: "/",
    hrefEn: "/",
  },
];

export const KEYWORD_GROUPS: KeywordGroup[] = ["clinica", "salao", "restaurante", "geral"];

export const SOLUTION_IDS: SolutionId[] = ["clinica", "salao", "restaurante"];

export function getKeywordLinksForGroup(group: KeywordGroup): KeywordLink[] {
  return KEYWORD_LINKS.filter((link) => link.group === group);
}

export function getRelatedKeywordLinks(solutionId: SolutionId): KeywordLink[] {
  return KEYWORD_LINKS.filter((link) => link.solutionId === solutionId);
}

export function getOtherSolutionIds(currentId: SolutionId): SolutionId[] {
  return SOLUTION_IDS.filter((id) => id !== currentId);
}

export function getSolutionByPath(path: string): (typeof SOLUTIONS)[SolutionId] | null {
  for (const solution of Object.values(SOLUTIONS)) {
    if (path === solution.pathPt || path === solution.pathEn) {
      return solution;
    }
  }
  return null;
}

export function getLocalePair(path: string): { pathPt: string; pathEn: string } | null {
  if (path === SOLUTION_HUB.pathPt || path === SOLUTION_HUB.pathEn) {
    return { pathPt: SOLUTION_HUB.pathPt, pathEn: SOLUTION_HUB.pathEn };
  }
  const solution = getSolutionByPath(path);
  if (solution) {
    return { pathPt: solution.pathPt, pathEn: solution.pathEn };
  }
  return null;
}

export function getPageLocaleFromPath(path: string): "pt-BR" | "en" | null {
  if (path === SOLUTION_HUB.pathEn) return "en";
  if (path === SOLUTION_HUB.pathPt) return "pt-BR";
  for (const solution of Object.values(SOLUTIONS)) {
    if (path === solution.pathEn) return "en";
    if (path === solution.pathPt) return "pt-BR";
  }
  return null;
}

export const ALL_SITEMAP_PATHS: Array<{
  path: string;
  changeFrequency: "weekly" | "monthly";
  priority: number;
}> = [
  ...Object.values(SOLUTIONS).flatMap((s) => [
    {
      path: s.pathPt,
      changeFrequency: "weekly" as const,
      priority: s.sitemapPriority,
    },
    {
      path: s.pathEn,
      changeFrequency: "weekly" as const,
      priority: s.sitemapPriority,
    },
  ]),
  {
    path: SOLUTION_HUB.pathPt,
    changeFrequency: "weekly",
    priority: SOLUTION_HUB.sitemapPriority,
  },
  {
    path: SOLUTION_HUB.pathEn,
    changeFrequency: "weekly",
    priority: SOLUTION_HUB.sitemapPriority,
  },
];
