import type { Metadata } from "next";
import "./globals.css";
import SessionProvider from "@/components/providers/SessionProvider";
import QueryProvider from "@/components/providers/QueryProvider";

export const metadata: Metadata = {
  title: "Home Dashboard",
  description: "Interactive home dashboard for household management",
  themeColor: "#1f2937",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Dashboard",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body>
        <SessionProvider>
          <QueryProvider>{children}</QueryProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
