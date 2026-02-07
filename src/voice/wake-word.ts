/**
 * Wake Word Detector
 *
 * Detects wake words in audio stream using Porcupine (Picovoice) engine
 * with fallback to text-match mode when no access key is available.
 */

import { EventEmitter } from 'events';
import type {
  WakeWordConfig,
  WakeWordDetection,
} from './types.js';
import { DEFAULT_WAKE_WORD_CONFIG } from './types.js';

/**
 * Wake word detector interface
 */
export interface IWakeWordDetector {
  /** Start detection */
  start(): Promise<void>;
  /** Stop detection */
  stop(): Promise<void>;
  /** Process audio frame (Int16Array for Porcupine, Buffer for text-match) */
  processFrame(frame: Buffer | Int16Array): WakeWordDetection | null;
  /** Check if running */
  isRunning(): boolean;
  /** Get configuration */
  getConfig(): WakeWordConfig;
  /** Update configuration */
  updateConfig(config: Partial<WakeWordConfig>): void;
}

/**
 * Built-in Porcupine keyword mapping.
 * Maps friendly wake word names to Porcupine built-in keyword identifiers.
 */
const BUILTIN_KEYWORD_MAP: Record<string, string> = {
  'hey buddy': 'COMPUTER',
  'ok code': 'PICOVOICE',
  'computer': 'COMPUTER',
  'picovoice': 'PICOVOICE',
  'alexa': 'ALEXA',
  'hey google': 'HEY_GOOGLE',
  'hey siri': 'HEY_SIRI',
  'ok google': 'OK_GOOGLE',
  'jarvis': 'JARVIS',
  'bumblebee': 'BUMBLEBEE',
  'porcupine': 'PORCUPINE',
  'terminator': 'TERMINATOR',
  'blueberry': 'BLUEBERRY',
  'grapefruit': 'GRAPEFRUIT',
  'grasshopper': 'GRASSHOPPER',
  'americano': 'AMERICANO',
};

type PorcupineInstance = {
  process(frame: Int16Array): number;
  release(): void;
  frameLength: number;
  sampleRate: number;
};

/**
 * Wake word detector with Porcupine engine and text-match fallback
 */
export class WakeWordDetector extends EventEmitter implements IWakeWordDetector {
  private config: WakeWordConfig;
  private running = false;
  private porcupine: PorcupineInstance | null = null;
  private engine: 'porcupine' | 'text-match' = 'text-match';
  private lastDetection: Date | null = null;
  private cooldownMs = 1000;
  private keywordLabels: string[] = [];

  constructor(config: Partial<WakeWordConfig> = {}) {
    super();
    this.config = { ...DEFAULT_WAKE_WORD_CONFIG, ...config };
  }

  async start(): Promise<void> {
    if (this.running) return;

    const accessKey = this.config.accessKey || process.env.PICOVOICE_ACCESS_KEY;
    const requestedEngine = this.config.engine;

    if (requestedEngine === 'text-match' || !accessKey) {
      this.engine = 'text-match';
      if (!accessKey && requestedEngine !== 'text-match') {
        console.warn('[WakeWord] No PICOVOICE_ACCESS_KEY found, falling back to text-match mode');
      }
    } else {
      try {
        await this.initPorcupine(accessKey);
        this.engine = 'porcupine';
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        console.warn(`[WakeWord] Porcupine init failed (${msg}), falling back to text-match mode`);
        this.engine = 'text-match';
      }
    }

    this.running = true;
    this.emit('started');
  }

  private async initPorcupine(accessKey: string): Promise<void> {
    const { Porcupine, BuiltinKeyword, getBuiltinKeywordPath } = await import('@picovoice/porcupine-node');

    if (this.config.keywordPaths && this.config.keywordPaths.length > 0) {
      // Custom .ppn keyword files
      const sensitivities = this.config.keywordPaths.map(() => this.config.sensitivity);
      this.porcupine = new Porcupine(
        accessKey,
        this.config.keywordPaths,
        sensitivities,
      ) as unknown as PorcupineInstance;
      this.keywordLabels = this.config.keywordPaths.map((p, i) => this.config.wakeWords[i] || `keyword_${i}`);
    } else {
      // Map configured wake words to built-in keyword paths
      const keywordPaths: string[] = [];
      const labels: string[] = [];

      for (const word of this.config.wakeWords) {
        const builtinName = BUILTIN_KEYWORD_MAP[word.toLowerCase()];
        if (builtinName) {
          const builtinEnum = BuiltinKeyword[builtinName as keyof typeof BuiltinKeyword];
          if (builtinEnum !== undefined) {
            keywordPaths.push(getBuiltinKeywordPath(builtinEnum));
            labels.push(word);
          }
        }
      }

      if (keywordPaths.length === 0) {
        // Default to COMPUTER if no mapping found
        keywordPaths.push(getBuiltinKeywordPath(BuiltinKeyword.COMPUTER));
        labels.push(this.config.wakeWords[0] || 'hey buddy');
      }

      const sensitivities = keywordPaths.map(() => this.config.sensitivity);
      this.porcupine = new Porcupine(
        accessKey,
        keywordPaths,
        sensitivities,
      ) as unknown as PorcupineInstance;
      this.keywordLabels = labels;
    }
  }

  async stop(): Promise<void> {
    if (!this.running) return;

    this.running = false;

    if (this.porcupine) {
      this.porcupine.release();
      this.porcupine = null;
    }

    this.emit('stopped');
  }

  processFrame(frame: Buffer | Int16Array): WakeWordDetection | null {
    if (!this.running) return null;

    // Cooldown check
    if (this.lastDetection && Date.now() - this.lastDetection.getTime() < this.cooldownMs) {
      return null;
    }

    if (this.engine === 'porcupine' && this.porcupine) {
      return this.processPorcupineFrame(frame);
    }

    // text-match mode: no-op for raw audio frames
    // Text matching is handled via detectWakeWordText()
    return null;
  }

  private processPorcupineFrame(frame: Buffer | Int16Array): WakeWordDetection | null {
    if (!this.porcupine) return null;

    let int16Frame: Int16Array;
    if (frame instanceof Int16Array) {
      int16Frame = frame;
    } else {
      // Convert Buffer to Int16Array
      int16Frame = new Int16Array(frame.buffer, frame.byteOffset, frame.length / 2);
    }

    const keywordIndex = this.porcupine.process(int16Frame);

    if (keywordIndex >= 0) {
      const detection: WakeWordDetection = {
        wakeWord: this.keywordLabels[keywordIndex] || `keyword_${keywordIndex}`,
        confidence: 1.0, // Porcupine is binary (detected or not)
        timestamp: new Date(),
        frameIndex: keywordIndex,
      };

      this.lastDetection = new Date();
      this.emit('detected', detection);
      return detection;
    }

    return null;
  }

  /**
   * Text-based wake word detection (fallback for when Porcupine is not available).
   * Call this with transcribed text instead of raw audio frames.
   */
  detectWakeWordText(text: string): WakeWordDetection | null {
    if (!this.running) return null;

    // Cooldown check
    if (this.lastDetection && Date.now() - this.lastDetection.getTime() < this.cooldownMs) {
      return null;
    }

    const normalized = text.toLowerCase().trim();

    for (const word of this.config.wakeWords) {
      if (normalized.includes(word.toLowerCase())) {
        const detection: WakeWordDetection = {
          wakeWord: word,
          confidence: 0.85,
          timestamp: new Date(),
        };

        this.lastDetection = new Date();
        this.emit('detected', detection);
        return detection;
      }
    }

    return null;
  }

  /**
   * Get the active detection engine
   */
  getEngine(): 'porcupine' | 'text-match' {
    return this.engine;
  }

  /**
   * Get Porcupine frame length (samples per frame required)
   */
  get frameLength(): number {
    return this.porcupine?.frameLength ?? this.config.frameSize;
  }

  /**
   * Get Porcupine sample rate
   */
  get sampleRate(): number {
    return this.porcupine?.sampleRate ?? this.config.sampleRate;
  }

  isRunning(): boolean {
    return this.running;
  }

  getConfig(): WakeWordConfig {
    return { ...this.config };
  }

  updateConfig(config: Partial<WakeWordConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Add a custom wake word
   */
  addWakeWord(wakeWord: string): void {
    if (!this.config.wakeWords.includes(wakeWord)) {
      this.config.wakeWords.push(wakeWord);
    }
  }

  /**
   * Remove a wake word
   */
  removeWakeWord(wakeWord: string): void {
    const index = this.config.wakeWords.indexOf(wakeWord);
    if (index >= 0) {
      this.config.wakeWords.splice(index, 1);
    }
  }

  /**
   * Get current wake words
   */
  getWakeWords(): string[] {
    return [...this.config.wakeWords];
  }

  /**
   * Set sensitivity
   */
  setSensitivity(sensitivity: number): void {
    this.config.sensitivity = Math.max(0, Math.min(1, sensitivity));
  }

  /**
   * Clear audio buffer (no-op, kept for API compatibility)
   */
  clearBuffer(): void {
    // Porcupine processes frames individually, no buffer to clear
  }
}

/**
 * Factory function for creating wake word detector
 */
export function createWakeWordDetector(
  config?: Partial<WakeWordConfig>
): WakeWordDetector {
  return new WakeWordDetector(config);
}

export default WakeWordDetector;
