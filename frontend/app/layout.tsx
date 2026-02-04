import './globals.css';
import type { Metadata } from 'next';
import { Cormorant_Garamond, Source_Serif_4 } from 'next/font/google';

import { Header } from '../components/Header';
import { ThemeProvider } from '../components/ThemeProvider';

const displayFont = Cormorant_Garamond({
  subsets: ['latin', 'cyrillic'],
  weight: ['400', '600'],
  variable: '--font-display',
});

const bodyFont = Source_Serif_4({
  subsets: ['latin', 'cyrillic'],
  weight: ['400', '600'],
  variable: '--font-body',
});

export const metadata: Metadata = {
  title: 'Шоирон — портал стихотворений',
  description: 'Публичный портал для чтения, поиска и сохранения поэзии форсу-таджикских авторов.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru" className={`${displayFont.variable} ${bodyFont.variable}`} suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <Header />
          <main className="container-shell py-10">{children}</main>
        </ThemeProvider>
      </body>
    </html>
  );
}