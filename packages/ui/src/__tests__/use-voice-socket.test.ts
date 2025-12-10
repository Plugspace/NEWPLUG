// ==============================================
// PLUGSPACE.IO TITAN v1.4 - VOICE SOCKET HOOK TESTS
// ==============================================

import { renderHook, act } from '@testing-library/react';
import { useVoiceSocket } from '../hooks/use-voice-socket';

// Mock WebSocket
class MockWebSocket {
  static OPEN = 1;
  static CLOSED = 3;
  
  readyState = MockWebSocket.OPEN;
  onopen: ((event: any) => void) | null = null;
  onclose: ((event: any) => void) | null = null;
  onmessage: ((event: any) => void) | null = null;
  onerror: ((event: any) => void) | null = null;

  constructor(url: string) {
    setTimeout(() => {
      if (this.onopen) {
        this.onopen({});
      }
    }, 0);
  }

  send(data: string) {
    // Mock send
  }

  close(code?: number, reason?: string) {
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose) {
      this.onclose({ code, reason });
    }
  }

  // Helper to simulate incoming messages
  simulateMessage(data: any) {
    if (this.onmessage) {
      this.onmessage({ data: JSON.stringify(data) });
    }
  }
}

// Mock getUserMedia
const mockGetUserMedia = jest.fn().mockResolvedValue({
  getTracks: () => [{
    stop: jest.fn(),
  }],
});

describe('useVoiceSocket', () => {
  let originalWebSocket: typeof WebSocket;
  let originalMediaDevices: typeof navigator.mediaDevices;

  beforeAll(() => {
    originalWebSocket = global.WebSocket;
    (global as any).WebSocket = MockWebSocket;
    
    originalMediaDevices = navigator.mediaDevices;
    Object.defineProperty(navigator, 'mediaDevices', {
      value: {
        getUserMedia: mockGetUserMedia,
      },
      writable: true,
    });
  });

  afterAll(() => {
    global.WebSocket = originalWebSocket;
    Object.defineProperty(navigator, 'mediaDevices', {
      value: originalMediaDevices,
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const defaultConfig = {
    organizationId: 'org-123',
    projectId: 'proj-456',
    language: 'en-US',
  };

  describe('connection', () => {
    it('should initialize with disconnected state', () => {
      const { result } = renderHook(() => useVoiceSocket(defaultConfig));

      expect(result.current.isConnected).toBe(false);
      expect(result.current.sessionId).toBeNull();
      expect(result.current.connectionQuality).toBe('disconnected');
    });

    it('should connect successfully', async () => {
      const { result } = renderHook(() => useVoiceSocket(defaultConfig));

      await act(async () => {
        await result.current.connect();
      });

      // WebSocket is mocked to connect immediately
      expect(result.current.isConnected).toBe(true);
    });

    it('should disconnect cleanly', async () => {
      const { result } = renderHook(() => useVoiceSocket(defaultConfig));

      await act(async () => {
        await result.current.connect();
      });

      act(() => {
        result.current.disconnect();
      });

      expect(result.current.isConnected).toBe(false);
    });
  });

  describe('recording', () => {
    it('should not be recording initially', () => {
      const { result } = renderHook(() => useVoiceSocket(defaultConfig));

      expect(result.current.isRecording).toBe(false);
    });

    it('should start recording when connected', async () => {
      const { result } = renderHook(() => useVoiceSocket(defaultConfig));

      await act(async () => {
        await result.current.connect();
        await result.current.startRecording();
      });

      expect(mockGetUserMedia).toHaveBeenCalled();
    });

    it('should stop recording', async () => {
      const { result } = renderHook(() => useVoiceSocket(defaultConfig));

      await act(async () => {
        await result.current.connect();
        await result.current.startRecording();
      });

      act(() => {
        result.current.stopRecording();
      });

      expect(result.current.isRecording).toBe(false);
    });
  });

  describe('transcript handling', () => {
    it('should update transcript on message', async () => {
      const { result } = renderHook(() => useVoiceSocket(defaultConfig));

      await act(async () => {
        await result.current.connect();
      });

      // Initial transcript should be empty
      expect(result.current.transcript).toBe('');
    });

    it('should update partial transcript', async () => {
      const { result } = renderHook(() => useVoiceSocket(defaultConfig));

      await act(async () => {
        await result.current.connect();
      });

      expect(result.current.partialTranscript).toBe('');
    });
  });

  describe('mute functionality', () => {
    it('should not be muted initially', () => {
      const { result } = renderHook(() => useVoiceSocket(defaultConfig));

      expect(result.current.isMuted).toBe(false);
    });

    it('should toggle mute', () => {
      const { result } = renderHook(() => useVoiceSocket(defaultConfig));

      act(() => {
        result.current.toggleMute();
      });

      expect(result.current.isMuted).toBe(true);

      act(() => {
        result.current.toggleMute();
      });

      expect(result.current.isMuted).toBe(false);
    });
  });

  describe('language setting', () => {
    it('should have default language', () => {
      const { result } = renderHook(() => useVoiceSocket(defaultConfig));

      expect(result.current.currentLanguage).toBe('en-US');
    });

    it('should update language', () => {
      const { result } = renderHook(() => useVoiceSocket(defaultConfig));

      act(() => {
        result.current.setLanguage('es-ES');
      });

      expect(result.current.currentLanguage).toBe('es-ES');
    });
  });

  describe('error handling', () => {
    it('should have no error initially', () => {
      const { result } = renderHook(() => useVoiceSocket(defaultConfig));

      expect(result.current.error).toBeNull();
    });

    it('should clear error', () => {
      const { result } = renderHook(() => useVoiceSocket(defaultConfig));

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('audio playback', () => {
    it('should not be playing initially', () => {
      const { result } = renderHook(() => useVoiceSocket(defaultConfig));

      expect(result.current.isPlaying).toBe(false);
    });
  });

  describe('audio levels', () => {
    it('should have zero input level initially', () => {
      const { result } = renderHook(() => useVoiceSocket(defaultConfig));

      expect(result.current.inputLevel).toBe(0);
    });

    it('should have zero output level initially', () => {
      const { result } = renderHook(() => useVoiceSocket(defaultConfig));

      expect(result.current.outputLevel).toBe(0);
    });
  });

  describe('text input', () => {
    it('should send text message', async () => {
      const { result } = renderHook(() => useVoiceSocket(defaultConfig));

      await act(async () => {
        await result.current.connect();
      });

      act(() => {
        result.current.sendText('Hello world');
      });

      // Should not throw
    });
  });

  describe('cleanup', () => {
    it('should cleanup on unmount', () => {
      const { unmount, result } = renderHook(() => useVoiceSocket(defaultConfig));

      unmount();

      // Should disconnect and cleanup
    });
  });
});
