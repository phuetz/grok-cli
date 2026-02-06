/**
 * Tests for the Events Module
 *
 * Covers TypedEventEmitter, FilteredEventEmitter, EventBus, and type guards.
 */

import {
  TypedEventEmitter,
  TypedEventEmitterAdapter,
  FilteredEventEmitter,
  EventBus,
  getGlobalEventBus,
  getEventBus,
  resetEventBus,
  isEventType,
  isAgentEvent,
  isToolEvent,
  isSessionEvent,
  isFileEvent,
  isCacheEvent,
  isSyncEvent,
} from '../../src/events/index';

import type {
  BaseEvent,
  ToolEvents,
  ToolEvent,
  AgentEvent,
  SessionEvent,
  FileEvent,
  AllEvents,
  ApplicationEvents,
} from '../../src/events/index';

// Mock logger to avoid console output during tests
jest.mock('../../src/utils/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('TypedEventEmitter', () => {
  let emitter: TypedEventEmitter<ToolEvents>;

  beforeEach(() => {
    emitter = new TypedEventEmitter<ToolEvents>();
  });

  afterEach(() => {
    emitter.dispose();
  });

  it('should emit and receive events', () => {
    const events: ToolEvent[] = [];

    emitter.on('tool:started', (event) => {
      events.push(event);
    });

    emitter.emit('tool:started', { toolName: 'bash', args: { command: 'ls' } });

    expect(events).toHaveLength(1);
    expect(events[0].toolName).toBe('bash');
    expect(events[0].type).toBe('tool:started');
    expect(events[0].timestamp).toBeDefined();
  });

  it('should support once listeners', () => {
    const events: ToolEvent[] = [];

    emitter.once('tool:completed', (event) => {
      events.push(event);
    });

    emitter.emit('tool:completed', { toolName: 'search', duration: 100 });
    emitter.emit('tool:completed', { toolName: 'search', duration: 200 });

    expect(events).toHaveLength(1);
    expect(events[0].duration).toBe(100);
  });

  it('should remove listener by id', () => {
    const events: ToolEvent[] = [];

    const id = emitter.on('tool:started', (event) => {
      events.push(event);
    });

    emitter.emit('tool:started', { toolName: 'bash' });
    expect(events).toHaveLength(1);

    emitter.off(id);

    emitter.emit('tool:started', { toolName: 'bash' });
    expect(events).toHaveLength(1);
  });

  it('should support wildcard listeners', () => {
    const events: BaseEvent[] = [];

    emitter.onAny((event) => {
      events.push(event);
    });

    emitter.emit('tool:started', { toolName: 'bash' });
    emitter.emit('tool:completed', { toolName: 'bash', duration: 50 });

    expect(events).toHaveLength(2);
    expect(events[0].type).toBe('tool:started');
    expect(events[1].type).toBe('tool:completed');
  });

  it('should track event history', () => {
    emitter.emit('tool:started', { toolName: 'bash' });
    emitter.emit('tool:completed', { toolName: 'bash', duration: 50 });

    const history = emitter.getHistory();
    expect(history).toHaveLength(2);
    expect(history[0].event.type).toBe('tool:started');
    expect(history[1].event.type).toBe('tool:completed');
  });

  it('should limit history size', () => {
    const smallEmitter = new TypedEventEmitter<ToolEvents>({ maxHistorySize: 2 });

    smallEmitter.emit('tool:started', { toolName: 'a' });
    smallEmitter.emit('tool:started', { toolName: 'b' });
    smallEmitter.emit('tool:started', { toolName: 'c' });

    const history = smallEmitter.getHistory();
    expect(history).toHaveLength(2);
    expect((history[0].event as ToolEvent).toolName).toBe('b');
    expect((history[1].event as ToolEvent).toolName).toBe('c');

    smallEmitter.dispose();
  });

  it('should track stats', () => {
    emitter.on('tool:started', () => {});
    emitter.emit('tool:started', { toolName: 'bash' });
    emitter.emit('tool:started', { toolName: 'bash' });

    const stats = emitter.getStats();
    expect(stats.totalEmitted).toBe(2);
    expect(stats.totalListeners).toBe(1);
    expect(stats.eventCounts['tool:started']).toBe(2);
  });

  it('should support enable/disable', () => {
    const events: ToolEvent[] = [];
    emitter.on('tool:started', (event) => events.push(event));

    emitter.setEnabled(false);
    expect(emitter.isEnabled()).toBe(false);

    emitter.emit('tool:started', { toolName: 'bash' });
    expect(events).toHaveLength(0);

    emitter.setEnabled(true);
    emitter.emit('tool:started', { toolName: 'bash' });
    expect(events).toHaveLength(1);
  });

  it('should support priority ordering', () => {
    const order: number[] = [];

    emitter.on('tool:started', () => order.push(1), { priority: 1 });
    emitter.on('tool:started', () => order.push(3), { priority: 3 });
    emitter.on('tool:started', () => order.push(2), { priority: 2 });

    emitter.emit('tool:started', { toolName: 'bash' });

    expect(order).toEqual([3, 2, 1]);
  });

  it('should support event filtering via listener options', () => {
    const events: ToolEvent[] = [];

    emitter.on('tool:started', (event) => events.push(event), {
      filter: (event) => event.toolName === 'bash',
    });

    emitter.emit('tool:started', { toolName: 'bash' });
    emitter.emit('tool:started', { toolName: 'search' });

    expect(events).toHaveLength(1);
    expect(events[0].toolName).toBe('bash');
  });

  it('should remove all listeners for a type', () => {
    emitter.on('tool:started', () => {});
    emitter.on('tool:started', () => {});
    emitter.on('tool:completed', () => {});

    emitter.offAll('tool:started');

    expect(emitter.listenerCount('tool:started')).toBe(0);
    // tool:completed listener still exists (1 type listener + 0 wildcard = 1)
    expect(emitter.listenerCount('tool:completed')).toBe(1);
  });

  it('should remove all listeners when offAll called without type', () => {
    emitter.on('tool:started', () => {});
    emitter.on('tool:completed', () => {});
    emitter.onAny(() => {});

    emitter.offAll();

    expect(emitter.listenerCount()).toBe(0);
  });

  it('should return event names with listeners', () => {
    emitter.on('tool:started', () => {});
    emitter.on('tool:completed', () => {});

    const names = emitter.eventNames();
    expect(names).toContain('tool:started');
    expect(names).toContain('tool:completed');
  });

  it('should clear history', () => {
    emitter.emit('tool:started', { toolName: 'bash' });
    expect(emitter.getHistory()).toHaveLength(1);

    emitter.clearHistory();
    expect(emitter.getHistory()).toHaveLength(0);
  });

  it('should reset stats', () => {
    emitter.on('tool:started', () => {});
    emitter.emit('tool:started', { toolName: 'bash' });

    emitter.resetStats();
    const stats = emitter.getStats();
    expect(stats.totalEmitted).toBe(0);
    expect(stats.eventCounts).toEqual({});
    // totalListeners should be preserved
    expect(stats.totalListeners).toBe(1);
  });

  it('should waitFor an event', async () => {
    const promise = emitter.waitFor('tool:started');

    // Emit after a microtask
    setTimeout(() => {
      emitter.emit('tool:started', { toolName: 'bash' });
    }, 10);

    const event = await promise;
    expect(event.toolName).toBe('bash');
  });

  it('should timeout on waitFor', async () => {
    const promise = emitter.waitFor('tool:started', { timeout: 50 });
    await expect(promise).rejects.toThrow('Timeout waiting for event: tool:started');
  });

  it('should pipe events to another emitter', () => {
    const target = new TypedEventEmitter<ToolEvents>();
    const events: ToolEvent[] = [];

    target.on('tool:started', (event) => events.push(event));

    emitter.pipe('tool:started', target);
    emitter.emit('tool:started', { toolName: 'bash' });

    expect(events).toHaveLength(1);
    expect(events[0].toolName).toBe('bash');

    target.dispose();
  });

  it('should return false when emitting with no listeners', () => {
    const result = emitter.emit('tool:started', { toolName: 'bash' });
    expect(result).toBe(false);
  });

  it('should return true when emitting with listeners', () => {
    emitter.on('tool:started', () => {});
    const result = emitter.emit('tool:started', { toolName: 'bash' });
    expect(result).toBe(true);
  });
});

describe('FilteredEventEmitter', () => {
  let emitter: TypedEventEmitter<ToolEvents>;

  beforeEach(() => {
    emitter = new TypedEventEmitter<ToolEvents>();
  });

  afterEach(() => {
    emitter.dispose();
  });

  it('should only receive events matching the filter', () => {
    const events: ToolEvent[] = [];

    const filtered = emitter.filter('tool:started', (event) => event.toolName === 'bash');
    filtered.on((event) => events.push(event));

    emitter.emit('tool:started', { toolName: 'bash' });
    emitter.emit('tool:started', { toolName: 'search' });
    emitter.emit('tool:started', { toolName: 'bash' });

    expect(events).toHaveLength(2);
    expect(events.every((e) => e.toolName === 'bash')).toBe(true);
  });

  it('should support once on filtered emitter', () => {
    const events: ToolEvent[] = [];

    const filtered = emitter.filter('tool:started', (event) => event.toolName === 'bash');
    filtered.once((event) => events.push(event));

    emitter.emit('tool:started', { toolName: 'bash' });
    emitter.emit('tool:started', { toolName: 'bash' });

    expect(events).toHaveLength(1);
  });

  it('should remove listener by id', () => {
    const events: ToolEvent[] = [];
    const filtered = emitter.filter('tool:started', () => true);

    const id = filtered.on((event) => events.push(event));
    emitter.emit('tool:started', { toolName: 'bash' });
    expect(events).toHaveLength(1);

    filtered.off(id);
    emitter.emit('tool:started', { toolName: 'bash' });
    expect(events).toHaveLength(1);
  });

  it('should remove all filtered listeners', () => {
    const filtered = emitter.filter('tool:started', () => true);
    filtered.on(() => {});
    filtered.on(() => {});

    filtered.offAll();

    // After removing filtered listeners, only wildcard listeners remain for that type
    expect(emitter.listenerCount('tool:started')).toBe(0);
  });
});

describe('EventBus', () => {
  afterEach(() => {
    resetEventBus();
  });

  it('should return singleton instance', () => {
    const bus1 = EventBus.getInstance();
    const bus2 = EventBus.getInstance();
    expect(bus1).toBe(bus2);
  });

  it('should reset singleton instance', () => {
    const bus1 = EventBus.getInstance();
    EventBus.resetInstance();
    const bus2 = EventBus.getInstance();
    expect(bus1).not.toBe(bus2);
  });

  it('should work with getGlobalEventBus', () => {
    const bus = getGlobalEventBus();
    expect(bus).toBeDefined();
    expect(bus).toBeInstanceOf(EventBus);
  });

  it('should work with getEventBus', () => {
    const bus = getEventBus();
    expect(bus).toBeDefined();
    expect(bus).toBeInstanceOf(EventBus);
  });

  it('should emit and receive via global bus', () => {
    const bus = getGlobalEventBus();
    const events: AgentEvent[] = [];

    bus.on('agent:started', (event) => events.push(event));
    bus.emit('agent:started', { agentId: 'test-agent' });

    expect(events).toHaveLength(1);
    expect(events[0].agentId).toBe('test-agent');
  });
});

describe('TypedEventEmitterAdapter', () => {
  let adapter: TypedEventEmitterAdapter<ApplicationEvents>;

  beforeEach(() => {
    adapter = new TypedEventEmitterAdapter<ApplicationEvents>();
  });

  afterEach(() => {
    adapter.dispose();
  });

  it('should emit through typed API', () => {
    const events: AgentEvent[] = [];

    adapter.onTyped('agent:started', (event) => events.push(event));
    adapter.emitTyped('agent:started', { agentId: 'test' });

    expect(events).toHaveLength(1);
    expect(events[0].agentId).toBe('test');
  });

  it('should emit through native EventEmitter API too', () => {
    const nativeEvents: unknown[] = [];

    // Listen via native EventEmitter
    adapter.on('agent:started', (event) => nativeEvents.push(event));
    adapter.emitTyped('agent:started', { agentId: 'test' });

    expect(nativeEvents).toHaveLength(1);
  });

  it('should support onceTyped', () => {
    const events: AgentEvent[] = [];

    adapter.onceTyped('agent:started', (event) => events.push(event));
    adapter.emitTyped('agent:started', { agentId: 'first' });
    adapter.emitTyped('agent:started', { agentId: 'second' });

    expect(events).toHaveLength(1);
    expect(events[0].agentId).toBe('first');
  });

  it('should remove typed listener', () => {
    const events: AgentEvent[] = [];

    const id = adapter.onTyped('agent:started', (event) => events.push(event));
    adapter.emitTyped('agent:started', { agentId: 'first' });

    adapter.offTyped(id);
    adapter.emitTyped('agent:started', { agentId: 'second' });

    expect(events).toHaveLength(1);
  });

  it('should return typed emitter', () => {
    const typedEmitter = adapter.getTypedEmitter();
    expect(typedEmitter).toBeInstanceOf(TypedEventEmitter);
  });

  it('should return stats and history', () => {
    adapter.emitTyped('agent:started', { agentId: 'test' });

    expect(adapter.getEventStats().totalEmitted).toBe(1);
    expect(adapter.getEventHistory()).toHaveLength(1);
  });
});

describe('Type Guards', () => {
  it('isEventType should narrow to correct type', () => {
    const event: BaseEvent = {
      type: 'agent:started',
      timestamp: Date.now(),
    };
    expect(isEventType(event, 'agent:started')).toBe(true);
    expect(isEventType(event, 'tool:started')).toBe(false);
  });

  it('isAgentEvent should detect agent events', () => {
    const agentEvent: BaseEvent = { type: 'agent:started', timestamp: Date.now() };
    const toolEvent: BaseEvent = { type: 'tool:started', timestamp: Date.now() };

    expect(isAgentEvent(agentEvent)).toBe(true);
    expect(isAgentEvent(toolEvent)).toBe(false);
  });

  it('isToolEvent should detect tool events', () => {
    const event: BaseEvent = { type: 'tool:completed', timestamp: Date.now() };
    expect(isToolEvent(event)).toBe(true);
    expect(isToolEvent({ type: 'session:started', timestamp: Date.now() })).toBe(false);
  });

  it('isSessionEvent should detect session events', () => {
    const event: BaseEvent = { type: 'session:started', timestamp: Date.now() };
    expect(isSessionEvent(event)).toBe(true);
    expect(isSessionEvent({ type: 'file:created', timestamp: Date.now() })).toBe(false);
  });

  it('isFileEvent should detect file events', () => {
    const event: BaseEvent = { type: 'file:created', timestamp: Date.now() };
    expect(isFileEvent(event)).toBe(true);
    expect(isFileEvent({ type: 'cache:hit', timestamp: Date.now() })).toBe(false);
  });

  it('isCacheEvent should detect cache events', () => {
    const event: BaseEvent = { type: 'cache:hit', timestamp: Date.now() };
    expect(isCacheEvent(event)).toBe(true);
    expect(isCacheEvent({ type: 'sync:started', timestamp: Date.now() })).toBe(false);
  });

  it('isSyncEvent should detect sync events', () => {
    const event: BaseEvent = { type: 'sync:started', timestamp: Date.now() };
    expect(isSyncEvent(event)).toBe(true);
    expect(isSyncEvent({ type: 'agent:started', timestamp: Date.now() })).toBe(false);
  });
});
