import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/providers';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Plugspace Studio - Build Your Website',
  description: 'The voice-first website builder studio. Create, edit, and publish stunning websites.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-background text-white antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
