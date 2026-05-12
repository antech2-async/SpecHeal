import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SpecHeal",
  description: "AI-assisted recovery cockpit for Playwright UI test failures"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
