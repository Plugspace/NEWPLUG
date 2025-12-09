import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/providers';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Plugspace.io - Voice-First AI Website Builder',
  description: 'Build stunning websites with the power of your voice. Plugspace Titan combines AI and voice commands to revolutionize web development.',
  keywords: ['website builder', 'AI', 'voice-first', 'no-code', 'web development'],
  openGraph: {
    title: 'Plugspace.io - Voice-First AI Website Builder',
    description: 'Build stunning websites with the power of your voice.',
    url: 'https://plugspace.io',
    siteName: 'Plugspace',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Plugspace.io - Voice-First AI Website Builder',
    description: 'Build stunning websites with the power of your voice.',
  },
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
