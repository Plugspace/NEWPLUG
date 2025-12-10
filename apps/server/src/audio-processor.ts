// ==============================================
// PLUGSPACE.IO TITAN v1.4 - AUDIO PROCESSOR
// ==============================================
// Audio processing pipeline with VAD, noise
// suppression, format conversion, and optimization
// ==============================================

import { EventEmitter } from 'events';
import { logger } from './logger';

// ============ TYPES ============

export interface AudioProcessingConfig {
  inputFormat: string;
  sampleRate: number;
  channels: number;
  enableVAD?: boolean;
  enableNoiseReduction?: boolean;
  enableNormalization?: boolean;
  vadThreshold?: number;
  silenceThreshold?: number;
}

export interface ProcessedAudio {
  data: Buffer;
  format: string;
  sampleRate: number;
  channels: number;
  duration: number;
  isSpeech: boolean;
  audioLevel: number;
  metadata: AudioMetadata;
}

export interface AudioMetadata {
  originalSize: number;
  processedSize: number;
  compressionRatio: number;
  processingTime: number;
  vadResult?: VADResult;
}

export interface VADResult {
  isSpeech: boolean;
  speechProbability: number;
  noiseLevel: number;
  signalToNoise: number;
}

export interface AudioChunk {
  data: Buffer;
  timestamp: number;
  sequence: number;
  duration: number;
}

// ============ AUDIO PROCESSOR ============

export class AudioProcessor extends EventEmitter {
  private config: AudioProcessingConfig;
  private frameBuffer: Buffer[] = [];
  private frameSize: number = 480; // 30ms at 16kHz
  private sequenceNumber: number = 0;

  // Audio analysis state
  private audioLevelHistory: number[] = [];
  private noiseFloor: number = 0.01;
  private speechThreshold: number = 0.03;

  constructor(config?: Partial<AudioProcessingConfig>) {
    super();
    this.config = {
      inputFormat: 'webm/opus',
      sampleRate: 16000,
      channels: 1,
      enableVAD: true,
      enableNoiseReduction: true,
      enableNormalization: true,
      vadThreshold: 0.5,
      silenceThreshold: 0.01,
      ...config,
    };
  }

  // ============ MAIN PROCESSING ============

  async process(
    inputData: Buffer,
    overrideConfig?: Partial<AudioProcessingConfig>
  ): Promise<Buffer> {
    const startTime = Date.now();
    const config = { ...this.config, ...overrideConfig };

    try {
      let processed = inputData;

      // Step 1: Format conversion (if needed)
      if (config.inputFormat !== 'pcm16') {
        processed = await this.convertFormat(processed, config.inputFormat, 'pcm16');
      }

      // Step 2: Resample (if needed)
      if (config.sampleRate !== 16000) {
        processed = await this.resample(processed, config.sampleRate, 16000);
      }

      // Step 3: Convert to mono (if needed)
      if (config.channels !== 1) {
        processed = this.convertToMono(processed, config.channels);
      }

      // Step 4: Normalize audio levels
      if (config.enableNormalization) {
        processed = this.normalize(processed);
      }

      // Step 5: Noise reduction
      if (config.enableNoiseReduction) {
        processed = this.reduceNoise(processed);
      }

      // Step 6: Voice Activity Detection
      const vadResult = config.enableVAD ? this.detectVoiceActivity(processed) : null;

      const processingTime = Date.now() - startTime;

      logger.debug('Audio processed', {
        inputSize: inputData.length,
        outputSize: processed.length,
        processingTime,
        isSpeech: vadResult?.isSpeech,
      });

      return processed;

    } catch (error) {
      logger.error('Audio processing error', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  // ============ FORMAT CONVERSION ============

  private async convertFormat(
    data: Buffer,
    fromFormat: string,
    toFormat: string
  ): Promise<Buffer> {
    // In production, this would use FFmpeg or a similar library
    // For now, we'll do basic handling
    
    if (fromFormat === 'webm/opus' && toFormat === 'pcm16') {
      // Simulate Opus decoding
      // In production: Use opus-decoder or FFmpeg
      return this.decodeOpus(data);
    }

    return data;
  }

  private decodeOpus(data: Buffer): Buffer {
    // Placeholder for Opus decoding
    // In production, use a proper Opus decoder library
    // The actual implementation would depend on the library used
    
    // For now, return the data as-is (in production this would decode)
    return data;
  }

  private async resample(
    data: Buffer,
    fromRate: number,
    toRate: number
  ): Promise<Buffer> {
    if (fromRate === toRate) return data;

    // Simple linear interpolation resampling
    // In production, use a proper resampling library like libresample
    
    const ratio = toRate / fromRate;
    const samples = new Int16Array(data.buffer, data.byteOffset, data.length / 2);
    const newLength = Math.floor(samples.length * ratio);
    const resampled = new Int16Array(newLength);

    for (let i = 0; i < newLength; i++) {
      const srcIndex = i / ratio;
      const srcIndexFloor = Math.floor(srcIndex);
      const srcIndexCeil = Math.min(srcIndexFloor + 1, samples.length - 1);
      const fraction = srcIndex - srcIndexFloor;

      resampled[i] = Math.round(
        samples[srcIndexFloor] * (1 - fraction) + samples[srcIndexCeil] * fraction
      );
    }

    return Buffer.from(resampled.buffer);
  }

  private convertToMono(data: Buffer, channels: number): Buffer {
    if (channels === 1) return data;

    const samples = new Int16Array(data.buffer, data.byteOffset, data.length / 2);
    const monoLength = Math.floor(samples.length / channels);
    const mono = new Int16Array(monoLength);

    for (let i = 0; i < monoLength; i++) {
      let sum = 0;
      for (let c = 0; c < channels; c++) {
        sum += samples[i * channels + c];
      }
      mono[i] = Math.round(sum / channels);
    }

    return Buffer.from(mono.buffer);
  }

  // ============ AUDIO ENHANCEMENT ============

  private normalize(data: Buffer): Buffer {
    const samples = new Int16Array(data.buffer, data.byteOffset, data.length / 2);
    
    // Find peak amplitude
    let maxAmp = 0;
    for (let i = 0; i < samples.length; i++) {
      maxAmp = Math.max(maxAmp, Math.abs(samples[i]));
    }

    if (maxAmp === 0) return data;

    // Target peak at 80% of max
    const targetPeak = 32767 * 0.8;
    const gain = targetPeak / maxAmp;

    // Apply gain with soft limiting
    const normalized = new Int16Array(samples.length);
    for (let i = 0; i < samples.length; i++) {
      const amplified = samples[i] * gain;
      // Soft clip to prevent harsh clipping
      normalized[i] = Math.round(this.softClip(amplified));
    }

    return Buffer.from(normalized.buffer);
  }

  private softClip(sample: number): number {
    const threshold = 32767 * 0.9;
    if (Math.abs(sample) < threshold) return sample;
    
    const sign = sample > 0 ? 1 : -1;
    const abs = Math.abs(sample);
    const overshoot = abs - threshold;
    const softened = threshold + (overshoot / (1 + overshoot / (32767 - threshold)));
    
    return sign * Math.min(softened, 32767);
  }

  private reduceNoise(data: Buffer): Buffer {
    const samples = new Int16Array(data.buffer, data.byteOffset, data.length / 2);
    
    // Simple spectral subtraction noise reduction
    // In production, use a proper noise reduction library
    
    // Estimate noise floor from quiet regions
    const windowSize = 160; // 10ms at 16kHz
    const windows: number[] = [];
    
    for (let i = 0; i < samples.length; i += windowSize) {
      const end = Math.min(i + windowSize, samples.length);
      let energy = 0;
      for (let j = i; j < end; j++) {
        energy += samples[j] * samples[j];
      }
      windows.push(Math.sqrt(energy / (end - i)));
    }

    // Sort and use bottom 10% as noise estimate
    windows.sort((a, b) => a - b);
    const noiseEstimate = windows[Math.floor(windows.length * 0.1)] || this.noiseFloor;
    
    // Update noise floor with smoothing
    this.noiseFloor = this.noiseFloor * 0.9 + noiseEstimate * 0.1;

    // Apply spectral subtraction (simplified)
    const reduced = new Int16Array(samples.length);
    const noiseThreshold = this.noiseFloor * 2;

    for (let i = 0; i < samples.length; i++) {
      const amplitude = Math.abs(samples[i]);
      if (amplitude < noiseThreshold) {
        // Reduce noise but don't completely eliminate
        reduced[i] = Math.round(samples[i] * 0.3);
      } else {
        reduced[i] = samples[i];
      }
    }

    return Buffer.from(reduced.buffer);
  }

  // ============ VOICE ACTIVITY DETECTION ============

  detectVoiceActivity(data: Buffer): VADResult {
    const samples = new Int16Array(data.buffer, data.byteOffset, data.length / 2);
    
    // Calculate RMS energy
    let sumSquares = 0;
    for (let i = 0; i < samples.length; i++) {
      const normalized = samples[i] / 32768;
      sumSquares += normalized * normalized;
    }
    const rms = Math.sqrt(sumSquares / samples.length);

    // Track audio level history
    this.audioLevelHistory.push(rms);
    if (this.audioLevelHistory.length > 100) {
      this.audioLevelHistory.shift();
    }

    // Calculate dynamic threshold based on recent history
    const recentAvg = this.audioLevelHistory.reduce((a, b) => a + b, 0) / this.audioLevelHistory.length;
    const dynamicThreshold = Math.max(this.config.silenceThreshold!, recentAvg * 1.5);

    // Zero crossing rate (helps distinguish speech from noise)
    let zeroCrossings = 0;
    for (let i = 1; i < samples.length; i++) {
      if ((samples[i] > 0 && samples[i - 1] < 0) || (samples[i] < 0 && samples[i - 1] > 0)) {
        zeroCrossings++;
      }
    }
    const zcr = zeroCrossings / samples.length;

    // Speech typically has ZCR between 0.1 and 0.5
    const zcrSpeechLikelihood = zcr >= 0.1 && zcr <= 0.5 ? 1 : 0.5;

    // Calculate speech probability
    const energyFactor = rms > dynamicThreshold ? Math.min(1, (rms - dynamicThreshold) / dynamicThreshold) : 0;
    const speechProbability = energyFactor * zcrSpeechLikelihood;

    const signalToNoise = this.noiseFloor > 0 ? rms / this.noiseFloor : 10;

    return {
      isSpeech: speechProbability > this.config.vadThreshold!,
      speechProbability,
      noiseLevel: this.noiseFloor,
      signalToNoise,
    };
  }

  // ============ CHUNKING ============

  createChunks(data: Buffer, chunkDurationMs: number = 100): AudioChunk[] {
    const samplesPerChunk = Math.floor((this.config.sampleRate * chunkDurationMs) / 1000);
    const bytesPerChunk = samplesPerChunk * 2; // 16-bit samples
    const chunks: AudioChunk[] = [];

    for (let i = 0; i < data.length; i += bytesPerChunk) {
      const end = Math.min(i + bytesPerChunk, data.length);
      chunks.push({
        data: data.subarray(i, end),
        timestamp: Date.now(),
        sequence: this.sequenceNumber++,
        duration: chunkDurationMs,
      });
    }

    return chunks;
  }

  // ============ AUDIO ANALYSIS ============

  getAudioLevel(data: Buffer): number {
    const samples = new Int16Array(data.buffer, data.byteOffset, data.length / 2);
    let sumSquares = 0;
    
    for (let i = 0; i < samples.length; i++) {
      const normalized = samples[i] / 32768;
      sumSquares += normalized * normalized;
    }
    
    return Math.sqrt(sumSquares / samples.length);
  }

  getSpectrum(data: Buffer, fftSize: number = 256): Float32Array {
    // Simple spectrum analysis using DFT
    // In production, use Web Audio API or FFT library
    
    const samples = new Int16Array(data.buffer, data.byteOffset, data.length / 2);
    const spectrum = new Float32Array(fftSize / 2);
    
    // Apply Hann window and compute magnitude spectrum
    for (let k = 0; k < fftSize / 2; k++) {
      let real = 0;
      let imag = 0;
      
      for (let n = 0; n < Math.min(samples.length, fftSize); n++) {
        const window = 0.5 * (1 - Math.cos(2 * Math.PI * n / fftSize));
        const angle = -2 * Math.PI * k * n / fftSize;
        real += (samples[n] / 32768) * window * Math.cos(angle);
        imag += (samples[n] / 32768) * window * Math.sin(angle);
      }
      
      spectrum[k] = Math.sqrt(real * real + imag * imag);
    }
    
    return spectrum;
  }

  // ============ UTILITY ============

  reset(): void {
    this.frameBuffer = [];
    this.sequenceNumber = 0;
    this.audioLevelHistory = [];
    this.noiseFloor = 0.01;
  }

  updateConfig(config: Partial<AudioProcessingConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getConfig(): AudioProcessingConfig {
    return { ...this.config };
  }
}

export default AudioProcessor;
