import type { Metadata } from 'next';
import '../globals.css';
import { TRPCProvider } from '@/lib/trpc';

export const metadata: Metadata = {
  title: 'Plugspace Admin - Master Dashboard',
  description: 'Master Admin Dashboard for Plugspace.io',
};

export default function AdminLayout({
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
