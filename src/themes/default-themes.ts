/**
 * Built-in themes for Grok CLI
 */

import { Theme, DEFAULT_AVATARS, EMOJI_AVATARS, HACKER_AVATARS, SPACE_AVATARS, MINIMAL_AVATARS } from './theme.js';

/**
 * Default theme - Clean and professional
 */
export const DEFAULT_THEME: Theme = {
  id: 'default',
  name: 'Default',
  description: 'Clean and professional theme with cyan accents',
  colors: {
    primary: 'cyan',
    secondary: 'magenta',
    accent: 'yellow',
    text: 'white',
    textMuted: 'gray',
    textDim: 'gray',
    success: 'green',
    error: 'red',
    warning: 'yellow',
    info: 'cyan',
    border: 'gray',
    borderActive: 'blue',
    borderBusy: 'yellow',
    userMessage: 'gray',
    assistantMessage: 'white',
    toolCall: 'magenta',
    toolResult: 'gray',
    code: 'yellow',
    spinner: 'cyan',
  },
  avatars: DEFAULT_AVATARS,
  isBuiltin: true,
};

/**
 * Dark theme - Easy on the eyes
 */
export const DARK_THEME: Theme = {
  id: 'dark',
  name: 'Dark',
  description: 'Subdued colors for dark environments',
  colors: {
    primary: 'blueBright',
    secondary: 'magentaBright',
    accent: 'cyanBright',
    text: 'whiteBright',
    textMuted: 'gray',
    textDim: 'gray',
    success: 'greenBright',
    error: 'redBright',
    warning: 'yellowBright',
    info: 'blueBright',
    border: 'gray',
    borderActive: 'blueBright',
    borderBusy: 'yellowBright',
    userMessage: 'gray',
    assistantMessage: 'whiteBright',
    toolCall: 'magentaBright',
    toolResult: 'gray',
    code: 'cyanBright',
    spinner: 'blueBright',
  },
  avatars: DEFAULT_AVATARS,
  isBuiltin: true,
};

/**
 * Neon theme - Vibrant cyberpunk colors
 */
export const NEON_THEME: Theme = {
  id: 'neon',
  name: 'Neon',
  description: 'Vibrant cyberpunk colors for a futuristic feel',
  colors: {
    primary: 'magentaBright',
    secondary: 'cyanBright',
    accent: 'yellowBright',
    text: 'whiteBright',
    textMuted: 'magenta',
    textDim: 'cyan',
    success: 'greenBright',
    error: 'redBright',
    warning: 'yellowBright',
    info: 'cyanBright',
    border: 'magenta',
    borderActive: 'cyanBright',
    borderBusy: 'yellowBright',
    userMessage: 'cyanBright',
    assistantMessage: 'whiteBright',
    toolCall: 'magentaBright',
    toolResult: 'cyan',
    code: 'yellowBright',
    spinner: 'magentaBright',
  },
  avatars: EMOJI_AVATARS,
  isBuiltin: true,
};

/**
 * Pastel theme - Soft and gentle colors
 */
export const PASTEL_THEME: Theme = {
  id: 'pastel',
  name: 'Pastel',
  description: 'Soft pastel colors for a gentle experience',
  colors: {
    primary: 'cyan',
    secondary: 'magenta',
    accent: 'yellow',
    text: 'white',
    textMuted: 'gray',
    textDim: 'gray',
    success: 'green',
    error: 'red',
    warning: 'yellow',
    info: 'blue',
    border: 'cyan',
    borderActive: 'magenta',
    borderBusy: 'yellow',
    userMessage: 'cyan',
    assistantMessage: 'white',
    toolCall: 'magenta',
    toolResult: 'cyan',
    code: 'yellow',
    spinner: 'magenta',
  },
  avatars: EMOJI_AVATARS,
  isBuiltin: true,
};

/**
 * High contrast theme - Maximum readability
 */
export const HIGH_CONTRAST_THEME: Theme = {
  id: 'high-contrast',
  name: 'High Contrast',
  description: 'Maximum contrast for accessibility',
  colors: {
    primary: 'whiteBright',
    secondary: 'yellowBright',
    accent: 'cyanBright',
    text: 'whiteBright',
    textMuted: 'white',
    textDim: 'white',
    success: 'greenBright',
    error: 'redBright',
    warning: 'yellowBright',
    info: 'cyanBright',
    border: 'whiteBright',
    borderActive: 'yellowBright',
    borderBusy: 'redBright',
    userMessage: 'whiteBright',
    assistantMessage: 'whiteBright',
    toolCall: 'yellowBright',
    toolResult: 'white',
    code: 'cyanBright',
    spinner: 'yellowBright',
  },
  avatars: DEFAULT_AVATARS,
  isBuiltin: true,
};

/**
 * Matrix theme - Green on black hacker style
 */
export const MATRIX_THEME: Theme = {
  id: 'matrix',
  name: 'Matrix',
  description: 'Green terminal aesthetic inspired by the Matrix',
  colors: {
    primary: 'greenBright',
    secondary: 'green',
    accent: 'greenBright',
    text: 'greenBright',
    textMuted: 'green',
    textDim: 'green',
    success: 'greenBright',
    error: 'redBright',
    warning: 'yellowBright',
    info: 'greenBright',
    border: 'green',
    borderActive: 'greenBright',
    borderBusy: 'yellowBright',
    userMessage: 'green',
    assistantMessage: 'greenBright',
    toolCall: 'greenBright',
    toolResult: 'green',
    code: 'greenBright',
    spinner: 'greenBright',
  },
  avatars: HACKER_AVATARS,
  isBuiltin: true,
};

/**
 * Ocean theme - Calming blue tones
 */
export const OCEAN_THEME: Theme = {
  id: 'ocean',
  name: 'Ocean',
  description: 'Calming ocean-inspired blue tones',
  colors: {
    primary: 'cyanBright',
    secondary: 'blueBright',
    accent: 'cyan',
    text: 'whiteBright',
    textMuted: 'cyan',
    textDim: 'blue',
    success: 'greenBright',
    error: 'redBright',
    warning: 'yellowBright',
    info: 'cyanBright',
    border: 'blue',
    borderActive: 'cyanBright',
    borderBusy: 'yellowBright',
    userMessage: 'cyan',
    assistantMessage: 'whiteBright',
    toolCall: 'blueBright',
    toolResult: 'cyan',
    code: 'cyanBright',
    spinner: 'cyanBright',
  },
  avatars: SPACE_AVATARS,
  isBuiltin: true,
};

/**
 * Sunset theme - Warm orange and red tones
 */
export const SUNSET_THEME: Theme = {
  id: 'sunset',
  name: 'Sunset',
  description: 'Warm sunset colors with orange and red tones',
  colors: {
    primary: 'yellowBright',
    secondary: 'redBright',
    accent: 'magentaBright',
    text: 'whiteBright',
    textMuted: 'yellow',
    textDim: 'red',
    success: 'greenBright',
    error: 'redBright',
    warning: 'yellowBright',
    info: 'yellow',
    border: 'red',
    borderActive: 'yellowBright',
    borderBusy: 'redBright',
    userMessage: 'yellow',
    assistantMessage: 'whiteBright',
    toolCall: 'redBright',
    toolResult: 'yellow',
    code: 'yellowBright',
    spinner: 'yellowBright',
  },
  avatars: EMOJI_AVATARS,
  isBuiltin: true,
};

/**
 * Minimal theme - Clean with minimal colors
 */
export const MINIMAL_THEME: Theme = {
  id: 'minimal',
  name: 'Minimal',
  description: 'Minimal and distraction-free',
  colors: {
    primary: 'white',
    secondary: 'gray',
    accent: 'white',
    text: 'white',
    textMuted: 'gray',
    textDim: 'gray',
    success: 'green',
    error: 'red',
    warning: 'yellow',
    info: 'white',
    border: 'gray',
    borderActive: 'white',
    borderBusy: 'gray',
    userMessage: 'gray',
    assistantMessage: 'white',
    toolCall: 'gray',
    toolResult: 'gray',
    code: 'white',
    spinner: 'gray',
  },
  avatars: MINIMAL_AVATARS,
  isBuiltin: true,
};

// ============================================================================
// Popular Community Themes
// ============================================================================

/**
 * Catppuccin Mocha - Popular pastel theme
 * https://github.com/catppuccin/catppuccin
 */
export const CATPPUCCIN_THEME: Theme = {
  id: 'catppuccin',
  name: 'Catppuccin',
  description: 'Soothing pastel theme for cozy coding sessions',
  colors: {
    primary: 'blueBright',     // Blue #89b4fa
    secondary: 'magentaBright', // Pink #f5c2e7
    accent: 'greenBright',     // Green #a6e3a1
    text: 'whiteBright',       // Text #cdd6f4
    textMuted: 'gray',         // Overlay1 #7f849c
    textDim: 'gray',           // Surface2 #585b70
    success: 'greenBright',    // Green #a6e3a1
    error: 'redBright',        // Red #f38ba8
    warning: 'yellowBright',   // Yellow #f9e2af
    info: 'cyanBright',        // Sapphire #74c7ec
    border: 'gray',            // Surface1 #45475a
    borderActive: 'blueBright',
    borderBusy: 'yellowBright',
    userMessage: 'magentaBright',
    assistantMessage: 'whiteBright',
    toolCall: 'blueBright',
    toolResult: 'gray',
    code: 'greenBright',
    spinner: 'blueBright',
  },
  avatars: EMOJI_AVATARS,
  isBuiltin: true,
};

/**
 * Gruvbox Dark - Retro groove theme
 * https://github.com/morhetz/gruvbox
 */
export const GRUVBOX_THEME: Theme = {
  id: 'gruvbox',
  name: 'Gruvbox',
  description: 'Retro groove color scheme with warm tones',
  colors: {
    primary: 'cyanBright',     // Blue #83a598
    secondary: 'magenta',      // Purple #d3869b
    accent: 'greenBright',     // Green #b8bb26
    text: 'yellowBright',      // fg #ebdbb2
    textMuted: 'gray',         // gray #928374
    textDim: 'gray',
    success: 'greenBright',    // Green #b8bb26
    error: 'redBright',        // Red #fb4934
    warning: 'yellowBright',   // Yellow #fabd2f
    info: 'cyanBright',        // Blue #83a598
    border: 'gray',            // bg2 #504945
    borderActive: 'yellowBright',
    borderBusy: 'redBright',
    userMessage: 'cyanBright',
    assistantMessage: 'yellowBright',
    toolCall: 'magenta',
    toolResult: 'gray',
    code: 'greenBright',
    spinner: 'yellowBright',
  },
  avatars: DEFAULT_AVATARS,
  isBuiltin: true,
};

/**
 * Dracula - Dark theme with vibrant colors
 * https://draculatheme.com/
 */
export const DRACULA_THEME: Theme = {
  id: 'dracula',
  name: 'Dracula',
  description: 'Dark theme with vibrant colors',
  colors: {
    primary: 'magentaBright',  // Purple #bd93f9
    secondary: 'greenBright',  // Green #50fa7b
    accent: 'cyanBright',      // Cyan #8be9fd
    text: 'whiteBright',       // Foreground #f8f8f2
    textMuted: 'gray',         // Comment #6272a4
    textDim: 'gray',
    success: 'greenBright',    // Green #50fa7b
    error: 'redBright',        // Red #ff5555
    warning: 'yellowBright',   // Yellow #f1fa8c
    info: 'cyanBright',        // Cyan #8be9fd
    border: 'gray',            // Current Line #44475a
    borderActive: 'magentaBright',
    borderBusy: 'yellowBright',
    userMessage: 'cyanBright',
    assistantMessage: 'whiteBright',
    toolCall: 'magentaBright',
    toolResult: 'gray',
    code: 'greenBright',
    spinner: 'magentaBright',
  },
  avatars: EMOJI_AVATARS,
  isBuiltin: true,
};

/**
 * Nord - Arctic, north-bluish color palette
 * https://www.nordtheme.com/
 */
export const NORD_THEME: Theme = {
  id: 'nord',
  name: 'Nord',
  description: 'Arctic, north-bluish color palette',
  colors: {
    primary: 'cyanBright',     // Nord8 #88c0d0
    secondary: 'blueBright',   // Nord9 #81a1c1
    accent: 'greenBright',     // Nord14 #a3be8c
    text: 'whiteBright',       // Nord4 #d8dee9
    textMuted: 'gray',         // Nord3 #4c566a
    textDim: 'gray',
    success: 'greenBright',    // Nord14 #a3be8c
    error: 'redBright',        // Nord11 #bf616a
    warning: 'yellowBright',   // Nord13 #ebcb8b
    info: 'cyanBright',        // Nord8 #88c0d0
    border: 'gray',            // Nord2 #434c5e
    borderActive: 'cyanBright',
    borderBusy: 'yellowBright',
    userMessage: 'blueBright',
    assistantMessage: 'whiteBright',
    toolCall: 'cyanBright',
    toolResult: 'gray',
    code: 'greenBright',
    spinner: 'cyanBright',
  },
  avatars: SPACE_AVATARS,
  isBuiltin: true,
};

/**
 * Tokyo Night - Inspired by Tokyo's night lights
 * https://github.com/enkia/tokyo-night-vscode-theme
 */
export const TOKYO_NIGHT_THEME: Theme = {
  id: 'tokyo-night',
  name: 'Tokyo Night',
  description: 'Inspired by the vibrant lights of Tokyo',
  colors: {
    primary: 'blueBright',     // Blue #7aa2f7
    secondary: 'magentaBright', // Purple #bb9af7
    accent: 'cyanBright',      // Cyan #7dcfff
    text: 'whiteBright',       // Foreground #a9b1d6
    textMuted: 'gray',         // Comment #565f89
    textDim: 'gray',
    success: 'greenBright',    // Green #9ece6a
    error: 'redBright',        // Red #f7768e
    warning: 'yellowBright',   // Yellow #e0af68
    info: 'cyanBright',        // Cyan #7dcfff
    border: 'gray',            // bg_highlight #292e42
    borderActive: 'blueBright',
    borderBusy: 'yellowBright',
    userMessage: 'magentaBright',
    assistantMessage: 'whiteBright',
    toolCall: 'blueBright',
    toolResult: 'gray',
    code: 'cyanBright',
    spinner: 'blueBright',
  },
  avatars: EMOJI_AVATARS,
  isBuiltin: true,
};

/**
 * One Dark - Atom's iconic dark theme
 * https://github.com/atom/atom/tree/master/packages/one-dark-syntax
 */
export const ONE_DARK_THEME: Theme = {
  id: 'one-dark',
  name: 'One Dark',
  description: "Atom's iconic dark theme",
  colors: {
    primary: 'blueBright',     // Blue #61afef
    secondary: 'magentaBright', // Purple #c678dd
    accent: 'cyanBright',      // Cyan #56b6c2
    text: 'whiteBright',       // Foreground #abb2bf
    textMuted: 'gray',         // Comment #5c6370
    textDim: 'gray',
    success: 'greenBright',    // Green #98c379
    error: 'redBright',        // Red #e06c75
    warning: 'yellowBright',   // Yellow #e5c07b
    info: 'cyanBright',        // Cyan #56b6c2
    border: 'gray',            // Gutter #636d83
    borderActive: 'blueBright',
    borderBusy: 'yellowBright',
    userMessage: 'cyanBright',
    assistantMessage: 'whiteBright',
    toolCall: 'magentaBright',
    toolResult: 'gray',
    code: 'greenBright',
    spinner: 'blueBright',
  },
  avatars: DEFAULT_AVATARS,
  isBuiltin: true,
};

/**
 * Solarized Dark - Precision colors for machines and people
 * https://ethanschoonover.com/solarized/
 */
export const SOLARIZED_DARK_THEME: Theme = {
  id: 'solarized-dark',
  name: 'Solarized Dark',
  description: 'Precision colors for machines and people',
  colors: {
    primary: 'blueBright',     // Blue #268bd2
    secondary: 'magenta',      // Magenta #d33682
    accent: 'cyanBright',      // Cyan #2aa198
    text: 'whiteBright',       // Base0 #839496
    textMuted: 'gray',         // Base01 #586e75
    textDim: 'gray',
    success: 'greenBright',    // Green #859900
    error: 'redBright',        // Red #dc322f
    warning: 'yellowBright',   // Yellow #b58900
    info: 'cyanBright',        // Cyan #2aa198
    border: 'gray',            // Base02 #073642
    borderActive: 'blueBright',
    borderBusy: 'yellowBright',
    userMessage: 'cyanBright',
    assistantMessage: 'whiteBright',
    toolCall: 'magenta',
    toolResult: 'gray',
    code: 'greenBright',
    spinner: 'cyanBright',
  },
  avatars: MINIMAL_AVATARS,
  isBuiltin: true,
};

/**
 * Monokai Pro - Monokai refined
 * https://monokai.pro/
 */
export const MONOKAI_THEME: Theme = {
  id: 'monokai',
  name: 'Monokai',
  description: 'The classic Monokai color scheme',
  colors: {
    primary: 'magentaBright',  // Pink #f92672
    secondary: 'blueBright',   // Blue #66d9ef
    accent: 'yellowBright',    // Yellow #e6db74
    text: 'whiteBright',       // Foreground #f8f8f2
    textMuted: 'gray',         // Comment #75715e
    textDim: 'gray',
    success: 'greenBright',    // Green #a6e22e
    error: 'redBright',        // Red #f92672
    warning: 'yellowBright',   // Orange #fd971f
    info: 'blueBright',        // Blue #66d9ef
    border: 'gray',            // Background #272822
    borderActive: 'magentaBright',
    borderBusy: 'yellowBright',
    userMessage: 'blueBright',
    assistantMessage: 'whiteBright',
    toolCall: 'magentaBright',
    toolResult: 'gray',
    code: 'greenBright',
    spinner: 'magentaBright',
  },
  avatars: HACKER_AVATARS,
  isBuiltin: true,
};

/**
 * All built-in themes
 */
export const BUILTIN_THEMES: Theme[] = [
  DEFAULT_THEME,
  DARK_THEME,
  NEON_THEME,
  PASTEL_THEME,
  HIGH_CONTRAST_THEME,
  MATRIX_THEME,
  OCEAN_THEME,
  SUNSET_THEME,
  MINIMAL_THEME,
  // Community popular themes
  CATPPUCCIN_THEME,
  GRUVBOX_THEME,
  DRACULA_THEME,
  NORD_THEME,
  TOKYO_NIGHT_THEME,
  ONE_DARK_THEME,
  SOLARIZED_DARK_THEME,
  MONOKAI_THEME,
];

/**
 * Get a built-in theme by ID
 */
export function getBuiltinTheme(id: string): Theme | undefined {
  return BUILTIN_THEMES.find(theme => theme.id === id);
}
