import { Suspense } from "react";
import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, Manrope } from "next/font/google";
import { ToastProvider } from "./components/Toast";
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

export const metadata: Metadata = {
  title: "Onduler",
  description: "Ride your waves. Hold your tides.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Onduler",
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
      <body className="min-h-[100dvh] flex flex-col bg-th-bg text-th-text pb-[calc(5rem+env(safe-area-inset-bottom))] overflow-x-hidden md:flex-row md:pb-0">
        <ToastProvider>
          <Suspense fallback={<Loading />}>
            <AppShell>{children}</AppShell>
          </Suspense>
        </ToastProvider>
      </body>
    </html>
  );
}
