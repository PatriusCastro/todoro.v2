/// <reference lib="esnext" />
/// <reference lib="webworker" />
import { defaultCache } from "@serwist/turbopack/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { NetworkOnly, Serwist } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    // Must come first — routes are first-match-wins, and `defaultCache` ends in
    // a catch-all. Todoro's sync layer treats a pulled row as authoritative, so
    // a cached response here would be merged as real state and pushed back as
    // the truth. This route has to exist before any Supabase call ships.
    {
      matcher: ({ url }) => url.hostname.endsWith(".supabase.co"),
      handler: new NetworkOnly(),
    },
    ...defaultCache,
  ],
  fallbacks: {
    entries: [
      {
        url: "/offline.html",
        matcher: ({ request }) => request.destination === "document",
      },
    ],
  },
});

// Carried over from the old hand-edited public/sw.js, where it was the only
// copy. useNotifications() posts timer alerts through the registration
// (hooks/useNotifications.ts), so without this a tap opens a second window
// instead of focusing the one already running the session.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          return client.focus();
        }
      }
      return self.clients.openWindow("/");
    }),
  );
});

serwist.addEventListeners();
