/**
 * A2UI Protocol v0.8 Types
 *
 * OpenClaw-inspired Agent-to-UI protocol for visual workspaces.
 * Uses adjacency list model for components (flat structure with ID references).
 *
 * Message Types:
 * - surfaceUpdate: Create/modify UI components
 * - dataModelUpdate: Populate component values via data binding
 * - beginRendering: Signal to display the assembled interface
 * - deleteSurface: Remove a surface and all associated components
 *
 * User Interaction:
 * - userAction: Sent when user interacts with components
 */

// ============================================================================
// Component Types
// ============================================================================

/**
 * Standard A2UI component types
 */
export type ComponentType =
  // Layout
  | 'row'
  | 'column'
  | 'list'
  | 'grid'
  | 'stack'
  // Display
  | 'text'
  | 'heading'
  | 'image'
  | 'icon'
  | 'video'
  | 'markdown'
  | 'code'
  | 'divider'
  | 'spacer'
  // Interactive
  | 'button'
  | 'textField'
  | 'textArea'
  | 'checkbox'
  | 'radio'
  | 'switch'
  | 'slider'
  | 'select'
  | 'datePicker'
  | 'timePicker'
  | 'filePicker'
  // Containers
  | 'card'
  | 'accordion'
  | 'tabs'
  | 'tabItem'
  | 'modal'
  | 'drawer'
  | 'popover'
  | 'tooltip'
  // Data
  | 'table'
  | 'chart'
  | 'progress'
  | 'badge'
  | 'avatar'
  | 'chip'
  // Custom
  | 'custom';

// ============================================================================
// Style Types
// ============================================================================

export interface A2UIStyles {
  // Layout
  width?: string | number;
  height?: string | number;
  minWidth?: string | number;
  minHeight?: string | number;
  maxWidth?: string | number;
  maxHeight?: string | number;
  padding?: string | number;
  paddingTop?: string | number;
  paddingRight?: string | number;
  paddingBottom?: string | number;
  paddingLeft?: string | number;
  margin?: string | number;
  marginTop?: string | number;
  marginRight?: string | number;
  marginBottom?: string | number;
  marginLeft?: string | number;
  gap?: string | number;
  flex?: number;
  flexGrow?: number;
  flexShrink?: number;
  alignItems?: 'start' | 'center' | 'end' | 'stretch';
  justifyContent?: 'start' | 'center' | 'end' | 'space-between' | 'space-around';
  alignSelf?: 'start' | 'center' | 'end' | 'stretch';
  // Appearance
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
  borderRadius?: string | number;
  borderStyle?: 'solid' | 'dashed' | 'dotted' | 'none';
  // Typography
  color?: string;
  fontSize?: string | number;
  fontWeight?: 'normal' | 'bold' | '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900';
  fontFamily?: string;
  textAlign?: 'left' | 'center' | 'right' | 'justify';
  textDecoration?: 'none' | 'underline' | 'line-through';
  // Effects
  opacity?: number;
  shadow?: string;
  overflow?: 'visible' | 'hidden' | 'scroll' | 'auto';
  // Visibility
  display?: 'flex' | 'block' | 'inline' | 'none';
  visibility?: 'visible' | 'hidden';
}

// ============================================================================
// Action Types
// ============================================================================

export interface A2UIAction {
  /** Action name (used in userAction callback) */
  name: string;
  /** Optional payload data */
  payload?: Record<string, unknown>;
  /** Confirmation message (if any) */
  confirmation?: string;
  /** Deep link URL */
  href?: string;
}

// ============================================================================
// Component Definitions
// ============================================================================

export interface LayoutComponentProps {
  children?: string[];
  styles?: A2UIStyles;
}

export interface TextComponentProps {
  value?: string;
  path?: string;
  styles?: A2UIStyles;
}

export interface HeadingComponentProps {
  value?: string;
  path?: string;
  level?: 1 | 2 | 3 | 4 | 5 | 6;
  styles?: A2UIStyles;
}

export interface ImageComponentProps {
  src?: string;
  path?: string;
  alt?: string;
  styles?: A2UIStyles;
}

export interface IconComponentProps {
  name: string;
  size?: number;
  color?: string;
  styles?: A2UIStyles;
}

export interface ButtonComponentProps {
  label?: string;
  path?: string;
  action?: A2UIAction;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  icon?: string;
  styles?: A2UIStyles;
}

export interface TextFieldComponentProps {
  label?: string;
  value?: string;
  path?: string;
  placeholder?: string;
  type?: 'text' | 'password' | 'email' | 'number' | 'tel' | 'url';
  disabled?: boolean;
  required?: boolean;
  validation?: {
    pattern?: string;
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
  };
  styles?: A2UIStyles;
}

export interface TextAreaComponentProps {
  label?: string;
  value?: string;
  path?: string;
  placeholder?: string;
  rows?: number;
  disabled?: boolean;
  required?: boolean;
  styles?: A2UIStyles;
}

export interface CheckboxComponentProps {
  label?: string;
  checked?: boolean;
  path?: string;
  disabled?: boolean;
  styles?: A2UIStyles;
}

export interface RadioComponentProps {
  label?: string;
  value?: string;
  groupPath?: string;
  disabled?: boolean;
  styles?: A2UIStyles;
}

export interface SwitchComponentProps {
  label?: string;
  checked?: boolean;
  path?: string;
  disabled?: boolean;
  styles?: A2UIStyles;
}

export interface SliderComponentProps {
  value?: number;
  path?: string;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  styles?: A2UIStyles;
}

export interface SelectComponentProps {
  label?: string;
  value?: string;
  path?: string;
  options?: Array<{ value: string; label: string }>;
  optionsPath?: string;
  placeholder?: string;
  disabled?: boolean;
  multiple?: boolean;
  styles?: A2UIStyles;
}

export interface CardComponentProps {
  title?: string;
  subtitle?: string;
  children?: string[];
  actions?: string[];
  styles?: A2UIStyles;
}

export interface TabsComponentProps {
  activeTab?: string;
  path?: string;
  children?: string[];
  styles?: A2UIStyles;
}

export interface TabItemComponentProps {
  id: string;
  label: string;
  icon?: string;
  children?: string[];
  styles?: A2UIStyles;
}

export interface ModalComponentProps {
  title?: string;
  open?: boolean;
  path?: string;
  children?: string[];
  actions?: string[];
  closable?: boolean;
  styles?: A2UIStyles;
}

export interface TableComponentProps {
  columns?: Array<{
    key: string;
    label: string;
    width?: string | number;
    sortable?: boolean;
  }>;
  dataPath?: string;
  selectable?: boolean;
  pagination?: boolean;
  pageSize?: number;
  styles?: A2UIStyles;
}

export interface ChartComponentProps {
  type: 'line' | 'bar' | 'pie' | 'area' | 'scatter';
  dataPath?: string;
  xAxis?: string;
  yAxis?: string;
  series?: Array<{ key: string; label: string; color?: string }>;
  styles?: A2UIStyles;
}

export interface ProgressComponentProps {
  value?: number;
  path?: string;
  max?: number;
  variant?: 'linear' | 'circular';
  showLabel?: boolean;
  styles?: A2UIStyles;
}

export interface ListComponentProps {
  itemsPath?: string;
  template?: string;
  children?: string[];
  dividers?: boolean;
  styles?: A2UIStyles;
}

export interface CodeComponentProps {
  value?: string;
  path?: string;
  language?: string;
  showLineNumbers?: boolean;
  styles?: A2UIStyles;
}

export interface MarkdownComponentProps {
  value?: string;
  path?: string;
  styles?: A2UIStyles;
}

export interface CustomComponentProps {
  type: string;
  props?: Record<string, unknown>;
  children?: string[];
  styles?: A2UIStyles;
}

// ============================================================================
// Component Union Type
// ============================================================================

export type ComponentProps =
  | { row: LayoutComponentProps }
  | { column: LayoutComponentProps }
  | { list: ListComponentProps }
  | { grid: LayoutComponentProps }
  | { stack: LayoutComponentProps }
  | { text: TextComponentProps }
  | { heading: HeadingComponentProps }
  | { image: ImageComponentProps }
  | { icon: IconComponentProps }
  | { video: { src?: string; path?: string; styles?: A2UIStyles } }
  | { markdown: MarkdownComponentProps }
  | { code: CodeComponentProps }
  | { divider: { styles?: A2UIStyles } }
  | { spacer: { size?: number; styles?: A2UIStyles } }
  | { button: ButtonComponentProps }
  | { textField: TextFieldComponentProps }
  | { textArea: TextAreaComponentProps }
  | { checkbox: CheckboxComponentProps }
  | { radio: RadioComponentProps }
  | { switch: SwitchComponentProps }
  | { slider: SliderComponentProps }
  | { select: SelectComponentProps }
  | { card: CardComponentProps }
  | { accordion: { children?: string[]; styles?: A2UIStyles } }
  | { tabs: TabsComponentProps }
  | { tabItem: TabItemComponentProps }
  | { modal: ModalComponentProps }
  | { drawer: { open?: boolean; position?: 'left' | 'right'; children?: string[]; styles?: A2UIStyles } }
  | { popover: { trigger?: string; children?: string[]; styles?: A2UIStyles } }
  | { tooltip: { content?: string; children?: string[]; styles?: A2UIStyles } }
  | { table: TableComponentProps }
  | { chart: ChartComponentProps }
  | { progress: ProgressComponentProps }
  | { badge: { value?: string | number; path?: string; variant?: string; styles?: A2UIStyles } }
  | { avatar: { src?: string; name?: string; size?: number; styles?: A2UIStyles } }
  | { chip: { label?: string; icon?: string; action?: A2UIAction; styles?: A2UIStyles } }
  | { custom: CustomComponentProps };

// ============================================================================
// Component Definition (Adjacency List Model)
// ============================================================================

export interface A2UIComponent {
  /** Unique component ID */
  id: string;
  /** Component type and properties */
  component: ComponentProps;
}

// ============================================================================
// A2UI Messages (Server to Client)
// ============================================================================

/**
 * surfaceUpdate: Create or modify UI components
 */
export interface SurfaceUpdateMessage {
  surfaceUpdate: {
    /** Surface identifier */
    surfaceId: string;
    /** Components to add/update */
    components: A2UIComponent[];
  };
}

/**
 * dataModelUpdate: Populate component values
 */
export interface DataModelUpdateMessage {
  dataModelUpdate: {
    /** Surface identifier */
    surfaceId: string;
    /** JSON path for nested updates */
    path?: string;
    /** Data to set */
    contents: Record<string, unknown>[] | Record<string, unknown>;
  };
}

/**
 * beginRendering: Signal to display the interface
 */
export interface BeginRenderingMessage {
  beginRendering: {
    /** Surface identifier */
    surfaceId: string;
    /** Root component ID to render */
    root: string;
    /** Component catalog URI */
    catalogId?: string;
    /** Global surface styles */
    styles?: A2UIStyles;
  };
}

/**
 * deleteSurface: Remove a surface
 */
export interface DeleteSurfaceMessage {
  deleteSurface: {
    /** Surface identifier */
    surfaceId: string;
  };
}

/**
 * Union of all A2UI messages
 */
export type A2UIMessage =
  | SurfaceUpdateMessage
  | DataModelUpdateMessage
  | BeginRenderingMessage
  | DeleteSurfaceMessage;

// ============================================================================
// User Interaction Messages (Client to Server)
// ============================================================================

/**
 * userAction: Sent when user interacts with a component
 */
export interface UserActionMessage {
  userAction: {
    /** Action name from component */
    name: string;
    /** Source surface ID */
    surfaceId: string;
    /** Component ID that triggered action */
    componentId?: string;
    /** Context data from interaction */
    context?: Record<string, unknown>;
  };
}

/**
 * errorMessage: Client reports an error
 */
export interface ErrorMessage {
  error: {
    /** Error message */
    message: string;
    /** Error code */
    code?: string;
    /** Additional details */
    details?: Record<string, unknown>;
  };
}

/**
 * Union of client messages
 */
export type A2UIClientMessage = UserActionMessage | ErrorMessage;

// ============================================================================
// Canvas Control Messages
// ============================================================================

export interface CanvasPresentCommand {
  method: 'canvas';
  action: 'present';
  visible: boolean;
}

export interface CanvasNavigateCommand {
  method: 'canvas';
  action: 'navigate';
  target: string;
}

export interface CanvasEvalCommand {
  method: 'canvas';
  action: 'eval';
  javascript: string;
}

export interface CanvasSnapshotCommand {
  method: 'canvas';
  action: 'snapshot';
}

export interface CanvasA2UICommand {
  method: 'canvas';
  action: 'a2ui';
  messages: A2UIMessage[];
}

export type CanvasCommand =
  | CanvasPresentCommand
  | CanvasNavigateCommand
  | CanvasEvalCommand
  | CanvasSnapshotCommand
  | CanvasA2UICommand;

// ============================================================================
// Surface State
// ============================================================================

export interface Surface {
  /** Surface identifier */
  id: string;
  /** All components in adjacency list */
  components: Map<string, A2UIComponent>;
  /** Data model */
  dataModel: Record<string, unknown>;
  /** Root component ID */
  root?: string;
  /** Surface styles */
  styles?: A2UIStyles;
  /** Catalog ID */
  catalogId?: string;
  /** Is surface visible */
  visible: boolean;
  /** Created timestamp */
  createdAt: Date;
  /** Last updated timestamp */
  updatedAt: Date;
}

// ============================================================================
// Rendered Component Tree
// ============================================================================

export interface RenderedComponent {
  /** Component ID */
  id: string;
  /** Component type */
  type: ComponentType;
  /** Resolved props (with data binding applied) */
  props: Record<string, unknown>;
  /** Child components */
  children: RenderedComponent[];
}

// ============================================================================
// Constants
// ============================================================================

export const A2UI_VERSION = '0.8';

export const STANDARD_CATALOG_ID = 'https://a2ui.org/catalog/standard/v1';

export const DEFAULT_SURFACE_STYLES: A2UIStyles = {
  backgroundColor: '#ffffff',
  fontFamily: 'system-ui, -apple-system, sans-serif',
  fontSize: 14,
  color: '#1a1a2e',
  padding: 16,
};
