import { EventTriggerManager, type Trigger, type TriggerEvent } from '../../src/agent/observer/event-trigger.js';

describe('EventTriggerManager', () => {
  let manager: EventTriggerManager;

  beforeEach(() => {
    manager = new EventTriggerManager();
  });

  const makeTrigger = (overrides: Partial<Trigger> = {}): Trigger => ({
    id: 'test-1',
    name: 'Test Trigger',
    type: 'file_change',
    condition: 'src/**/*.ts',
    action: { type: 'notify', target: 'cli' },
    cooldownMs: 0,
    enabled: true,
    createdAt: new Date(),
    fireCount: 0,
    ...overrides,
  });

  it('should add and list triggers', () => {
    manager.addTrigger(makeTrigger());
    expect(manager.listTriggers()).toHaveLength(1);
  });

  it('should remove triggers', () => {
    manager.addTrigger(makeTrigger());
    expect(manager.removeTrigger('test-1')).toBe(true);
    expect(manager.listTriggers()).toHaveLength(0);
  });

  it('should not remove non-existent triggers', () => {
    expect(manager.removeTrigger('nope')).toBe(false);
  });

  it('should evaluate file_change events', () => {
    manager.addTrigger(makeTrigger({ condition: 'src/**/*.ts' }));
    const event: TriggerEvent = {
      triggerId: '',
      type: 'file_change',
      data: { path: 'src/index.ts' },
      timestamp: new Date(),
    };

    const fired = manager.evaluate(event);
    expect(fired).toHaveLength(1);
  });

  it('should not fire disabled triggers', () => {
    manager.addTrigger(makeTrigger({ enabled: false }));
    const event: TriggerEvent = {
      triggerId: '',
      type: 'file_change',
      data: { path: 'src/index.ts' },
      timestamp: new Date(),
    };

    const fired = manager.evaluate(event);
    expect(fired).toHaveLength(0);
  });

  it('should respect cooldown', () => {
    manager.addTrigger(makeTrigger({ cooldownMs: 60000 }));
    const event: TriggerEvent = {
      triggerId: '',
      type: 'file_change',
      data: { path: 'src/index.ts' },
      timestamp: new Date(),
    };

    // First fire
    const first = manager.evaluate(event);
    expect(first).toHaveLength(1);

    // Second fire within cooldown
    const second = manager.evaluate(event);
    expect(second).toHaveLength(0);
  });

  it('should evaluate wildcard conditions', () => {
    manager.addTrigger(makeTrigger({ condition: '*', type: 'webhook' }));
    const event: TriggerEvent = {
      triggerId: '',
      type: 'webhook',
      data: { any: 'data' },
      timestamp: new Date(),
    };

    const fired = manager.evaluate(event);
    expect(fired).toHaveLength(1);
  });

  it('should enable/disable triggers', () => {
    manager.addTrigger(makeTrigger());
    expect(manager.setEnabled('test-1', false)).toBe(true);
    expect(manager.getTrigger('test-1')?.enabled).toBe(false);
  });

  it('should increment fire count', () => {
    manager.addTrigger(makeTrigger());
    const event: TriggerEvent = {
      triggerId: '',
      type: 'file_change',
      data: { path: 'src/foo.ts' },
      timestamp: new Date(),
    };

    manager.evaluate(event);
    expect(manager.getTrigger('test-1')?.fireCount).toBe(1);
  });

  it('should filter by type', () => {
    manager.addTrigger(makeTrigger({ id: 't1', type: 'file_change' }));
    manager.addTrigger(makeTrigger({ id: 't2', type: 'webhook' }));

    expect(manager.listTriggers('file_change')).toHaveLength(1);
    expect(manager.listTriggers('webhook')).toHaveLength(1);
  });
});
