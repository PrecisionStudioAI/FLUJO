import type { Metadata } from "next";
import "./globals.css";
import { createLogger } from "@/utils/logger";
import AppWrapper from "@/frontend/components/AppWrapper";

const log = createLogger("app/layout");

export const metadata: Metadata = {
  title: "FLUJO",
  description:
    "A browser-based application for managing models, MCP servers, flows and chat interactions",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  log.debug("Rendering RootLayout");
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <AppWrapper>{children}</AppWrapper>
      </body>
    </html>
  );
}
