// ==============================================
// PLUGSPACE.IO TITAN v1.4 - AUDIO PROCESSING TESTS
// ==============================================

import { AudioProcessor } from '../src/audio-processor';

describe('AudioProcessor', () => {
  let processor: AudioProcessor;

  beforeEach(() => {
    processor = new AudioProcessor({
      inputFormat: 'webm/opus',
      sampleRate: 16000,
      channels: 1,
      enableVAD: true,
      enableNoiseReduction: true,
      enableNormalization: true,
    });
  });

  describe('initialization', () => {
    it('should create processor with default config', () => {
      const defaultProcessor = new AudioProcessor();
      expect(defaultProcessor).toBeDefined();
      expect(defaultProcessor.getConfig().sampleRate).toBe(16000);
    });

    it('should create processor with custom config', () => {
      const config = processor.getConfig();
      expect(config.enableVAD).toBe(true);
      expect(config.enableNoiseReduction).toBe(true);
    });
  });

  describe('audio processing', () => {
    it('should process audio buffer', async () => {
      // Create a simple audio buffer (16-bit PCM)
      const samples = new Int16Array(1600); // 100ms at 16kHz
      for (let i = 0; i < samples.length; i++) {
        samples[i] = Math.sin(i * 0.1) * 10000;
      }
      const buffer = Buffer.from(samples.buffer);

      const processed = await processor.process(buffer, {
        inputFormat: 'pcm16',
        sampleRate: 16000,
        channels: 1,
      });

      expect(processed).toBeDefined();
      expect(processed.length).toBeGreaterThan(0);
    });

    it('should handle empty buffer', async () => {
      const emptyBuffer = Buffer.alloc(0);
      
      await expect(processor.process(emptyBuffer, {
        inputFormat: 'pcm16',
        sampleRate: 16000,
        channels: 1,
      })).resolves.toBeDefined();
    });
  });

  describe('voice activity detection', () => {
    it('should detect speech in audio', () => {
      // Create buffer with high amplitude (simulating speech)
      const samples = new Int16Array(1600);
      for (let i = 0; i < samples.length; i++) {
        samples[i] = Math.sin(i * 0.3) * 20000;
      }
      const buffer = Buffer.from(samples.buffer);

      const result = processor.detectVoiceActivity(buffer);
      expect(result).toHaveProperty('isSpeech');
      expect(result).toHaveProperty('speechProbability');
      expect(result).toHaveProperty('noiseLevel');
    });

    it('should detect silence', () => {
      // Create buffer with very low amplitude (silence)
      const samples = new Int16Array(1600);
      for (let i = 0; i < samples.length; i++) {
        samples[i] = Math.random() * 10 - 5;
      }
      const buffer = Buffer.from(samples.buffer);

      const result = processor.detectVoiceActivity(buffer);
      expect(result.speechProbability).toBeLessThan(0.5);
    });
  });

  describe('audio level', () => {
    it('should calculate audio level', () => {
      const samples = new Int16Array(1600);
      for (let i = 0; i < samples.length; i++) {
        samples[i] = Math.sin(i * 0.1) * 16000;
      }
      const buffer = Buffer.from(samples.buffer);

      const level = processor.getAudioLevel(buffer);
      expect(level).toBeGreaterThan(0);
      expect(level).toBeLessThanOrEqual(1);
    });

    it('should return 0 for silence', () => {
      const samples = new Int16Array(1600);
      samples.fill(0);
      const buffer = Buffer.from(samples.buffer);

      const level = processor.getAudioLevel(buffer);
      expect(level).toBe(0);
    });
  });

  describe('chunking', () => {
    it('should create chunks of correct duration', () => {
      const samples = new Int16Array(16000); // 1 second at 16kHz
      const buffer = Buffer.from(samples.buffer);

      const chunks = processor.createChunks(buffer, 100); // 100ms chunks
      expect(chunks.length).toBe(10);
      expect(chunks[0].duration).toBe(100);
    });

    it('should include sequence numbers', () => {
      const samples = new Int16Array(3200);
      const buffer = Buffer.from(samples.buffer);

      const chunks = processor.createChunks(buffer, 100);
      expect(chunks[0].sequence).toBeLessThan(chunks[1].sequence);
    });
  });

  describe('spectrum analysis', () => {
    it('should return spectrum data', () => {
      const samples = new Int16Array(1600);
      for (let i = 0; i < samples.length; i++) {
        samples[i] = Math.sin(i * 0.1) * 16000;
      }
      const buffer = Buffer.from(samples.buffer);

      const spectrum = processor.getSpectrum(buffer, 256);
      expect(spectrum).toBeInstanceOf(Float32Array);
      expect(spectrum.length).toBe(128); // fftSize / 2
    });
  });

  describe('configuration', () => {
    it('should update config', () => {
      processor.updateConfig({ vadThreshold: 0.7 });
      const config = processor.getConfig();
      expect(config.vadThreshold).toBe(0.7);
    });

    it('should reset state', () => {
      processor.reset();
      // No error should be thrown
    });
  });
});
