import { defineConfig } from "vitest/config";

// Two projects so pure logic runs in a fast `node` env while component tests
// get jsdom. The `@/*` alias resolves natively from tsconfig.
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/**/*.test.{ts,tsx}",
        "src/lib/supabase/database.types.ts",
        "src/app/**/{icon,apple-icon,manifest}.tsx",
      ],
    },
    projects: [
      {
        extends: true,
        test: {
          name: "node",
          environment: "node",
          include: ["src/lib/**/*.test.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "dom",
          environment: "jsdom",
          setupFiles: ["./vitest.setup.ts"],
          include: ["src/**/*.test.tsx"],
        },
      },
    ],
  },
});
