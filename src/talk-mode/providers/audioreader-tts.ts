/**
 * AudioReader TTS Provider
 *
 * Uses a local AudioReader API (Kokoro-82M engine) for high-quality,
 * free text-to-speech synthesis via an OpenAI-compatible REST API.
 */

import type {
  TTSProviderConfig,
  Voice,
  SynthesisOptions,
  SynthesisResult,
  AudioReaderTTSConfig,
} from '../types.js';
import type { ITTSProvider } from '../tts-manager.js';

const DEFAULT_BASE_URL = 'http://localhost:8000';
const DEFAULT_MODEL = 'kokoro';
const DEFAULT_VOICE = 'ff_siwis';

/** Known Kokoro voices with metadata */
const KOKORO_VOICES: Record<string, { name: string; language: string; gender: 'male' | 'female' }> = {
  ff_siwis: { name: 'Siwis', language: 'fr-FR', gender: 'female' },
  af_bella: { name: 'Bella', language: 'en-US', gender: 'female' },
  af_heart: { name: 'Heart', language: 'en-US', gender: 'female' },
  af_sarah: { name: 'Sarah', language: 'en-US', gender: 'female' },
  af_nicole: { name: 'Nicole', language: 'en-US', gender: 'female' },
  af_sky: { name: 'Sky', language: 'en-US', gender: 'female' },
  am_adam: { name: 'Adam', language: 'en-US', gender: 'male' },
  am_michael: { name: 'Michael', language: 'en-US', gender: 'male' },
  bf_emma: { name: 'Emma', language: 'en-GB', gender: 'female' },
  bm_george: { name: 'George', language: 'en-GB', gender: 'male' },
};

/** OpenAI voice name to Kokoro voice mapping */
const OPENAI_VOICE_MAP: Record<string, string> = {
  alloy: 'af_bella',
  echo: 'am_adam',
  nova: 'af_nicole',
  shimmer: 'af_sky',
};

export class AudioReaderTTSProvider implements ITTSProvider {
  readonly id = 'audioreader' as const;
  private config: AudioReaderTTSConfig = {};
  private initialized = false;

  async initialize(config: TTSProviderConfig): Promise<void> {
    const settings = (config.settings as AudioReaderTTSConfig | undefined) ?? {};
    this.config = {
      baseURL: settings.baseURL ?? DEFAULT_BASE_URL,
      model: settings.model ?? DEFAULT_MODEL,
      defaultVoice: settings.defaultVoice ?? DEFAULT_VOICE,
      speed: settings.speed ?? 1.0,
      format: settings.format ?? 'wav',
    };
    this.initialized = true;
  }

  async isAvailable(): Promise<boolean> {
    if (!this.initialized) return false;
    try {
      const res = await fetch(`${this.config.baseURL}/api/v2/health`, {
        signal: AbortSignal.timeout(3000),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  async listVoices(): Promise<Voice[]> {
    try {
      const res = await fetch(`${this.config.baseURL}/api/v2/voices`, {
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        const data = await res.json() as Record<string, unknown>;
        // API returns voice list — try to parse it
        if (Array.isArray(data)) {
          return data.map((v: string) => this.buildVoice(v));
        }
        if (data.voices && Array.isArray(data.voices)) {
          return (data.voices as string[]).map((v: string) => this.buildVoice(v));
        }
      }
    } catch {
      // Fall back to known voices
    }
    return Object.keys(KOKORO_VOICES).map(id => this.buildVoice(id));
  }

  async synthesize(text: string, options?: SynthesisOptions): Promise<SynthesisResult> {
    if (!this.initialized) {
      throw new Error('Provider not initialized');
    }

    const voice = this.resolveVoice(options?.voice) ?? this.config.defaultVoice ?? DEFAULT_VOICE;
    const speed = options?.rate ?? this.config.speed ?? 1.0;
    const format = (options?.format as 'wav' | 'mp3') ?? this.config.format ?? 'wav';

    const response = await fetch(`${this.config.baseURL}/v1/audio/speech`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.config.model ?? DEFAULT_MODEL,
        input: text,
        voice,
        speed: Math.max(0.25, Math.min(4.0, speed)),
        response_format: format,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`AudioReader TTS error: ${response.status} ${error}`);
    }

    const audioBuffer = Buffer.from(await response.arrayBuffer());

    const words = text.split(/\s+/).length;
    const durationMs = Math.round((words / 150) * 60 * 1000 / speed);

    return {
      audio: audioBuffer,
      format,
      durationMs,
      sampleRate: 24000,
      channels: 1,
      bitsPerSample: 16,
      provider: 'audioreader',
      voice: `audioreader-${voice}`,
    };
  }

  async shutdown(): Promise<void> {
    this.initialized = false;
    this.config = {};
  }

  private resolveVoice(voice?: string): string | undefined {
    if (!voice) return undefined;
    // Strip provider prefix
    if (voice.startsWith('audioreader-')) {
      voice = voice.slice('audioreader-'.length);
    }
    // Map OpenAI voice names
    if (voice in OPENAI_VOICE_MAP) {
      return OPENAI_VOICE_MAP[voice];
    }
    return voice;
  }

  private buildVoice(id: string): Voice {
    const meta = KOKORO_VOICES[id];
    return {
      id: `audioreader-${id}`,
      name: meta?.name ?? id,
      description: `AudioReader Kokoro voice - ${meta?.name ?? id}`,
      language: meta?.language ?? 'en-US',
      gender: meta?.gender ?? 'female',
      provider: 'audioreader',
      providerId: id,
      quality: 'high',
      sampleRate: 24000,
      isDefault: id === DEFAULT_VOICE,
    };
  }
}

export default AudioReaderTTSProvider;
