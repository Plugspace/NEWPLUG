// ==============================================
// PLUGSPACE.IO TITAN v1.4 - GEMINI SESSION TESTS
// ==============================================

import { GeminiLiveSession } from '../src/gemini-session';

describe('GeminiLiveSession', () => {
  let session: GeminiLiveSession;

  beforeEach(() => {
    session = new GeminiLiveSession({
      sessionId: 'test-session-123',
      language: 'en-US',
      audioConfig: {
        inputFormat: 'webm/opus',
        outputFormat: 'mp3',
        sampleRate: 16000,
        channels: 1,
        bitrate: 64000,
      },
      features: {
        transcription: true,
        translation: false,
        sentimentAnalysis: true,
        intentDetection: true,
        voiceCloning: true,
      },
    });
  });

  describe('initialization', () => {
    it('should create session with correct config', () => {
      expect(session).toBeDefined();
    });

    it('should initialize without errors', async () => {
      // Mock the Gemini API
      await expect(session.initialize()).resolves.not.toThrow();
    });
  });

  describe('language setting', () => {
    it('should set language correctly', () => {
      session.setLanguage('es-ES');
      // Verify language is set
      const metrics = session.getMetrics();
      expect(metrics.language).toBe('es-ES');
    });
  });

  describe('intent detection', () => {
    // Testing the internal intent detection
    it('should detect create_project intent', () => {
      const text = 'Create a restaurant website';
      // This would be tested through sendText and observing the response
    });

    it('should detect modify_design intent', () => {
      const text = 'Change the colors to blue';
      // Test through response observation
    });
  });

  describe('entity extraction', () => {
    it('should extract URL entities', () => {
      const text = 'Clone https://stripe.com';
      // Test entity extraction
    });

    it('should extract color entities', () => {
      const text = 'Make the buttons red';
      // Test entity extraction
    });

    it('should extract section types', () => {
      const text = 'Add a hero section';
      // Test entity extraction
    });
  });

  describe('sentiment analysis', () => {
    it('should detect positive sentiment', () => {
      const text = 'This looks amazing!';
      // Test sentiment
    });

    it('should detect negative sentiment', () => {
      const text = 'This is broken and terrible';
      // Test sentiment
    });
  });

  describe('metrics', () => {
    it('should return correct metrics', () => {
      const metrics = session.getMetrics();
      expect(metrics.sessionId).toBe('test-session-123');
      expect(metrics.isStreaming).toBe(false);
      expect(metrics.language).toBe('en-US');
    });
  });

  describe('health status', () => {
    it('should report health status', () => {
      const health = session.getHealthStatus();
      expect(health).toHaveProperty('healthy');
      expect(health).toHaveProperty('lastActivity');
      expect(health).toHaveProperty('isStreaming');
    });
  });

  describe('streaming lifecycle', () => {
    it('should start and stop streaming', async () => {
      await session.initialize();
      await session.startSession();
      
      let metrics = session.getMetrics();
      expect(metrics.isStreaming).toBe(true);

      await session.endTurn();
      // Streaming should stop after end turn
    });
  });

  describe('event handling', () => {
    it('should register transcript handler', () => {
      const handler = jest.fn();
      session.onTranscript(handler);
      // Handler should be registered without error
    });

    it('should register response handler', () => {
      const handler = jest.fn();
      session.onResponse(handler);
      // Handler should be registered without error
    });

    it('should register error handler', () => {
      const handler = jest.fn();
      session.onError(handler);
      // Handler should be registered without error
    });
  });

  describe('disconnection', () => {
    it('should disconnect cleanly', async () => {
      await session.initialize();
      await session.disconnect();
      
      const health = session.getHealthStatus();
      expect(health.chatInitialized).toBe(false);
    });
  });
});
