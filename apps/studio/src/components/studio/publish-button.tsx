'use client';

import { Rocket } from 'lucide-react';

interface PublishButtonProps {
  onClick: () => void;
}

export function PublishButton({ onClick }: PublishButtonProps) {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-6 right-6 flex items-center space-x-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-full shadow-lg shadow-emerald-600/30 transition-all hover:scale-105"
    >
      <Rocket className="w-5 h-5" />
      <span className="font-medium">Publish</span>
    </button>
  );
}
