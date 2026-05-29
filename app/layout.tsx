import type { Metadata } from "next";
import "./globals.css";
import { VaultKeyProvider } from "@/lib/vault-context";

export const metadata: Metadata = {
  title: "Sherpa — The keychain for vibe coders",
  description:
    "One safe place for every API key. Step-by-step rotation guides. Your AI agents can use them without ever seeing them.",
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
