import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { loadAgentProfiles, mergeProfileWithMode } from '../../../src/agent/profiles/index.js';
import type { AgentProfile } from '../../../src/agent/profiles/index.js';
import type { ModeConfig } from '../../../src/agent/operating-modes.js';

describe('Profile Loader', () => {
  describe('mergeProfileWithMode', () => {
    const baseConfig: ModeConfig = {
      name: 'Test',
      description: 'Test mode',
      preferredModel: 'grok-2-latest',
      maxInputTokens: 64000,
      maxOutputTokens: 8000,
      maxContextTokens: 100000,
      enableExtendedThinking: false,
      thinkingBudget: 0,
      maxToolRounds: 20,
      parallelToolCalls: true,
      allowedTools: 'all',
      enableSelfReview: false,
      enableIterativeRefinement: false,
      maxRefinementRounds: 0,
      enableRAG: true,
      ragTopK: 10,
      enableRepoMap: true,
      maxCostPerRequest: 2.0,
      warnAtCost: 1.0,
      streamResponse: true,
      eagerExecution: false,
    };

    it('should return base config when profile has no overrides', () => {
      const profile: AgentProfile = { id: 'test', name: 'Test', description: '' };
      const merged = mergeProfileWithMode(baseConfig, profile);
      expect(merged.preferredModel).toBe('grok-2-latest');
      expect(merged.maxToolRounds).toBe(20);
    });

    it('should override preferredModel', () => {
      const profile: AgentProfile = {
        id: 'test', name: 'Test', description: '',
        preferredModel: 'claude-4-opus',
      };
      const merged = mergeProfileWithMode(baseConfig, profile);
      expect(merged.preferredModel).toBe('claude-4-opus');
    });

    it('should override maxToolRounds', () => {
      const profile: AgentProfile = {
        id: 'test', name: 'Test', description: '',
        maxToolRounds: 100,
      };
      const merged = mergeProfileWithMode(baseConfig, profile);
      expect(merged.maxToolRounds).toBe(100);
    });

    it('should append systemPromptAddition', () => {
      const base = { ...baseConfig, systemPromptAddition: 'Base prompt.' };
      const profile: AgentProfile = {
        id: 'test', name: 'Test', description: '',
        systemPromptAddition: 'Profile prompt.',
      };
      const merged = mergeProfileWithMode(base, profile);
      expect(merged.systemPromptAddition).toContain('Base prompt.');
      expect(merged.systemPromptAddition).toContain('Profile prompt.');
    });

    it('should override enableExtendedThinking and thinkingBudget', () => {
      const profile: AgentProfile = {
        id: 'test', name: 'Test', description: '',
        enableExtendedThinking: true,
        thinkingBudget: 16000,
      };
      const merged = mergeProfileWithMode(baseConfig, profile);
      expect(merged.enableExtendedThinking).toBe(true);
      expect(merged.thinkingBudget).toBe(16000);
    });

    it('should override allowedTools', () => {
      const profile: AgentProfile = {
        id: 'test', name: 'Test', description: '',
        allowedTools: ['view_file', 'search'],
      };
      const merged = mergeProfileWithMode(baseConfig, profile);
      expect(merged.allowedTools).toEqual(['view_file', 'search']);
    });

    it('should filter blockedTools from allowedTools array', () => {
      const base = { ...baseConfig, allowedTools: ['view_file', 'bash', 'search'] as string[] };
      const profile: AgentProfile = {
        id: 'test', name: 'Test', description: '',
        blockedTools: ['bash'],
      };
      const merged = mergeProfileWithMode(base, profile);
      expect(merged.allowedTools).toEqual(['view_file', 'search']);
    });
  });
});
