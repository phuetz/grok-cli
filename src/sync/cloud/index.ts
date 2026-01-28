/**
 * Cloud Sync Module
 *
 * Provides cloud storage, synchronization, and backup capabilities.
 */

// Types
export * from './types.js';

// Storage
export {
  CloudStorage,
  LocalStorage,
  S3Storage,
  createCloudStorage,
  type StorageObject,
  type ListOptions,
  type ListResult,
} from './storage.js';

// Sync Manager
export {
  CloudSyncManager,
  createSyncManager,
  type SyncManagerConfig,
} from './sync-manager.js';

// Backup Manager
export {
  BackupManager,
  createBackupManager,
  type BackupManagerConfig,
} from './backup-manager.js';

// ============================================================================
// Convenience Functions
// ============================================================================

import { homedir } from 'os';
import type { CloudConfig, SyncConfig, BackupConfig } from './types.js';
import { createSyncManager } from './sync-manager.js';
import { createBackupManager } from './backup-manager.js';

/**
 * Create a fully configured sync system with both sync and backup capabilities
 */
export function createCloudSyncSystem(config: {
  cloud: CloudConfig;
  sync?: Partial<SyncConfig>;
  backup?: Partial<BackupConfig>;
}) {
  const defaultSyncConfig: SyncConfig = {
    autoSync: false,
    syncInterval: 30000,
    direction: 'bidirectional',
    conflictResolution: 'newest',
    items: [],
    compression: true,
    encryption: true,
    ...config.sync,
  };

  const defaultBackupConfig: BackupConfig = {
    autoBackup: false,
    backupInterval: 3600000, // 1 hour
    maxBackups: 10,
    items: [],
    compressionLevel: 6,
    ...config.backup,
  };

  const syncManager = createSyncManager({
    cloud: config.cloud,
    sync: defaultSyncConfig,
  });

  const backupManager = createBackupManager({
    cloud: config.cloud,
    backup: defaultBackupConfig,
  });

  return {
    sync: syncManager,
    backup: backupManager,

    /**
     * Start both auto-sync and auto-backup
     */
    startAll() {
      syncManager.startAutoSync();
      backupManager.startAutoBackup();
    },

    /**
     * Stop both auto-sync and auto-backup
     */
    stopAll() {
      syncManager.stopAutoSync();
      backupManager.stopAutoBackup();
    },

    /**
     * Dispose of all resources
     */
    dispose() {
      syncManager.dispose();
      backupManager.dispose();
    },
  };
}

// ============================================================================
// Default Configuration Helpers
// ============================================================================

/**
 * Create a local storage configuration for testing
 */
export function createLocalConfig(basePath?: string): CloudConfig {
  return {
    provider: 'local',
    bucket: 'local',
    endpoint: basePath || (process.env.HOME || homedir()) + '/.codebuddy/cloud',
  };
}

/**
 * Create an S3 configuration
 */
export function createS3Config(options: {
  bucket: string;
  region?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  endpoint?: string;
  prefix?: string;
  encryptionKey?: string;
}): CloudConfig {
  return {
    provider: 's3',
    bucket: options.bucket,
    region: options.region || 'us-east-1',
    credentials: {
      accessKeyId: options.accessKeyId,
      secretAccessKey: options.secretAccessKey,
    },
    endpoint: options.endpoint,
    prefix: options.prefix,
    encryptionKey: options.encryptionKey,
  };
}

/**
 * Create default sync items for Code Buddy
 */
export function createDefaultSyncItems(): SyncConfig['items'] {
  return [
    {
      type: 'sessions',
      localPath: '.codebuddy/sessions',
      remotePath: 'sessions',
      enabled: true,
      priority: 1,
    },
    {
      type: 'memory',
      localPath: '.codebuddy/memory',
      remotePath: 'memory',
      enabled: true,
      priority: 2,
    },
    {
      type: 'settings',
      localPath: '.codebuddy/settings',
      remotePath: 'settings',
      enabled: true,
      priority: 3,
    },
    {
      type: 'checkpoints',
      localPath: '.codebuddy/checkpoints',
      remotePath: 'checkpoints',
      enabled: false, // Large, disabled by default
      priority: 4,
    },
  ];
}

/**
 * Create default backup items for Code Buddy
 */
export function createDefaultBackupItems(): string[] {
  return [
    '.codebuddy/sessions',
    '.codebuddy/memory',
    '.codebuddy/settings',
  ];
}
