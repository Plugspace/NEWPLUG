'use client';

import { motion } from 'framer-motion';

interface VoiceIndicatorProps {
  isActive: boolean;
}

export default function VoiceIndicator({ isActive }: VoiceIndicatorProps) {
  if (!isActive) return null;

  return (
    <div className="flex items-center gap-2 text-[#8b5cf6]">
      <motion.div
        className="w-2 h-2 bg-[#8b5cf6] rounded-full"
        animate={{
          scale: [1, 1.5, 1],
          opacity: [1, 0.5, 1],
        }}
        transition={{
          duration: 1,
          repeat: Infinity,
        }}
      />
      <span className="text-sm font-medium">Listening...</span>
    </div>
  );
}
