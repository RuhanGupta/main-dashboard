import type { Metadata } from 'next';
import { Geist, Geist_Mono, Lora } from 'next/font/google';
import './globals.css';
import { AppShell } from '@/components/shared/AppShell';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });
const lora = Lora({ variable: '--font-lora', subsets: ['latin'], style: ['normal', 'italic'] });

export const metadata: Metadata = {
  title: 'Student Dashboard',
  description: 'Your personal student life command center',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} ${lora.variable} h-full`}>
      <body className="min-h-full text-foreground">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
