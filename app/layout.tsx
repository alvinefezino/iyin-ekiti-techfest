import type { Metadata, Viewport } from "next";
import "@fontsource-variable/space-grotesk";
import "@fontsource-variable/jetbrains-mono";
import { SITE } from "@/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: { default: SITE.fullName, template: `%s | ${SITE.name}` },
  description: SITE.tagline,
  icons: { icon: SITE.logo },
  openGraph: { title: SITE.fullName, description: SITE.tagline, images: [SITE.logo] },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#04140e" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
