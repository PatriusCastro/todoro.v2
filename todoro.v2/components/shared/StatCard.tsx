"use client"

interface StatCardProps {
  label:   string
  value:   string | number
  suffix?: string
  icon?:   string
  accent?: boolean
}

export default function StatCard({ label, value, suffix, icon, accent = false }: StatCardProps) {
  return (
    <div className="rounded-2xl border border-border bg-surface px-4 py-4 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-sub">{label}</span>
        {icon && <span className="text-lg">{icon}</span>}
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className={`text-2xl font-black leading-none ${accent ? "text-accent" : "text-tx"}`}>{value}</span>
        {suffix && <span className="text-xs text-sub">{suffix}</span>}
      </div>
    </div>
  )
}