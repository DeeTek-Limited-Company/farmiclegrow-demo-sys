import type { Metadata } from "next";
import { Providers } from "@/components/providers";
import NextTopLoader from "nextjs-toploader";
import "./globals.css";

export const metadata: Metadata = {
  title: "FarmicleGrow Platform",
  description: "FarmicleGrow Phase 1 platform foundation",
  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased" suppressHydrationWarning>
        <Providers>
          <NextTopLoader color="#1F6B2E" showSpinner={false} height={3} />
          {children}
        </Providers>
      </body>
    </html>
  );
}
