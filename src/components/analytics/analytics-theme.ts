/** Cores semânticas do Analytics — derivadas da marca Waitless (navy + laranja) */

export const analyticsColors = {
  orange: "#FF6600",
  orangeLight: "#FF8533",
  orangeSoft: "#FFE0CC",
  navy: "#0A1B3F",
  navyMid: "#1A3058",
  navyLight: "#4A5D7A",
  slate: "#6B7C93",
  wait: "#F59E0B",
  waitSoft: "#FEF3C7",
  active: "#0EA5E9",
  activeSoft: "#E0F2FE",
  fast: "#10B981",
  fastSoft: "#D1FAE5",
  growth: "#059669",
  growthSoft: "#D1FAE5",
  insight: "#8B5CF6",
  insightSoft: "#EDE9FE",
} as const;

export const waitDistributionColors = [
  analyticsColors.fast,
  analyticsColors.orange,
  analyticsColors.orangeLight,
  analyticsColors.navyMid,
] as const;
