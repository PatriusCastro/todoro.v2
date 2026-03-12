export const colors = {
  accent:      "#6C63FF",
  accentHover: "#5A52E0",
  accentGlow:  "rgba(108,99,255,0.4)",
  accentDim:   "rgba(108,99,255,0.15)",
  priority: { high: "#FF6B6B", mid: "#FFB347", low: "#51CF66", none: "#868E96" },
} as const

export const breakpoints = { sm: 480, md: 768, lg: 1024, xl: 1280 } as const

export type Priority = "high" | "mid" | "low" | "none"
export const getPriority = (p: Priority) => colors.priority[p]