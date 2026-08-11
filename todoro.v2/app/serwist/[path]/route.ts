import { createSerwistRoute } from "@serwist/turbopack";

// Turbopack has no plugin API yet, so Serwist builds the worker through a
// prerendered route handler (`dynamic: "force-static"`) rather than a bundler
// plugin. The response carries `Service-Worker-Allowed: /`, which is what lets
// a worker served from /serwist/sw.js still control the whole origin.
export const { dynamic, dynamicParams, revalidate, generateStaticParams, GET } = createSerwistRoute({
  swSrc: "app/sw.ts",
  // esbuild proper, not the wasm build — it's already a dependency and native
  // is markedly faster on a cold Vercel build.
  useNativeEsbuild: true,
});
