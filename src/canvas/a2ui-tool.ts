/**
 * A2UI Tool
 *
 * Tool interface for AI agents to interact with the A2UI system.
 * Provides actions to create surfaces, add components, update data, and render.
 */

import type {
  A2UIMessage,
  A2UIComponent,
  ComponentProps,
  A2UIStyles,
  ComponentType,
} from './a2ui-types.js';
import { A2UIManager, getA2UIManager } from './a2ui-manager.js';
import { A2UIServer, getA2UIServer } from './a2ui-server.js';

// ============================================================================
// Types
// ============================================================================

export type A2UIAction =
  | 'create_surface'
  | 'delete_surface'
  | 'add_component'
  | 'add_components'
  | 'update_data'
  | 'begin_rendering'
  | 'render_terminal'
  | 'render_html'
  | 'get_surface'
  | 'list_surfaces'
  | 'start_server'
  | 'stop_server'
  | 'server_status';

export interface A2UIToolInput {
  /** Action to perform */
  action: A2UIAction;

  /** Surface ID (for most actions) */
  surfaceId?: string;

  /** Component to add */
  component?: {
    id: string;
    type: ComponentType;
    props?: Record<string, unknown>;
  };

  /** Multiple components to add */
  components?: Array<{
    id: string;
    type: ComponentType;
    props?: Record<string, unknown>;
  }>;

  /** Data to update */
  data?: Record<string, unknown>;

  /** Data path for nested updates */
  dataPath?: string;

  /** Root component ID for rendering */
  root?: string;

  /** Surface styles */
  styles?: A2UIStyles;

  /** Server port */
  port?: number;

  /** Server host */
  host?: string;
}

export interface A2UIToolResult {
  success: boolean;
  output?: string;
  error?: string;
  data?: unknown;
}

// ============================================================================
// A2UI Tool
// ============================================================================

export class A2UITool {
  private manager: A2UIManager;
  private server: A2UIServer | null = null;

  constructor(manager?: A2UIManager) {
    this.manager = manager || getA2UIManager();
  }

  /**
   * Execute an A2UI action
   */
  async execute(input: A2UIToolInput): Promise<A2UIToolResult> {
    try {
      switch (input.action) {
        case 'create_surface':
          return this.createSurface(input);

        case 'delete_surface':
          return this.deleteSurface(input);

        case 'add_component':
          return this.addComponent(input);

        case 'add_components':
          return this.addComponents(input);

        case 'update_data':
          return this.updateData(input);

        case 'begin_rendering':
          return this.beginRendering(input);

        case 'render_terminal':
          return this.renderTerminal(input);

        case 'render_html':
          return this.renderHTML(input);

        case 'get_surface':
          return this.getSurface(input);

        case 'list_surfaces':
          return this.listSurfaces();

        case 'start_server':
          return await this.startServer(input);

        case 'stop_server':
          return await this.stopServer();

        case 'server_status':
          return this.serverStatus();

        default:
          return {
            success: false,
            error: `Unknown action: ${input.action}`,
          };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  // ==========================================================================
  // Surface Actions
  // ==========================================================================

  /**
   * Create a new surface
   */
  private createSurface(input: A2UIToolInput): A2UIToolResult {
    if (!input.surfaceId) {
      return { success: false, error: 'surfaceId is required' };
    }

    // Creating a surface is implicit through surfaceUpdate
    // We can just create an empty one by processing a message
    this.manager.processMessage({
      surfaceUpdate: {
        surfaceId: input.surfaceId,
        components: [],
      },
    });

    return {
      success: true,
      output: `Surface '${input.surfaceId}' created`,
      data: { surfaceId: input.surfaceId },
    };
  }

  /**
   * Delete a surface
   */
  private deleteSurface(input: A2UIToolInput): A2UIToolResult {
    if (!input.surfaceId) {
      return { success: false, error: 'surfaceId is required' };
    }

    if (!this.manager.hasSurface(input.surfaceId)) {
      return { success: false, error: `Surface '${input.surfaceId}' not found` };
    }

    this.manager.processMessage({
      deleteSurface: {
        surfaceId: input.surfaceId,
      },
    });

    return {
      success: true,
      output: `Surface '${input.surfaceId}' deleted`,
    };
  }

  // ==========================================================================
  // Component Actions
  // ==========================================================================

  /**
   * Add a single component to a surface
   */
  private addComponent(input: A2UIToolInput): A2UIToolResult {
    if (!input.surfaceId) {
      return { success: false, error: 'surfaceId is required' };
    }
    if (!input.component) {
      return { success: false, error: 'component is required' };
    }

    const component = this.buildComponent(input.component);

    this.manager.processMessage({
      surfaceUpdate: {
        surfaceId: input.surfaceId,
        components: [component],
      },
    });

    return {
      success: true,
      output: `Component '${input.component.id}' (${input.component.type}) added to surface '${input.surfaceId}'`,
      data: { componentId: input.component.id },
    };
  }

  /**
   * Add multiple components to a surface
   */
  private addComponents(input: A2UIToolInput): A2UIToolResult {
    if (!input.surfaceId) {
      return { success: false, error: 'surfaceId is required' };
    }
    if (!input.components || input.components.length === 0) {
      return { success: false, error: 'components array is required' };
    }

    const components = input.components.map(c => this.buildComponent(c));

    this.manager.processMessage({
      surfaceUpdate: {
        surfaceId: input.surfaceId,
        components,
      },
    });

    return {
      success: true,
      output: `${components.length} component(s) added to surface '${input.surfaceId}'`,
      data: { componentIds: input.components.map(c => c.id) },
    };
  }

  /**
   * Build A2UIComponent from input
   */
  private buildComponent(input: { id: string; type: ComponentType; props?: Record<string, unknown> }): A2UIComponent {
    const props = input.props || {};
    const componentProps: Record<string, unknown> = {};
    componentProps[input.type] = props;

    return {
      id: input.id,
      component: componentProps as ComponentProps,
    };
  }

  // ==========================================================================
  // Data Actions
  // ==========================================================================

  /**
   * Update data model
   */
  private updateData(input: A2UIToolInput): A2UIToolResult {
    if (!input.surfaceId) {
      return { success: false, error: 'surfaceId is required' };
    }
    if (!input.data) {
      return { success: false, error: 'data is required' };
    }

    this.manager.processMessage({
      dataModelUpdate: {
        surfaceId: input.surfaceId,
        path: input.dataPath,
        contents: input.data,
      },
    });

    return {
      success: true,
      output: input.dataPath
        ? `Data updated at path '${input.dataPath}' in surface '${input.surfaceId}'`
        : `Data model updated in surface '${input.surfaceId}'`,
    };
  }

  // ==========================================================================
  // Rendering Actions
  // ==========================================================================

  /**
   * Begin rendering a surface
   */
  private beginRendering(input: A2UIToolInput): A2UIToolResult {
    if (!input.surfaceId) {
      return { success: false, error: 'surfaceId is required' };
    }
    if (!input.root) {
      return { success: false, error: 'root component ID is required' };
    }

    this.manager.processMessage({
      beginRendering: {
        surfaceId: input.surfaceId,
        root: input.root,
        styles: input.styles,
      },
    });

    return {
      success: true,
      output: `Surface '${input.surfaceId}' is now rendering from root '${input.root}'`,
    };
  }

  /**
   * Render surface to terminal
   */
  private renderTerminal(input: A2UIToolInput): A2UIToolResult {
    if (!input.surfaceId) {
      return { success: false, error: 'surfaceId is required' };
    }

    const output = this.manager.renderToTerminal(input.surfaceId);

    return {
      success: true,
      output,
    };
  }

  /**
   * Render surface to HTML
   */
  private renderHTML(input: A2UIToolInput): A2UIToolResult {
    if (!input.surfaceId) {
      return { success: false, error: 'surfaceId is required' };
    }

    const html = this.manager.renderToHTML(input.surfaceId);

    return {
      success: true,
      output: `HTML generated (${html.length} bytes)`,
      data: { html },
    };
  }

  // ==========================================================================
  // Query Actions
  // ==========================================================================

  /**
   * Get surface details
   */
  private getSurface(input: A2UIToolInput): A2UIToolResult {
    if (!input.surfaceId) {
      return { success: false, error: 'surfaceId is required' };
    }

    const surface = this.manager.getSurface(input.surfaceId);
    if (!surface) {
      return { success: false, error: `Surface '${input.surfaceId}' not found` };
    }

    const components = Array.from(surface.components.values()).map(c => ({
      id: c.id,
      type: Object.keys(c.component)[0],
    }));

    return {
      success: true,
      output: `Surface '${input.surfaceId}': ${components.length} components, visible=${surface.visible}`,
      data: {
        id: surface.id,
        visible: surface.visible,
        root: surface.root,
        componentCount: components.length,
        components,
        dataModelKeys: Object.keys(surface.dataModel),
        createdAt: surface.createdAt.toISOString(),
        updatedAt: surface.updatedAt.toISOString(),
      },
    };
  }

  /**
   * List all surfaces
   */
  private listSurfaces(): A2UIToolResult {
    const surfaces = this.manager.getAllSurfaces().map(s => ({
      id: s.id,
      visible: s.visible,
      componentCount: s.components.size,
      root: s.root,
    }));

    return {
      success: true,
      output: `${surfaces.length} surface(s) found`,
      data: { surfaces },
    };
  }

  // ==========================================================================
  // Server Actions
  // ==========================================================================

  /**
   * Start A2UI server
   */
  private async startServer(input: A2UIToolInput): Promise<A2UIToolResult> {
    if (this.server && this.server.isRunning()) {
      return {
        success: false,
        error: 'A2UI server is already running',
      };
    }

    this.server = getA2UIServer({
      port: input.port || 18790,
      host: input.host || '127.0.0.1',
    });

    await this.server.start();

    const port = input.port || 18790;
    const host = input.host || '127.0.0.1';

    return {
      success: true,
      output: `A2UI server started at http://${host}:${port} (WebSocket: ws://${host}:${port}/a2ui)`,
      data: { port, host },
    };
  }

  /**
   * Stop A2UI server
   */
  private async stopServer(): Promise<A2UIToolResult> {
    if (!this.server || !this.server.isRunning()) {
      return {
        success: false,
        error: 'A2UI server is not running',
      };
    }

    await this.server.stop();

    return {
      success: true,
      output: 'A2UI server stopped',
    };
  }

  /**
   * Get server status
   */
  private serverStatus(): A2UIToolResult {
    if (!this.server || !this.server.isRunning()) {
      return {
        success: true,
        output: 'A2UI server is not running',
        data: { running: false },
      };
    }

    const stats = this.server.getStats();

    return {
      success: true,
      output: `A2UI server running: ${stats.clients} client(s), ${stats.surfaces} surface(s)`,
      data: {
        running: true,
        ...stats,
      },
    };
  }

  // ==========================================================================
  // Utility Methods
  // ==========================================================================

  /**
   * Get the A2UI Manager
   */
  getManager(): A2UIManager {
    return this.manager;
  }

  /**
   * Get the A2UI Server (if running)
   */
  getServer(): A2UIServer | null {
    return this.server;
  }
}

// ============================================================================
// Singleton
// ============================================================================

let a2uiToolInstance: A2UITool | null = null;

/**
 * Get singleton A2UI Tool instance
 */
export function getA2UITool(): A2UITool {
  if (!a2uiToolInstance) {
    a2uiToolInstance = new A2UITool();
  }
  return a2uiToolInstance;
}

/**
 * Reset A2UI Tool (for testing)
 */
export function resetA2UITool(): void {
  a2uiToolInstance = null;
}

export default A2UITool;
