/**
 * Plugin Manifest System
 *
 * Extended manifest format with components, marketplace sources,
 * namespaced skill resolution, and marketplace restrictions.
 */

import { logger } from '../utils/logger.js';

// ============================================================================
// Types
// ============================================================================

export type PluginSourceType = 'github' | 'git' | 'url' | 'npm' | 'file' | 'directory' | 'host-pattern';

export interface PluginManifest {
  name: string;
  version: string;
  author?: string;
  license?: string;
  description?: string;
  schema?: number;
  components: {
    skills?: string[];
    agents?: string[];
    hooks?: string;
    mcpServers?: string[];
    lspServers?: string[];
  };
  dependencies?: Record<string, string>;
  marketplace?: {
    source: PluginSourceType;
    url?: string;
    registry?: string;
  };
}

export interface InstalledPlugin {
  manifest: PluginManifest;
  path: string;
  enabled: boolean;
  installedAt: number;
  namespace: string;
}

// ============================================================================
// Known Marketplaces
// ============================================================================

const DEFAULT_KNOWN_MARKETPLACES = [
  'https://marketplace.codebuddy.dev',
  'https://registry.npmjs.org',
  'https://github.com',
];

// ============================================================================
// Plugin Manifest Manager
// ============================================================================

export class PluginManifestManager {
  private plugins: Map<string, InstalledPlugin> = new Map();
  private pluginDirs: string[];
  private strictKnownMarketplaces: boolean = false;
  private extraKnownMarketplaces: string[] = [];

  constructor(pluginDirs?: string[]) {
    this.pluginDirs = pluginDirs || [];
  }

  /**
   * Load plugin from manifest at a given path
   */
  loadPlugin(pluginPath: string): InstalledPlugin {
    const manifest = this.readManifest(pluginPath);
    const validation = this.validateManifest(manifest);

    if (!validation.valid) {
      throw new Error(`Invalid manifest at ${pluginPath}: ${validation.errors.join(', ')}`);
    }

    const installed: InstalledPlugin = {
      manifest,
      path: pluginPath,
      enabled: true,
      installedAt: Date.now(),
      namespace: manifest.name,
    };

    this.plugins.set(manifest.name, installed);
    logger.info(`Loaded plugin: ${manifest.name}@${manifest.version}`);
    return installed;
  }

  /**
   * Read manifest from plugin path (stub - returns parsed JSON-like object)
   */
  private readManifest(pluginPath: string): PluginManifest {
    // In real implementation this would read from disk
    // For now we expect the pluginPath to be a manifest object serialized
    throw new Error(`Cannot read manifest from ${pluginPath} - use installFromSource or loadPluginDirect`);
  }

  /**
   * Load a plugin directly from a manifest object (for programmatic use)
   */
  loadPluginDirect(manifest: PluginManifest, pluginPath: string): InstalledPlugin {
    const validation = this.validateManifest(manifest);
    if (!validation.valid) {
      throw new Error(`Invalid manifest: ${validation.errors.join(', ')}`);
    }

    const installed: InstalledPlugin = {
      manifest,
      path: pluginPath,
      enabled: true,
      installedAt: Date.now(),
      namespace: manifest.name,
    };

    this.plugins.set(manifest.name, installed);
    logger.info(`Loaded plugin: ${manifest.name}@${manifest.version}`);
    return installed;
  }

  /**
   * Validate a plugin manifest
   */
  validateManifest(manifest: PluginManifest): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!manifest || typeof manifest !== 'object') {
      return { valid: false, errors: ['Manifest must be a valid object'] };
    }

    // Required fields
    if (!manifest.name || typeof manifest.name !== 'string') {
      errors.push('Missing or invalid required field: name');
    }
    if (!manifest.version || typeof manifest.version !== 'string') {
      errors.push('Missing or invalid required field: version');
    }

    // Version format
    if (manifest.version && typeof manifest.version === 'string') {
      if (!/^\d+\.\d+\.\d+(-[\w.]+)?$/.test(manifest.version)) {
        errors.push('Version must be in semver format (e.g., 1.0.0)');
      }
    }

    // Components must be an object
    if (!manifest.components || typeof manifest.components !== 'object') {
      errors.push('Missing or invalid required field: components');
    } else {
      // Validate component arrays
      const arrayFields = ['skills', 'agents', 'mcpServers', 'lspServers'] as const;
      for (const field of arrayFields) {
        const val = manifest.components[field];
        if (val !== undefined && !Array.isArray(val)) {
          errors.push(`components.${field} must be an array`);
        }
      }
      if (manifest.components.hooks !== undefined && typeof manifest.components.hooks !== 'string') {
        errors.push('components.hooks must be a string path');
      }
    }

    // Schema version
    if (manifest.schema !== undefined && typeof manifest.schema !== 'number') {
      errors.push('schema must be a number');
    }

    // Dependencies
    if (manifest.dependencies !== undefined) {
      if (typeof manifest.dependencies !== 'object' || Array.isArray(manifest.dependencies)) {
        errors.push('dependencies must be an object');
      }
    }

    // Marketplace
    if (manifest.marketplace !== undefined) {
      if (typeof manifest.marketplace !== 'object') {
        errors.push('marketplace must be an object');
      } else {
        const validSources: PluginSourceType[] = ['github', 'git', 'url', 'npm', 'file', 'directory', 'host-pattern'];
        if (!validSources.includes(manifest.marketplace.source)) {
          errors.push(`marketplace.source must be one of: ${validSources.join(', ')}`);
        }
      }
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Install from various sources (stub implementation)
   */
  async installFromSource(source: PluginSourceType, location: string): Promise<InstalledPlugin> {
    // Check marketplace restrictions
    if (this.strictKnownMarketplaces && (source === 'url' || source === 'github' || source === 'git')) {
      if (!this.isMarketplaceAllowed(location)) {
        throw new Error(`Marketplace URL not allowed: ${location}`);
      }
    }

    const pluginName = this.extractPluginName(source, location);
    const manifest: PluginManifest = {
      name: pluginName,
      version: '0.0.0',
      components: {},
      marketplace: { source, url: location },
    };

    const installed: InstalledPlugin = {
      manifest,
      path: location,
      enabled: true,
      installedAt: Date.now(),
      namespace: pluginName,
    };

    this.plugins.set(pluginName, installed);
    logger.info(`Installed plugin from ${source}: ${pluginName}`);
    return installed;
  }

  /**
   * Extract a plugin name from source type and location
   */
  private extractPluginName(source: PluginSourceType, location: string): string {
    switch (source) {
      case 'github':
        return location.replace(/^https?:\/\/github\.com\//, '').replace(/\.git$/, '');
      case 'npm':
        return location.replace(/^@/, '').replace(/\//, '-');
      default:
        // Use last path segment
        const segments = location.split('/').filter(Boolean);
        return segments[segments.length - 1] || location;
    }
  }

  /**
   * Resolve namespaced skill: "plugin-name:skill-name"
   */
  resolveSkill(namespacedName: string): { pluginName: string; skillName: string } | null {
    const parts = namespacedName.split(':');
    if (parts.length !== 2) {
      return null;
    }

    const [pluginName, skillName] = parts;
    if (!pluginName || !skillName) {
      return null;
    }

    const plugin = this.plugins.get(pluginName);
    if (!plugin || !plugin.enabled) {
      return null;
    }

    return { pluginName, skillName };
  }

  /**
   * List all plugins
   */
  listPlugins(): InstalledPlugin[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Get a specific plugin by name
   */
  getPlugin(name: string): InstalledPlugin | null {
    return this.plugins.get(name) || null;
  }

  /**
   * Enable a plugin
   */
  enablePlugin(name: string): boolean {
    const plugin = this.plugins.get(name);
    if (!plugin) return false;
    plugin.enabled = true;
    logger.info(`Enabled plugin: ${name}`);
    return true;
  }

  /**
   * Disable a plugin
   */
  disablePlugin(name: string): boolean {
    const plugin = this.plugins.get(name);
    if (!plugin) return false;
    plugin.enabled = false;
    logger.info(`Disabled plugin: ${name}`);
    return true;
  }

  /**
   * Uninstall a plugin
   */
  uninstallPlugin(name: string): boolean {
    const existed = this.plugins.delete(name);
    if (existed) {
      logger.info(`Uninstalled plugin: ${name}`);
    }
    return existed;
  }

  /**
   * Check if a marketplace URL is allowed
   */
  isMarketplaceAllowed(url: string): boolean {
    const allKnown = [...DEFAULT_KNOWN_MARKETPLACES, ...this.extraKnownMarketplaces];
    return allKnown.some(known => url.startsWith(known));
  }

  /**
   * Set strict marketplace mode
   */
  setStrictMarketplaces(strict: boolean): void {
    this.strictKnownMarketplaces = strict;
    logger.info(`Strict marketplaces: ${strict}`);
  }

  /**
   * Add a known marketplace URL
   */
  addKnownMarketplace(url: string): void {
    if (!this.extraKnownMarketplaces.includes(url)) {
      this.extraKnownMarketplaces.push(url);
      logger.info(`Added known marketplace: ${url}`);
    }
  }

  /**
   * Get total plugin count
   */
  getPluginCount(): number {
    return this.plugins.size;
  }

  /**
   * Get enabled plugin count
   */
  getEnabledCount(): number {
    let count = 0;
    const plugins = Array.from(this.plugins.values());
    for (const plugin of plugins) {
      if (plugin.enabled) count++;
    }
    return count;
  }
}
