import { compareVersions, UpdateNotifier } from '../../src/utils/update-notifier.js';

describe('Update Notifier', () => {
  describe('compareVersions', () => {
    it('should return 0 for equal versions', () => {
      expect(compareVersions('1.0.0', '1.0.0')).toBe(0);
      expect(compareVersions('2.3.4', '2.3.4')).toBe(0);
    });

    it('should return -1 when a < b', () => {
      expect(compareVersions('1.0.0', '2.0.0')).toBe(-1);
      expect(compareVersions('1.0.0', '1.1.0')).toBe(-1);
      expect(compareVersions('1.0.0', '1.0.1')).toBe(-1);
    });

    it('should return 1 when a > b', () => {
      expect(compareVersions('2.0.0', '1.0.0')).toBe(1);
      expect(compareVersions('1.1.0', '1.0.0')).toBe(1);
      expect(compareVersions('1.0.1', '1.0.0')).toBe(1);
    });

    it('should handle v prefix', () => {
      expect(compareVersions('v1.0.0', '1.0.0')).toBe(0);
      expect(compareVersions('v1.0.0', 'v2.0.0')).toBe(-1);
    });

    it('should handle versions with different lengths', () => {
      expect(compareVersions('1.0', '1.0.0')).toBe(0);
      expect(compareVersions('1.0', '1.0.1')).toBe(-1);
    });
  });

  describe('UpdateNotifier', () => {
    it('should create with default config', () => {
      const notifier = new UpdateNotifier();
      expect(notifier.getUpdateInfo()).toBeNull();
    });

    it('should create with custom config', () => {
      const notifier = new UpdateNotifier({
        enabled: false,
        checkIntervalHours: 48,
      });
      expect(notifier.getUpdateInfo()).toBeNull();
    });

    it('should return null when disabled', async () => {
      const notifier = new UpdateNotifier({ enabled: false });
      const result = await notifier.check();
      expect(result).toBeNull();
    });

    it('should format notification when update available', () => {
      const notifier = new UpdateNotifier();
      // Manually set update info for testing
      (notifier as unknown as { updateInfo: unknown }).updateInfo = {
        currentVersion: '1.0.0',
        latestVersion: '2.0.0',
        updateAvailable: true,
        installCommand: 'npm update -g @phuetz/code-buddy',
        lastCheck: new Date(),
      };

      const notification = notifier.formatNotification();
      expect(notification).not.toBeNull();
      expect(notification).toContain('1.0.0');
      expect(notification).toContain('2.0.0');
    });

    it('should return null notification when no update', () => {
      const notifier = new UpdateNotifier();
      (notifier as unknown as { updateInfo: unknown }).updateInfo = {
        currentVersion: '2.0.0',
        latestVersion: '2.0.0',
        updateAvailable: false,
        installCommand: 'npm update -g @phuetz/code-buddy',
        lastCheck: new Date(),
      };

      expect(notifier.formatNotification()).toBeNull();
    });
  });
});
