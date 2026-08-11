import type { SupabaseClient } from "@supabase/supabase-js"

/**
 * Lazily created, and null when sync isn't configured.
 *
 * The null branch is not defensive padding — it is the mechanism that keeps the
 * promise that signed-out behaviour is identical to before sync existed. A
 * clone without .env.local, a preview deploy missing its vars, a botched
 * dashboard setting: all of them render "Sync unavailable" and change nothing
 * else. No call site may assume a client exists.
 *
 * Loaded through a dynamic import so the ~40KB of Supabase never enters the
 * bundle for someone who never signs in.
 */

let cached: SupabaseClient | null | undefined

export function isConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  )
}

export async function getSupabase(): Promise<SupabaseClient | null> {
  if (cached !== undefined) return cached
  if (!isConfigured() || typeof window === "undefined") {
    cached = null
    return cached
  }

  const { createClient } = await import("@supabase/supabase-js")
  cached = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        // Sign-in is a 6-digit code typed into a sheet, so there is no redirect
        // to parse and no callback route.
        detectSessionInUrl: false,
        // Dashed, deliberately OUTSIDE the `todoro:` namespace. exportPayload()
        // collects every todoro:-prefixed key, so a session token stored there
        // would be written into every backup file the user downloads and might
        // share. Consequence to remember: "Reset all data" clears todoro: keys
        // only, so it does NOT sign out — that has to be explicit.
        storageKey: "todoro-auth",
      },
      global: {
        // Belt and braces against the service worker or any intermediary
        // serving a cached row. A stale pull would be merged as authoritative
        // and pushed back as the truth.
        fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }),
      },
    },
  )
  return cached
}

/** Test seam. */
export function __resetClientForTests() {
  cached = undefined
}
