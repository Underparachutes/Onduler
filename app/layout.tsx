import { Suspense } from "react";
import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, Manrope } from "next/font/google";
import { ToastProvider } from "./components/Toast";
import { DekProvider } from "./components/DekProvider";
import { UnlockGate } from "./components/UnlockGate";
import { AppShell } from "./AppShell";
import Loading from "./loading";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
});

// iOS launch screens (apple-touch-startup-image). An installed PWA shows a
// blank screen between tap and first paint unless an exact-resolution
// startup image matches the device; these mirror app/loading.tsx (wordmark
// on the app background) so cold launch reads as the loading screen.
// Regenerate with scripts/generate-splash.sh. Dimensions are CSS px.
const SPLASH_DEVICES = [
  { w: 440, h: 956, dpr: 3 }, // iPhone 16 Pro Max
  { w: 430, h: 932, dpr: 3 }, // 14/15 Pro Max, 15/16 Plus
  { w: 428, h: 926, dpr: 3 }, // 12/13 Pro Max, 14 Plus
  { w: 414, h: 896, dpr: 3 }, // XS Max, 11 Pro Max
  { w: 414, h: 896, dpr: 2 }, // XR, 11
  { w: 402, h: 874, dpr: 3 }, // 16 Pro
  { w: 393, h: 852, dpr: 3 }, // 14 Pro, 15, 15 Pro, 16
  { w: 390, h: 844, dpr: 3 }, // 12, 13, 14
  { w: 375, h: 812, dpr: 3 }, // X, XS, 11 Pro, 12/13 mini
  { w: 375, h: 667, dpr: 2 }, // 8, SE 2/3
];

const startupImage = SPLASH_DEVICES.flatMap(({ w, h, dpr }) =>
  (["dark", "light"] as const).map((mode) => ({
    url: `/splash/splash-${w * dpr}x${h * dpr}-${mode}.png`,
    media: `screen and (device-width: ${w}px) and (device-height: ${h}px) and (-webkit-device-pixel-ratio: ${dpr}) and (orientation: portrait) and (prefers-color-scheme: ${mode})`,
  })),
);

export const metadata: Metadata = {
  title: "Onduler",
  description: "Ride your waves. Hold your tides.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Onduler",
    startupImage,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#5a6f55",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-theme="biarritz"
      className={`${manrope.variable} ${ibmPlexMono.variable} h-full antialiased`}
    >
      <body className="min-h-[100dvh] flex flex-col bg-th-bg text-th-text pb-[calc(5rem+env(safe-area-inset-bottom))] overflow-x-hidden desktop:flex-row desktop:pb-0">
        <ToastProvider>
          <DekProvider>
            <Suspense fallback={<Loading />}>
              <AppShell>{children}</AppShell>
            </Suspense>
            <UnlockGate />
          </DekProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
