import type { NextConfig } from "next";

import { collectBuildInfo } from "./src/lib/collect-build-info";

const nextConfig: NextConfig = {
  env: {
    // Commit SHA, build time, codebase trivia and coverage for the About
    // page, computed once when the config loads (see src/lib/collect-build-info.ts)
    // and inlined at build time — read back via readBuildInfo().
    BUILD_INFO: JSON.stringify(collectBuildInfo(process.cwd())),
  },
};

export default nextConfig;
