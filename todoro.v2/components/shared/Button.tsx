"use client"

type Variant = "primary" | "secondary" | "ghost" | "danger"
type Size    = "sm" | "md" | "lg"

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?:    Size
  /** Stretches to the container and left-aligns its content. */
  block?:   boolean
}

/**
 * The one button in the app. Primary actions had drifted into six different
 * shapes — text-xs/text-sm/text-meta/text-lead crossed with
 * font-semibold/bold/extrabold — so two accent buttons on the same screen
 * rarely matched.
 *
 * Every size clears the 44px touch floor.
 */
const VARIANTS: Record<Variant, string> = {
  primary:   "bg-accent text-white hover:bg-accent-hover",
  secondary: "border border-border bg-surface text-tx hover:border-accent/40 hover:text-accent",
  ghost:     "text-accent hover:bg-accent/10",
  danger:    "border border-priority-high/40 text-priority-high hover:bg-priority-high/10",
}

const SIZES: Record<Size, string> = {
  sm: "min-h-11 px-3.5 text-meta gap-1.5",
  md: "min-h-12 px-4   text-meta gap-2",
  lg: "min-h-14 px-5   text-lead gap-2.5",
}

export default function Button({
  variant = "primary", size = "md", block = false,
  className = "", children, ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      className={`inline-flex items-center rounded-control font-extrabold
        transition-all duration-150 active:scale-[0.98]
        disabled:opacity-40 disabled:pointer-events-none
        ${block ? "w-full justify-start" : "justify-center"}
        ${VARIANTS[variant]} ${SIZES[size]} ${className}`}>
      {children}
    </button>
  )
}
