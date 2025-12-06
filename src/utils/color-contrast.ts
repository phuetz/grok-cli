/**
 * Color Contrast Utilities
 *
 * Functions for checking color contrast ratios and ensuring accessibility.
 * Based on WCAG 2.1 guidelines for color contrast.
 */

/**
 * Parse hex color to RGB values
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  // Remove # if present
  const cleanHex = hex.replace(/^#/, "");

  // Handle 3-character hex
  let fullHex = cleanHex;
  if (cleanHex.length === 3) {
    fullHex = cleanHex
      .split("")
      .map((c) => c + c)
      .join("");
  }

  if (fullHex.length !== 6) {
    return null;
  }

  const result = /^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(fullHex);
  if (!result) {
    return null;
  }

  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  };
}

/**
 * Convert RGB to hex
 */
export function rgbToHex(r: number, g: number, b: number): string {
  return (
    "#" +
    [r, g, b]
      .map((x) => {
        const hex = Math.round(Math.max(0, Math.min(255, x))).toString(16);
        return hex.length === 1 ? "0" + hex : hex;
      })
      .join("")
  );
}

/**
 * Calculate relative luminance of a color
 * https://www.w3.org/WAI/GL/wiki/Relative_luminance
 */
export function getRelativeLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const srgb = c / 255;
    return srgb <= 0.03928
      ? srgb / 12.92
      : Math.pow((srgb + 0.055) / 1.055, 2.4);
  });

  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Calculate contrast ratio between two colors
 * https://www.w3.org/WAI/GL/wiki/Contrast_ratio
 *
 * @returns Contrast ratio (1 to 21)
 */
export function getContrastRatio(
  color1: { r: number; g: number; b: number },
  color2: { r: number; g: number; b: number }
): number {
  const l1 = getRelativeLuminance(color1.r, color1.g, color1.b);
  const l2 = getRelativeLuminance(color2.r, color2.g, color2.b);

  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Check contrast ratio between two hex colors
 */
export function checkContrast(fg: string, bg: string): number {
  const fgRgb = hexToRgb(fg);
  const bgRgb = hexToRgb(bg);

  if (!fgRgb || !bgRgb) {
    throw new Error("Invalid color format");
  }

  return getContrastRatio(fgRgb, bgRgb);
}

/**
 * WCAG contrast level
 */
export type WcagLevel = "AAA" | "AA" | "AA-large" | "fail";

/**
 * Check if contrast meets WCAG requirements
 *
 * - AAA: >= 7:1 for normal text, >= 4.5:1 for large text
 * - AA: >= 4.5:1 for normal text, >= 3:1 for large text
 */
export function getWcagLevel(
  ratio: number,
  isLargeText: boolean = false
): WcagLevel {
  if (isLargeText) {
    if (ratio >= 4.5) return "AAA";
    if (ratio >= 3) return "AA";
    return "fail";
  } else {
    if (ratio >= 7) return "AAA";
    if (ratio >= 4.5) return "AA";
    if (ratio >= 3) return "AA-large"; // Only valid for large text
    return "fail";
  }
}

/**
 * Suggest a better color for accessibility
 * Adjusts lightness to meet minimum contrast
 */
export function suggestAccessibleColor(
  fg: string,
  bg: string,
  targetRatio: number = 4.5
): string | null {
  const fgRgb = hexToRgb(fg);
  const bgRgb = hexToRgb(bg);

  if (!fgRgb || !bgRgb) {
    return null;
  }

  const currentRatio = getContrastRatio(fgRgb, bgRgb);
  if (currentRatio >= targetRatio) {
    return fg; // Already meets requirements
  }

  // Convert to HSL for easier manipulation
  const fgHsl = rgbToHsl(fgRgb.r, fgRgb.g, fgRgb.b);
  const bgLuminance = getRelativeLuminance(bgRgb.r, bgRgb.g, bgRgb.b);

  // Determine if we need lighter or darker
  const needsLighter = bgLuminance < 0.5;

  // Binary search for the right lightness
  let minL = needsLighter ? fgHsl.l : 0;
  let maxL = needsLighter ? 1 : fgHsl.l;

  for (let i = 0; i < 20; i++) {
    const testL = (minL + maxL) / 2;
    const testRgb = hslToRgb(fgHsl.h, fgHsl.s, testL);
    const testRatio = getContrastRatio(testRgb, bgRgb);

    if (Math.abs(testRatio - targetRatio) < 0.1) {
      return rgbToHex(testRgb.r, testRgb.g, testRgb.b);
    }

    if (testRatio < targetRatio) {
      if (needsLighter) {
        minL = testL;
      } else {
        maxL = testL;
      }
    } else {
      if (needsLighter) {
        maxL = testL;
      } else {
        minL = testL;
      }
    }
  }

  // Return best found
  const finalRgb = hslToRgb(fgHsl.h, fgHsl.s, (minL + maxL) / 2);
  return rgbToHex(finalRgb.r, finalRgb.g, finalRgb.b);
}

/**
 * Convert RGB to HSL
 */
export function rgbToHsl(
  r: number,
  g: number,
  b: number
): { h: number; s: number; l: number } {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return { h, s, l };
}

/**
 * Convert HSL to RGB
 */
export function hslToRgb(
  h: number,
  s: number,
  l: number
): { r: number; g: number; b: number } {
  let r: number, g: number, b: number;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number): number => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;

    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255),
  };
}

/**
 * Named terminal colors to approximate hex values
 * These are approximations as terminal colors vary by terminal emulator
 */
export const TERMINAL_COLORS: Record<string, string> = {
  black: "#000000",
  red: "#cc0000",
  green: "#00cc00",
  yellow: "#cccc00",
  blue: "#0000cc",
  magenta: "#cc00cc",
  cyan: "#00cccc",
  white: "#cccccc",
  gray: "#808080",
  grey: "#808080",
  blackBright: "#666666",
  redBright: "#ff0000",
  greenBright: "#00ff00",
  yellowBright: "#ffff00",
  blueBright: "#0000ff",
  magentaBright: "#ff00ff",
  cyanBright: "#00ffff",
  whiteBright: "#ffffff",
};

/**
 * Convert terminal color name to hex
 */
export function terminalColorToHex(colorName: string): string | null {
  return TERMINAL_COLORS[colorName] || null;
}

/**
 * Check if a terminal color pair has sufficient contrast
 */
export function checkTerminalContrast(
  fg: string,
  bg: string = "black"
): { ratio: number; level: WcagLevel } | null {
  const fgHex = terminalColorToHex(fg);
  const bgHex = terminalColorToHex(bg);

  if (!fgHex || !bgHex) {
    return null;
  }

  const ratio = checkContrast(fgHex, bgHex);
  const level = getWcagLevel(ratio);

  return { ratio, level };
}

/**
 * Validate a theme's color contrast
 */
export function validateThemeContrast(
  colors: Record<string, string>,
  backgroundColor: string = "black"
): Array<{ color: string; ratio: number; level: WcagLevel; warning: boolean }> {
  const results: Array<{
    color: string;
    ratio: number;
    level: WcagLevel;
    warning: boolean;
  }> = [];

  const bgHex = terminalColorToHex(backgroundColor) || backgroundColor;

  for (const [name, color] of Object.entries(colors)) {
    const fgHex = terminalColorToHex(color) || color;

    try {
      const ratio = checkContrast(fgHex, bgHex);
      const level = getWcagLevel(ratio);

      results.push({
        color: name,
        ratio: Math.round(ratio * 100) / 100,
        level,
        warning: level === "fail" || level === "AA-large",
      });
    } catch {
      // Skip invalid colors
    }
  }

  return results;
}

export default {
  hexToRgb,
  rgbToHex,
  getRelativeLuminance,
  getContrastRatio,
  checkContrast,
  getWcagLevel,
  suggestAccessibleColor,
  rgbToHsl,
  hslToRgb,
  terminalColorToHex,
  checkTerminalContrast,
  validateThemeContrast,
  TERMINAL_COLORS,
};
