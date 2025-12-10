# Audio Technical Specifications

## Overview

This document details the technical audio specifications for the Plugspace.io Titan voice system, including format requirements, processing pipeline, and quality standards.

## Audio Format Specifications

### Input Audio (Client → Server)

| Parameter | Value | Notes |
|-----------|-------|-------|
| Format | WebM/Opus | Browser native |
| Sample Rate | 16kHz (min), 48kHz (optimal) | Resampled to 16kHz |
| Channels | Mono (preferred), Stereo (supported) | Converted to mono |
| Bit Depth | 16-bit | |
| Bitrate | 32-128 kbps (adaptive) | |
| Chunk Size | 100-500ms | 100ms default |
| Buffer Size | 1-2 seconds | |

### Output Audio (Server → Client)

| Parameter | Value | Notes |
|-----------|-------|-------|
| Format | MP3, WAV, Opus | MP3 default |
| Sample Rate | 24kHz | Neural TTS output |
| Channels | Mono | |
| Bitrate | 64 kbps | |

## Audio Processing Pipeline

```
┌─────────────────────────────────────────────────────────────────┐
│                    AUDIO PROCESSING PIPELINE                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Raw Audio ───▶ VAD ───▶ Noise ───▶ Normalize ───▶ Resample    │
│  (WebM/Opus)        Reduction                    (16kHz)         │
│                                                                  │
│       │                                              │           │
│       ▼                                              ▼           │
│  ┌─────────┐                                  ┌───────────┐     │
│  │ Silence │                                  │  Gemini   │     │
│  │ Detect  │                                  │  Stream   │     │
│  └─────────┘                                  └───────────┘     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 1. Format Conversion

```typescript
// Opus decoding (WebM container)
const decoder = new OpusDecoder({
  sampleRate: 16000,
  channels: 1,
});

const pcm = decoder.decode(webmData);
```

### 2. Voice Activity Detection (VAD)

```typescript
interface VADConfig {
  threshold: number;      // Speech probability threshold (0.5)
  silenceThreshold: number; // Silence detection (0.01)
  frameDuration: number;  // Analysis frame (30ms)
}

interface VADResult {
  isSpeech: boolean;
  speechProbability: number;
  noiseLevel: number;
  signalToNoise: number;
}
```

**VAD Algorithm:**
1. Calculate RMS energy per frame
2. Track audio level history
3. Compute zero-crossing rate
4. Combine metrics for speech probability
5. Apply hysteresis for stability

### 3. Noise Reduction

```typescript
interface NoiseReductionConfig {
  enabled: boolean;
  aggressiveness: number; // 0-3
  noiseFloor: number;
}
```

**Implementation:**
- Spectral subtraction
- Noise floor estimation from quiet regions
- Adaptive threshold adjustment
- Soft limiting to prevent artifacts

### 4. Normalization

```typescript
// Peak normalization to 80% of max
const targetPeak = 32767 * 0.8;
const gain = targetPeak / maxAmplitude;

// Soft clipping for natural sound
function softClip(sample: number): number {
  const threshold = 32767 * 0.9;
  if (Math.abs(sample) < threshold) return sample;
  // Gradual compression above threshold
}
```

### 5. Resampling

```typescript
// Linear interpolation resampling
function resample(
  data: Int16Array,
  fromRate: number,
  toRate: number
): Int16Array {
  const ratio = toRate / fromRate;
  // Interpolation algorithm
}
```

## Audio Quality Metrics

### Mean Opinion Score (MOS)

Target: >4.0 (Good to Excellent)

| Score | Quality |
|-------|---------|
| 5 | Excellent |
| 4 | Good |
| 3 | Fair |
| 2 | Poor |
| 1 | Bad |

### Signal-to-Noise Ratio (SNR)

Target: >20dB for clear speech

### Latency Breakdown

| Stage | Target | Max |
|-------|--------|-----|
| Capture → Send | 50ms | 100ms |
| Network Transit | 100ms | 200ms |
| Server Processing | 50ms | 100ms |
| Gemini API | 200ms | 400ms |
| Response Synthesis | 100ms | 200ms |
| **Total** | **500ms** | **1000ms** |

## Browser Audio API Usage

### MediaRecorder Configuration

```typescript
const mediaRecorder = new MediaRecorder(stream, {
  mimeType: 'audio/webm;codecs=opus',
  audioBitsPerSecond: 64000,
});

mediaRecorder.ondataavailable = (event) => {
  // Process 100ms chunks
};

mediaRecorder.start(100); // 100ms timeslice
```

### getUserMedia Constraints

```typescript
const constraints = {
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    sampleRate: 16000,
    channelCount: 1,
  },
};
```

### Web Audio API for Visualization

```typescript
const audioContext = new AudioContext();
const analyser = audioContext.createAnalyser();
analyser.fftSize = 256;

const source = audioContext.createMediaStreamSource(stream);
source.connect(analyser);

// Get frequency data
const dataArray = new Uint8Array(analyser.frequencyBinCount);
analyser.getByteFrequencyData(dataArray);
```

## Codec Support

### Supported Input Codecs

| Codec | Container | Browser Support |
|-------|-----------|-----------------|
| Opus | WebM | ✅ All modern |
| Opus | OGG | ✅ Firefox, Chrome |
| AAC | MP4 | ✅ Safari, Chrome |
| PCM | WAV | ✅ All |

### Codec Selection Priority

```typescript
const mimeTypes = [
  'audio/webm;codecs=opus',  // Preferred
  'audio/webm',
  'audio/ogg;codecs=opus',
  'audio/mp4',
];

function getSupportedMimeType(): string {
  for (const type of mimeTypes) {
    if (MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }
  return '';
}
```

## Bandwidth Optimization

### Adaptive Bitrate

| Quality | Bitrate | Use Case |
|---------|---------|----------|
| High | 128 kbps | Excellent connection |
| Medium | 64 kbps | Standard (default) |
| Low | 32 kbps | Poor connection |

### Bandwidth Estimation

```typescript
function estimateBandwidth(latency: number): 'high' | 'medium' | 'low' {
  if (latency < 100) return 'high';
  if (latency < 300) return 'medium';
  return 'low';
}
```

### Silence Suppression

- Detect silence periods
- Reduce data transmission during silence
- Comfort noise generation (optional)

## Text-to-Speech (TTS) Specifications

### Google Cloud TTS Configuration

```typescript
const request = {
  input: { ssml: '<speak>...</speak>' },
  voice: {
    languageCode: 'en-US',
    name: 'en-US-Neural2-F',
  },
  audioConfig: {
    audioEncoding: 'MP3',
    sampleRateHertz: 24000,
    speakingRate: 1.0,
    pitch: 0,
    volumeGainDb: 0,
  },
};
```

### SSML Support

```xml
<speak>
  <prosody rate="medium" pitch="+2st">
    Hello! I'm Zara.
    <break time="300ms"/>
    How can I help you today?
  </prosody>
</speak>
```

### Emotion-Based Voice Modulation

| Emotion | Pitch | Speed | Volume |
|---------|-------|-------|--------|
| Neutral | 0 | 1.0 | 0dB |
| Happy | +2st | 1.05 | +1dB |
| Excited | +3st | 1.1 | +2dB |
| Concerned | -1st | 0.95 | -1dB |
| Thoughtful | -0.5st | 0.9 | 0dB |

## Error Handling

### Audio Capture Errors

```typescript
try {
  stream = await navigator.mediaDevices.getUserMedia(constraints);
} catch (error) {
  if (error.name === 'NotAllowedError') {
    // Permission denied
  } else if (error.name === 'NotFoundError') {
    // No microphone
  } else if (error.name === 'NotReadableError') {
    // Hardware error
  }
}
```

### Processing Errors

- Fallback to unprocessed audio
- Log errors for debugging
- Continue with degraded quality

### Network Errors

- Buffer audio during disconnection
- Automatic reconnection
- Graceful degradation

## Testing Audio Quality

### Automated Tests

```typescript
describe('AudioProcessor', () => {
  it('should reduce noise', async () => {
    const noisy = loadTestAudio('noisy.wav');
    const clean = processor.reduceNoise(noisy);
    expect(calculateSNR(clean)).toBeGreaterThan(20);
  });

  it('should detect voice activity', () => {
    const speech = loadTestAudio('speech.wav');
    const silence = loadTestAudio('silence.wav');
    
    expect(processor.detectVoiceActivity(speech).isSpeech).toBe(true);
    expect(processor.detectVoiceActivity(silence).isSpeech).toBe(false);
  });
});
```

### Manual Testing Checklist

- [ ] Clear speech transcription
- [ ] Noise rejection (keyboard, background)
- [ ] Echo cancellation
- [ ] Natural TTS output
- [ ] Latency within targets
- [ ] Reconnection handling
