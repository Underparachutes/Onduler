import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, Manrope } from "next/font/google";
import { createClient } from "@/lib/supabase/server";
import { TimezoneSync } from "./components/TimezoneSync";
import { BottomNav } from "./components/BottomNav";
import { SideNav } from "./components/SideNav";
import { fetchAnyCeremonyPending } from "./actions/reflections";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let theme = "default";
  let pendingAnchor = false;
  if (user) {
    const [{ data }, anyPending] = await Promise.all([
      supabase.from("user_settings").select("theme").eq("user_id", user.id).single(),
      fetchAnyCeremonyPending(),
    ]);
    if (data?.theme) theme = data.theme;
    pendingAnchor = anyPending;
  }

  return (
    <html
      lang="en"
      data-theme={theme}
      className={`${manrope.variable} ${ibmPlexMono.variable} h-full antialiased`}
    >
      <body className="min-h-[100dvh] flex flex-col bg-th-bg text-th-text pb-[calc(3.5rem+env(safe-area-inset-bottom))] overflow-x-hidden md:flex-row md:pb-0">
        <TimezoneSync />
        {user && <SideNav pendingAnchor={pendingAnchor} />}
        <div className="mx-auto flex w-full max-w-lg flex-col flex-1 md:mx-0 md:ml-12 md:mr-auto lg:max-w-4xl">{children}</div>
        {user && <BottomNav pendingAnchor={pendingAnchor} />}
      </body>
    </html>
  );
}
