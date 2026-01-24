// @ts-expect-error - CSS imported as text via tsup loader
import cssText from "../dist/styles.css";
import { render } from "solid-js/web";
import { createSignal, For, onCleanup, onMount, Show } from "solid-js";
import { SelectionLabel } from "./components/selection-label/index.js";
import { ContextMenu } from "./components/context-menu.js";
import type { OverlayBounds, SelectionLabelStatus } from "./types.js";

type ComponentType = "label" | "context-menu";

interface DesignSystemState {
  id: string;
  label: string;
  description: string;
  component: ComponentType;
  props: {
    tagName?: string;
    componentName?: string;
    elementsCount?: number;
    status?: SelectionLabelStatus;
    hasAgent?: boolean;
    isAgentConnected?: boolean;
    isPromptMode?: boolean;
    inputValue?: string;
    replyToPrompt?: string;
    statusText?: string;
    isPendingDismiss?: boolean;
    isPendingAbort?: boolean;
    error?: string;
    isContextMenuOpen?: boolean;
    supportsUndo?: boolean;
    supportsFollowUp?: boolean;
    filePath?: string;
    hasFilePath?: boolean;
    showMoreOptions?: boolean;
    dismissButtonText?: string;
    previousPrompt?: string;
    hasOnDismiss?: boolean;
    hasOnUndo?: boolean;
    hasOnRetry?: boolean;
    hasOnAcknowledge?: boolean;
  };
}

const DESIGN_SYSTEM_STATES: DesignSystemState[] = [
  // ══════════════════════════════════════════════════════════════════════════
  // SELECTION LABEL STATES
  // ══════════════════════════════════════════════════════════════════════════

  // === IDLE STATES ===
  {
    id: "idle-default",
    label: "Idle (Default)",
    description: 'TagBadge + "Click to Copy"',
    component: "label",
    props: {
      tagName: "button",
      componentName: "Button",
      status: "idle",
      hasAgent: false,
    },
  },
  {
    id: "idle-with-filepath",
    label: "Idle (With File Path)",
    description: "Clickable tag badge with open icon",
    component: "label",
    props: {
      tagName: "div",
      componentName: "Header",
      status: "idle",
      hasAgent: false,
      filePath: "src/components/Header.tsx",
    },
  },
  {
    id: "idle-context-menu-open",
    label: "Idle (Context Menu Open)",
    description: "Open indicator icon visible",
    component: "label",
    props: {
      tagName: "main",
      componentName: "Main",
      status: "idle",
      hasAgent: false,
      isContextMenuOpen: true,
      filePath: "src/components/Main.tsx",
    },
  },
  {
    id: "idle-multi-element",
    label: "Idle (Multi-Element)",
    description: 'Shows "3 elements" instead of tag',
    component: "label",
    props: {
      tagName: "div",
      elementsCount: 3,
      status: "idle",
      hasAgent: false,
    },
  },
  {
    id: "idle-tag-only",
    label: "Idle (Tag Only)",
    description: "HTML tag without component name",
    component: "label",
    props: {
      tagName: "section",
      status: "idle",
      hasAgent: false,
    },
  },
  {
    id: "idle-agent-not-connected",
    label: "Idle (Agent Not Connected)",
    description: "Agent available but not connected",
    component: "label",
    props: {
      tagName: "div",
      componentName: "Panel",
      status: "idle",
      hasAgent: true,
      isAgentConnected: false,
    },
  },

  // === PROMPT MODE STATES ===
  {
    id: "prompt-empty",
    label: "Prompt (Empty)",
    description: "Input field ready for typing",
    component: "label",
    props: {
      tagName: "div",
      componentName: "Card",
      status: "idle",
      hasAgent: true,
      isAgentConnected: true,
      isPromptMode: true,
      inputValue: "",
    },
  },
  {
    id: "prompt-with-text",
    label: "Prompt (With Text)",
    description: "Input field with user text",
    component: "label",
    props: {
      tagName: "form",
      componentName: "Form",
      status: "idle",
      hasAgent: true,
      isAgentConnected: true,
      isPromptMode: true,
      inputValue: "make the button larger",
    },
  },
  {
    id: "prompt-with-reply",
    label: "Prompt (Reply Mode)",
    description: 'Shows "previously:" quote above input',
    component: "label",
    props: {
      tagName: "span",
      componentName: "Text",
      status: "idle",
      hasAgent: true,
      isAgentConnected: true,
      isPromptMode: true,
      inputValue: "now make it blue",
      replyToPrompt: "make the button larger",
    },
  },
  {
    id: "prompt-multiline",
    label: "Prompt (Multi-line)",
    description: "Long text that wraps to multiple lines",
    component: "label",
    props: {
      tagName: "div",
      componentName: "Container",
      status: "idle",
      hasAgent: true,
      isAgentConnected: true,
      isPromptMode: true,
      inputValue: "make the button bigger and change the background color to a nice gradient from blue to purple",
    },
  },
  {
    id: "prompt-long-reply",
    label: "Prompt (Long Previous)",
    description: "Long previously: text that truncates",
    component: "label",
    props: {
      tagName: "button",
      componentName: "Submit",
      status: "idle",
      hasAgent: true,
      isAgentConnected: true,
      isPromptMode: true,
      inputValue: "also add rounded corners",
      replyToPrompt: "make the button larger and add a hover effect with a nice shadow underneath it",
    },
  },
  {
    id: "pending-dismiss",
    label: "Pending Dismiss",
    description: '"Discard?" confirmation dialog',
    component: "label",
    props: {
      tagName: "header",
      componentName: "Header",
      status: "idle",
      hasAgent: true,
      isPromptMode: true,
      isPendingDismiss: true,
    },
  },

  // === COPYING STATES ===
  {
    id: "copying-simple",
    label: "Copying (Simple)",
    description: '"Grabbing..." with pulse animation',
    component: "label",
    props: {
      tagName: "input",
      componentName: "TextField",
      status: "copying",
      hasAgent: false,
      statusText: "Grabbing…",
    },
  },
  {
    id: "copying-with-prompt",
    label: "Copying (With Prompt)",
    description: "Disabled input + stop button",
    component: "label",
    props: {
      tagName: "section",
      componentName: "Section",
      status: "copying",
      hasAgent: true,
      isAgentConnected: true,
      inputValue: "add form validation",
      statusText: "Thinking…",
    },
  },
  {
    id: "pending-abort",
    label: "Pending Abort",
    description: '"Discard?" during copy operation',
    component: "label",
    props: {
      tagName: "article",
      componentName: "Article",
      status: "copying",
      hasAgent: true,
      isPendingAbort: true,
    },
  },
  {
    id: "copying-applying",
    label: "Copying (Applying)",
    description: '"Applying changes…" status variant',
    component: "label",
    props: {
      tagName: "form",
      componentName: "LoginForm",
      status: "copying",
      hasAgent: true,
      isAgentConnected: true,
      inputValue: "add validation",
      statusText: "Applying changes…",
    },
  },
  {
    id: "copying-analyzing",
    label: "Copying (Analyzing)",
    description: '"Analyzing…" status variant',
    component: "label",
    props: {
      tagName: "table",
      componentName: "DataTable",
      status: "copying",
      hasAgent: true,
      isAgentConnected: true,
      inputValue: "make columns sortable",
      statusText: "Analyzing…",
    },
  },

  // === COMPLETION STATES ===
  {
    id: "copied-simple",
    label: "Copied (Simple)",
    description: 'Checkmark + "Copied" text only',
    component: "label",
    props: {
      tagName: "nav",
      componentName: "Navigation",
      status: "copied",
      hasAgent: false,
    },
  },
  {
    id: "copied-with-actions",
    label: "Copied (With Actions)",
    description: "Undo + Keep buttons",
    component: "label",
    props: {
      tagName: "footer",
      componentName: "Footer",
      status: "copied",
      hasAgent: true,
      isAgentConnected: true,
      statusText: "Applied changes",
      supportsUndo: true,
    },
  },
  {
    id: "copied-with-followup",
    label: "Copied (With Follow-up)",
    description: "Follow-up input field below",
    component: "label",
    props: {
      tagName: "aside",
      componentName: "Sidebar",
      status: "copied",
      hasAgent: true,
      isAgentConnected: true,
      statusText: "Done",
      supportsUndo: true,
      supportsFollowUp: true,
    },
  },
  {
    id: "copied-no-dismiss",
    label: "Copied (No Dismiss)",
    description: "Checkmark + status only, no Keep button",
    component: "label",
    props: {
      tagName: "span",
      componentName: "Badge",
      status: "copied",
      hasAgent: true,
      isAgentConnected: true,
      statusText: "Applied",
      hasOnDismiss: false,
    },
  },
  {
    id: "copied-no-undo",
    label: "Copied (No Undo)",
    description: "Keep button but no Undo",
    component: "label",
    props: {
      tagName: "li",
      componentName: "ListItem",
      status: "copied",
      hasAgent: true,
      isAgentConnected: true,
      statusText: "Changes saved",
      supportsUndo: false,
    },
  },
  {
    id: "copied-with-more-options",
    label: "Copied (More Options)",
    description: "Ellipsis button for context menu",
    component: "label",
    props: {
      tagName: "div",
      componentName: "Widget",
      status: "copied",
      hasAgent: true,
      isAgentConnected: true,
      statusText: "Updated",
      supportsUndo: true,
      showMoreOptions: true,
    },
  },
  {
    id: "copied-custom-dismiss",
    label: "Copied (Custom Dismiss)",
    description: '"Accept" instead of "Keep"',
    component: "label",
    props: {
      tagName: "section",
      componentName: "Hero",
      status: "copied",
      hasAgent: true,
      isAgentConnected: true,
      statusText: "Ready",
      supportsUndo: true,
      dismissButtonText: "Accept",
    },
  },
  {
    id: "copied-followup-placeholder",
    label: "Copied (Follow-up Placeholder)",
    description: "Previous prompt as placeholder",
    component: "label",
    props: {
      tagName: "header",
      componentName: "TopBar",
      status: "copied",
      hasAgent: true,
      isAgentConnected: true,
      statusText: "Done",
      supportsUndo: true,
      supportsFollowUp: true,
      previousPrompt: "make it bigger",
    },
  },

  // === ERROR STATES ===
  {
    id: "error",
    label: "Error",
    description: "Error message with Retry + Ok",
    component: "label",
    props: {
      tagName: "dialog",
      componentName: "Modal",
      status: "error",
      error: "Failed to copy element",
    },
  },
  {
    id: "error-retry-only",
    label: "Error (Retry Only)",
    description: "Retry button, no Ok",
    component: "label",
    props: {
      tagName: "form",
      componentName: "Search",
      status: "error",
      error: "Connection timeout",
      hasOnRetry: true,
      hasOnAcknowledge: false,
    },
  },
  {
    id: "error-ok-only",
    label: "Error (Ok Only)",
    description: "Ok button, no Retry",
    component: "label",
    props: {
      tagName: "div",
      componentName: "Alert",
      status: "error",
      error: "Operation cancelled",
      hasOnRetry: false,
      hasOnAcknowledge: true,
    },
  },
  {
    id: "error-long-message",
    label: "Error (Long Message)",
    description: "Truncated error > 50 chars",
    component: "label",
    props: {
      tagName: "section",
      componentName: "Dashboard",
      status: "error",
      error: "The server returned an unexpected error response. Please check your network connection and try again later.",
    },
  },

  // ══════════════════════════════════════════════════════════════════════════
  // CONTEXT MENU STATES (Right-Click Menu)
  // ══════════════════════════════════════════════════════════════════════════
  {
    id: "context-menu-basic",
    label: "Context Menu (Basic)",
    description: "Copy, Copy HTML options",
    component: "context-menu",
    props: {
      tagName: "button",
      componentName: "Button",
      hasFilePath: false,
    },
  },
  {
    id: "context-menu-with-open",
    label: "Context Menu (With Open)",
    description: "Includes Open option with file path",
    component: "context-menu",
    props: {
      tagName: "div",
      componentName: "Header",
      hasFilePath: true,
      filePath: "src/components/Header.tsx",
    },
  },
  {
    id: "context-menu-tag-only",
    label: "Context Menu (Tag Only)",
    description: "HTML tag without component name",
    component: "context-menu",
    props: {
      tagName: "section",
      hasFilePath: false,
    },
  },
];

const CELL_SIZE_PX = 300;
const TARGET_HEIGHT_PX = 48;
const GAP_PX = 16;

const CARD_BORDER_RADIUS_PX = 8;
const CARD_HEADER_PADDING = "12px 14px";
const CARD_CONTENT_PADDING_PX = 16;
const CARD_TITLE_FONT_SIZE_PX = 13;
const CARD_DESCRIPTION_FONT_SIZE_PX = 11;
const CARD_TITLE_GAP_PX = 2;

const REFRESH_BUTTON_SIZE_PX = 20;
const REFRESH_BUTTON_BORDER_RADIUS_PX = 4;

const HEADER_PADDING = "16px 24px";
const HEADER_TITLE_FONT_SIZE_PX = 14;
const HEADER_BUTTONS_GAP_PX = 8;

const TOGGLE_BUTTON_PADDING = "5px 10px";
const TOGGLE_BUTTON_GAP_PX = 6;
const TOGGLE_BUTTON_BORDER_RADIUS_PX = 6;
const TOGGLE_BUTTON_FONT_SIZE_PX = 12;

const SECTION_TITLE_FONT_SIZE_PX = 11;
const SECTION_TITLE_MARGIN_BOTTOM_PX = 12;

const FPS_METER_POSITION_PX = 16;
const FPS_METER_PADDING = "6px 10px";
const FPS_METER_BORDER_RADIUS_PX = 6;
const FPS_METER_FONT_SIZE_PX = 12;

const TARGET_BORDER_RADIUS_PX = 6;
const TARGET_FONT_SIZE_PX = 12;

const TRANSITION_DURATION = "0.15s ease";

interface ThemeColors {
  background: string;
  cardBackground: string;
  cardContentBackground: string;
  cardBorder: string;
  cardShadow: string;
  titleText: string;
  descriptionText: string;
  targetBackground: string;
  targetBorder: string;
  targetText: string;
  toggleBackground: string;
  toggleBorder: string;
  toggleText: string;
  sectionTitle: string;
}

const DARK_THEME: ThemeColors = {
  background: "#000000",
  cardBackground: "rgba(255, 255, 255, 0.05)",
  cardContentBackground: "rgba(0, 0, 0, 0.6)",
  cardBorder: "rgba(255, 255, 255, 0.1)",
  cardShadow: "0 8px 30px rgba(0, 0, 0, 0.3)",
  titleText: "#ffffff",
  descriptionText: "rgba(255, 255, 255, 0.5)",
  targetBackground: "rgba(215, 95, 203, 0.1)",
  targetBorder: "rgba(215, 95, 203, 0.3)",
  targetText: "rgba(215, 95, 203, 0.7)",
  toggleBackground: "rgba(255, 255, 255, 0.05)",
  toggleBorder: "rgba(255, 255, 255, 0.1)",
  toggleText: "#ffffff",
  sectionTitle: "rgba(255, 255, 255, 0.4)",
};

const LIGHT_THEME: ThemeColors = {
  background: "#f5f5f5",
  cardBackground: "#ffffff",
  cardContentBackground: "rgba(0, 0, 0, 0.03)",
  cardBorder: "rgba(0, 0, 0, 0.1)",
  cardShadow: "0 8px 30px rgba(0, 0, 0, 0.08)",
  titleText: "#0a0a0a",
  descriptionText: "rgba(0, 0, 0, 0.5)",
  targetBackground: "rgba(215, 95, 203, 0.08)",
  targetBorder: "rgba(215, 95, 203, 0.3)",
  targetText: "rgba(215, 95, 203, 0.7)",
  toggleBackground: "#ffffff",
  toggleBorder: "rgba(0, 0, 0, 0.1)",
  toggleText: "#0a0a0a",
  sectionTitle: "rgba(0, 0, 0, 0.4)",
};

const createToggleButtonStyle = (theme: ThemeColors): Record<string, string> => ({
  display: "flex",
  "align-items": "center",
  gap: `${TOGGLE_BUTTON_GAP_PX}px`,
  padding: TOGGLE_BUTTON_PADDING,
  "background-color": theme.toggleBackground,
  border: `1px solid ${theme.toggleBorder}`,
  "border-radius": `${TOGGLE_BUTTON_BORDER_RADIUS_PX}px`,
  color: theme.toggleText,
  "font-size": `${TOGGLE_BUTTON_FONT_SIZE_PX}px`,
  "font-weight": "500",
  cursor: "pointer",
  transition: `all ${TRANSITION_DURATION}`,
});

const createCardContainerStyle = (theme: ThemeColors): Record<string, string> => ({
  display: "flex",
  "flex-direction": "column",
  "background-color": theme.cardBackground,
  "border-radius": `${CARD_BORDER_RADIUS_PX}px`,
  border: `1px solid ${theme.cardBorder}`,
  "box-shadow": theme.cardShadow,
  overflow: "hidden",
  "aspect-ratio": "1",
  transition: `all ${TRANSITION_DURATION}`,
});

const createCardHeaderStyle = (theme: ThemeColors): Record<string, string> => ({
  display: "flex",
  "justify-content": "space-between",
  "align-items": "flex-start",
  padding: CARD_HEADER_PADDING,
  "border-bottom": `1px solid ${theme.cardBorder}`,
});

const createCardContentStyle = (theme: ThemeColors): Record<string, string> => ({
  flex: "1",
  display: "flex",
  "flex-direction": "column",
  "align-items": "center",
  "justify-content": "center",
  padding: `${CARD_CONTENT_PADDING_PX}px`,
  position: "relative",
  "background-color": theme.cardContentBackground,
});

const createTargetStyle = (theme: ThemeColors): Record<string, string> => ({
  width: "100%",
  height: `${TARGET_HEIGHT_PX}px`,
  "background-color": theme.targetBackground,
  border: `1px solid ${theme.targetBorder}`,
  "border-radius": `${TARGET_BORDER_RADIUS_PX}px`,
  display: "flex",
  "align-items": "center",
  "justify-content": "center",
  color: theme.targetText,
  "font-size": `${TARGET_FONT_SIZE_PX}px`,
  "font-family": "Geist Mono, monospace",
});

interface StateCardProps {
  state: DesignSystemState;
  theme: ThemeColors;
  getBounds: () => OverlayBounds | undefined;
  registerCell: (element: HTMLDivElement) => void;
  onRefresh: () => void;
  getTargetDisplayText: () => string;
}

const StateCard = (props: StateCardProps) => {
  const [isCardRefreshing, setIsCardRefreshing] = createSignal(false);

  const handleCardRefresh = (event: MouseEvent) => {
    event.stopPropagation();
    setIsCardRefreshing(true);
    props.onRefresh();
    queueMicrotask(() => setIsCardRefreshing(false));
  };

  return (
    <div style={createCardContainerStyle(props.theme)}>
      <div style={createCardHeaderStyle(props.theme)}>
        <div style={{ display: "flex", "flex-direction": "column", gap: `${CARD_TITLE_GAP_PX}px` }}>
          <span
            style={{
              color: props.theme.titleText,
              "font-size": `${CARD_TITLE_FONT_SIZE_PX}px`,
              "font-weight": "500",
              "line-height": "1.3",
            }}
          >
            {props.state.label}
          </span>
          <span
            style={{
              color: props.theme.descriptionText,
              "font-size": `${CARD_DESCRIPTION_FONT_SIZE_PX}px`,
              "line-height": "1.3",
            }}
          >
            {props.state.description}
          </span>
        </div>
        <button
          onClick={handleCardRefresh}
          style={{
            display: "flex",
            "align-items": "center",
            "justify-content": "center",
            width: `${REFRESH_BUTTON_SIZE_PX}px`,
            height: `${REFRESH_BUTTON_SIZE_PX}px`,
            padding: "0",
            "background-color": "transparent",
            border: `1px solid ${props.theme.cardBorder}`,
            "border-radius": `${REFRESH_BUTTON_BORDER_RADIUS_PX}px`,
            color: props.theme.descriptionText,
            "font-size": `${TOGGLE_BUTTON_FONT_SIZE_PX}px`,
            cursor: "pointer",
            transition: `all ${TRANSITION_DURATION}`,
            "flex-shrink": "0",
          }}
          title="Refresh this card"
        >
          ↻
        </button>
      </div>

      <div style={createCardContentStyle(props.theme)}>
        <Show when={!isCardRefreshing()}>
          <div
            ref={(element) => props.registerCell(element)}
            style={createTargetStyle(props.theme)}
          >
            {props.getTargetDisplayText()}
          </div>

          <Show when={props.state.component === "label"}>
            <SelectionLabel
              tagName={props.state.props.tagName}
              componentName={props.state.props.componentName}
              elementsCount={props.state.props.elementsCount}
              selectionBounds={props.getBounds()}
              mouseX={props.getBounds() ? props.getBounds()!.x + props.getBounds()!.width / 2 : undefined}
              visible={true}
              status={props.state.props.status}
              hasAgent={props.state.props.hasAgent}
              isAgentConnected={props.state.props.isAgentConnected}
              isPromptMode={props.state.props.isPromptMode}
              inputValue={props.state.props.inputValue}
              replyToPrompt={props.state.props.replyToPrompt}
              statusText={props.state.props.statusText}
              isPendingDismiss={props.state.props.isPendingDismiss}
              isPendingAbort={props.state.props.isPendingAbort}
              error={props.state.props.error}
              isContextMenuOpen={props.state.props.isContextMenuOpen}
              supportsUndo={props.state.props.supportsUndo}
              supportsFollowUp={props.state.props.supportsFollowUp}
              filePath={props.state.props.filePath}
              dismissButtonText={props.state.props.dismissButtonText}
              previousPrompt={props.state.props.previousPrompt}
              onOpen={props.state.props.filePath ? () => {} : undefined}
              onInputChange={() => {}}
              onSubmit={() => {}}
              onToggleExpand={() => {}}
              onConfirmDismiss={() => {}}
              onCancelDismiss={() => {}}
              onConfirmAbort={() => {}}
              onCancelAbort={() => {}}
              onAcknowledgeError={props.state.props.hasOnAcknowledge !== false ? () => {} : undefined}
              onRetry={props.state.props.hasOnRetry !== false ? () => {} : undefined}
              onDismiss={props.state.props.hasOnDismiss !== false ? () => {} : undefined}
              onUndo={props.state.props.hasOnUndo !== false ? () => {} : undefined}
              onFollowUpSubmit={() => {}}
              onAbort={() => {}}
              onShowContextMenu={props.state.props.showMoreOptions ? () => {} : undefined}
            />
          </Show>

          <Show when={props.state.component === "context-menu"}>
            <ContextMenu
              position={
                props.getBounds()
                  ? { x: props.getBounds()!.x + props.getBounds()!.width / 2, y: props.getBounds()!.y + props.getBounds()!.height }
                  : null
              }
              selectionBounds={props.getBounds() ?? null}
              tagName={props.state.props.tagName}
              componentName={props.state.props.componentName}
              hasFilePath={props.state.props.hasFilePath ?? false}
              onCopy={() => {}}
              onCopyScreenshot={() => {}}
              onCopyHtml={() => {}}
              onOpen={() => {}}
              onDismiss={() => {}}
              onHide={() => {}}
            />
          </Show>
        </Show>
      </div>
    </div>
  );
};

interface FpsMeterProps {
  theme: ThemeColors;
}

const FpsMeter = (props: FpsMeterProps) => {
  const [fps, setFps] = createSignal(0);
  let frameCount = 0;
  let lastTime = performance.now();
  let animationFrameId: number | undefined;

  const measureFps = () => {
    frameCount++;
    const currentTime = performance.now();
    const elapsed = currentTime - lastTime;

    if (elapsed >= 1000) {
      setFps(Math.round((frameCount * 1000) / elapsed));
      frameCount = 0;
      lastTime = currentTime;
    }

    animationFrameId = requestAnimationFrame(measureFps);
  };

  onMount(() => {
    animationFrameId = requestAnimationFrame(measureFps);
  });

  onCleanup(() => {
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
    }
  });

  return (
    <div
      style={{
        position: "fixed",
        bottom: `${FPS_METER_POSITION_PX}px`,
        right: `${FPS_METER_POSITION_PX}px`,
        padding: FPS_METER_PADDING,
        "background-color": props.theme.cardBackground,
        border: `1px solid ${props.theme.cardBorder}`,
        "border-radius": `${FPS_METER_BORDER_RADIUS_PX}px`,
        "font-family": "Geist Mono, monospace",
        "font-size": `${FPS_METER_FONT_SIZE_PX}px`,
        color: props.theme.titleText,
        "z-index": "9999",
        "backdrop-filter": "blur(8px)",
      }}
    >
      {fps()} FPS
    </div>
  );
};

const DesignSystemGrid = () => {
  const [cellRefs, setCellRefs] = createSignal<Map<string, HTMLDivElement>>(
    new Map(),
  );
  const [boundsVersion, setBoundsVersion] = createSignal(0);
  const [isDarkMode, setIsDarkMode] = createSignal(true);
  const [isRefreshing, setIsRefreshing] = createSignal(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setCellRefs(new Map());
    queueMicrotask(() => setIsRefreshing(false));
  };

  const theme = () => (isDarkMode() ? DARK_THEME : LIGHT_THEME);

  const sectionTitleStyle = () => ({
    display: "block",
    color: theme().sectionTitle,
    "font-size": `${SECTION_TITLE_FONT_SIZE_PX}px`,
    "font-weight": "600",
    "text-transform": "uppercase",
    "letter-spacing": "0.05em",
    "margin-bottom": `${SECTION_TITLE_MARGIN_BOTTOM_PX}px`,
  });

  const gridStyle = () => ({
    display: "grid",
    "grid-template-columns": `repeat(auto-fill, minmax(${CELL_SIZE_PX}px, 1fr))`,
    gap: `${GAP_PX}px`,
  });

  const getTargetDisplayText = (props: DesignSystemState["props"]): string => {
    if (props.elementsCount && props.elementsCount > 1) {
      return `<${props.elementsCount} elements>`;
    }
    return `<${props.componentName || props.tagName || "element"} />`;
  };

  const registerCell = (id: string, element: HTMLDivElement) => {
    setCellRefs((prev) => {
      const next = new Map(prev);
      next.set(id, element);
      return next;
    });
    setBoundsVersion((version) => version + 1);
  };

  const getBoundsForCell = (id: string): OverlayBounds | undefined => {
    boundsVersion();
    const element = cellRefs().get(id);
    if (!element) return undefined;
    const rect = element.getBoundingClientRect();
    return {
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
      borderRadius: `${TARGET_BORDER_RADIUS_PX}px`,
      transform: "",
    };
  };

  let resizeObserver: ResizeObserver | undefined;
  let containerRef: HTMLDivElement | undefined;

  const handleScroll = () => {
    setBoundsVersion((version) => version + 1);
  };

  const setupResizeObserver = (container: HTMLDivElement) => {
    containerRef = container;
    resizeObserver = new ResizeObserver(() => {
      setBoundsVersion((version) => version + 1);
    });
    resizeObserver.observe(container);
    window.addEventListener("scroll", handleScroll, true);
    container.addEventListener("scroll", handleScroll, true);
  };

  onCleanup(() => {
    resizeObserver?.disconnect();
    window.removeEventListener("scroll", handleScroll, true);
    containerRef?.removeEventListener("scroll", handleScroll, true);
  });

  const labelStates = () => DESIGN_SYSTEM_STATES.filter((state) => state.component === "label" && !state.props.hasAgent);
  const agentLabelStates = () => DESIGN_SYSTEM_STATES.filter((state) => state.component === "label" && state.props.hasAgent);
  const contextMenuStates = () => DESIGN_SYSTEM_STATES.filter((state) => state.component === "context-menu");

  const createRefreshHandler = (id: string) => () => {
    setCellRefs((prev) => {
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
  };

  return (
    <div
      ref={setupResizeObserver}
      style={{
        display: "flex",
        "flex-direction": "column",
        "min-height": "100vh",
        "background-color": theme().background,
        "font-family":
          'Geist, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        transition: `background-color ${TRANSITION_DURATION}`,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          "justify-content": "space-between",
          "align-items": "center",
          padding: HEADER_PADDING,
          "border-bottom": `1px solid ${theme().cardBorder}`,
        }}
      >
        <span
          style={{
            color: theme().titleText,
            "font-size": `${HEADER_TITLE_FONT_SIZE_PX}px`,
            "font-weight": "600",
            "letter-spacing": "-0.01em",
          }}
        >
          Design System
        </span>
        <div style={{ display: "flex", "align-items": "center", gap: `${HEADER_BUTTONS_GAP_PX}px` }}>
          <button onClick={handleRefresh} style={createToggleButtonStyle(theme())}>
            ↻ Refresh
          </button>
          <button onClick={() => setIsDarkMode((prev) => !prev)} style={createToggleButtonStyle(theme())}>
            {isDarkMode() ? "Dark" : "Light"}
          </button>
        </div>
      </div>

      <Show when={!isRefreshing()}>
        {/* Selection Label Section */}
        <div style={{ padding: `${GAP_PX}px 24px` }}>
          <span style={sectionTitleStyle()}>Selection Label</span>
          <div style={gridStyle()}>
            <For each={labelStates()}>
              {(state) => (
                <StateCard
                  state={state}
                  theme={theme()}
                  getBounds={() => getBoundsForCell(state.id)}
                  registerCell={(element) => registerCell(state.id, element)}
                  onRefresh={createRefreshHandler(state.id)}
                  getTargetDisplayText={() => getTargetDisplayText(state.props)}
                />
              )}
            </For>
          </div>
        </div>

        {/* Agent States Section */}
        <div style={{ padding: `${GAP_PX}px 24px` }}>
          <span style={sectionTitleStyle()}>Agent States</span>
          <div style={gridStyle()}>
            <For each={agentLabelStates()}>
              {(state) => (
                <StateCard
                  state={state}
                  theme={theme()}
                  getBounds={() => getBoundsForCell(state.id)}
                  registerCell={(element) => registerCell(state.id, element)}
                  onRefresh={createRefreshHandler(state.id)}
                  getTargetDisplayText={() => getTargetDisplayText(state.props)}
                />
              )}
            </For>
          </div>
        </div>

        {/* Context Menu Section */}
        <div style={{ padding: `${GAP_PX}px 24px 24px` }}>
          <span style={sectionTitleStyle()}>Context Menu (Right-Click)</span>
          <div style={gridStyle()}>
            <For each={contextMenuStates()}>
              {(state) => (
                <StateCard
                  state={state}
                  theme={theme()}
                  getBounds={() => getBoundsForCell(state.id)}
                  registerCell={(element) => registerCell(state.id, element)}
                  onRefresh={createRefreshHandler(state.id)}
                  getTargetDisplayText={() => getTargetDisplayText(state.props)}
                />
              )}
            </For>
          </div>
        </div>
      </Show>

      {/* FPS Meter */}
      <FpsMeter theme={theme()} />
    </div>
  );
};

export interface DesignSystemPreviewOptions {
  onDispose?: () => void;
}

export const renderDesignSystemPreview = (
  container: HTMLElement,
  options?: DesignSystemPreviewOptions,
): (() => void) => {
  const shadowHost = document.createElement("div");
  shadowHost.setAttribute("data-react-grab-design-system", "true");
  shadowHost.style.position = "relative";
  shadowHost.style.width = "100%";
  shadowHost.style.minHeight = "100vh";

  const shadowRoot = shadowHost.attachShadow({ mode: "open" });

  if (cssText) {
    const styleElement = document.createElement("style");
    styleElement.textContent = cssText as string;
    shadowRoot.appendChild(styleElement);
  }

  const fontLink = document.createElement("link");
  fontLink.rel = "stylesheet";
  fontLink.href =
    "https://fonts.googleapis.com/css2?family=Geist+Mono:wght@500&family=Geist:wght@500&display=swap";
  shadowRoot.appendChild(fontLink);

  const renderRoot = document.createElement("div");
  renderRoot.style.width = "100%";
  shadowRoot.appendChild(renderRoot);

  container.appendChild(shadowHost);

  const dispose = render(() => <DesignSystemGrid />, renderRoot);

  return () => {
    dispose();
    container.removeChild(shadowHost);
    options?.onDispose?.();
  };
};
