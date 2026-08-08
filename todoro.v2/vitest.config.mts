import { defineConfig } from "vitest/config";

// Pure functions only — no jsdom, no React, no setup file. The things worth
// testing here (streak arithmetic, points, id handling, backup round-trips, and
// later the sync merge) have no DOM in them, and keeping it that way is what
// makes the suite fast enough to actually run.
export default defineConfig({
  test: {
    include: ["lib/**/*.test.ts"],
    environment: "node",
    // Pinned so the DST tests mean something. Without it they'd pass trivially
    // on a machine in UTC and fail on one that observes a transition.
    env: { TZ: "America/New_York" },
  },
});
