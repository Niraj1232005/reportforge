import type { Metadata } from "next";
import { AuthProvider } from "@/components/AuthProvider";
import { DataProvider } from "@/components/DataProvider";
import AppShell from "@/components/AppShell";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ToastProvider } from "@/components/ToastProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "ReportForge",
  description: "Professional Report Generator",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-app antialiased text-app">
        <ThemeProvider>
          <ToastProvider>
            <DataProvider>
              <AuthProvider>
                <AppShell>{children}</AppShell>
              </AuthProvider>
            </DataProvider>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
