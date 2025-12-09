import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Plugspace.io - Voice-First AI Website Builder',
  description: 'Build beautiful websites with your voice. Powered by AI.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
