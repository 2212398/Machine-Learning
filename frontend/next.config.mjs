import { withSentryConfig } from "@sentry/nextjs";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  outputFileTracingRoot: process.cwd(),
  webpack(config, { dev }) {
    if (!dev) {
      config.cache = false; // Avoid serializing large build strings into webpack's filesystem cache.
    }

    return config;
  },
  experimental: {
    // Next DevTools Segment Explorer can desync the RSC client manifest in webpack dev mode on this setup.
    devtoolSegmentExplorer: false,
  },
};

export default withSentryConfig(nextConfig, {
  silent: true,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  sourcemaps: {
    disable: true, // Disable build-time source-map processing to avoid webpack caching large map strings.
  },
  webpack: {
    treeshake: {
      removeDebugLogging: true, // Drop Sentry debug branches without changing runtime error capture.
      excludeReplayIframe: true, // Keep Replay smaller because this app does not need iframe recording.
      excludeReplayShadowDOM: true, // Keep Replay smaller because this app does not need shadow DOM recording.
    },
  },
});
