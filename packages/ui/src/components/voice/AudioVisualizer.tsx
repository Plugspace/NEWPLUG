// ==============================================
// PLUGSPACE.IO TITAN v1.4 - AUDIO VISUALIZER
// ==============================================
// Real-time audio visualization components
// for voice interface feedback
// ==============================================

'use client';

import React, { useRef, useEffect, useCallback } from 'react';
import { cn } from '../../lib/utils';

// ============ TYPES ============

export interface AudioVisualizerProps {
  audioLevel: number; // 0-1
  isActive: boolean;
  variant?: 'bars' | 'wave' | 'circle' | 'spectrum';
  size?: 'sm' | 'md' | 'lg';
  color?: string;
  className?: string;
}

export interface WaveformVisualizerProps {
  analyser: AnalyserNode | null;
  isActive: boolean;
  className?: string;
  color?: string;
  height?: number;
}

export interface SpectrumVisualizerProps {
  analyser: AnalyserNode | null;
  isActive: boolean;
  className?: string;
  barCount?: number;
  color?: string;
}

// ============ BAR VISUALIZER ============

export function AudioVisualizer({
  audioLevel,
  isActive,
  variant = 'bars',
  size = 'md',
  color = 'primary',
  className,
}: AudioVisualizerProps) {
  const barCount = { sm: 3, md: 5, lg: 7 }[size];
  const barWidth = { sm: 2, md: 3, lg: 4 }[size];
  const maxHeight = { sm: 16, md: 24, lg: 32 }[size];
  const gap = { sm: 1, md: 2, lg: 3 }[size];

  const colorClasses = {
    primary: 'bg-primary-500',
    secondary: 'bg-secondary-500',
    green: 'bg-green-500',
    red: 'bg-red-500',
    blue: 'bg-blue-500',
  };

  if (variant === 'circle') {
    return (
      <CircleVisualizer
        audioLevel={audioLevel}
        isActive={isActive}
        size={size}
        color={color}
        className={className}
      />
    );
  }

  return (
    <div
      className={cn('flex items-end justify-center', className)}
      style={{ gap: `${gap}px`, height: `${maxHeight}px` }}
    >
      {[...Array(barCount)].map((_, i) => {
        // Create natural-looking variation
        const variation = Math.sin((i / barCount) * Math.PI);
        const baseHeight = isActive ? audioLevel * variation : 0.2;
        const animatedHeight = baseHeight + (isActive ? Math.random() * 0.1 : 0);
        const height = Math.max(0.15, Math.min(1, animatedHeight));

        return (
          <div
            key={i}
            className={cn(
              'rounded-full transition-all duration-75',
              colorClasses[color as keyof typeof colorClasses] || colorClasses.primary,
              !isActive && 'opacity-50'
            )}
            style={{
              width: `${barWidth}px`,
              height: `${height * maxHeight}px`,
            }}
          />
        );
      })}
    </div>
  );
}

// ============ CIRCLE VISUALIZER ============

function CircleVisualizer({
  audioLevel,
  isActive,
  size,
  color,
  className,
}: {
  audioLevel: number;
  isActive: boolean;
  size: 'sm' | 'md' | 'lg';
  color: string;
  className?: string;
}) {
  const dimensions = { sm: 40, md: 60, lg: 80 }[size];
  const strokeWidth = { sm: 2, md: 3, lg: 4 }[size];
  const radius = (dimensions - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  
  const colorClasses = {
    primary: 'stroke-primary-500',
    secondary: 'stroke-secondary-500',
    green: 'stroke-green-500',
    red: 'stroke-red-500',
    blue: 'stroke-blue-500',
  };

  return (
    <div className={cn('relative', className)}>
      <svg
        width={dimensions}
        height={dimensions}
        className={cn(
          'transform -rotate-90',
          isActive && 'animate-pulse'
        )}
      >
        {/* Background circle */}
        <circle
          cx={dimensions / 2}
          cy={dimensions / 2}
          r={radius}
          fill="none"
          className="stroke-gray-200"
          strokeWidth={strokeWidth}
        />
        
        {/* Active circle */}
        <circle
          cx={dimensions / 2}
          cy={dimensions / 2}
          r={radius}
          fill="none"
          className={cn(
            colorClasses[color as keyof typeof colorClasses] || colorClasses.primary,
            'transition-all duration-75'
          )}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - (isActive ? audioLevel : 0.1))}
          strokeLinecap="round"
        />
      </svg>
      
      {/* Center dot */}
      <div
        className={cn(
          'absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 rounded-full',
          isActive ? 'bg-primary-500' : 'bg-gray-300',
          { sm: 'w-2 h-2', md: 'w-3 h-3', lg: 'w-4 h-4' }[size]
        )}
      />
    </div>
  );
}

// ============ WAVEFORM VISUALIZER ============

export function WaveformVisualizer({
  analyser,
  isActive,
  className,
  color = '#6366f1',
  height = 100,
}: WaveformVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !analyser) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyser.fftSize;
    const dataArray = new Uint8Array(bufferLength);
    analyser.getByteTimeDomainData(dataArray);

    ctx.fillStyle = 'rgb(255, 255, 255)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.lineWidth = 2;
    ctx.strokeStyle = isActive ? color : '#d1d5db';
    ctx.beginPath();

    const sliceWidth = canvas.width / bufferLength;
    let x = 0;

    for (let i = 0; i < bufferLength; i++) {
      const v = dataArray[i] / 128.0;
      const y = (v * canvas.height) / 2;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }

      x += sliceWidth;
    }

    ctx.lineTo(canvas.width, canvas.height / 2);
    ctx.stroke();

    animationRef.current = requestAnimationFrame(draw);
  }, [analyser, isActive, color]);

  useEffect(() => {
    if (isActive && analyser) {
      draw();
    }
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isActive, analyser, draw]);

  return (
    <canvas
      ref={canvasRef}
      width={300}
      height={height}
      className={cn('rounded-lg bg-white', className)}
    />
  );
}

// ============ SPECTRUM VISUALIZER ============

export function SpectrumVisualizer({
  analyser,
  isActive,
  className,
  barCount = 32,
  color = '#6366f1',
}: SpectrumVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !analyser) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyser.getByteFrequencyData(dataArray);

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const barWidth = (canvas.width / barCount) * 0.8;
    const gap = (canvas.width / barCount) * 0.2;
    
    for (let i = 0; i < barCount; i++) {
      const dataIndex = Math.floor((i / barCount) * bufferLength);
      const value = dataArray[dataIndex] / 255;
      const barHeight = value * canvas.height;

      const x = i * (barWidth + gap);
      const y = canvas.height - barHeight;

      // Gradient effect
      const gradient = ctx.createLinearGradient(x, canvas.height, x, y);
      gradient.addColorStop(0, isActive ? color : '#d1d5db');
      gradient.addColorStop(1, isActive ? `${color}80` : '#e5e7eb');

      ctx.fillStyle = gradient;
      ctx.fillRect(x, y, barWidth, barHeight);
    }

    animationRef.current = requestAnimationFrame(draw);
  }, [analyser, isActive, barCount, color]);

  useEffect(() => {
    if (isActive && analyser) {
      draw();
    }
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isActive, analyser, draw]);

  return (
    <canvas
      ref={canvasRef}
      width={200}
      height={60}
      className={cn('rounded-lg', className)}
    />
  );
}

// ============ SPEAKING INDICATOR ============

export function SpeakingIndicator({
  isSpeaking,
  className,
}: {
  isSpeaking: boolean;
  className?: string;
}) {
  return (
    <div className={cn('flex items-center gap-1', className)}>
      {[...Array(3)].map((_, i) => (
        <div
          key={i}
          className={cn(
            'w-1.5 h-1.5 rounded-full transition-all duration-150',
            isSpeaking
              ? 'bg-green-500 animate-pulse'
              : 'bg-gray-300',
            isSpeaking && i === 1 && 'animation-delay-100',
            isSpeaking && i === 2 && 'animation-delay-200'
          )}
          style={{
            animationDelay: `${i * 100}ms`,
          }}
        />
      ))}
    </div>
  );
}

// ============ LATENCY INDICATOR ============

export function LatencyIndicator({
  latency,
  className,
}: {
  latency: number;
  className?: string;
}) {
  const getColor = () => {
    if (latency < 100) return 'text-green-500';
    if (latency < 300) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getBars = () => {
    if (latency < 100) return 4;
    if (latency < 200) return 3;
    if (latency < 400) return 2;
    return 1;
  };

  return (
    <div className={cn('flex items-end gap-0.5', className)}>
      {[...Array(4)].map((_, i) => (
        <div
          key={i}
          className={cn(
            'w-1 rounded-sm transition-all',
            i < getBars() ? getColor().replace('text-', 'bg-') : 'bg-gray-200'
          )}
          style={{ height: `${(i + 1) * 3}px` }}
        />
      ))}
      {latency > 0 && (
        <span className={cn('ml-1 text-xs', getColor())}>
          {latency}ms
        </span>
      )}
    </div>
  );
}

export default AudioVisualizer;
