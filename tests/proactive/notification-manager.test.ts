import { NotificationManager } from '../../src/agent/proactive/notification-manager.js';

describe('NotificationManager', () => {
  let manager: NotificationManager;

  beforeEach(() => {
    manager = new NotificationManager({
      channels: ['cli', 'telegram'],
      maxPerHour: 5,
    });
  });

  it('should allow messages on enabled channels', () => {
    const result = manager.shouldSend({
      channelType: 'cli',
      channelId: 'test',
      message: 'Hello',
      priority: 'normal',
    });
    expect(result.allowed).toBe(true);
  });

  it('should block messages on disabled channels', () => {
    const result = manager.shouldSend({
      channelType: 'discord',
      channelId: 'test',
      message: 'Hello',
      priority: 'normal',
    });
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('not enabled');
  });

  it('should enforce rate limiting', () => {
    // Fill rate limit
    for (let i = 0; i < 5; i++) {
      manager.record({ channelType: 'cli', channelId: 'test', message: 'test', priority: 'normal' }, true);
    }

    const result = manager.shouldSend({
      channelType: 'cli',
      channelId: 'test',
      message: 'One more',
      priority: 'normal',
    });
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('Rate limit');
  });

  it('should enforce quiet hours', () => {
    const hour = new Date().getHours();
    manager.setPreferences({
      quietHoursStart: hour,
      quietHoursEnd: hour + 1,
      quietHoursMinPriority: 'urgent',
    });

    const lowPriority = manager.shouldSend({
      channelType: 'cli',
      channelId: 'test',
      message: 'Low priority',
      priority: 'low',
    });
    expect(lowPriority.allowed).toBe(false);

    const urgentPriority = manager.shouldSend({
      channelType: 'cli',
      channelId: 'test',
      message: 'Urgent',
      priority: 'urgent',
    });
    expect(urgentPriority.allowed).toBe(true);
  });

  it('should return stats', () => {
    manager.record({ channelType: 'cli', channelId: 'test', message: 'test', priority: 'normal' }, true);
    manager.record({ channelType: 'cli', channelId: 'test', message: 'test', priority: 'normal' }, false);

    const stats = manager.getStats();
    expect(stats.totalSent).toBe(2);
    expect(stats.deliveryRate).toBe(0.5);
  });

  it('should return notification history', () => {
    manager.record({ channelType: 'cli', channelId: 'test', message: 'test', priority: 'normal' }, true);
    const history = manager.getHistory(10);
    expect(history).toHaveLength(1);
  });

  it('should update preferences', () => {
    manager.setPreferences({ maxPerHour: 100 });
    expect(manager.getPreferences().maxPerHour).toBe(100);
  });
});
