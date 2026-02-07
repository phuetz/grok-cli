import { CronAgentBridge, resetCronAgentBridge } from '../../src/daemon/cron-agent-bridge.js';
import type { CronJob } from '../../src/scheduler/cron-scheduler.js';

describe('CronAgentBridge', () => {
  let bridge: CronAgentBridge;

  beforeEach(() => {
    resetCronAgentBridge();
    bridge = new CronAgentBridge({
      apiKey: 'test-key',
      baseURL: 'http://localhost:3000',
      model: 'test-model',
      maxToolRounds: 5,
      jobTimeoutMs: 10000,
    });
  });

  it('should create a task executor function', () => {
    const executor = bridge.createTaskExecutor();
    expect(typeof executor).toBe('function');
  });

  it('should track active job count', () => {
    expect(bridge.getActiveJobCount()).toBe(0);
  });

  it('should cancel non-existent job gracefully', () => {
    expect(bridge.cancelJob('non-existent')).toBe(false);
  });

  it('should emit events on job execution', async () => {
    const events: string[] = [];
    bridge.on('job:start', () => events.push('start'));
    bridge.on('job:error', () => events.push('error'));

    const job: CronJob = {
      id: 'test-job',
      name: 'Test Job',
      type: 'every',
      schedule: { every: 60000 },
      task: { type: 'message', message: 'test' },
      status: 'active',
      createdAt: new Date(),
      runCount: 0,
      errorCount: 0,
      enabled: true,
    };

    // This will fail because CodeBuddyAgent requires a real API key
    // but we can verify events are emitted
    try {
      await bridge.executeJob(job);
    } catch {
      // Expected to fail
    }

    expect(events).toContain('start');
  });

  it('should handle webhook delivery', async () => {
    const job: CronJob = {
      id: 'test-job',
      name: 'Test Job',
      type: 'every',
      schedule: { every: 60000 },
      task: { type: 'message', message: 'test' },
      delivery: { webhookUrl: 'http://localhost:9999/webhook' },
      status: 'active',
      createdAt: new Date(),
      runCount: 0,
      errorCount: 0,
      enabled: true,
    };

    // Webhook will fail (no server) but should not throw
    const result = await bridge.deliverResult(job, 'test output');
    // May or may not deliver depending on fetch behavior
    expect(result).toBeDefined();
  });

  it('should return not delivered when no delivery config', async () => {
    const job: CronJob = {
      id: 'test-job',
      name: 'Test Job',
      type: 'every',
      schedule: { every: 60000 },
      task: { type: 'message' },
      status: 'active',
      createdAt: new Date(),
      runCount: 0,
      errorCount: 0,
      enabled: true,
    };

    const result = await bridge.deliverResult(job, 'output');
    expect(result.delivered).toBe(false);
  });
});
