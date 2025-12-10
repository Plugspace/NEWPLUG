// ==============================================
// PLUGSPACE.IO TITAN v1.4 - AUDIO RECORDER
// ==============================================
// Browser audio recording utility with
// format conversion and quality optimization
// ==============================================

// ============ TYPES ============

export interface RecordingOptions {
  mimeType?: string;
  audioBitsPerSecond?: number;
  sampleRate?: number;
  channelCount?: number;
  echoCancellation?: boolean;
  noiseSuppression?: boolean;
  autoGainControl?: boolean;
}

export interface AudioRecorderState {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  audioLevel: number;
}

export interface ProcessedChunk {
  data: Blob;
  timestamp: number;
  duration: number;
}

// ============ AUDIO RECORDER CLASS ============

export class AudioRecorder {
  private mediaStream: MediaStream | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private chunks: Blob[] = [];
  private startTime: number = 0;
  private pausedDuration: number = 0;
  private pauseStartTime: number = 0;

  private options: RecordingOptions = {
    mimeType: 'audio/webm;codecs=opus',
    audioBitsPerSecond: 64000,
    sampleRate: 16000,
    channelCount: 1,
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  };

  private state: AudioRecorderState = {
    isRecording: false,
    isPaused: false,
    duration: 0,
    audioLevel: 0,
  };

  private onDataAvailable?: (chunk: ProcessedChunk) => void;
  private onStateChange?: (state: AudioRecorderState) => void;
  private levelUpdateInterval?: NodeJS.Timeout;

  constructor(options?: Partial<RecordingOptions>) {
    if (options) {
      this.options = { ...this.options, ...options };
    }
  }

  // ============ PERMISSIONS ============

  async requestMicrophonePermission(): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch (error) {
      console.error('Microphone permission denied:', error);
      return false;
    }
  }

  async checkMicrophonePermission(): Promise<'granted' | 'denied' | 'prompt'> {
    if (!navigator.permissions) {
      // Fallback for browsers without Permissions API
      return 'prompt';
    }

    try {
      const result = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      return result.state;
    } catch {
      return 'prompt';
    }
  }

  // ============ STREAM MANAGEMENT ============

  async getAudioStream(): Promise<MediaStream> {
    if (this.mediaStream) {
      return this.mediaStream;
    }

    const constraints: MediaStreamConstraints = {
      audio: {
        echoCancellation: this.options.echoCancellation,
        noiseSuppression: this.options.noiseSuppression,
        autoGainControl: this.options.autoGainControl,
        sampleRate: this.options.sampleRate,
        channelCount: this.options.channelCount,
      },
    };

    this.mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
    return this.mediaStream;
  }

  stopStream(): void {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
      this.analyser = null;
    }
  }

  // ============ RECORDING CONTROL ============

  async startRecording(options?: Partial<RecordingOptions>): Promise<void> {
    if (this.state.isRecording) {
      return;
    }

    if (options) {
      this.options = { ...this.options, ...options };
    }

    try {
      const stream = await this.getAudioStream();

      // Set up audio analysis
      this.audioContext = new AudioContext();
      const source = this.audioContext.createMediaStreamSource(stream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      source.connect(this.analyser);

      // Find supported MIME type
      const mimeType = this.getSupportedMimeType();

      // Create MediaRecorder
      this.mediaRecorder = new MediaRecorder(stream, {
        mimeType,
        audioBitsPerSecond: this.options.audioBitsPerSecond,
      });

      this.chunks = [];
      this.startTime = Date.now();
      this.pausedDuration = 0;

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.chunks.push(event.data);

          if (this.onDataAvailable) {
            this.onDataAvailable({
              data: event.data,
              timestamp: Date.now(),
              duration: this.getDuration(),
            });
          }
        }
      };

      this.mediaRecorder.start(100); // 100ms chunks

      this.state = {
        ...this.state,
        isRecording: true,
        isPaused: false,
      };

      // Start level monitoring
      this.startLevelMonitoring();

      this.emitStateChange();

    } catch (error) {
      console.error('Failed to start recording:', error);
      throw error;
    }
  }

  async stopRecording(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder || !this.state.isRecording) {
        reject(new Error('Not recording'));
        return;
      }

      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.chunks, { type: this.options.mimeType });
        this.chunks = [];

        this.state = {
          ...this.state,
          isRecording: false,
          isPaused: false,
          duration: 0,
          audioLevel: 0,
        };

        this.stopLevelMonitoring();
        this.emitStateChange();

        resolve(blob);
      };

      this.mediaRecorder.stop();
    });
  }

  pauseRecording(): void {
    if (this.mediaRecorder && this.state.isRecording && !this.state.isPaused) {
      this.mediaRecorder.pause();
      this.pauseStartTime = Date.now();
      this.state = { ...this.state, isPaused: true };
      this.emitStateChange();
    }
  }

  resumeRecording(): void {
    if (this.mediaRecorder && this.state.isRecording && this.state.isPaused) {
      this.mediaRecorder.resume();
      this.pausedDuration += Date.now() - this.pauseStartTime;
      this.state = { ...this.state, isPaused: false };
      this.emitStateChange();
    }
  }

  // ============ AUDIO PROCESSING ============

  async processChunk(chunk: Blob): Promise<ProcessedChunk> {
    // Basic processing - in production, could add compression, filtering, etc.
    return {
      data: chunk,
      timestamp: Date.now(),
      duration: (chunk.size / (this.options.audioBitsPerSecond || 64000)) * 8 * 1000,
    };
  }

  async convertToFormat(blob: Blob, targetFormat: string): Promise<Blob> {
    // In production, use AudioContext to decode and re-encode
    // For now, return original blob
    console.warn('Audio format conversion not implemented');
    return blob;
  }

  // ============ VISUALIZATION ============

  getAudioLevels(): Float32Array {
    if (!this.analyser) {
      return new Float32Array(0);
    }

    const dataArray = new Float32Array(this.analyser.frequencyBinCount);
    this.analyser.getFloatFrequencyData(dataArray);
    return dataArray;
  }

  getFrequencyData(): Uint8Array {
    if (!this.analyser) {
      return new Uint8Array(0);
    }

    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(dataArray);
    return dataArray;
  }

  getTimeDomainData(): Uint8Array {
    if (!this.analyser) {
      return new Uint8Array(0);
    }

    const dataArray = new Uint8Array(this.analyser.fftSize);
    this.analyser.getByteTimeDomainData(dataArray);
    return dataArray;
  }

  getAnalyser(): AnalyserNode | null {
    return this.analyser;
  }

  // ============ QUALITY CONTROL ============

  adjustQuality(quality: 'high' | 'medium' | 'low'): void {
    const qualitySettings = {
      high: { audioBitsPerSecond: 128000, sampleRate: 48000 },
      medium: { audioBitsPerSecond: 64000, sampleRate: 16000 },
      low: { audioBitsPerSecond: 32000, sampleRate: 8000 },
    };

    this.options = { ...this.options, ...qualitySettings[quality] };

    // If currently recording, restart with new settings
    if (this.state.isRecording) {
      console.warn('Quality change during recording requires restart');
    }
  }

  // ============ STATE & CALLBACKS ============

  getState(): AudioRecorderState {
    return { ...this.state };
  }

  getDuration(): number {
    if (!this.state.isRecording) {
      return 0;
    }

    const now = this.state.isPaused ? this.pauseStartTime : Date.now();
    return now - this.startTime - this.pausedDuration;
  }

  onData(callback: (chunk: ProcessedChunk) => void): void {
    this.onDataAvailable = callback;
  }

  onStateChanged(callback: (state: AudioRecorderState) => void): void {
    this.onStateChange = callback;
  }

  // ============ PRIVATE METHODS ============

  private getSupportedMimeType(): string {
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/mp4',
    ];

    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }

    return '';
  }

  private startLevelMonitoring(): void {
    this.levelUpdateInterval = setInterval(() => {
      if (this.analyser && this.state.isRecording && !this.state.isPaused) {
        const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
        this.analyser.getByteFrequencyData(dataArray);
        
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        this.state = { ...this.state, audioLevel: average / 255 };
        
        this.emitStateChange();
      }
    }, 50);
  }

  private stopLevelMonitoring(): void {
    if (this.levelUpdateInterval) {
      clearInterval(this.levelUpdateInterval);
      this.levelUpdateInterval = undefined;
    }
  }

  private emitStateChange(): void {
    if (this.onStateChange) {
      this.onStateChange(this.getState());
    }
  }

  // ============ CLEANUP ============

  dispose(): void {
    this.stopStream();
    this.stopLevelMonitoring();
    this.mediaRecorder = null;
    this.chunks = [];
  }
}

// ============ SINGLETON INSTANCE ============

let recorderInstance: AudioRecorder | null = null;

export function getAudioRecorder(options?: Partial<RecordingOptions>): AudioRecorder {
  if (!recorderInstance) {
    recorderInstance = new AudioRecorder(options);
  }
  return recorderInstance;
}

export default AudioRecorder;
