export const colors = {
  accent:      "#5B8CFF",
  accentHover: "#4C7CF0",
  accentGlow:  "rgba(91,140,255,0.45)",
  accentDim:   "rgba(91,140,255,0.15)",
  gradFocus:   ["#7EB0FF", "#5B8DEF", "#3A6FD8"],
  gradBreak:   ["#7EECD4", "#5CC8A0", "#3AAE84"],
  priority: { high: "#FF6B6B", mid: "#FBBF24", low: "#34D399", none: "#6B7280" },
} as const

export const breakpoints = { sm: 480, md: 768, lg: 1024, xl: 1280 } as const

export type Priority = "high" | "mid" | "low" | "none"
export const getPriority = (p: Priority) => colors.priority[p]