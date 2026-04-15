// src/app/layout.tsx 또는 app/layout.tsx
import type { Metadata } from 'next';
import "./globals.css";
// 경로에 맞게 HeaderComponent를 import 해주세요
import HeaderComponent from "@/components/HeaderComponent";

export const metadata: Metadata = {
  title: "OAuth Frontend",
  description: "OAuth frontend built with Next.js",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className="bg-gray-100 min-h-screen">
        <HeaderComponent /> {/* 👈 헤더 추가 */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
