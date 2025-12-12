/**
 * Zod schemas for theme validation
 * Ensures custom themes are properly structured and don't crash the application
 */

import { z } from 'zod';

/**
 * Valid Ink color names
 */
const inkColorNames = z.enum([
  'black', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white', 'gray',
  'blackBright', 'redBright', 'greenBright', 'yellowBright', 'blueBright',
  'magentaBright', 'cyanBright', 'whiteBright',
]);

/**
 * Theme color: either an Ink color name or a hex color (#RRGGBB)
 */
const themeColorSchema = z.union([
  inkColorNames,
  z.string().regex(/^#[0-9A-Fa-f]{6}$/), // Hex color
]);

/**
 * Avatar configuration schema
 */
export const avatarConfigSchema = z.object({
  user: z.string().min(1).max(10),
  assistant: z.string().min(1).max(10),
  tool: z.string().min(1).max(10),
  system: z.string().min(1).max(10),
});

/**
 * Theme colors schema
 */
export const themeColorsSchema = z.object({
  // Primary colors
  primary: themeColorSchema,
  secondary: themeColorSchema,
  accent: themeColorSchema,

  // Text colors
  text: themeColorSchema,
  textMuted: themeColorSchema,
  textDim: themeColorSchema,

  // Background colors (optional)
  background: themeColorSchema.optional(),
  backgroundAlt: themeColorSchema.optional(),

  // Status colors
  success: themeColorSchema,
  error: themeColorSchema,
  warning: themeColorSchema,
  info: themeColorSchema,

  // UI element colors
  border: themeColorSchema,
  borderActive: themeColorSchema,
  borderBusy: themeColorSchema,

  // Chat colors
  userMessage: themeColorSchema,
  assistantMessage: themeColorSchema,
  toolCall: themeColorSchema,
  toolResult: themeColorSchema,

  // Code/syntax colors
  code: themeColorSchema,
  codeBackground: themeColorSchema.optional(),

  // Spinner/loading colors
  spinner: themeColorSchema,
});

/**
 * Complete theme schema
 */
export const themeSchema = z.object({
  id: z.string().min(1).max(50).regex(/^[a-z0-9-_]+$/i),
  name: z.string().min(1).max(100),
  description: z.string().max(500),
  colors: themeColorsSchema,
  avatars: avatarConfigSchema,
  isBuiltin: z.boolean(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
});

/**
 * Theme preferences schema
 */
export const themePreferencesSchema = z.object({
  activeTheme: z.string().min(1),
  customAvatars: avatarConfigSchema.partial().optional(),
  customColors: themeColorsSchema.partial().optional(),
});

/**
 * Type exports inferred from schemas
 */
export type ThemeColorsValidated = z.infer<typeof themeColorsSchema>;
export type AvatarConfigValidated = z.infer<typeof avatarConfigSchema>;
export type ThemeValidated = z.infer<typeof themeSchema>;
export type ThemePreferencesValidated = z.infer<typeof themePreferencesSchema>;
