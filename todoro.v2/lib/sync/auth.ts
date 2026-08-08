"use client"

import { useCallback, useEffect, useState } from "react"
import { getSupabase, isConfigured } from "./client"

export interface AuthUser { id: string; email: string | null }

export type AuthStatus = "unconfigured" | "loading" | "signed-out" | "signed-in"

/** Owned by app/page.tsx and passed down — see the note on useAuth. */
export type AuthApi = ReturnType<typeof useAuth>

/**
 * Email one-time code, not a clickable magic link.
 *
 * The link flow is PKCE, which binds the code verifier to the browser that
 * requested it — request on a laptop, open the mail on a phone, and it fails.
 * Worse for an installed PWA: tapping a link in iOS Mail opens Safari, whose
 * storage is separate from the standalone app, so the session lands somewhere
 * the PWA can't see it. A typed code has neither problem, needs no callback
 * route, and works on every Vercel preview origin without an allow-list.
 */
export function useAuth() {
  const [status, setStatus] = useState<AuthStatus>(
    () => (isConfigured() ? "loading" : "unconfigured"),
  )
  const [user, setUser] = useState<AuthUser | null>(null)

  useEffect(() => {
    if (!isConfigured()) return
    let alive = true
    let unsubscribe: (() => void) | undefined

    void (async () => {
      const supabase = await getSupabase()
      if (!supabase || !alive) return

      const { data } = await supabase.auth.getSession()
      if (!alive) return
      const s = data.session
      setUser(s ? { id: s.user.id, email: s.user.email ?? null } : null)
      setStatus(s ? "signed-in" : "signed-out")

      const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
        if (!alive) return
        setUser(session ? { id: session.user.id, email: session.user.email ?? null } : null)
        setStatus(session ? "signed-in" : "signed-out")
      })
      unsubscribe = () => sub.subscription.unsubscribe()
    })()

    return () => { alive = false; unsubscribe?.() }
  }, [])

  const sendCode = useCallback(async (email: string): Promise<string | null> => {
    const supabase = await getSupabase()
    if (!supabase) return "Sync isn't configured on this build."
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: true },
    })
    return error ? error.message : null
  }, [])

  const verifyCode = useCallback(async (email: string, token: string): Promise<string | null> => {
    const supabase = await getSupabase()
    if (!supabase) return "Sync isn't configured on this build."
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: token.trim(),
      type: "email",
    })
    return error ? error.message : null
  }, [])

  /**
   * Never touches local data. autoRefreshToken can emit SIGNED_OUT after
   * repeated failures offline, and if signing out wiped the device that would
   * be unrecoverable. Erasing is a separate, explicit action.
   */
  const signOut = useCallback(async () => {
    const supabase = await getSupabase()
    await supabase?.auth.signOut()
  }, [])

  return { status, user, sendCode, verifyCode, signOut }
}
