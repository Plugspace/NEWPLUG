import { create } from 'zustand';

interface VoiceState {
  isListening: boolean;
  isProcessing: boolean;
  transcript: string;
  confidence: number;
  error: string | null;
  
  startListening: () => void;
  stopListening: () => void;
  setTranscript: (transcript: string, confidence: number) => void;
  setProcessing: (processing: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

export const useVoiceStore = create<VoiceState>((set) => ({
  isListening: false,
  isProcessing: false,
  transcript: '',
  confidence: 0,
  error: null,

  startListening: () => set({ isListening: true, transcript: '', error: null }),
  stopListening: () => set({ isListening: false }),
  setTranscript: (transcript, confidence) => set({ transcript, confidence }),
  setProcessing: (isProcessing) => set({ isProcessing }),
  setError: (error) => set({ error, isListening: false }),
  reset: () => set({ 
    isListening: false, 
    isProcessing: false, 
    transcript: '', 
    confidence: 0, 
    error: null 
  }),
}));
