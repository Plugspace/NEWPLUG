/**
 * tRPC Client Setup
 * Shared client configuration for all frontend apps
 */

import { createTRPCReact } from '@trpc/react-query';
import { httpBatchLink } from '@trpc/client';
import type { AppRouter } from '@plugspace/backend/src/router';

export const trpc = createTRPCReact<AppRouter>();

export function getBaseUrl() {
  if (typeof window !== 'undefined') {
    // Browser should use relative URL
    return '';
  }
  // SSR should use absolute URL
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  // Development
  return `http://localhost:3001`;
}

export function createTRPCClient() {
  return trpc.createClient({
    links: [
      httpBatchLink({
        url: `${getBaseUrl()}/trpc`,
        headers: () => {
          const token = typeof window !== 'undefined' 
            ? localStorage.getItem('firebaseToken') 
            : null;
          
          return token ? {
            authorization: `Bearer ${token}`,
          } : {};
        },
      }),
    ],
  });
}
