/**
 * Tests for RenderManager and specialized renderers
 */
import {
  RenderManager,
  getRenderManager,
  resetRenderManager,
} from '../src/renderers/render-manager';
import { Renderer } from '../src/renderers/types';

describe('RenderManager', () => {
  let manager: RenderManager;

  beforeEach(() => {
    resetRenderManager();
    manager = getRenderManager();
  });

  afterEach(() => {
    resetRenderManager();
  });

  describe('Initialization', () => {
    it('should create a singleton instance', () => {
      const manager1 = getRenderManager();
      const manager2 = getRenderManager();
      expect(manager1).toBe(manager2);
    });

    it('should reset correctly', () => {
      const manager1 = getRenderManager();
      resetRenderManager();
      const manager2 = getRenderManager();
      expect(manager1).not.toBe(manager2);
    });

    it('should get registered renderers', () => {
      const renderers = manager.getRenderers();
      expect(Array.isArray(renderers)).toBe(true);
    });
  });

  describe('Rendering', () => {
    it('should render plain text', () => {
      const content = 'Hello, world!';
      const result = manager.render(content);
      expect(result).toBe(content);
    });

    it('should render with context options', () => {
      const content = 'Test content';
      const result = manager.render(content, { color: false, emoji: false });
      expect(typeof result).toBe('string');
    });

    it('should render arrays', () => {
      const content = [1, 2, 3];
      const result = manager.render(content);
      expect(typeof result).toBe('string');
    });

    it('should render objects', () => {
      const content = { name: 'test', value: 42 };
      const result = manager.render(content);
      expect(typeof result).toBe('string');
    });

    it('should render null and undefined', () => {
      expect(manager.render(null)).toBe('null');
      expect(manager.render(undefined)).toBe('undefined');
    });

    it('should render booleans and numbers', () => {
      expect(manager.render(true)).toBe('true');
      expect(manager.render(42)).toBe('42');
    });

    it('should render empty arrays', () => {
      expect(manager.render([])).toBe('[]');
    });

    it('should render empty objects', () => {
      expect(manager.render({})).toBe('{}');
    });
  });

  describe('Renderer Registration', () => {
    it('should register custom renderer', () => {
      // Create a type-safe renderer
      const customRenderer: Renderer<{ custom: true }> = {
        id: 'custom',
        name: 'Custom Renderer',
        canRender: (data): data is { custom: true } =>
          typeof data === 'object' && data !== null && 'custom' in data,
        render: () => '[CUSTOM]',
        priority: 100,
      };

      manager.register(customRenderer);
      const renderers = manager.getRenderers();
      expect(renderers.some((r) => r.id === 'custom')).toBe(true);
    });

    it('should unregister renderer', () => {
      const customRenderer: Renderer<{ temp: true }> = {
        id: 'temp-renderer',
        name: 'Temp Renderer',
        canRender: (data): data is { temp: true } =>
          typeof data === 'object' && data !== null && 'temp' in data,
        render: () => 'temp',
        priority: 1,
      };

      manager.register(customRenderer);
      expect(manager.getRenderers().some((r) => r.id === 'temp-renderer')).toBe(true);

      manager.unregister('temp-renderer');
      expect(manager.getRenderers().some((r) => r.id === 'temp-renderer')).toBe(false);
    });

    it('should use custom renderer for matching content', () => {
      const customRenderer: Renderer<{ marker: string }> = {
        id: 'custom-test',
        name: 'Custom Test Renderer',
        canRender: (data): data is { marker: string } =>
          typeof data === 'object' && data !== null && 'marker' in data,
        render: (data) => `Rendered: ${data.marker}`,
        priority: 100,
      };

      manager.register(customRenderer);
      const result = manager.render({ marker: 'test' });
      expect(result).toContain('Rendered');
    });

    it('should get renderer by id', () => {
      const customRenderer: Renderer<{ id: string }> = {
        id: 'by-id-test',
        name: 'By ID Renderer',
        canRender: (data): data is { id: string } =>
          typeof data === 'object' && data !== null && 'id' in data,
        render: () => 'by-id',
        priority: 1,
      };

      manager.register(customRenderer);
      const renderer = manager.getRenderer('by-id-test');
      expect(renderer).toBeDefined();
      expect(renderer?.id).toBe('by-id-test');
    });

    it('should return undefined for unknown renderer', () => {
      const renderer = manager.getRenderer('nonexistent');
      expect(renderer).toBeUndefined();
    });
  });

  describe('Context Configuration', () => {
    it('should update context', () => {
      manager.setContext({ color: false });
      const context = manager.getContext();
      expect(context.color).toBe(false);
    });

    it('should set mode', () => {
      manager.setMode('plain');
      const context = manager.getContext();
      expect(context.mode).toBe('plain');
    });

    it('should set color', () => {
      manager.setColor(false);
      const context = manager.getContext();
      expect(context.color).toBe(false);
    });

    it('should set emoji', () => {
      manager.setEmoji(false);
      const context = manager.getContext();
      expect(context.emoji).toBe(false);
    });
  });

  describe('canRender', () => {
    it('should check if content can be rendered', () => {
      // With no custom renderers, should return false for most content
      const result = manager.canRender({ type: 'unknown' });
      expect(typeof result).toBe('boolean');
    });
  });

  describe('renderAll', () => {
    it('should render multiple items', () => {
      const items = ['item1', 'item2', 'item3'];
      const result = manager.renderAll(items);
      expect(result).toContain('item1');
      expect(result).toContain('item2');
      expect(result).toContain('item3');
    });

    it('should use custom separator', () => {
      const items = ['a', 'b'];
      const result = manager.renderAll(items, ' | ');
      expect(result).toBe('a | b');
    });
  });

  describe('findRenderer', () => {
    it('should find renderer for matching data', () => {
      const customRenderer: Renderer<{ findable: true }> = {
        id: 'findable-renderer',
        name: 'Findable Renderer',
        canRender: (data): data is { findable: true } =>
          typeof data === 'object' && data !== null && 'findable' in data,
        render: () => 'found',
        priority: 1,
      };

      manager.register(customRenderer);
      const renderer = manager.findRenderer({ findable: true });
      expect(renderer).toBeDefined();
      expect(renderer?.id).toBe('findable-renderer');
    });

    it('should return undefined for non-matching data', () => {
      const renderer = manager.findRenderer({ unknown: true });
      expect(renderer).toBeUndefined();
    });
  });
});
