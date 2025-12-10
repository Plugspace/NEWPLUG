// ==============================================
// PLUGSPACE.IO TITAN v1.4 - VOICE TRIGGER COMPONENT
// ==============================================
// Animated microphone button with real-time
// visualization and status indicators
// ==============================================

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useVoiceSocket, VoiceSessionConfig } from '../../hooks/use-voice-socket';
import { AudioVisualizer } from './AudioVisualizer';
import { cn } from '../../lib/utils';

// ============ TYPES ============

export interface VoiceTriggerProps {
  config: VoiceSessionConfig;
  onTranscript?: (text: string, isFinal: boolean) => void;
  onResponse?: (response: any) => void;
  onIntent?: (intent: string, entities: any[]) => void;
  onError?: (error: Error) => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'minimal' | 'floating';
  showTranscript?: boolean;
  showStatus?: boolean;
  autoConnect?: boolean;
}

// ============ COMPONENT ============

export function VoiceTrigger({
  config,
  onTranscript,
  onResponse,
  onIntent,
  onError,
  className,
  size = 'md',
  variant = 'default',
  showTranscript = true,
  showStatus = true,
  autoConnect = false,
}: VoiceTriggerProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const {
    connect,
    disconnect,
    isConnected,
    sessionId,
    startRecording,
    stopRecording,
    isRecording,
    sendText,
    transcript,
    partialTranscript,
    response,
    playResponse,
    stopPlayback,
    isPlaying,
    toggleMute,
    isMuted,
    setLanguage,
    currentLanguage,
    connectionQuality,
    latency,
    error,
    clearError,
    inputLevel,
  } = useVoiceSocket(config);

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect) {
      connect();
    }
    return () => {
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);

  // Handle errors
  useEffect(() => {
    if (error && onError) {
      onError(error);
    }
  }, [error, onError]);

  // Handle transcript updates
  useEffect(() => {
    if (onTranscript && (transcript || partialTranscript)) {
      onTranscript(transcript + partialTranscript, !!transcript && !partialTranscript);
    }
  }, [transcript, partialTranscript, onTranscript]);

  // Handle responses
  useEffect(() => {
    if (response && onResponse) {
      onResponse(response);
    }
    if (response?.intent && onIntent) {
      onIntent(response.intent, response.entities || []);
    }
  }, [response, onResponse, onIntent]);

  // Handle voice button click
  const handleVoiceClick = useCallback(async () => {
    if (!isConnected) {
      await connect();
      return;
    }

    if (isRecording) {
      stopRecording();
    } else {
      await startRecording();
    }
  }, [isConnected, isRecording, connect, startRecording, stopRecording]);

  // Size classes
  const sizeClasses = {
    sm: 'w-12 h-12',
    md: 'w-16 h-16',
    lg: 'w-20 h-20',
  };

  const iconSizes = {
    sm: 'w-5 h-5',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  return (
    <div className={cn('relative', className)}>
      {/* Main Voice Button */}
      <div className="relative inline-flex flex-col items-center">
        {/* Ripple Effect */}
        {isRecording && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="absolute animate-ping rounded-full bg-primary-400/30 w-full h-full" />
            <div className="absolute animate-pulse rounded-full bg-primary-300/20 w-[120%] h-[120%]" />
          </div>
        )}

        {/* Voice Button */}
        <button
          onClick={handleVoiceClick}
          disabled={!isConnected && !autoConnect}
          className={cn(
            'relative z-10 rounded-full flex items-center justify-center transition-all duration-300',
            sizeClasses[size],
            isRecording
              ? 'bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/30'
              : isConnected
              ? 'bg-primary-500 hover:bg-primary-600 text-white shadow-lg shadow-primary-500/30'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed',
            'focus:outline-none focus:ring-4 focus:ring-primary-500/30'
          )}
          aria-label={isRecording ? 'Stop recording' : 'Start recording'}
        >
          {isRecording ? (
            // Stop icon
            <svg className={iconSizes[size]} viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="6" width="12" height="12" rx="2" />
            </svg>
          ) : (
            // Microphone icon
            <svg className={iconSizes[size]} viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z" />
            </svg>
          )}
        </button>

        {/* Audio Level Indicator */}
        {isRecording && (
          <div className="mt-2 flex items-center gap-1">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className={cn(
                  'w-1 rounded-full bg-primary-500 transition-all duration-75',
                  inputLevel > i * 0.2 ? 'opacity-100' : 'opacity-30'
                )}
                style={{
                  height: `${Math.max(8, inputLevel * 40 * (1 + i * 0.2))}px`,
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Connection Status */}
      {showStatus && (
        <div className="mt-3 flex items-center justify-center gap-2 text-sm">
          <div
            className={cn(
              'w-2 h-2 rounded-full',
              connectionQuality === 'excellent' && 'bg-green-500',
              connectionQuality === 'good' && 'bg-green-400',
              connectionQuality === 'fair' && 'bg-yellow-500',
              connectionQuality === 'poor' && 'bg-red-500',
              connectionQuality === 'disconnected' && 'bg-gray-400'
            )}
          />
          <span className="text-gray-500">
            {isConnected
              ? isRecording
                ? 'Listening...'
                : 'Ready'
              : 'Disconnected'}
          </span>
          {latency > 0 && isConnected && (
            <span className="text-gray-400 text-xs">({latency}ms)</span>
          )}
        </div>
      )}

      {/* Transcript Display */}
      {showTranscript && (transcript || partialTranscript) && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg max-w-md">
          <p className="text-sm text-gray-700">
            {transcript}
            {partialTranscript && (
              <span className="text-gray-400 italic">{partialTranscript}</span>
            )}
          </p>
        </div>
      )}

      {/* Response Display */}
      {response && (
        <div className="mt-4 p-4 bg-primary-50 rounded-lg max-w-md">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
              <span className="text-primary-600 text-sm font-medium">Z</span>
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-700">{response.text}</p>
              {response.audio && (
                <button
                  onClick={isPlaying ? stopPlayback : playResponse}
                  className="mt-2 text-xs text-primary-600 hover:text-primary-700 flex items-center gap-1"
                >
                  {isPlaying ? (
                    <>
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                        <rect x="6" y="4" width="4" height="16" />
                        <rect x="14" y="4" width="4" height="16" />
                      </svg>
                      Stop
                    </>
                  ) : (
                    <>
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                      Play response
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg max-w-md">
          <div className="flex items-center justify-between">
            <p className="text-sm text-red-600">{error.message}</p>
            <button
              onClick={clearError}
              className="text-red-400 hover:text-red-500"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Settings Panel */}
      {showSettings && (
        <div className="absolute top-full mt-2 right-0 w-64 bg-white rounded-lg shadow-lg border p-4 z-20">
          <h3 className="font-medium text-gray-900 mb-3">Voice Settings</h3>
          
          {/* Language Selection */}
          <div className="mb-3">
            <label className="block text-sm text-gray-600 mb-1">Language</label>
            <select
              value={currentLanguage}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full px-3 py-2 border rounded-md text-sm"
            >
              <option value="en-US">English (US)</option>
              <option value="en-GB">English (UK)</option>
              <option value="es-ES">Spanish</option>
              <option value="fr-FR">French</option>
              <option value="de-DE">German</option>
              <option value="ja-JP">Japanese</option>
              <option value="zh-CN">Chinese</option>
            </select>
          </div>

          {/* Mute Toggle */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Mute Microphone</span>
            <button
              onClick={toggleMute}
              className={cn(
                'relative w-10 h-6 rounded-full transition-colors',
                isMuted ? 'bg-red-500' : 'bg-gray-300'
              )}
            >
              <div
                className={cn(
                  'absolute top-1 w-4 h-4 bg-white rounded-full transition-transform',
                  isMuted ? 'translate-x-5' : 'translate-x-1'
                )}
              />
            </button>
          </div>
        </div>
      )}

      {/* Settings Toggle */}
      <button
        onClick={() => setShowSettings(!showSettings)}
        className="absolute top-0 right-0 p-1 text-gray-400 hover:text-gray-600"
        aria-label="Voice settings"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" />
        </svg>
      </button>
    </div>
  );
}

export default VoiceTrigger;
