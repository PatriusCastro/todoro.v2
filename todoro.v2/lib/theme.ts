export const colors = {
  accent:      "#2940D3",
  accentHover: "#2033A8",
  accentGlow:  "rgba(41,64,211,0.4)",
  accentDim:   "rgba(41,64,211,0.15)",
  gradFocus:   ["#7EB0FF", "#5B8DEF", "#3A6FD8"],
  gradBreak:   ["#7EECD4", "#5CC8A0", "#3AAE84"],
  priority: { high: "#F44321", mid: "#F9A541", low: "#51CF66", none: "#868E96" },
} as const

export const breakpoints = { sm: 480, md: 768, lg: 1024, xl: 1280 } as const

export type Priority = "high" | "mid" | "low" | "none"
export const getPriority = (p: Priority) => colors.priority[p]