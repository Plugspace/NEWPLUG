// ==============================================
// PLUGSPACE.IO TITAN v1.4 - VOICE CONFIGURATION
// ==============================================

export const voiceConfig = {
  // Server settings
  server: {
    port: parseInt(process.env.VOICE_SERVER_PORT || '4001', 10),
    host: process.env.VOICE_SERVER_HOST || '0.0.0.0',
    maxConnections: parseInt(process.env.MAX_CONNECTIONS || '10000', 10),
    heartbeatInterval: 30000,
    sessionTimeout: 3600000, // 1 hour
  },

  // Audio settings
  audio: {
    inputFormat: 'webm/opus',
    outputFormat: 'mp3',
    sampleRate: 16000,
    channels: 1,
    bitrate: 64000,
    chunkSize: 100, // ms
    bufferSize: 2000, // ms
    vadThreshold: 0.5,
    silenceThreshold: 0.01,
  },

  // Gemini Live API settings
  gemini: {
    model: 'gemini-2.0-flash-exp',
    apiKey: process.env.GOOGLE_AI_API_KEY,
    temperature: 0.7,
    topP: 0.9,
    topK: 40,
    maxOutputTokens: 1024,
  },

  // Zara Voice settings
  zara: {
    baseVoice: 'en-US-Neural2-F',
    defaultLanguage: 'en-US',
    pitch: 0,
    speed: 1.0,
    emotions: {
      neutral: { pitch: 0, speed: 1.0 },
      happy: { pitch: 2, speed: 1.05 },
      excited: { pitch: 3, speed: 1.1 },
      concerned: { pitch: -1, speed: 0.95 },
      thoughtful: { pitch: -0.5, speed: 0.9 },
    },
  },

  // Security settings
  security: {
    maxConnectionsPerUser: 3,
    maxConnectionsPerOrg: 50,
    rateLimitWindow: 60, // seconds
    rateLimitMax: 60, // requests per window
    tokenExpiry: 3600, // seconds
    ipWhitelistEnabled: false,
    deviceAuthEnabled: false,
  },

  // Language support
  languages: [
    { code: 'en-US', name: 'English (US)' },
    { code: 'en-GB', name: 'English (UK)' },
    { code: 'es-ES', name: 'Spanish' },
    { code: 'fr-FR', name: 'French' },
    { code: 'de-DE', name: 'German' },
    { code: 'it-IT', name: 'Italian' },
    { code: 'pt-BR', name: 'Portuguese (Brazil)' },
    { code: 'ja-JP', name: 'Japanese' },
    { code: 'ko-KR', name: 'Korean' },
    { code: 'zh-CN', name: 'Chinese (Simplified)' },
    { code: 'zh-TW', name: 'Chinese (Traditional)' },
    { code: 'hi-IN', name: 'Hindi' },
    { code: 'ar-SA', name: 'Arabic' },
    { code: 'ru-RU', name: 'Russian' },
    { code: 'nl-NL', name: 'Dutch' },
    { code: 'sv-SE', name: 'Swedish' },
    { code: 'pl-PL', name: 'Polish' },
    { code: 'tr-TR', name: 'Turkish' },
    { code: 'th-TH', name: 'Thai' },
    { code: 'vi-VN', name: 'Vietnamese' },
  ],

  // Performance settings
  performance: {
    targetLatency: 500, // ms
    maxLatency: 1000, // ms
    reconnectDelay: 1000, // ms
    maxReconnectAttempts: 5,
    compressionEnabled: true,
    compressionThreshold: 1024, // bytes
  },

  // Metrics settings
  metrics: {
    enabled: true,
    flushInterval: 60000, // ms
    retentionDays: 30,
  },

  // Feature flags
  features: {
    transcription: true,
    translation: false, // Enable when needed
    sentimentAnalysis: true,
    intentDetection: true,
    voiceCloning: true,
    multiLanguage: true,
    pushToTalk: true,
    continuousListening: true,
  },
};

export default voiceConfig;
