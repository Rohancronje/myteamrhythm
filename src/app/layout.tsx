import type { Metadata, Viewport } from "next";
import { Space_Grotesk, Inter } from "next/font/google";
import { getSession } from "@/lib/auth/server";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space",
  subsets: ["latin"],
});
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Rhythm — Volunteer Connection",
  description: "Help coaches stay connected to their volunteers — reach-outs, birthdays, and encouragement.",
  applicationName: "Rhythm",
  appleWebApp: { capable: true, title: "Rhythm", statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#0a0912",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // When signed in, the bottom tab bar becomes a fixed left sidebar on large
  // screens — so offset the content to clear it. Logged-out pages (login, public
  // pulse) have no sidebar and stay centered.
  const session = await getSession();
  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${inter.variable} h-full`}>
      <body className={`min-h-full ${session ? "lg:pl-60" : ""}`}>
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
