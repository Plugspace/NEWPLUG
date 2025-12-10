import type { Metadata } from 'next';
import '../globals.css';
import { TRPCProvider } from '@/lib/trpc';

export const metadata: Metadata = {
  title: 'Plugspace Studio - Build Your Website',
  description: 'Voice-first AI website builder',
};

export default function StudioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <TRPCProvider>{children}</TRPCProvider>
      </body>
    </html>
  );
}
