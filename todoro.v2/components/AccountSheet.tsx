"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { HiArrowPath, HiArrowRight, HiCheck, HiEnvelope, HiXMark } from "react-icons/hi2"
import Sheet from "./shared/Sheet"

interface AccountSheetProps {
  onClose: () => void
  sendCode:   (email: string) => Promise<string | null>
  verifyCode: (email: string, token: string) => Promise<string | null>
}

// Supabase's OTP length is a project setting, not a constant — anywhere from 6
// to 10 digits. Hardcoding 6 here meant a project configured for 8 produced a
// code that physically could not be typed into the field.
const MIN_CODE = 6
const MAX_CODE = 10

/**
 * How long a code is good for. Must match Supabase → Authentication → Providers
 * → Email → "Email OTP Expiration" (120), or the countdown lies in one
 * direction or the other. The email template states the same number.
 */
const CODE_TTL_SECONDS = 120

/** Gap before another code can be requested — Supabase rate-limits sends. */
const RESEND_COOLDOWN_SECONDS = 30

const mmss = (total: number) =>
  `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`

/**
 * Sign-in is an emailed code, in two steps, in a sheet. Nothing navigates — a
 * redirect would unmount the page and drop a running timer.
 */
export default function AccountSheet({ onClose, sendCode, verifyCode }: AccountSheetProps) {
  const [step, setStep]   = useState<"email" | "code" | "done">("email")
  const [email, setEmail] = useState("")
  const [code, setCode]   = useState("")
  const [busy, setBusy]   = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [expiresIn, setExpiresIn] = useState(0)
  const [cooldown,  setCooldown]  = useState(0)

  // Anchored to wall-clock deadlines rather than counting ticks. setInterval is
  // throttled or suspended in a backgrounded tab, so a phone that locks for a
  // minute would otherwise come back showing a timer that never moved — and
  // claim a dead code is still good.
  const expiryAt   = useRef(0)
  const cooldownAt = useRef(0)

  useEffect(() => {
    if (step !== "code") return
    const tick = () => {
      const now = Date.now()
      setExpiresIn(Math.max(0, Math.ceil((expiryAt.current - now) / 1000)))
      setCooldown(Math.max(0, Math.ceil((cooldownAt.current - now) / 1000)))
    }
    tick()
    const id = setInterval(tick, 500)
    return () => clearInterval(id)
  }, [step])

  const startTimers = useCallback(() => {
    const now = Date.now()
    expiryAt.current   = now + CODE_TTL_SECONDS * 1000
    cooldownAt.current = now + RESEND_COOLDOWN_SECONDS * 1000
    setExpiresIn(CODE_TTL_SECONDS)
    setCooldown(RESEND_COOLDOWN_SECONDS)
  }, [])

  const submitEmail = async () => {
    if (!email.trim() || busy) return
    setBusy(true); setError(null)
    const err = await sendCode(email)
    setBusy(false)
    if (err) { setError(err); return }
    startTimers()
    setStep("code")
  }

  const resend = async () => {
    if (cooldown > 0 || busy) return
    setBusy(true); setError(null); setCode("")
    const err = await sendCode(email)
    setBusy(false)
    if (err) { setError(err); return }
    startTimers()
  }

  const expired = step === "code" && expiresIn === 0

  const submitCode = async () => {
    if (code.trim().length < MIN_CODE || busy || expired) return
    setBusy(true); setError(null)
    const err = await verifyCode(email, code)
    setBusy(false)
    if (err) { setError(err); return }
    // Confirm rather than vanish. Closing on success looks identical to the
    // sheet being dismissed, and leaves the one question that matters — which
    // account am I now on — unanswered.
    setStep("done")
  }

  return (
    <Sheet label="Sign in" onClose={onClose} align="center"
      className="px-4 xs:px-5 pb-7 md:pb-5">
      <div className="flex items-center gap-3 py-3">
        <h2 className="flex-1 min-w-0 text-heading xs:text-title font-extrabold text-tx">
          {step === "email" ? "Sync across devices"
            : step === "code" ? "Check your email"
            : "You're signed in"}
        </h2>
        <button onClick={onClose} aria-label="Close"
          className="w-11 h-11 shrink-0 grid place-items-center rounded-control border border-border
            text-sub hover:text-tx hover:border-accent/40 transition-colors">
          <HiXMark size={17} />
        </button>
      </div>

      {step === "email" ? (
        <div className="flex flex-col gap-4 pt-1">
          {/* Leads with the promise, because the app's whole pitch is that you
              don't need this. */}
          <p className="text-body text-sub">
            Optional. Todoro works fully offline without an account — nothing leaves this
            device unless you sign in. Sign in only if you want the same tasks on more
            than one device.
          </p>

          <label className="flex flex-col gap-2">
            <span className="text-caption font-extrabold uppercase tracking-wider text-sub">Email</span>
            <span className="flex items-center gap-3 min-h-13 px-4 rounded-control border border-border bg-surface2">
              <HiEnvelope size={16} className="text-sub shrink-0" />
              <input
                type="email" inputMode="email" autoComplete="email" autoFocus
                value={email} onChange={e => setEmail(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); void submitEmail() } }}
                placeholder="you@example.com"
                className="focus-no-ring flex-1 min-w-0 bg-transparent outline-none text-body text-tx placeholder:text-sub" />
            </span>
          </label>

          {error && <p className="text-meta text-priority-high">{error}</p>}

          <button onClick={submitEmail} disabled={!email.trim() || busy}
            className="min-h-13 flex items-center justify-center gap-2 rounded-control bg-accent text-bg
              text-body font-extrabold disabled:opacity-40 hover:bg-accent-hover transition-all">
            {busy ? "Sending…" : "Send code"}
            {!busy && <HiArrowRight size={16} />}
          </button>
        </div>
      ) : step === "done" ? (
        <div className="flex flex-col items-center gap-3 xs:gap-4 pt-1 pb-2 text-center">
          <span className="w-14 h-14 xs:w-16 xs:h-16 shrink-0 grid place-items-center
            rounded-pill bg-accent/15 text-accent">
            <HiCheck size={28} />
          </span>
          <div className="flex flex-col gap-1.5 w-full min-w-0">
            <p className="text-body text-tx">
              {/* An address is one long unbreakable token; without this it
                  forces the sheet wider than the viewport on a narrow phone. */}
              Signed in as{" "}
              <span className="font-extrabold wrap-break-words">{email}</span>
            </p>
            {/* Says what actually changed. "Success" alone leaves the user
                guessing whether their existing tasks were affected. */}
            <p className="text-meta text-sub">
              Your tasks stay on this device and are backed up to your account.
              Sign in with this same email on another device to see them there.
            </p>
          </div>
          <button onClick={onClose}
            className="w-full min-h-13 flex items-center justify-center gap-2 rounded-control bg-accent text-bg
              text-body font-extrabold hover:bg-accent-hover transition-all">
            Done
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-4 pt-1">
          <p className="text-body text-sub">
            We sent a code to <span className="font-extrabold text-tx">{email}</span>.
            Enter it below.
          </p>

          <label className="flex flex-col gap-2">
            <span className="flex items-center gap-2">
              <span className="flex-1 text-caption font-extrabold uppercase tracking-wider text-sub">Code</span>
              <span className={`text-caption font-extrabold tabular-nums
                ${expired ? "text-priority-high" : expiresIn <= 30 ? "text-priority-mid" : "text-sub"}`}>
                {expired ? "Expired" : `Expires in ${mmss(expiresIn)}`}
              </span>
            </span>
            <input
              inputMode="numeric" autoComplete="one-time-code" autoFocus maxLength={MAX_CODE}
              value={code} disabled={expired}
              onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, MAX_CODE))}
              onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); void submitCode() } }}
              placeholder={expired ? "Request a new code" : "Paste or type your code"}
              className={`focus-no-ring min-h-13 px-4 rounded-control border bg-surface2
                text-title font-extrabold tracking-[0.2em] text-tx
                placeholder:text-body placeholder:font-semibold placeholder:tracking-normal placeholder:text-sub
                outline-none transition-colors disabled:opacity-50
                ${expired ? "border-priority-high/40" : "border-border focus:border-accent"}`} />
          </label>

          {error && <p className="text-meta text-priority-high">{error}</p>}
          {expired && !error && (
            <p className="text-meta text-sub">
              That code has expired. Send a new one — it only takes a moment.
            </p>
          )}

          <button onClick={submitCode} disabled={code.length < MIN_CODE || busy || expired}
            className="min-h-13 flex items-center justify-center gap-2 rounded-control bg-accent text-bg
              text-body font-extrabold disabled:opacity-40 hover:bg-accent-hover transition-all">
            {busy ? "Verifying…" : "Verify"}
            {!busy && <HiArrowRight size={16} />}
          </button>

          {/* Cooldown is on the resend, not the expiry: Supabase rate-limits
              sends, and letting someone hammer this would lock them out of the
              provider rather than help. */}
          <button onClick={resend} disabled={cooldown > 0 || busy}
            className="min-h-11 flex items-center justify-center gap-2 rounded-control border border-border
              text-meta font-extrabold text-tx disabled:opacity-40 hover:border-accent/40 transition-colors">
            <HiArrowPath size={14} />
            {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
          </button>

          <button onClick={() => { setStep("email"); setCode(""); setError(null) }}
            className="min-h-11 text-meta font-extrabold text-sub hover:text-tx transition-colors">
            Use a different email
          </button>
        </div>
      )}
    </Sheet>
  )
}
