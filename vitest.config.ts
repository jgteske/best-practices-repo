import { defineConfig } from "vitest/config";

// Runs the React examples' *.test.tsx files in a simulated DOM (jsdom), so the
// React pages can show tests that really pass - the React counterpart of
// `npm run check:js` executing the JavaScript examples.
export default defineConfig({
  test: {
    include: ["examples/react/**/*.test.{ts,tsx}"],
    environment: "jsdom",
    setupFiles: ["examples/react/test-setup.ts"],
    // Undo every vi.spyOn / vi.stubGlobal after each test.
    restoreMocks: true,
    unstubGlobals: true,
  },
});
