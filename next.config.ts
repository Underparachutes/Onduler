import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  // Allow phone-on-LAN testing of the dev server (Next blocks cross-origin
  // dev resources by default, which breaks client hydration over the LAN IP).
  // Set DEV_LAN_ORIGIN in .env.local to your laptop's LAN IP (e.g.
  // 192.168.86.23) when testing on a phone over the same wifi. Left unset in
  // production, so this is a no-op there.
  allowedDevOrigins: process.env.DEV_LAN_ORIGIN ? [process.env.DEV_LAN_ORIGIN] : [],
};

export default withSentryConfig(nextConfig, {
  silent: true,
});
