export const ACCOUNT_DELETE_IMPACT_KEYS = [
  "impactQueue",
  "impactClients",
  "impactTeam",
  "impactAuthAccount",
  "impactPublicQueue",
  "impactBrand",
  "impactSubscription",
] as const;

export type AccountDeleteImpactKey = (typeof ACCOUNT_DELETE_IMPACT_KEYS)[number];
