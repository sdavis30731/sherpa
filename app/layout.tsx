import type { Metadata } from "next";
import "./globals.css";
import { VaultKeyProvider } from "@/lib/vault-context";

export const metadata: Metadata = {
  title: "SherpaKeys — Let AI work on your app. Don't hand it the keys.",
  description:
    "The AI firewall for AI-built apps. SherpaKeys lets Claude, Cursor, and Codex operate on your stack safely — without exposing your secrets or giving them unchecked power. Zero-knowledge encrypted credential vault, write-action approval, and a Go-Live Check that runs before you ship.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full">
        <VaultKeyProvider>{children}</VaultKeyProvider>
      </body>
    </html>
  );
}
