import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";
import { ToastProvider } from "@/components/ui/Toast";

const inter = Inter({ subsets: ["latin"], preload: false });

export const metadata: Metadata = {
  title: "ArihantCRM - Research CRM",
  description: "Secure CRM with 2FA authentication",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-50 min-h-screen`}>
        <AuthProvider><ToastProvider>{children}</ToastProvider></AuthProvider>
      </body>
    </html>
  );
}
