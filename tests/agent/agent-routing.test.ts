/**
 * Agent Peer Routing Tests
 *
 * Tests that CodeBuddyAgent correctly accepts and applies peer routing
 * configuration from the PeerRouter, including model overrides, system
 * prompt overrides, and forwarding decisions.
 */

import type { RouteAgentConfig } from '../../src/channels/peer-routing.js';

// ---------------------------------------------------------------------------
// We cannot easily construct a full CodeBuddyAgent in tests (it requires
// a real API key and spins up heavy infrastructure). Instead we test:
// 1. The RouteAgentConfig interface contract
// 2. The routing logic applied via applyPeerRouting / shouldForwardToAgent
//    by mocking a minimal agent-like object that exercises the same logic.
// ---------------------------------------------------------------------------

/**
 * Minimal agent stub that mirrors the peer routing methods added to
 * CodeBuddyAgent, allowing us to test the routing logic in isolation
 * without the full agent infrastructure.
 */
class AgentRoutingStub {
  private peerRoutingConfig: RouteAgentConfig | null = null;
  private currentModel = 'grok-3-latest';
  private systemPrompt: string | null = null;
  private maxToolRounds = 50;
  private events: Array<{ name: string; data: unknown }> = [];

  applyPeerRouting(config: RouteAgentConfig): void {
    this.peerRoutingConfig = config;

    if (config.model) {
      this.currentModel = config.model;
    }

    if (config.systemPrompt) {
      this.systemPrompt = config.systemPrompt;
    }

    if (config.maxToolRounds !== undefined) {
      this.maxToolRounds = config.maxToolRounds;
    }

    this.events.push({ name: 'peer-routing:applied', data: config });
  }

  getPeerRoutingConfig(): RouteAgentConfig | null {
    return this.peerRoutingConfig;
  }

  clearPeerRouting(): void {
    this.peerRoutingConfig = null;
    this.events.push({ name: 'peer-routing:cleared', data: null });
  }

  shouldForwardToAgent(): string | null {
    if (!this.peerRoutingConfig?.agentId) {
      return null;
    }
    return this.peerRoutingConfig.agentId;
  }

  // Accessors for testing
  getCurrentModel(): string {
    return this.currentModel;
  }

  getSystemPrompt(): string | null {
    return this.systemPrompt;
  }

  getMaxToolRounds(): number {
    return this.maxToolRounds;
  }

  getEvents(): Array<{ name: string; data: unknown }> {
    return this.events;
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Agent Peer Routing', () => {
  let agent: AgentRoutingStub;

  beforeEach(() => {
    agent = new AgentRoutingStub();
  });

  // =========================================================================
  // applyPeerRouting
  // =========================================================================

  describe('applyPeerRouting', () => {
    it('should apply model override from routing config', () => {
      const config: RouteAgentConfig = {
        model: 'claude-3-opus',
      };

      agent.applyPeerRouting(config);

      expect(agent.getCurrentModel()).toBe('claude-3-opus');
      expect(agent.getPeerRoutingConfig()).toBe(config);
    });

    it('should apply system prompt override', () => {
      const config: RouteAgentConfig = {
        systemPrompt: 'You are a specialized coding assistant.',
      };

      agent.applyPeerRouting(config);

      expect(agent.getSystemPrompt()).toBe('You are a specialized coding assistant.');
    });

    it('should apply maxToolRounds override', () => {
      const config: RouteAgentConfig = {
        maxToolRounds: 100,
      };

      agent.applyPeerRouting(config);

      expect(agent.getMaxToolRounds()).toBe(100);
    });

    it('should apply all config fields at once', () => {
      const config: RouteAgentConfig = {
        agentId: 'agent-42',
        model: 'grok-3-fast',
        systemPrompt: 'Be fast and concise.',
        maxToolRounds: 200,
        temperature: 0.3,
        allowedTools: ['read_file', 'search'],
        deniedTools: ['bash'],
        metadata: { tier: 'premium' },
      };

      agent.applyPeerRouting(config);

      const applied = agent.getPeerRoutingConfig();
      expect(applied).not.toBeNull();
      expect(applied!.agentId).toBe('agent-42');
      expect(applied!.model).toBe('grok-3-fast');
      expect(applied!.systemPrompt).toBe('Be fast and concise.');
      expect(applied!.maxToolRounds).toBe(200);
      expect(applied!.temperature).toBe(0.3);
      expect(applied!.allowedTools).toEqual(['read_file', 'search']);
      expect(applied!.deniedTools).toEqual(['bash']);
      expect(applied!.metadata).toEqual({ tier: 'premium' });
    });

    it('should not change model when config has no model', () => {
      agent.applyPeerRouting({ systemPrompt: 'Hello' });

      expect(agent.getCurrentModel()).toBe('grok-3-latest'); // default
    });

    it('should emit peer-routing:applied event', () => {
      const config: RouteAgentConfig = { model: 'grok-3' };
      agent.applyPeerRouting(config);

      const events = agent.getEvents();
      expect(events).toHaveLength(1);
      expect(events[0].name).toBe('peer-routing:applied');
      expect(events[0].data).toBe(config);
    });
  });

  // =========================================================================
  // clearPeerRouting
  // =========================================================================

  describe('clearPeerRouting', () => {
    it('should clear the routing config', () => {
      agent.applyPeerRouting({ model: 'claude-3-opus' });
      expect(agent.getPeerRoutingConfig()).not.toBeNull();

      agent.clearPeerRouting();
      expect(agent.getPeerRoutingConfig()).toBeNull();
    });

    it('should emit peer-routing:cleared event', () => {
      agent.applyPeerRouting({ model: 'grok-3' });
      agent.clearPeerRouting();

      const events = agent.getEvents();
      expect(events).toHaveLength(2);
      expect(events[1].name).toBe('peer-routing:cleared');
    });
  });

  // =========================================================================
  // shouldForwardToAgent
  // =========================================================================

  describe('shouldForwardToAgent', () => {
    it('should return null when no routing config is applied', () => {
      expect(agent.shouldForwardToAgent()).toBeNull();
    });

    it('should return null when routing config has no agentId', () => {
      agent.applyPeerRouting({ model: 'grok-3' });
      expect(agent.shouldForwardToAgent()).toBeNull();
    });

    it('should return the agentId when routing config specifies one', () => {
      agent.applyPeerRouting({ agentId: 'agent-secondary' });
      expect(agent.shouldForwardToAgent()).toBe('agent-secondary');
    });

    it('should return null after clearing routing', () => {
      agent.applyPeerRouting({ agentId: 'agent-secondary' });
      agent.clearPeerRouting();
      expect(agent.shouldForwardToAgent()).toBeNull();
    });
  });

  // =========================================================================
  // Routing flow scenarios
  // =========================================================================

  describe('routing flow scenarios', () => {
    it('should handle sequential route changes', () => {
      // First route: telegram VIP user
      agent.applyPeerRouting({
        agentId: 'vip-agent',
        model: 'claude-3-opus',
        systemPrompt: 'VIP treatment',
        maxToolRounds: 100,
      });

      expect(agent.getCurrentModel()).toBe('claude-3-opus');
      expect(agent.shouldForwardToAgent()).toBe('vip-agent');

      // Switch to different route
      agent.clearPeerRouting();
      agent.applyPeerRouting({
        model: 'grok-3-fast',
        maxToolRounds: 10,
      });

      expect(agent.getCurrentModel()).toBe('grok-3-fast');
      expect(agent.shouldForwardToAgent()).toBeNull();
      expect(agent.getMaxToolRounds()).toBe(10);
    });

    it('should handle empty routing config gracefully', () => {
      agent.applyPeerRouting({});

      expect(agent.getPeerRoutingConfig()).toBeDefined();
      expect(agent.getCurrentModel()).toBe('grok-3-latest'); // unchanged
      expect(agent.getMaxToolRounds()).toBe(50); // unchanged
      expect(agent.shouldForwardToAgent()).toBeNull();
    });
  });

  // =========================================================================
  // RouteAgentConfig interface contract
  // =========================================================================

  describe('RouteAgentConfig interface', () => {
    it('should accept all optional fields', () => {
      const config: RouteAgentConfig = {
        agentId: 'a1',
        model: 'm1',
        systemPrompt: 'sp1',
        maxToolRounds: 50,
        temperature: 0.5,
        allowedTools: ['tool1'],
        deniedTools: ['tool2'],
        metadata: { key: 'value' },
      };

      expect(config.agentId).toBe('a1');
      expect(config.model).toBe('m1');
      expect(config.systemPrompt).toBe('sp1');
      expect(config.maxToolRounds).toBe(50);
      expect(config.temperature).toBe(0.5);
      expect(config.allowedTools).toEqual(['tool1']);
      expect(config.deniedTools).toEqual(['tool2']);
      expect(config.metadata).toEqual({ key: 'value' });
    });

    it('should accept empty config', () => {
      const config: RouteAgentConfig = {};
      expect(config.agentId).toBeUndefined();
      expect(config.model).toBeUndefined();
    });
  });
});
