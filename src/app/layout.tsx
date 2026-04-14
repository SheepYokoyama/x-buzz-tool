import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import './globals.css';

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
        {children}
      </body>
    </html>
  );
}
