# Voice System Architecture

## Overview

Plugspace.io Titan v1.4 features a comprehensive voice interaction system powered by Google's Gemini Live API, enabling natural language website building through voice commands. The system includes Agent Zara, an AI voice assistant with a distinct personality that guides users through the creation process.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              VOICE SYSTEM                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐                │
│  │   Browser    │     │ Voice Server │     │  Gemini Live │                │
│  │   Client     │────▶│  (WebSocket) │────▶│     API      │                │
│  │              │◀────│              │◀────│              │                │
│  └──────────────┘     └──────────────┘     └──────────────┘                │
│         │                    │                                              │
│         │                    ▼                                              │
│         │             ┌──────────────┐                                      │
│         │             │    Redis     │                                      │
│         │             │   Sessions   │                                      │
│         │             └──────────────┘                                      │
│         │                    │                                              │
│         ▼                    ▼                                              │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐                │
│  │    Audio     │     │   Session    │     │    Zara      │                │
│  │  Processor   │     │   Manager    │     │    Voice     │                │
│  └──────────────┘     └──────────────┘     └──────────────┘                │
│                              │                     │                        │
│                              ▼                     ▼                        │
│                       ┌──────────────┐     ┌──────────────┐                │
│                       │     NLP      │     │    TTS       │                │
│                       │   Services   │     │   Synthesis  │                │
│                       └──────────────┘     └──────────────┘                │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. Voice WebSocket Server (`apps/server/`)

The voice server handles real-time bidirectional audio streaming:

```typescript
// Server initialization
const wss = new WebSocketServer({ server });

wss.on('connection', async (ws, request) => {
  // Authenticate connection
  // Create voice session
  // Initialize Gemini session
  // Handle audio streaming
});
```

**Key Features:**
- WebSocket-based communication
- Sub-500ms latency target
- Automatic reconnection
- Session persistence
- Multi-tenant isolation

### 2. Gemini Live Session (`gemini-session.ts`)

Manages bidirectional streaming with Gemini:

```typescript
class GeminiLiveSession {
  async initialize(): Promise<void>;
  async sendAudio(chunk: Buffer): Promise<void>;
  async sendText(text: string): Promise<void>;
  
  onTranscript(handler: (transcript: Transcript) => void): void;
  onResponse(handler: (response: GeminiResponse) => void): void;
}
```

### 3. Audio Processor (`audio-processor.ts`)

Handles audio format conversion and enhancement:

```typescript
class AudioProcessor {
  async process(data: Buffer, config: AudioConfig): Promise<Buffer>;
  detectVoiceActivity(data: Buffer): VADResult;
  getAudioLevel(data: Buffer): number;
}
```

**Processing Pipeline:**
1. Format conversion (WebM/Opus → PCM)
2. Resampling to 16kHz
3. Mono conversion
4. Normalization
5. Noise reduction
6. Voice Activity Detection (VAD)

### 4. Agent Zara Voice (`zara-voice.ts`)

The AI assistant's voice personality system:

```typescript
class ZaraVoice {
  async synthesize(text: string, options: SynthesisOptions): Promise<VoiceResponse>;
  detectEmotion(text: string, context?: ConversationContext): string;
  generateGreeting(context?: GreetingContext): Promise<VoiceResponse>;
}
```

**Personality Traits:**
- Warm and encouraging
- Professional but approachable
- Clear and concise
- Patient with clarifications
- Enthusiastic about helping

**Emotional States:**
- `neutral` - Default state
- `happy` - Positive acknowledgments
- `excited` - Celebrations and completions
- `concerned` - Error handling
- `thoughtful` - Complex queries
- `encouraging` - User guidance

### 5. Session Manager (`session-manager.ts`)

Manages voice session lifecycle:

```typescript
interface VoiceSession {
  sessionId: string;
  userId: string;
  connection: ConnectionState;
  audio: AudioConfig;
  language: LanguageConfig;
  context: ConversationContext;
  features: SessionFeatures;
  metrics: SessionMetrics;
}
```

### 6. Security Manager (`security.ts`)

Handles authentication and authorization:

```typescript
class SecurityManager {
  async authenticate(token: string): Promise<AuthResult>;
  async checkRateLimit(userId: string): Promise<RateLimitResult>;
  validateOrigin(origin: string, allowed: string[]): boolean;
}
```

## NLP Services (`apps/api/src/services/nlp/`)

### Intent Detection

Classifies user intents with high accuracy:

```typescript
const INTENT_DEFINITIONS = {
  create_project: { patterns: [...], category: 'project_creation' },
  modify_design: { patterns: [...], category: 'project_modification' },
  add_section: { patterns: [...], category: 'project_modification' },
  clone_website: { patterns: [...], category: 'project_creation' },
  deploy: { patterns: [...], category: 'command' },
  // ...more intents
};
```

**Supported Intents:**
- `create_project` - Create new website
- `modify_design` - Change design elements
- `add_section` - Add new sections
- `remove_section` - Remove sections
- `clone_website` - Clone from URL
- `navigate` - Navigation commands
- `deploy` - Deploy project
- `export` - Export code
- `query_help` - Help requests

### Entity Extraction

Extracts relevant entities from text:

```typescript
const entities = await intentService.extractEntities(text);
// Returns: Entity[] with types like:
// - url, color, section_type, industry, style
```

### Dialogue Management

Handles multi-turn conversations:

```typescript
class DialogueManager {
  async processUserTurn(sessionId: string, input: string): Promise<DialogueResponse>;
  async updateContext(sessionId: string, key: string, value: any): Promise<void>;
}
```

**Dialogue Phases:**
1. `greeting` - Initial interaction
2. `intent_capture` - Understanding request
3. `clarification` - Getting more details
4. `confirmation` - Confirming action
5. `execution` - Performing action
6. `feedback` - Getting user feedback
7. `completion` - Task complete

## Voice Command Processor

Natural language to action translation:

```typescript
class VoiceCommandProcessor {
  async processCommand(command: VoiceCommand): Promise<CommandResult>;
  async parseComplexCommand(text: string): Promise<CommandSequence>;
}
```

**Example Commands:**
- "Create a restaurant website with a booking system"
- "Make the hero section darker"
- "Add a pricing table"
- "Clone the design from stripe.com"
- "Deploy to production"

## Frontend Components

### useVoiceSocket Hook

```typescript
const {
  connect,
  disconnect,
  isConnected,
  startRecording,
  stopRecording,
  isRecording,
  transcript,
  response,
  connectionQuality,
  latency,
} = useVoiceSocket(config);
```

### VoiceTrigger Component

```tsx
<VoiceTrigger
  config={{
    organizationId: 'org_123',
    projectId: 'proj_456',
  }}
  onTranscript={(text, isFinal) => console.log(text)}
  onResponse={(response) => console.log(response)}
  showTranscript
  showStatus
/>
```

### AudioVisualizer Component

```tsx
<AudioVisualizer
  audioLevel={0.5}
  isActive={isRecording}
  variant="bars" // 'bars' | 'wave' | 'circle' | 'spectrum'
  size="md"
/>
```

## Message Protocol

### Client → Server

```typescript
// Start recording
{ type: 'start_recording' }

// Audio data
{ type: 'audio', data: 'base64_audio_data' }

// Text input (accessibility)
{ type: 'text_input', text: 'Create a website' }

// Stop recording
{ type: 'stop_recording' }

// Set language
{ type: 'set_language', language: 'en-US' }
```

### Server → Client

```typescript
// Connection established
{ type: 'connected', sessionId: '...', features: {...} }

// Transcript update
{ type: 'transcript', data: { text: '...', isFinal: true, confidence: 0.95 } }

// Voice response
{ type: 'voice_response', data: { text: '...', audio: 'base64', emotion: 'happy' } }

// Error
{ type: 'error', error: 'Error message' }
```

## Configuration

### Voice Server Config

```typescript
const voiceConfig = {
  server: { port: 4001, maxConnections: 10000 },
  audio: { sampleRate: 16000, channels: 1, bitrate: 64000 },
  gemini: { model: 'gemini-2.0-flash-exp', temperature: 0.7 },
  zara: { baseVoice: 'en-US-Neural2-F', defaultLanguage: 'en-US' },
};
```

### Security Config

```typescript
const securityConfig = {
  cors: { allowedOrigins: [...] },
  rateLimits: {
    free: { requests: 100, windowSeconds: 3600 },
    professional: { requests: 2000, windowSeconds: 3600 },
  },
  connections: { maxPerUser: 3, maxPerOrganization: 50 },
};
```

## Performance Requirements

| Metric | Target | Maximum |
|--------|--------|---------|
| Voice-to-text latency | 500ms | 1000ms |
| Text-to-voice latency | 300ms | 500ms |
| Connection establishment | 2s | 5s |
| Reconnection time | 5s | 15s |
| Concurrent sessions/server | 1000+ | - |
| Uptime | 99.9% | - |

## Quality Requirements

| Metric | Target |
|--------|--------|
| Transcription accuracy | >95% |
| Intent detection accuracy | >99% |
| Audio quality (MOS) | >4.0 |
| Voice naturalness | >85% satisfaction |
| Zara personality consistency | >90% |

## Supported Languages

| Language | Code | Status |
|----------|------|--------|
| English (US) | en-US | ✅ Full |
| English (UK) | en-GB | ✅ Full |
| Spanish | es-ES | ✅ Full |
| French | fr-FR | ✅ Full |
| German | de-DE | ✅ Full |
| Japanese | ja-JP | ✅ Full |
| Chinese | zh-CN | ✅ Full |
| + 13 more | ... | ✅ Supported |

## Error Handling

```typescript
// Connection errors
ws.onerror = (error) => {
  // Attempt reconnection with exponential backoff
  reconnect(attempt);
};

// Gemini API errors
geminiSession.onError((error) => {
  // Fallback to text-only mode
  // Notify user
});

// Audio processing errors
try {
  await processor.process(audio);
} catch (error) {
  // Use original audio
  // Log for debugging
}
```

## Security Considerations

1. **Authentication**: Firebase token validation
2. **Rate Limiting**: Tier-based limits
3. **Data Protection**: Optional audio encryption
4. **GDPR Compliance**: Configurable retention
5. **Origin Validation**: Whitelist-based CORS

## Deployment

### Docker

```bash
cd apps/server
docker build -t plugspace-voice:latest .
docker run -p 4001:4001 plugspace-voice:latest
```

### Environment Variables

See `apps/server/.env.example` for all configuration options.
