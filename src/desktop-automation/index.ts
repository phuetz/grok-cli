/**
 * Desktop Automation Module
 *
 * Cross-platform desktop automation for mouse, keyboard, windows, and applications.
 * Supports multiple backends (robotjs, nut.js) with mock for testing.
 *
 * OpenClaw-inspired features:
 * - Smart Snapshot System for AI element references
 * - Permission Manager for platform-specific permissions
 * - System Control for volume, brightness, notifications
 * - Screen Recorder for video capture
 */

// Types
export type {
  Point,
  Size,
  Rect,
  ModifierKey,
  MouseButton,
  MousePosition,
  MouseMoveOptions,
  MouseClickOptions,
  MouseDragOptions,
  MouseScrollOptions,
  KeyCode,
  KeyPressOptions,
  TypeOptions,
  HotkeySequence,
  WindowInfo,
  WindowSearchOptions,
  WindowSetOptions,
  AppInfo,
  AppLaunchOptions,
  ScreenInfo,
  ColorInfo,
  ClipboardContent,
  AutomationProvider,
  ProviderCapabilities,
  ProviderStatus,
  DesktopAutomationConfig,
  DesktopAutomationEvents,
} from './types.js';

export { DEFAULT_AUTOMATION_CONFIG } from './types.js';

// Manager
export type { IAutomationProvider } from './automation-manager.js';

export {
  MockAutomationProvider,
  DesktopAutomationManager,
  getDesktopAutomation,
  resetDesktopAutomation,
} from './automation-manager.js';

// Providers
export { NutJsProvider } from './nutjs-provider.js';

// Platform-Native Providers (OpenClaw-inspired)
export { BaseNativeProvider } from './base-native-provider.js';
export { LinuxNativeProvider } from './linux-native-provider.js';
export { WindowsNativeProvider } from './windows-native-provider.js';
export { MacOSNativeProvider } from './macos-native-provider.js';

// Permission Manager (OpenClaw-inspired)
export type {
  PermissionType,
  PermissionStatus,
  PermissionInfo,
  PermissionCheckResult,
  PermissionManagerConfig,
} from './permission-manager.js';

export {
  PermissionManager,
  PermissionError,
  getPermissionManager,
  resetPermissionManager,
} from './permission-manager.js';

// System Control (OpenClaw-inspired)
export type {
  VolumeInfo,
  BrightnessInfo,
  NotificationOptions,
  NotificationResult,
  PowerAction,
  DisplayInfo,
  NetworkInfo,
  BatteryInfo,
  SystemInfo,
} from './system-control.js';

export {
  SystemControl,
  getSystemControl,
  resetSystemControl,
} from './system-control.js';

// Smart Snapshot System (OpenClaw-inspired)
export type {
  ElementRole,
  UIElement,
  Snapshot,
  SnapshotOptions,
  AnnotatedScreenshot,
  SmartSnapshotConfig,
} from './smart-snapshot.js';

export {
  SmartSnapshotManager,
  getSmartSnapshotManager,
  resetSmartSnapshotManager,
} from './smart-snapshot.js';

// Screen Recorder
export type {
  RecordingFormat,
  VideoCodec,
  RecordingState,
  RecordingOptions,
  RecordingInfo,
  RecordingResult,
  ScreenRecorderConfig,
} from './screen-recorder.js';

export {
  ScreenRecorder,
  getScreenRecorder,
  resetScreenRecorder,
} from './screen-recorder.js';
