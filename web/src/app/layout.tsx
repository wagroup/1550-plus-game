import type { Metadata, Viewport } from 'next';
import { Inter, Inter_Tight } from 'next/font/google';
import '@fontsource/norwester';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-ui',
  display: 'swap',
});

const interTight = Inter_Tight({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'ClassBuzz — Classroom Team Quiz & Buzzer',
  description: 'Real-time Team A vs Team B classroom quiz and buzzer game for teachers and students.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#010516',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`h-full ${inter.variable} ${interTight.variable} scroll-smooth`}>
      <body className="min-h-full antialiased font-ui">{children}</body>
    </html>
  );
}
