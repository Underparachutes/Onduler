import type { Metadata, Viewport } from "next";
import { Courier_Prime, Manrope } from "next/font/google";
import { createClient } from "@/lib/supabase/server";
import { TimezoneSync } from "./components/TimezoneSync";
import { BottomNav } from "./components/BottomNav";
import { getWeekCeremonyState } from "./actions/reflections";
import { pacificDayKey } from "@/lib/periods";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const courierPrime = Courier_Prime({
  variable: "--font-courier-prime",
  subsets: ["latin"],
  weight: ["400", "700"],
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
  let pendingReflection = false;
  if (user) {
    const todayKey = pacificDayKey(new Date());
    const [{ data }, ceremony] = await Promise.all([
      supabase.from("user_settings").select("theme").eq("user_id", user.id).single(),
      getWeekCeremonyState(supabase, user.id, todayKey),
    ]);
    if (data?.theme) theme = data.theme;
    pendingReflection = ceremony.state === 'pending';
  }

  return (
    <html
      lang="en"
      data-theme={theme}
      className={`${manrope.variable} ${courierPrime.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-th-bg text-th-text pb-20 overflow-x-hidden">
        <TimezoneSync />
        <div className="mx-auto flex w-full max-w-lg flex-col flex-1">{children}</div>
        {user && <BottomNav pendingReflection={pendingReflection} />}
      </body>
    </html>
  );
}
