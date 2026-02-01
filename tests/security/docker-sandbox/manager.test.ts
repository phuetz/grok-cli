/**
 * Docker Sandbox Manager Tests
 */

import {
  DockerSandboxManager,
  MockDockerClient,
  DEFAULT_SANDBOX_CONFIG,
  DEFAULT_NETWORK_POLICY,
} from '../../../src/security/docker-sandbox/index.js';
import type {
  SessionContainer,
  ExecutionResult,
} from '../../../src/security/docker-sandbox/index.js';

describe('DockerSandboxManager', () => {
  let manager: DockerSandboxManager;
  let mockDocker: MockDockerClient;

  beforeEach(() => {
    mockDocker = new MockDockerClient();
    manager = new DockerSandboxManager(mockDocker);
  });

  afterEach(async () => {
    await manager.shutdown();
  });

  describe('initialization', () => {
    it('should initialize successfully', async () => {
      await expect(manager.initialize()).resolves.not.toThrow();
    });

    it('should fail if Docker is not available', async () => {
      const unavailableDocker = {
        ...mockDocker,
        isAvailable: async () => false,
      };
      const failManager = new DockerSandboxManager(unavailableDocker as MockDockerClient);
      await expect(failManager.initialize()).rejects.toThrow('Docker is not available');
    });
  });

  describe('container lifecycle', () => {
    it('should create a container for a session', async () => {
      const sessionId = 'test-session-1';
      const container = await manager.createContainer(sessionId);

      expect(container).toBeDefined();
      expect(container.sessionId).toBe(sessionId);
      expect(container.status).toBe('running');
      expect(container.containerId).toBeDefined();
    });

    it('should return existing container if session already has one', async () => {
      const sessionId = 'test-session-2';
      const first = await manager.createContainer(sessionId);
      const second = await manager.createContainer(sessionId);

      expect(first.id).toBe(second.id);
    });

    it('should get container for session', async () => {
      const sessionId = 'test-session-3';
      await manager.createContainer(sessionId);

      const retrieved = manager.getContainerForSession(sessionId);
      expect(retrieved).toBeDefined();
      expect(retrieved?.sessionId).toBe(sessionId);
    });

    it('should return undefined for unknown session', () => {
      const retrieved = manager.getContainerForSession('unknown');
      expect(retrieved).toBeUndefined();
    });

    it('should get all containers', async () => {
      await manager.createContainer('session-a');
      await manager.createContainer('session-b');

      const all = manager.getAllContainers();
      expect(all.length).toBe(2);
    });

    it('should destroy a container', async () => {
      const container = await manager.createContainer('test-destroy');
      await manager.destroyContainer(container.id);

      expect(manager.getContainer(container.id)).toBeUndefined();
    });

    it('should destroy container for session', async () => {
      const sessionId = 'test-destroy-session';
      await manager.createContainer(sessionId);
      await manager.destroyContainerForSession(sessionId);

      expect(manager.getContainerForSession(sessionId)).toBeUndefined();
    });
  });

  describe('command execution', () => {
    it('should execute command in container', async () => {
      const container = await manager.createContainer('exec-test-1');
      const result = await manager.executeInContainer(container.id, 'echo hello');

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('echo hello');
      expect(result.timedOut).toBe(false);
    });

    it('should execute command in session container', async () => {
      const sessionId = 'exec-test-2';
      await manager.createContainer(sessionId);
      const result = await manager.executeInSession(sessionId, 'ls -la');

      expect(result.exitCode).toBe(0);
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });

    it('should throw if container not found', async () => {
      await expect(
        manager.executeInContainer('nonexistent', 'test')
      ).rejects.toThrow('Container nonexistent not found');
    });

    it('should throw if no container for session', async () => {
      await expect(
        manager.executeInSession('no-session', 'test')
      ).rejects.toThrow('No container for session no-session');
    });

    it('should update lastActivityAt on execution', async () => {
      const container = await manager.createContainer('activity-test');
      const before = container.lastActivityAt;

      await new Promise(resolve => setTimeout(resolve, 10));
      await manager.executeInContainer(container.id, 'test');

      const updated = manager.getContainer(container.id);
      expect(updated?.lastActivityAt.getTime()).toBeGreaterThan(before.getTime());
    });
  });

  describe('tool policies', () => {
    it('should set tool allowlist', async () => {
      const container = await manager.createContainer('policy-test-1');
      manager.setToolAllowlist(container.id, ['read_file', 'write_file']);

      expect(manager.isToolAllowed(container.id, 'read_file')).toBe(true);
      expect(manager.isToolAllowed(container.id, 'bash')).toBe(false);
    });

    it('should set tool denylist', async () => {
      const container = await manager.createContainer('policy-test-2');
      manager.setToolDenylist(container.id, ['bash', 'exec']);

      expect(manager.isToolAllowed(container.id, 'bash')).toBe(false);
      expect(manager.isToolAllowed(container.id, 'read_file')).toBe(true);
    });

    it('should prioritize denylist over allowlist', async () => {
      const container = await manager.createContainer('policy-test-3');
      manager.setToolAllowlist(container.id, ['bash', 'read_file']);
      manager.setToolDenylist(container.id, ['bash']);

      expect(manager.isToolAllowed(container.id, 'bash')).toBe(false);
      expect(manager.isToolAllowed(container.id, 'read_file')).toBe(true);
    });

    it('should allow all tools when allowlist is empty', async () => {
      const container = await manager.createContainer('policy-test-4');
      // No allowlist set

      expect(manager.isToolAllowed(container.id, 'anything')).toBe(true);
    });

    it('should return false for unknown container', () => {
      expect(manager.isToolAllowed('unknown', 'test')).toBe(false);
    });
  });

  describe('network policies', () => {
    it('should set network policy', async () => {
      const container = await manager.createContainer('network-test');
      const policy = {
        allowedHosts: ['api.example.com'],
        blockedPorts: [22, 3389],
        allowLocalhost: false,
      };

      manager.setNetworkPolicy(container.id, policy);

      const updated = manager.getContainer(container.id);
      expect(updated?.networkPolicy?.allowedHosts).toContain('api.example.com');
      expect(updated?.networkPolicy?.blockedPorts).toContain(22);
    });

    it('should have default network policy', async () => {
      const container = await manager.createContainer('default-network');

      expect(container.networkPolicy).toEqual(DEFAULT_NETWORK_POLICY);
    });
  });

  describe('metrics', () => {
    it('should get container metrics', async () => {
      const container = await manager.createContainer('metrics-test');
      const metrics = await manager.getMetrics(container.id);

      expect(metrics).toBeDefined();
      expect(metrics?.cpuPercent).toBeGreaterThanOrEqual(0);
      expect(metrics?.memoryUsage).toBeGreaterThanOrEqual(0);
    });

    it('should return null for non-running container', async () => {
      const container = await manager.createContainer('stopped-metrics');
      await manager.destroyContainer(container.id);

      const metrics = await manager.getMetrics(container.id);
      expect(metrics).toBeNull();
    });

    it('should get all metrics', async () => {
      await manager.createContainer('metrics-1');
      await manager.createContainer('metrics-2');

      const allMetrics = await manager.getAllMetrics();
      expect(allMetrics.size).toBe(2);
    });
  });

  describe('cleanup', () => {
    it('should clean up idle containers', async () => {
      const container = await manager.createContainer('idle-test');

      // Set lastActivityAt to past
      const c = manager.getContainer(container.id);
      if (c) {
        c.lastActivityAt = new Date(Date.now() - 60000); // 1 minute ago
      }

      const cleaned = await manager.cleanupIdleContainers(30000); // 30 seconds threshold
      expect(cleaned).toBe(1);
      expect(manager.getContainer(container.id)).toBeUndefined();
    });

    it('should not clean up active containers', async () => {
      await manager.createContainer('active-test');

      const cleaned = await manager.cleanupIdleContainers(60000);
      expect(cleaned).toBe(0);
    });
  });

  describe('statistics', () => {
    it('should return correct stats', async () => {
      await manager.createContainer('stats-1');
      await manager.createContainer('stats-2');

      const stats = manager.getStats();
      expect(stats.totalContainers).toBe(2);
      expect(stats.runningContainers).toBe(2);
      expect(stats.sessionsWithContainers).toBe(2);
    });
  });

  describe('events', () => {
    it('should emit container:created event', async () => {
      const handler = jest.fn();
      manager.on('container:created', handler);

      await manager.createContainer('event-test');

      expect(handler).toHaveBeenCalled();
      expect(handler.mock.calls[0][0].sessionId).toBe('event-test');
    });

    it('should emit container:destroyed event', async () => {
      const handler = jest.fn();
      manager.on('container:destroyed', handler);

      const container = await manager.createContainer('destroy-event-test');
      await manager.destroyContainer(container.id);

      expect(handler).toHaveBeenCalled();
    });

    it('should emit execution:complete event', async () => {
      const handler = jest.fn();
      manager.on('execution:complete', handler);

      const container = await manager.createContainer('exec-event-test');
      await manager.executeInContainer(container.id, 'test');

      expect(handler).toHaveBeenCalled();
    });

    it('should emit policy:violation event', async () => {
      const handler = jest.fn();
      manager.on('policy:violation', handler);

      const container = await manager.createContainer('violation-test');
      manager.setToolAllowlist(container.id, ['allowed_tool']);
      manager.isToolAllowed(container.id, 'forbidden_tool');

      expect(handler).toHaveBeenCalled();
    });
  });
});

describe('MockDockerClient', () => {
  let client: MockDockerClient;

  beforeEach(() => {
    client = new MockDockerClient();
  });

  it('should report as available', async () => {
    expect(await client.isAvailable()).toBe(true);
  });

  it('should create container', async () => {
    const id = await client.createContainer({ image: 'test' });
    expect(id).toBeDefined();
    expect(id.length).toBe(12);
  });

  it('should start container', async () => {
    const id = await client.createContainer({ image: 'test' });
    await client.startContainer(id);
    expect(await client.getStatus(id)).toBe('running');
  });

  it('should stop container', async () => {
    const id = await client.createContainer({ image: 'test' });
    await client.startContainer(id);
    await client.stopContainer(id);
    expect(await client.getStatus(id)).toBe('stopped');
  });

  it('should remove container', async () => {
    const id = await client.createContainer({ image: 'test' });
    await client.removeContainer(id);
    expect(await client.getStatus(id)).toBe('dead');
  });

  it('should execute command', async () => {
    const id = await client.createContainer({ image: 'test' });
    const result = await client.exec(id, ['echo', 'hello']);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('echo hello');
  });

  it('should return stats', async () => {
    const id = await client.createContainer({ image: 'test' });
    const stats = await client.getStats(id);
    expect(stats.cpuPercent).toBeGreaterThanOrEqual(0);
    expect(stats.memoryUsage).toBeGreaterThanOrEqual(0);
  });

  it('should report image exists', async () => {
    expect(await client.imageExists('any-image')).toBe(true);
  });
});
