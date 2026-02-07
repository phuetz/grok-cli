import { AudioReaderTTSProvider } from '../../src/talk-mode/providers/audioreader-tts';

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;

describe('AudioReaderTTSProvider', () => {
  let provider: AudioReaderTTSProvider;

  beforeEach(async () => {
    mockFetch.mockReset();
    provider = new AudioReaderTTSProvider();
    await provider.initialize({
      provider: 'audioreader',
      enabled: true,
      priority: 1,
      settings: { baseURL: 'http://localhost:8000' },
    });
  });

  afterEach(async () => {
    await provider.shutdown();
  });

  describe('isAvailable', () => {
    it('should return true when health endpoint responds ok', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });
      expect(await provider.isAvailable()).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/v2/health',
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      );
    });

    it('should return false when health endpoint fails', async () => {
      mockFetch.mockRejectedValueOnce(new Error('ECONNREFUSED'));
      expect(await provider.isAvailable()).toBe(false);
    });

    it('should return false when not initialized', async () => {
      const fresh = new AudioReaderTTSProvider();
      expect(await fresh.isAvailable()).toBe(false);
    });
  });

  describe('listVoices', () => {
    it('should fetch voices from API', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ voices: ['ff_siwis', 'af_bella'] }),
      });
      const voices = await provider.listVoices();
      expect(voices).toHaveLength(2);
      expect(voices[0].providerId).toBe('ff_siwis');
      expect(voices[0].provider).toBe('audioreader');
    });

    it('should fall back to known voices when API fails', async () => {
      mockFetch.mockRejectedValueOnce(new Error('fail'));
      const voices = await provider.listVoices();
      expect(voices.length).toBeGreaterThan(0);
      expect(voices.find(v => v.providerId === 'ff_siwis')).toBeDefined();
    });

    it('should handle array response format', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ['am_adam', 'bf_emma'],
      });
      const voices = await provider.listVoices();
      expect(voices).toHaveLength(2);
      expect(voices[0].providerId).toBe('am_adam');
    });
  });

  describe('synthesize', () => {
    it('should call speech endpoint and return buffer', async () => {
      const fakeAudio = new Uint8Array([1, 2, 3, 4]).buffer;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        arrayBuffer: async () => fakeAudio,
      });

      const result = await provider.synthesize('Hello world');
      expect(result.audio).toBeInstanceOf(Buffer);
      expect(result.audio.length).toBe(4);
      expect(result.provider).toBe('audioreader');
      expect(result.format).toBe('wav');
      expect(result.voice).toBe('audioreader-ff_siwis');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8000/v1/audio/speech',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"voice":"ff_siwis"'),
        }),
      );
    });

    it('should use specified voice', async () => {
      const fakeAudio = new Uint8Array([0]).buffer;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        arrayBuffer: async () => fakeAudio,
      });

      await provider.synthesize('Test', { voice: 'af_bella' });
      const body = JSON.parse((mockFetch.mock.calls[0][1] as RequestInit).body as string);
      expect(body.voice).toBe('af_bella');
    });

    it('should map OpenAI voice names', async () => {
      const fakeAudio = new Uint8Array([0]).buffer;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        arrayBuffer: async () => fakeAudio,
      });

      await provider.synthesize('Test', { voice: 'alloy' });
      const body = JSON.parse((mockFetch.mock.calls[0][1] as RequestInit).body as string);
      expect(body.voice).toBe('af_bella');
    });

    it('should strip audioreader- prefix from voice', async () => {
      const fakeAudio = new Uint8Array([0]).buffer;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        arrayBuffer: async () => fakeAudio,
      });

      await provider.synthesize('Test', { voice: 'audioreader-am_adam' });
      const body = JSON.parse((mockFetch.mock.calls[0][1] as RequestInit).body as string);
      expect(body.voice).toBe('am_adam');
    });

    it('should throw on API error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => 'Internal Server Error',
      });

      await expect(provider.synthesize('Test')).rejects.toThrow('AudioReader TTS error: 500');
    });

    it('should throw when not initialized', async () => {
      const fresh = new AudioReaderTTSProvider();
      await expect(fresh.synthesize('Test')).rejects.toThrow('Provider not initialized');
    });

    it('should clamp speed to valid range', async () => {
      const fakeAudio = new Uint8Array([0]).buffer;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        arrayBuffer: async () => fakeAudio,
      });

      await provider.synthesize('Test', { rate: 10.0 });
      const body = JSON.parse((mockFetch.mock.calls[0][1] as RequestInit).body as string);
      expect(body.speed).toBe(4.0);
    });
  });
});
