import { ScreenObserver } from '../../src/agent/observer/screen-observer.js';

describe('ScreenObserver', () => {
  let observer: ScreenObserver;

  beforeEach(() => {
    observer = new ScreenObserver({ intervalMs: 100, maxHistory: 5 });
  });

  afterEach(() => {
    observer.stop();
  });

  it('should start and stop', () => {
    observer.start();
    expect(observer.isRunning()).toBe(true);
    observer.stop();
    expect(observer.isRunning()).toBe(false);
  });

  it('should not start twice', () => {
    observer.start();
    observer.start(); // Should be idempotent
    expect(observer.isRunning()).toBe(true);
  });

  it('should run an observation cycle', async () => {
    const diff = await observer.observe();
    // First observation should not have changes (no previous)
    expect(diff).not.toBeNull();
    expect(diff!.hasChanges).toBe(false);
  });

  it('should detect changes between observations', async () => {
    await observer.observe();
    const diff = await observer.observe();
    // Random UUIDs as fallback hashes will always differ
    expect(diff).not.toBeNull();
    expect(diff!.hasChanges).toBe(true);
  });

  it('should maintain history', async () => {
    await observer.observe();
    await observer.observe();
    await observer.observe();
    expect(observer.getHistory().length).toBe(3);
  });

  it('should cap history at maxHistory', async () => {
    for (let i = 0; i < 10; i++) {
      await observer.observe();
    }
    expect(observer.getHistory().length).toBeLessThanOrEqual(5);
  });

  it('should emit change events', async () => {
    const changes: unknown[] = [];
    observer.on('change', (diff) => changes.push(diff));

    await observer.observe();
    await observer.observe();
    expect(changes.length).toBeGreaterThanOrEqual(1);
  });

  it('should use custom capture method', async () => {
    observer.setCaptureMethod(async () => Buffer.from('test-image-data'));
    const diff = await observer.observe();
    expect(diff).not.toBeNull();
  });

  it('should return config', () => {
    const config = observer.getConfig();
    expect(config.intervalMs).toBe(100);
    expect(config.maxHistory).toBe(5);
  });
});
