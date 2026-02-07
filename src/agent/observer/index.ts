/**
 * Observer Module - Barrel Export
 */

export {
  ScreenObserver,
  type ScreenDiff,
  type Region,
  type ScreenFrame,
  type ScreenObserverConfig,
} from './screen-observer.js';

export {
  EventTriggerManager,
  getEventTriggerManager,
  resetEventTriggerManager,
  type Trigger,
  type TriggerType,
  type TriggerAction,
  type TriggerEvent,
} from './event-trigger.js';

export {
  TriggerRegistry,
  TRIGGER_TEMPLATES,
} from './trigger-registry.js';

export {
  ObserverCoordinator,
  type CoordinatorConfig,
} from './observer-coordinator.js';
