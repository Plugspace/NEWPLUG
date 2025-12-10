// ==============================================
// PLUGSPACE.IO TITAN v1.4 - VOICE SOCKET HOOK
// ==============================================
// React hook for WebSocket voice communication
// with real-time audio streaming and transcription
// ==============================================

import { useState, useEffect, useCallback, useRef } from 'react';

// ============ TYPES ============

export interface VoiceMessage {
  type: string;
  data?: any;
  error?: string;
  timestamp: number;
}

export interface VoiceSessionConfig {
  organizationId: string;
  projectId?: string;
  language?: string;
  features?: {
    transcription?: boolean;
    voiceCloning?: boolean;
    sentimentAnalysis?: boolean;
  };
}

export interface UseVoiceSocketReturn {
  // Connection
  connect: () => Promise<void>;
  disconnect: () => void;
  isConnected: boolean;
  sessionId: string | null;

  // Recording
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  isRecording: boolean;
  
  // Transmission
  sendAudio: (blob: Blob) => Promise<void>;
  sendText: (text: string) => void;

  // Reception
  lastMessage: VoiceMessage | null;
  transcript: string;
  partialTranscript: string;
  response: VoiceResponse | null;

  // Audio playback
  playResponse: () => void;
  stopPlayback: () => void;
  isPlaying: boolean;

  // Features
  toggleMute: () => void;
  isMuted: boolean;
  setLanguage: (lang: string) => void;
  currentLanguage: string;

  // Quality
  connectionQuality: 'excellent' | 'good' | 'fair' | 'poor' | 'disconnected';
  latency: number;

  // Errors
  error: Error | null;
  clearError: () => void;

  // Audio levels
  inputLevel: number;
  outputLevel: number;
}

export interface VoiceResponse {
  text: string;
  audio?: string; // base64
  emotion?: string;
  intent?: string;
  entities?: any[];
}

// ============ HOOK IMPLEMENTATION ============

export function useVoiceSocket(config: VoiceSessionConfig): UseVoiceSocketReturn {
  // Connection state
  const [isConnected, setIsConnected] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [connectionQuality, setConnectionQuality] = useState<UseVoiceSocketReturn['connectionQuality']>('disconnected');
  const [latency, setLatency] = useState(0);

  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  // Transcript state
  const [transcript, setTranscript] = useState('');
  const [partialTranscript, setPartialTranscript] = useState('');
  const [lastMessage, setLastMessage] = useState<VoiceMessage | null>(null);
  const [response, setResponse] = useState<VoiceResponse | null>(null);

  // Audio state
  const [inputLevel, setInputLevel] = useState(0);
  const [outputLevel, setOutputLevel] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // Language
  const [currentLanguage, setCurrentLanguage] = useState(config.language || 'en-US');

  // Error state
  const [error, setError] = useState<Error | null>(null);

  // Refs
  const wsRef = useRef<WebSocket | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);

  // ============ CONNECTION ============

  const connect = useCallback(async () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      // Get auth token
      const token = await getAuthToken();
      
      // Build WebSocket URL
      const wsUrl = new URL(process.env.NEXT_PUBLIC_VOICE_SERVER_URL || 'ws://localhost:4001');
      wsUrl.searchParams.set('token', token);
      wsUrl.searchParams.set('orgId', config.organizationId);
      if (config.projectId) {
        wsUrl.searchParams.set('projectId', config.projectId);
      }

      // Create WebSocket
      const ws = new WebSocket(wsUrl.toString());
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('Voice WebSocket connected');
        setIsConnected(true);
        setConnectionQuality('good');
        reconnectAttempts.current = 0;
        
        // Start ping interval
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
          }
        }, 30000);
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          handleMessage(message);
        } catch (e) {
          console.error('Failed to parse WebSocket message:', e);
        }
      };

      ws.onerror = (event) => {
        console.error('Voice WebSocket error:', event);
        setError(new Error('WebSocket connection error'));
      };

      ws.onclose = (event) => {
        console.log('Voice WebSocket closed:', event.code, event.reason);
        setIsConnected(false);
        setConnectionQuality('disconnected');
        setSessionId(null);
        
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
        }

        // Attempt reconnection
        if (event.code !== 1000 && reconnectAttempts.current < 5) {
          reconnectAttempts.current++;
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
          setTimeout(connect, delay);
        }
      };

    } catch (err) {
      setError(err instanceof Error ? err : new Error('Connection failed'));
    }
  }, [config.organizationId, config.projectId]);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close(1000, 'User disconnected');
      wsRef.current = null;
    }

    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
    }

    stopRecording();
    setIsConnected(false);
    setSessionId(null);
  }, []);

  // ============ MESSAGE HANDLING ============

  const handleMessage = useCallback((message: VoiceMessage) => {
    setLastMessage({ ...message, timestamp: Date.now() });

    switch (message.type) {
      case 'connected':
        setSessionId(message.data?.sessionId);
        break;

      case 'transcript':
        if (message.data?.isFinal) {
          setTranscript(prev => prev + ' ' + message.data.text);
          setPartialTranscript('');
        } else {
          setPartialTranscript(message.data?.text || '');
        }
        break;

      case 'voice_response':
      case 'text_response':
        setResponse({
          text: message.data?.text,
          audio: message.data?.audio,
          emotion: message.data?.emotion,
          intent: message.data?.intent,
          entities: message.data?.entities,
        });
        
        // Auto-play audio response
        if (message.data?.audio) {
          playAudioResponse(message.data.audio);
        }
        break;

      case 'recording_started':
        setIsRecording(true);
        break;

      case 'recording_stopped':
        setIsRecording(false);
        break;

      case 'heartbeat':
        // Update latency
        const latencyMs = Date.now() - (message.data?.timestamp || Date.now());
        setLatency(latencyMs);
        updateConnectionQuality(latencyMs);
        break;

      case 'error':
        setError(new Error(message.error || 'Unknown error'));
        break;

      case 'language_updated':
        setCurrentLanguage(message.data?.language || currentLanguage);
        break;
    }
  }, [currentLanguage]);

  // ============ RECORDING ============

  const startRecording = useCallback(async () => {
    try {
      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000,
        },
      });

      mediaStreamRef.current = stream;

      // Set up audio analysis
      audioContextRef.current = new AudioContext();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      source.connect(analyserRef.current);

      // Start level monitoring
      monitorInputLevel();

      // Create MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      });

      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0 && wsRef.current?.readyState === WebSocket.OPEN && !isMuted) {
          sendAudioChunk(event.data);
        }
      };

      // Start recording with 100ms chunks
      mediaRecorder.start(100);

      // Notify server
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'start_recording' }));
      }

      setIsRecording(true);

    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to start recording'));
    }
  }, [isMuted]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    // Notify server
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'stop_recording' }));
    }

    setIsRecording(false);
    setInputLevel(0);
  }, []);

  // ============ AUDIO SENDING ============

  const sendAudioChunk = useCallback(async (blob: Blob) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      return;
    }

    // Convert to base64
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = (reader.result as string).split(',')[1];
      wsRef.current?.send(JSON.stringify({
        type: 'audio',
        data: base64,
      }));
    };
    reader.readAsDataURL(blob);
  }, []);

  const sendAudio = useCallback(async (blob: Blob) => {
    await sendAudioChunk(blob);
  }, [sendAudioChunk]);

  const sendText = useCallback((text: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'text_input',
        text,
      }));
    }
  }, []);

  // ============ AUDIO PLAYBACK ============

  const playAudioResponse = useCallback((audioBase64: string) => {
    if (!audioBase64) return;

    try {
      const audio = new Audio(`data:audio/mp3;base64,${audioBase64}`);
      audioPlayerRef.current = audio;
      
      audio.onplay = () => setIsPlaying(true);
      audio.onended = () => setIsPlaying(false);
      audio.onerror = () => {
        setIsPlaying(false);
        console.error('Audio playback error');
      };

      audio.play();
    } catch (err) {
      console.error('Failed to play audio:', err);
    }
  }, []);

  const playResponse = useCallback(() => {
    if (response?.audio) {
      playAudioResponse(response.audio);
    }
  }, [response, playAudioResponse]);

  const stopPlayback = useCallback(() => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current = null;
      setIsPlaying(false);
    }
  }, []);

  // ============ FEATURES ============

  const toggleMute = useCallback(() => {
    setIsMuted(prev => !prev);
  }, []);

  const setLanguage = useCallback((lang: string) => {
    setCurrentLanguage(lang);
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'set_language',
        language: lang,
      }));
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // ============ MONITORING ============

  const monitorInputLevel = useCallback(() => {
    if (!analyserRef.current) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    
    const updateLevel = () => {
      if (!analyserRef.current) return;
      
      analyserRef.current.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
      setInputLevel(average / 255);
      
      if (isRecording) {
        requestAnimationFrame(updateLevel);
      }
    };

    updateLevel();
  }, [isRecording]);

  const updateConnectionQuality = useCallback((latencyMs: number) => {
    if (latencyMs < 100) {
      setConnectionQuality('excellent');
    } else if (latencyMs < 300) {
      setConnectionQuality('good');
    } else if (latencyMs < 500) {
      setConnectionQuality('fair');
    } else {
      setConnectionQuality('poor');
    }
  }, []);

  // ============ CLEANUP ============

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    // Connection
    connect,
    disconnect,
    isConnected,
    sessionId,

    // Recording
    startRecording,
    stopRecording,
    isRecording,

    // Transmission
    sendAudio,
    sendText,

    // Reception
    lastMessage,
    transcript,
    partialTranscript,
    response,

    // Playback
    playResponse,
    stopPlayback,
    isPlaying,

    // Features
    toggleMute,
    isMuted,
    setLanguage,
    currentLanguage,

    // Quality
    connectionQuality,
    latency,

    // Errors
    error,
    clearError,

    // Levels
    inputLevel,
    outputLevel,
  };
}

// ============ HELPERS ============

async function getAuthToken(): Promise<string> {
  // In production, this would get the Firebase auth token
  // For now, return empty string for development
  if (typeof window !== 'undefined') {
    // @ts-ignore
    const auth = window.firebase?.auth?.();
    if (auth?.currentUser) {
      return auth.currentUser.getIdToken();
    }
  }
  return '';
}

export default useVoiceSocket;
