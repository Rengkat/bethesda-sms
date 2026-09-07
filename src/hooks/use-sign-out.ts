"use client";

import { authClient } from "@/lib/auth-client";

/**
 * Signs the user out and hard-redirects to /login. A hard redirect
 * (window.location, not router.push) is deliberate here: sign-out needs
 * to guarantee every bit of client-side state (React Query caches, any
 * in-memory session data) is thrown away, not just navigated away from —
 * router.push alone left the sidebar/topbar showing stale session data
 * because nothing forced the (dashboard) layout's server-side session
 * check to re-run before this fix.
 */
export function useSignOut() {
  return async function signOut() {
    await authClient.signOut();
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = "/login";
  };
}
