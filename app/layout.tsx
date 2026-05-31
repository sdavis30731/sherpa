import type { Metadata } from "next";
import "./globals.css";
import { VaultKeyProvider } from "@/lib/vault-context";

export const metadata: Metadata = {
  title: "SherpaKeys — Don't leave Camp 4 without your Sherpa",
  description:
    "Launch confidence for AI-built apps. Run a Go-Live Check on every credential your app depends on — before you ship. Zero-knowledge encrypted. Step-by-step rotation guides. Your AI agents can use them without ever seeing them.",
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
