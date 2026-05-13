import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "StyleTrip AI",
  description: "AI outfit inspiration boards for travel style planning.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
