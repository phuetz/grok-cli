import * as fs from 'fs';
import * as path from 'path';
import { logger } from './logger.js';

export function loadCustomInstructions(workingDirectory: string = process.cwd()): string | null {
  try {
    // Try CODEBUDDY.md first, fall back to GROK.md for backwards compatibility
    const codebuddyPath = path.join(workingDirectory, '.codebuddy', 'CODEBUDDY.md');
    const legacyPath = path.join(workingDirectory, '.codebuddy', 'GROK.md');

    const instructionsPath = fs.existsSync(codebuddyPath) ? codebuddyPath : legacyPath;

    if (!fs.existsSync(instructionsPath)) {
      return null;
    }

    const customInstructions = fs.readFileSync(instructionsPath, 'utf-8');
    return customInstructions.trim();
  } catch (error) {
    logger.warn('Failed to load custom instructions', { error: String(error) });
    return null;
  }
}
