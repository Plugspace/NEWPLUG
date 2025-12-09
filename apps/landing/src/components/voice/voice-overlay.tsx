'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, X } from 'lucide-react';
import { useVoiceStore } from '@/stores/voice-store';

export function VoiceOverlay() {
  const { isListening, transcript, confidence, stopListening, reset } = useVoiceStore();

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        stopListening();
        reset();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [stopListening, reset]);

  return (
    <AnimatePresence>
      {isListening && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="relative flex flex-col items-center"
          >
            {/* Close button */}
            <button
              onClick={() => {
                stopListening();
                reset();
              }}
              className="absolute top-0 right-0 p-2 text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>

            {/* Microphone with animated rings */}
            <div className="relative w-40 h-40 flex items-center justify-center mb-8">
              {/* Animated rings */}
              <div className="absolute inset-0 rounded-full border-2 border-primary-700/30 animate-ring-1" />
              <div className="absolute inset-0 rounded-full border-2 border-primary-700/30 animate-ring-2" />
              <div className="absolute inset-0 rounded-full border-2 border-primary-700/30 animate-ring-3" />
              
              {/* Microphone icon */}
              <div className="relative w-24 h-24 bg-primary-700 rounded-full flex items-center justify-center shadow-lg shadow-primary-700/50">
                <Mic className="w-12 h-12 text-white" />
              </div>
            </div>

            {/* Sound bars */}
            <div className="flex items-end justify-center space-x-1 h-12 mb-6">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className={`sound-bar h-8 animate-wave-${i}`}
                />
              ))}
            </div>

            {/* Listening text */}
            <p className="text-gray-400 text-sm mb-4">
              Listening... (Press ESC to cancel)
            </p>

            {/* Transcript */}
            {transcript && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-md text-center"
              >
                <p className="text-white text-lg mb-2">"{transcript}"</p>
                {confidence > 0 && (
                  <p className="text-gray-500 text-xs">
                    Confidence: {(confidence * 100).toFixed(0)}%
                  </p>
                )}
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
