'use client';

import { useCallback, useEffect, useRef } from 'react';
import { Mic, MicOff } from 'lucide-react';
import { useVoiceStore } from '@/stores/voice-store';
import { cn } from '@/lib/utils';

export function VoiceButton() {
  const { isListening, startListening, stopListening, setTranscript, setError } = useVoiceStore();
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    // Check for browser support
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = 'en-US';

        recognitionRef.current.onresult = (event) => {
          const results = event.results;
          const lastResult = results[results.length - 1];
          if (lastResult) {
            const transcript = lastResult[0]?.transcript || '';
            const confidence = lastResult[0]?.confidence || 0;
            setTranscript(transcript, confidence);
          }
        };

        recognitionRef.current.onerror = (event) => {
          setError(event.error);
        };

        recognitionRef.current.onend = () => {
          if (isListening) {
            recognitionRef.current?.start();
          }
        };
      }
    }

    return () => {
      recognitionRef.current?.stop();
    };
  }, [isListening, setTranscript, setError]);

  const toggleListening = useCallback(() => {
    if (!recognitionRef.current) {
      setError('Speech recognition not supported in this browser');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      stopListening();
    } else {
      recognitionRef.current.start();
      startListening();
    }
  }, [isListening, startListening, stopListening, setError]);

  return (
    <button
      onClick={toggleListening}
      className={cn(
        'relative p-3 rounded-full transition-all duration-300',
        isListening
          ? 'bg-primary-700 voice-active'
          : 'bg-surface hover:bg-surface-light border border-surface-light'
      )}
      aria-label={isListening ? 'Stop voice input' : 'Start voice input'}
    >
      {isListening ? (
        <Mic className="w-5 h-5 text-white" />
      ) : (
        <MicOff className="w-5 h-5 text-gray-400" />
      )}
    </button>
  );
}

// Add types for Speech Recognition API
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}
