/**
 * Accessibility Utilities
 *
 * Provides utilities for improved accessibility including:
 * - Screen reader announcements
 * - Focus management
 * - Keyboard navigation
 * - High contrast mode
 * - Reduced motion support
 * - Color contrast checking
 */

import { useEffect, useState, useCallback } from 'react';
import { useInput } from 'ink';

// ============================================================================
// Types
// ============================================================================

export interface AriaLiveRegion {
  /** Politeness level */
  politeness: 'polite' | 'assertive' | 'off';
  /** Message to announce */
  message: string;
  /** Timestamp */
  timestamp: number;
}

export interface KeyboardShortcut {
  /** Key combination */
  keys: string[];
  /** Description */
  description: string;
  /** Handler function */
  handler: () => void;
  /** Whether it's enabled */
  enabled?: boolean;
}

export interface ContrastRatio {
  /** Contrast ratio (1-21) */
  ratio: number;
  /** WCAG AA compliance (4.5:1 for normal text, 3:1 for large text) */
  isAA: boolean;
  /** WCAG AAA compliance (7:1 for normal text, 4.5:1 for large text) */
  isAAA: boolean;
}

export interface AccessibilitySettings {
  /** Enable screen reader support */
  screenReader: boolean;
  /** Enable high contrast mode */
  highContrast: boolean;
  /** Reduce motion */
  reduceMotion: boolean;
  /** Announce keystrokes */
  announceKeys: boolean;
  /** Focus indicator style */
  focusIndicator: 'underline' | 'box' | 'background' | 'none';
  /** Minimum contrast ratio */
  minContrastRatio: number;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_SETTINGS: AccessibilitySettings = {
  screenReader: false,
  highContrast: false,
  reduceMotion: false,
  announceKeys: false,
  focusIndicator: 'underline',
  minContrastRatio: 4.5,
};

// WCAG color contrast constants
const WCAG_AA_NORMAL = 4.5;
const WCAG_AA_LARGE = 3.0;
const WCAG_AAA_NORMAL = 7.0;
const WCAG_AAA_LARGE = 4.5;

// ============================================================================
// Screen Reader Support
// ============================================================================

class ScreenReaderManager {
  private announcements: AriaLiveRegion[] = [];
  private listeners: Set<(announcement: AriaLiveRegion) => void> = new Set();

  /**
   * Announce a message to screen readers
   */
  announce(message: string, politeness: 'polite' | 'assertive' = 'polite'): void {
    const announcement: AriaLiveRegion = {
      politeness,
      message,
      timestamp: Date.now(),
    };

    this.announcements.push(announcement);

    // Keep only last 50 announcements
    if (this.announcements.length > 50) {
      this.announcements.shift();
    }

    // Notify listeners
    this.listeners.forEach((listener) => listener(announcement));

    // In terminal context, we output to stderr for screen readers
    // This doesn't interfere with the main UI
    if (process.stderr.isTTY) {
      // Use ANSI escape codes to create a hidden announcement
      // Screen readers will still read this
      process.stderr.write(`\x1b]0;${message}\x07`);
    }
  }

  /**
   * Subscribe to announcements
   */
  subscribe(listener: (announcement: AriaLiveRegion) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Get recent announcements
   */
  getRecent(count: number = 10): AriaLiveRegion[] {
    return this.announcements.slice(-count);
  }

  /**
   * Clear all announcements
   */
  clear(): void {
    this.announcements = [];
  }
}

// Singleton instance
const screenReaderManager = new ScreenReaderManager();

/**
 * Announce a message to screen readers
 */
export function announceToScreenReader(
  message: string,
  politeness: 'polite' | 'assertive' = 'polite'
): void {
  screenReaderManager.announce(message, politeness);
}

/**
 * Hook for subscribing to screen reader announcements
 */
export function useScreenReaderAnnouncements(
  callback: (announcement: AriaLiveRegion) => void
): void {
  useEffect(() => {
    return screenReaderManager.subscribe(callback);
  }, [callback]);
}

// ============================================================================
// Focus Management
// ============================================================================

export interface FocusableElement {
  id: string;
  label: string;
  order: number;
}

class FocusManager {
  private elements: FocusableElement[] = [];
  private currentFocus: string | null = null;
  private listeners: Set<(focusId: string | null) => void> = new Set();

  /**
   * Register a focusable element
   */
  register(element: FocusableElement): () => void {
    this.elements.push(element);
    this.elements.sort((a, b) => a.order - b.order);

    return () => {
      this.elements = this.elements.filter((e) => e.id !== element.id);
    };
  }

  /**
   * Set focus to an element
   */
  focus(id: string | null): void {
    if (this.currentFocus === id) return;

    this.currentFocus = id;
    this.listeners.forEach((listener) => listener(id));

    // Announce focus change to screen readers
    if (id) {
      const element = this.elements.find((e) => e.id === id);
      if (element) {
        announceToScreenReader(`Focus: ${element.label}`, 'polite');
      }
    }
  }

  /**
   * Move focus to next element
   */
  focusNext(): void {
    if (this.elements.length === 0) return;

    const currentIndex = this.elements.findIndex((e) => e.id === this.currentFocus);
    const nextIndex = (currentIndex + 1) % this.elements.length;
    this.focus(this.elements[nextIndex].id);
  }

  /**
   * Move focus to previous element
   */
  focusPrevious(): void {
    if (this.elements.length === 0) return;

    const currentIndex = this.elements.findIndex((e) => e.id === this.currentFocus);
    const prevIndex = currentIndex <= 0 ? this.elements.length - 1 : currentIndex - 1;
    this.focus(this.elements[prevIndex].id);
  }

  /**
   * Get current focus
   */
  getCurrentFocus(): string | null {
    return this.currentFocus;
  }

  /**
   * Subscribe to focus changes
   */
  subscribe(listener: (focusId: string | null) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Get all focusable elements
   */
  getElements(): FocusableElement[] {
    return [...this.elements];
  }
}

// Singleton instance
const focusManager = new FocusManager();

/**
 * Hook for managing focus
 */
export function useFocusManagement(
  elementId: string,
  label: string,
  order: number = 0
): {
  isFocused: boolean;
  focus: () => void;
  focusNext: () => void;
  focusPrevious: () => void;
} {
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    const unregister = focusManager.register({ id: elementId, label, order });
    const unsubscribe = focusManager.subscribe((focusId) => {
      setIsFocused(focusId === elementId);
    });

    return () => {
      unregister();
      unsubscribe();
    };
  }, [elementId, label, order]);

  const focus = useCallback(() => {
    focusManager.focus(elementId);
  }, [elementId]);

  const focusNext = useCallback(() => {
    focusManager.focusNext();
  }, []);

  const focusPrevious = useCallback(() => {
    focusManager.focusPrevious();
  }, []);

  return { isFocused, focus, focusNext, focusPrevious };
}

// ============================================================================
// Keyboard Navigation
// ============================================================================

/**
 * Hook for keyboard shortcuts with accessibility
 */
export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]): void {
  useInput((input, key) => {
    for (const shortcut of shortcuts) {
      if (shortcut.enabled === false) continue;

      // Match key combination
      const matches = shortcut.keys.every((k) => {
        switch (k.toLowerCase()) {
          case 'ctrl':
            return key.ctrl;
          case 'shift':
            return key.shift;
          case 'alt':
          case 'meta':
            return key.meta;
          case 'tab':
            return key.tab;
          case 'escape':
          case 'esc':
            return key.escape;
          case 'return':
          case 'enter':
            return key.return;
          case 'backspace':
            return key.backspace;
          case 'delete':
            return key.delete;
          case 'up':
          case 'uparrow':
            return key.upArrow;
          case 'down':
          case 'downarrow':
            return key.downArrow;
          case 'left':
          case 'leftarrow':
            return key.leftArrow;
          case 'right':
          case 'rightarrow':
            return key.rightArrow;
          default:
            return input === k;
        }
      });

      if (matches) {
        shortcut.handler();
        announceToScreenReader(
          `Keyboard shortcut: ${shortcut.description}`,
          'polite'
        );
        return;
      }
    }
  });
}

/**
 * Hook for arrow key navigation
 */
export function useArrowKeyNavigation(
  itemCount: number,
  onSelect: (index: number) => void,
  options: {
    enabled?: boolean;
    wrap?: boolean;
    horizontal?: boolean;
    announceSelection?: boolean;
  } = {}
): {
  selectedIndex: number;
  setSelectedIndex: (index: number) => void;
} {
  const {
    enabled = true,
    wrap = true,
    horizontal = false,
    announceSelection = true,
  } = options;

  const [selectedIndex, setSelectedIndex] = useState(0);

  useInput(
    (input, key) => {
      const isNext = horizontal ? key.rightArrow : key.downArrow;
      const isPrev = horizontal ? key.leftArrow : key.upArrow;

      if (isNext) {
        const nextIndex = selectedIndex + 1;
        const newIndex = wrap ? nextIndex % itemCount : Math.min(nextIndex, itemCount - 1);
        setSelectedIndex(newIndex);

        if (announceSelection) {
          announceToScreenReader(`Item ${newIndex + 1} of ${itemCount}`, 'polite');
        }
      } else if (isPrev) {
        const prevIndex = selectedIndex - 1;
        const newIndex = wrap
          ? (prevIndex + itemCount) % itemCount
          : Math.max(prevIndex, 0);
        setSelectedIndex(newIndex);

        if (announceSelection) {
          announceToScreenReader(`Item ${newIndex + 1} of ${itemCount}`, 'polite');
        }
      } else if (key.return) {
        onSelect(selectedIndex);
      }
    },
    { isActive: enabled }
  );

  return { selectedIndex, setSelectedIndex };
}

// ============================================================================
// Color Contrast Checking
// ============================================================================

/**
 * Convert hex color to RGB
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

/**
 * Calculate relative luminance
 */
function getLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });

  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Calculate contrast ratio between two colors
 */
export function calculateContrastRatio(color1: string, color2: string): number {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);

  if (!rgb1 || !rgb2) {
    return 1; // Invalid colors have no contrast
  }

  const l1 = getLuminance(rgb1.r, rgb1.g, rgb1.b);
  const l2 = getLuminance(rgb2.r, rgb2.g, rgb2.b);

  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Check if contrast ratio meets WCAG standards
 */
export function checkContrast(
  foreground: string,
  background: string,
  isLargeText: boolean = false
): ContrastRatio {
  const ratio = calculateContrastRatio(foreground, background);

  const aaThreshold = isLargeText ? WCAG_AA_LARGE : WCAG_AA_NORMAL;
  const aaaThreshold = isLargeText ? WCAG_AAA_LARGE : WCAG_AAA_NORMAL;

  return {
    ratio: Math.round(ratio * 100) / 100,
    isAA: ratio >= aaThreshold,
    isAAA: ratio >= aaaThreshold,
  };
}

/**
 * Get high contrast version of a color
 */
export function getHighContrastColor(
  color: string,
  background: string,
  targetRatio: number = WCAG_AA_NORMAL
): string {
  const contrast = calculateContrastRatio(color, background);

  if (contrast >= targetRatio) {
    return color; // Already meets target
  }

  const rgb = hexToRgb(color);
  const bgRgb = hexToRgb(background);

  if (!rgb || !bgRgb) {
    return color; // Can't adjust invalid colors
  }

  const bgLuminance = getLuminance(bgRgb.r, bgRgb.g, bgRgb.b);

  // Make darker or lighter based on background
  const shouldLighten = bgLuminance < 0.5;

  let adjusted = rgb;
  let iterations = 0;
  const maxIterations = 20;

  while (iterations < maxIterations) {
    const currentContrast = calculateContrastRatio(
      rgbToHex(adjusted.r, adjusted.g, adjusted.b),
      background
    );

    if (currentContrast >= targetRatio) {
      break;
    }

    // Adjust color
    if (shouldLighten) {
      adjusted = {
        r: Math.min(255, adjusted.r + 10),
        g: Math.min(255, adjusted.g + 10),
        b: Math.min(255, adjusted.b + 10),
      };
    } else {
      adjusted = {
        r: Math.max(0, adjusted.r - 10),
        g: Math.max(0, adjusted.g - 10),
        b: Math.max(0, adjusted.b - 10),
      };
    }

    iterations++;
  }

  return rgbToHex(adjusted.r, adjusted.g, adjusted.b);
}

/**
 * Convert RGB to hex
 */
function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('');
}

// ============================================================================
// Accessibility Settings
// ============================================================================

class AccessibilitySettingsManager {
  private settings: AccessibilitySettings = { ...DEFAULT_SETTINGS };
  private listeners: Set<(settings: AccessibilitySettings) => void> = new Set();

  /**
   * Load settings from environment or system preferences
   */
  constructor() {
    // Check for system preferences
    if (process.env.PREFERS_REDUCED_MOTION === 'true') {
      this.settings.reduceMotion = true;
    }

    if (process.env.FORCE_HIGH_CONTRAST === 'true') {
      this.settings.highContrast = true;
    }

    // Check for screen reader
    if (process.env.SCREEN_READER === 'true') {
      this.settings.screenReader = true;
    }
  }

  /**
   * Get current settings
   */
  getSettings(): AccessibilitySettings {
    return { ...this.settings };
  }

  /**
   * Update settings
   */
  updateSettings(updates: Partial<AccessibilitySettings>): void {
    this.settings = { ...this.settings, ...updates };
    this.listeners.forEach((listener) => listener(this.settings));
  }

  /**
   * Subscribe to settings changes
   */
  subscribe(listener: (settings: AccessibilitySettings) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Reset to defaults
   */
  reset(): void {
    this.settings = { ...DEFAULT_SETTINGS };
    this.listeners.forEach((listener) => listener(this.settings));
  }
}

// Singleton instance
const accessibilitySettings = new AccessibilitySettingsManager();

/**
 * Hook for accessibility settings
 */
export function useAccessibilitySettings(): {
  settings: AccessibilitySettings;
  updateSettings: (updates: Partial<AccessibilitySettings>) => void;
  reset: () => void;
} {
  const [settings, setSettings] = useState(accessibilitySettings.getSettings());

  useEffect(() => {
    return accessibilitySettings.subscribe(setSettings);
  }, []);

  const updateSettings = useCallback((updates: Partial<AccessibilitySettings>) => {
    accessibilitySettings.updateSettings(updates);
  }, []);

  const reset = useCallback(() => {
    accessibilitySettings.reset();
  }, []);

  return { settings, updateSettings, reset };
}

// ============================================================================
// Reduced Motion Support
// ============================================================================

/**
 * Hook for respecting reduced motion preference
 */
export function useReducedMotion(): boolean {
  const { settings } = useAccessibilitySettings();
  return settings.reduceMotion;
}

/**
 * Get animation duration based on reduced motion preference
 */
export function getAnimationDuration(defaultMs: number, reducedMotion: boolean): number {
  return reducedMotion ? 0 : defaultMs;
}

// ============================================================================
// ARIA Labels
// ============================================================================

/**
 * Generate ARIA label for UI element
 */
export function generateAriaLabel(
  label: string,
  context?: {
    role?: string;
    index?: number;
    total?: number;
    state?: 'selected' | 'active' | 'disabled' | 'expanded' | 'collapsed';
  }
): string {
  const parts: string[] = [label];

  if (context?.role) {
    parts.push(context.role);
  }

  if (context?.index !== undefined && context?.total !== undefined) {
    parts.push(`${context.index + 1} of ${context.total}`);
  }

  if (context?.state) {
    parts.push(context.state);
  }

  return parts.join(', ');
}

// ============================================================================
// Export Manager Instance
// ============================================================================

export const accessibility = {
  screenReader: screenReaderManager,
  focus: focusManager,
  settings: accessibilitySettings,
};

export default accessibility;
