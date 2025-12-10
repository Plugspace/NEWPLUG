'use client';

import StudioInterface from '@/components/StudioInterface';

export default function StudioPage({ params }: { params: { id: string } }) {
  return <StudioInterface projectId={params.id} />;
}
