import "@cicada/ui/tokens.css";
import "./globals.css";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cicada",
  description: "Personal finance for cross-border families.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
