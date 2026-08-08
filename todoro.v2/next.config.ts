import { withSerwist } from "@serwist/turbopack";
import path from "node:path";
import { fileURLToPath } from "node:url";

// next-pwa was replaced here. It hooks `nextConfig.webpack()`, and Next 16
// builds with Turbopack, so it never ran — `public/sw.js` was a stale dev
// artifact served as a static file, and the runtimeCaching block below it was
// dead config. Serwist's Turbopack integration builds the worker through a
// prerendered route handler instead (see app/serwist/[path]/route.ts).
const nextConfig = {
  reactStrictMode: true,
  // The repo root holds a stub package-lock.json, so Turbopack inferred the
  // workspace root one level too high and warned on every build. The app is
  // the root; Vercel is already configured with todoro.v2 as its Root Directory.
  turbopack: {
    root: path.dirname(fileURLToPath(import.meta.url)),
  },
};

export default withSerwist(nextConfig);
