'use client';

import { trpc } from '@plugspace/trpc-client';

export function useTemplates(category?: string, search?: string) {
  return trpc.template.list.useQuery({
    category: category === 'All' ? undefined : category,
    limit: 25,
    offset: 0,
  });
}
