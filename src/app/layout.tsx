import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import './globals.css';
import { Sidebar } from '@/components/layout/Sidebar';
import { AppProviders } from '@/components/layout/AppProviders';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Xpresso - X バズ投稿ツール',
  description: 'AIを使ってXのバズ投稿を自動生成・管理するツール',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className={geistSans.variable}>
      <body className="min-h-screen app-bg bg-grid antialiased">
        <AppProviders>
          <Sidebar />
          <main className="md:pl-[260px] min-h-screen">
            <div className="max-w-[1100px] mx-auto px-5 sm:px-8 lg:px-12 py-10 lg:py-12">
              {children}
            </div>
          </main>
        </AppProviders>
      </body>
    </html>
  );
}
