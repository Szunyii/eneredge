import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { hu } from "@/i18n/hu";
// Archivo with its width axis, served by this app (latin and latin-ext subsets).
import "@fontsource-variable/archivo/wdth.css";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: hu.common.appName, template: `%s – ${hu.common.appName}` },
  description: hu.common.description,
  // Everything here sits behind a login; there is nothing for a search engine.
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#edf0f3",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="hu">
      <body>{children}</body>
    </html>
  );
}
