"use client"

import { useState } from "react"
import { HiArrowRight, HiEnvelope, HiXMark } from "react-icons/hi2"
import Sheet from "./shared/Sheet"

interface AccountSheetProps {
  onClose: () => void
  sendCode:   (email: string) => Promise<string | null>
  verifyCode: (email: string, token: string) => Promise<string | null>
}

/**
 * Sign-in is a 6-digit code, in two steps, in a sheet. Nothing navigates — a
 * redirect would unmount the page and drop a running timer.
 */
export default function AccountSheet({ onClose, sendCode, verifyCode }: AccountSheetProps) {
  const [step, setStep]   = useState<"email" | "code">("email")
  const [email, setEmail] = useState("")
  const [code, setCode]   = useState("")
  const [busy, setBusy]   = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submitEmail = async () => {
    if (!email.trim() || busy) return
    setBusy(true); setError(null)
    const err = await sendCode(email)
    setBusy(false)
    if (err) { setError(err); return }
    setStep("code")
  }

  const submitCode = async () => {
    if (code.trim().length < 6 || busy) return
    setBusy(true); setError(null)
    const err = await verifyCode(email, code)
    setBusy(false)
    if (err) { setError(err); return }
    onClose()
  }

  return (
    <Sheet label="Sign in" onClose={onClose} className="px-4 xs:px-5 pb-7">
      <div className="flex items-center gap-3 py-3">
        <h2 className="flex-1 text-title font-extrabold text-tx">
          {step === "email" ? "Sync across devices" : "Check your email"}
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
      ) : (
        <div className="flex flex-col gap-4 pt-1">
          <p className="text-body text-sub">
            We sent a 6-digit code to <span className="font-extrabold text-tx">{email}</span>.
            Enter it below.
          </p>

          <label className="flex flex-col gap-2">
            <span className="text-caption font-extrabold uppercase tracking-wider text-sub">Code</span>
            <input
              inputMode="numeric" autoComplete="one-time-code" autoFocus maxLength={6}
              value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, ""))}
              onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); void submitCode() } }}
              placeholder="000000"
              className="focus-no-ring min-h-13 px-4 rounded-control border border-border bg-surface2
                text-title font-extrabold tracking-[0.3em] text-tx placeholder:text-sub
                placeholder:tracking-[0.3em] outline-none focus:border-accent transition-colors" />
          </label>

          {error && <p className="text-meta text-priority-high">{error}</p>}

          <button onClick={submitCode} disabled={code.length < 6 || busy}
            className="min-h-13 flex items-center justify-center gap-2 rounded-control bg-accent text-bg
              text-body font-extrabold disabled:opacity-40 hover:bg-accent-hover transition-all">
            {busy ? "Verifying…" : "Verify"}
            {!busy && <HiArrowRight size={16} />}
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
