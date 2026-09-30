import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { LanguageProvider } from '@/components/LanguageContext';
import { SessionProvider } from 'next-auth/react';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'マウス管理システム',
  description: '実験用マウスの個体・繁殖・ケージ管理',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <SessionProvider>
          <LanguageProvider>
            {/* print: ユーティリティでアプリシェルの flex / min-height:100vh を印刷時に解除する。
                これがないと Chrome for Android の印刷で余剰な空白ページが出る（globals.css 参照） */}
            <div className="flex min-h-screen print:block print:min-h-0">
              <Sidebar />
              <div className="flex-1 flex flex-col min-w-0 print:block">
                <Header />
                <main className="flex-1 p-4 md:p-6 overflow-auto print:p-0 print:block print:flex-none print:overflow-visible">{children}</main>
              </div>
            </div>
          </LanguageProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
