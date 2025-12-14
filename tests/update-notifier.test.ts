/**
 * Update Notifier Tests
 */

import { UpdateNotifier, compareVersions } from '../src/utils/update-notifier.js';

// ============================================================================
// Version Comparison Tests
// ============================================================================

describe('compareVersions', () => {
  it('should return 0 for equal versions', () => {
    expect(compareVersions('1.0.0', '1.0.0')).toBe(0);
    expect(compareVersions('2.3.4', '2.3.4')).toBe(0);
    expect(compareVersions('0.0.1', '0.0.1')).toBe(0);
  });

  it('should return -1 when a < b', () => {
    expect(compareVersions('1.0.0', '2.0.0')).toBe(-1);
    expect(compareVersions('1.0.0', '1.1.0')).toBe(-1);
    expect(compareVersions('1.0.0', '1.0.1')).toBe(-1);
    expect(compareVersions('0.9.9', '1.0.0')).toBe(-1);
  });

  it('should return 1 when a > b', () => {
    expect(compareVersions('2.0.0', '1.0.0')).toBe(1);
    expect(compareVersions('1.1.0', '1.0.0')).toBe(1);
    expect(compareVersions('1.0.1', '1.0.0')).toBe(1);
    expect(compareVersions('1.0.0', '0.9.9')).toBe(1);
  });

  it('should handle versions with different lengths', () => {
    expect(compareVersions('1.0', '1.0.0')).toBe(0);
    expect(compareVersions('1.0.0', '1.0')).toBe(0);
    expect(compareVersions('1.0', '1.0.1')).toBe(-1);
    expect(compareVersions('1.0.1', '1.0')).toBe(1);
  });

  it('should handle v prefix', () => {
    expect(compareVersions('v1.0.0', '1.0.0')).toBe(0);
    expect(compareVersions('1.0.0', 'v1.0.0')).toBe(0);
    expect(compareVersions('v1.0.0', 'v2.0.0')).toBe(-1);
  });
});

// ============================================================================
// UpdateNotifier Tests
// ============================================================================

describe('UpdateNotifier', () => {
  it('should create notifier with default config', () => {
    const notifier = new UpdateNotifier();

    expect(notifier).toBeDefined();
    expect(notifier.getUpdateInfo()).toBeNull();
  });

  it('should create notifier with custom config', () => {
    const notifier = new UpdateNotifier({
      enabled: false,
      checkIntervalHours: 48,
    });

    expect(notifier).toBeDefined();
  });

  it('should return null when disabled', async () => {
    const notifier = new UpdateNotifier({ enabled: false });

    const result = await notifier.check();

    expect(result).toBeNull();
  });

  it('should format notification correctly', () => {
    const notifier = new UpdateNotifier();

    // Manually set update info for testing
    (notifier as unknown as { updateInfo: unknown }).updateInfo = {
      currentVersion: '1.0.0',
      latestVersion: '1.1.0',
      updateAvailable: true,
      installCommand: 'npm update -g @phuetz/code-buddy',
      lastCheck: new Date(),
    };

    const notification = notifier.formatNotification();

    expect(notification).not.toBeNull();
    expect(notification).toContain('Update available');
    expect(notification).toContain('1.0.0');
    expect(notification).toContain('1.1.0');
    expect(notification).toContain('npm update');
  });

  it('should return null notification when no update', () => {
    const notifier = new UpdateNotifier();

    // Manually set update info with no update available
    (notifier as unknown as { updateInfo: unknown }).updateInfo = {
      currentVersion: '1.0.0',
      latestVersion: '1.0.0',
      updateAvailable: false,
      installCommand: 'npm update -g @phuetz/code-buddy',
      lastCheck: new Date(),
    };

    const notification = notifier.formatNotification();

    expect(notification).toBeNull();
  });

  it('should return null notification when no check done', () => {
    const notifier = new UpdateNotifier();

    const notification = notifier.formatNotification();

    expect(notification).toBeNull();
  });
});

// ============================================================================
// Integration Tests (these may fail without network)
// ============================================================================

describe('UpdateNotifier Integration', () => {
  it('should handle network errors gracefully', async () => {
    const notifier = new UpdateNotifier({
      registryUrl: 'https://invalid.registry.example.com',
    });

    // Should not throw, just return null
    await notifier.check();

    // May be null or cached value
    // The important thing is it doesn't throw
    expect(true).toBe(true);
  }, 10000);

  it('should checkAndNotify without errors', async () => {
    const notifier = new UpdateNotifier({ enabled: false });
    const messages: string[] = [];

    // Should not throw
    await notifier.checkAndNotify((msg) => messages.push(msg));

    // No message expected when disabled
    expect(messages.length).toBe(0);
  });
});
