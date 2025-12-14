/**
 * Tests for the Disposable system
 */

import { describe, expect, it, beforeEach, afterEach } from '@jest/globals';
import {
  Disposable,
  DisposableManager,
  registerDisposable,
  unregisterDisposable,
  disposeAll,
  getDisposableManager,
} from '../../src/utils/disposable.js';

describe('Disposable System', () => {
  let manager: DisposableManager;

  beforeEach(() => {
    // Get a fresh manager instance for each test
    manager = getDisposableManager();
    manager.reset();
  });

  afterEach(() => {
    // Clean up after each test
    manager.reset();
  });

  describe('DisposableManager', () => {
    it('should register disposables', () => {
      const disposable: Disposable = {
        dispose: () => {},
      };

      manager.register(disposable);
      expect(manager.getCount()).toBe(1);
    });

    it('should unregister disposables', () => {
      const disposable: Disposable = {
        dispose: () => {},
      };

      manager.register(disposable);
      expect(manager.getCount()).toBe(1);

      manager.unregister(disposable);
      expect(manager.getCount()).toBe(0);
    });

    it('should call dispose on all registered disposables', async () => {
      const disposeCalls: number[] = [];

      const disposable1: Disposable = {
        dispose: () => {
          disposeCalls.push(1);
        },
      };

      const disposable2: Disposable = {
        dispose: () => {
          disposeCalls.push(2);
        },
      };

      manager.register(disposable1);
      manager.register(disposable2);

      await manager.disposeAll();

      // Should be called in reverse order (LIFO)
      expect(disposeCalls).toEqual([2, 1]);
    });

    it('should handle async dispose methods', async () => {
      let asyncDisposeCalled = false;

      const disposable: Disposable = {
        dispose: async () => {
          await new Promise(resolve => setTimeout(resolve, 10));
          asyncDisposeCalled = true;
        },
      };

      manager.register(disposable);
      await manager.disposeAll();

      expect(asyncDisposeCalled).toBe(true);
    });

    it('should clear all disposables after disposeAll', async () => {
      const disposable: Disposable = {
        dispose: () => {},
      };

      manager.register(disposable);
      expect(manager.getCount()).toBe(1);

      await manager.disposeAll();
      expect(manager.getCount()).toBe(0);
    });

    it('should be marked as disposed after disposeAll', async () => {
      expect(manager.isDisposed()).toBe(false);

      await manager.disposeAll();

      expect(manager.isDisposed()).toBe(true);
    });

    it('should not register disposables after disposal', async () => {
      await manager.disposeAll();

      const disposable: Disposable = {
        dispose: () => {},
      };

      manager.register(disposable);
      expect(manager.getCount()).toBe(0);
    });

    it('should handle errors during disposal without stopping', async () => {
      const disposeCalls: number[] = [];

      const disposable1: Disposable = {
        dispose: () => {
          disposeCalls.push(1);
          throw new Error('Disposal error');
        },
      };

      const disposable2: Disposable = {
        dispose: () => {
          disposeCalls.push(2);
        },
      };

      manager.register(disposable1);
      manager.register(disposable2);

      // Should not throw
      await expect(manager.disposeAll()).resolves.not.toThrow();

      // Both should be called despite error in first
      expect(disposeCalls).toContain(1);
      expect(disposeCalls).toContain(2);
    });

    it('should allow multiple disposeAll calls safely', async () => {
      const disposable: Disposable = {
        dispose: () => {},
      };

      manager.register(disposable);

      await manager.disposeAll();
      await manager.disposeAll(); // Should not throw

      expect(manager.isDisposed()).toBe(true);
    });
  });

  describe('Helper Functions', () => {
    it('should register via helper function', () => {
      const disposable: Disposable = {
        dispose: () => {},
      };

      registerDisposable(disposable);
      expect(getDisposableManager().getCount()).toBeGreaterThan(0);
    });

    it('should unregister via helper function', () => {
      const disposable: Disposable = {
        dispose: () => {},
      };

      registerDisposable(disposable);
      const initialCount = getDisposableManager().getCount();

      unregisterDisposable(disposable);
      expect(getDisposableManager().getCount()).toBe(initialCount - 1);
    });

    it('should dispose all via helper function', async () => {
      let disposed = false;

      const disposable: Disposable = {
        dispose: () => {
          disposed = true;
        },
      };

      getDisposableManager().reset(); // Clear any existing
      registerDisposable(disposable);

      await disposeAll();

      expect(disposed).toBe(true);
    });
  });
});
