import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Starter Project",
  description: "A clean starting point for building your site.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: [{ url: "/cap-renard-32.png", sizes: "32x32", type: "image/png" }, { url: "/cap-renard-48.png", sizes: "48x48", type: "image/png" }],
    shortcut: "/favicon.ico",
    apple: [{ url: "/cap-renard-180.png", sizes: "180x180", type: "image/png" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
