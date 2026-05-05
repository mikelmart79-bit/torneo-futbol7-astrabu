import type { Metadata, Viewport } from "next";
import "./globals.css";
import AppShell from "@/components/AppShell";

export const metadata: Metadata = {
  title: "Torneo Fútbol 7 Astrabudua",
  description: "App oficial del Torneo Fútbol 7 Astrabudua",
  applicationName: "Torneo Astrabudua",
};

export const viewport: Viewport = {
  themeColor: "#000000",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="bg-black">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}