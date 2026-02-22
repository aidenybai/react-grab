// @ts-expect-error - CSS imported as text via tsup loader
import cssText from "react-grab/dist/styles.css";
import { render } from "solid-js/web";
import { createSignal, For, onCleanup, onMount, Show } from "solid-js";
import { SelectionLabel } from "react-grab/src/components/selection-label/index.js";
import { ContextMenu } from "react-grab/src/components/context-menu.js";
import { ToolbarContent } from "react-grab/src/components/toolbar/toolbar-content.js";
import { HistoryDropdown } from "react-grab/src/components/history-dropdown.js";
import { IconClock } from "react-grab/src/components/icons/icon-clock.js";
import type {
  OverlayBounds,
  SelectionLabelStatus,
  HistoryItem,
} from "react-grab/src/types.js";

type ComponentType = "label" | "context-menu" | "toolbar" | "history-dropdown";

interface DesignSystemStateProps {
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
  isToolbarActive?: boolean;
  isToolbarEnabled?: boolean;
  isToolbarCollapsed?: boolean;
  toolbarSnapEdge?: "top" | "bottom" | "left" | "right";
  toolbarHistoryItemCount?: number;
  toolbarHasUnreadHistoryItems?: boolean;
  historyItems?: HistoryItem[];
}

interface AnimationFrame {
  props: DesignSystemStateProps;
  durationMs: number;
}

interface DesignSystemState {
  id: string;
  label: string;
  description: string;
  component: ComponentType;
  props: DesignSystemStateProps;
  animationSequence?: AnimationFrame[];
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
    id: "idle-long-component-name",
    label: "Idle (Long Component)",
    description: "Very long component name truncation",
    component: "label",
    props: {
      tagName: "div",
      componentName: "SuperLongComponentNameThatShouldDefinitelyTruncate",
      status: "idle",
      hasAgent: false,
    },
  },
  {
    id: "idle-long-tag-name",
    label: "Idle (Long Tag)",
    description: "Long custom element tag name",
    component: "label",
    props: {
      tagName: "my-super-long-custom-web-component-element",
      status: "idle",
      hasAgent: false,
    },
  },
  {
    id: "idle-long-filepath",
    label: "Idle (Long File Path)",
    description: "Deeply nested file path truncation",
    component: "label",
    props: {
      tagName: "div",
      componentName: "Button",
      status: "idle",
      hasAgent: false,
      filePath:
        "src/components/ui/forms/inputs/buttons/primary/PrimaryButton.tsx",
    },
  },
  {
    id: "idle-large-element-count",
    label: "Idle (Large Count)",
    description: "Many elements selected (99)",
    component: "label",
    props: {
      tagName: "div",
      elementsCount: 99,
      status: "idle",
      hasAgent: false,
    },
  },
  {
    id: "idle-long-both",
    label: "Idle (Long Tag + Component)",
    description: "Both tag and component name long",
    component: "label",
    props: {
      tagName: "custom-interactive-element",
      componentName: "InteractiveCustomElementWrapper",
      status: "idle",
      hasAgent: false,
      filePath: "src/wrappers/InteractiveCustomElementWrapper.tsx",
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
      inputValue:
        "make the button bigger and change the background color to a nice gradient from blue to purple",
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
      replyToPrompt:
        "make the button larger and add a hover effect with a nice shadow underneath it",
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
  {
    id: "copying-long-input",
    label: "Copying (Long Input)",
    description: "Long prompt during copying",
    component: "label",
    props: {
      tagName: "div",
      componentName: "Modal",
      status: "copying",
      hasAgent: true,
      isAgentConnected: true,
      inputValue:
        "add a close button in the top right corner with an X icon and make it dismiss the modal when clicked",
      statusText: "Thinking…",
    },
  },
  {
    id: "copying-long-component",
    label: "Copying (Long Component)",
    description: "Long component name while copying",
    component: "label",
    props: {
      tagName: "div",
      componentName: "InteractiveDataVisualizationChart",
      status: "copying",
      hasAgent: true,
      isAgentConnected: true,
      inputValue: "add tooltips",
      statusText: "Applying…",
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
      hasOnDismiss: false,
      hasOnUndo: false,
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

  // === AGENT EDGE CASES ===
  {
    id: "agent-long-component",
    label: "Agent (Long Component)",
    description: "Long component name with prompt",
    component: "label",
    props: {
      tagName: "div",
      componentName: "VeryLongComponentNameThatShouldTruncateInTheUI",
      status: "idle",
      hasAgent: true,
      isAgentConnected: true,
      isPromptMode: true,
      inputValue: "",
    },
  },
  {
    id: "agent-long-status",
    label: "Agent (Long Status)",
    description: "Very long status text during operation",
    component: "label",
    props: {
      tagName: "form",
      componentName: "SearchForm",
      status: "copying",
      hasAgent: true,
      isAgentConnected: true,
      inputValue: "add validation",
      statusText: "Analyzing component structure and dependencies…",
    },
  },
  {
    id: "agent-long-previous",
    label: "Agent (Long Previous Prompt)",
    description: "Very long previous prompt truncation",
    component: "label",
    props: {
      tagName: "div",
      componentName: "Card",
      status: "idle",
      hasAgent: true,
      isAgentConnected: true,
      isPromptMode: true,
      inputValue: "and also fix the spacing",
      replyToPrompt:
        "make the card have rounded corners with a subtle shadow and increase the padding on all sides to make it feel more spacious",
    },
  },
  {
    id: "agent-copied-long-status",
    label: "Agent Copied (Long Status)",
    description: "Long completion status message",
    component: "label",
    props: {
      tagName: "section",
      componentName: "HeroSection",
      status: "copied",
      hasAgent: true,
      isAgentConnected: true,
      statusText: "Successfully applied 5 changes across 3 files",
      supportsUndo: true,
      supportsFollowUp: true,
    },
  },
  {
    id: "agent-copied-long-placeholder",
    label: "Agent Copied (Long Placeholder)",
    description: "Long previous prompt as placeholder",
    component: "label",
    props: {
      tagName: "nav",
      componentName: "Navbar",
      status: "copied",
      hasAgent: true,
      isAgentConnected: true,
      statusText: "Done",
      supportsUndo: true,
      supportsFollowUp: true,
      previousPrompt:
        "make the navbar sticky with a blur background effect and add smooth scroll behavior",
    },
  },
  {
    id: "agent-all-features",
    label: "Agent (All Features)",
    description: "Undo + Follow-up + More options",
    component: "label",
    props: {
      tagName: "div",
      componentName: "Dashboard",
      status: "copied",
      hasAgent: true,
      isAgentConnected: true,
      statusText: "Applied changes",
      supportsUndo: true,
      supportsFollowUp: true,
      showMoreOptions: true,
      previousPrompt: "add dark mode",
    },
  },
  {
    id: "agent-single-char-component",
    label: "Agent (Single Char)",
    description: "Single character component name",
    component: "label",
    props: {
      tagName: "i",
      componentName: "I",
      status: "idle",
      hasAgent: true,
      isAgentConnected: true,
      isPromptMode: true,
      inputValue: "",
    },
  },
  {
    id: "agent-numeric-component",
    label: "Agent (Numeric Name)",
    description: "Component name with numbers",
    component: "label",
    props: {
      tagName: "div",
      componentName: "Card2024V2",
      status: "idle",
      hasAgent: true,
      isAgentConnected: true,
      isPromptMode: true,
      inputValue: "update the styles",
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
      error:
        "The server returned an unexpected error response. Please check your network connection and try again later.",
    },
  },
  {
    id: "error-long-component",
    label: "Error (Long Component)",
    description: "Error with long component name",
    component: "label",
    props: {
      tagName: "div",
      componentName: "VeryLongComponentNameThatMightOverflow",
      status: "error",
      error: "Component not found",
    },
  },
  {
    id: "error-no-buttons",
    label: "Error (No Buttons)",
    description: "Error with no action buttons",
    component: "label",
    props: {
      tagName: "span",
      componentName: "Text",
      status: "error",
      error: "Unknown error occurred",
      hasOnRetry: false,
      hasOnAcknowledge: false,
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
  {
    id: "context-menu-long-component",
    label: "Context Menu (Long Name)",
    description: "Long component name in header",
    component: "context-menu",
    props: {
      tagName: "div",
      componentName: "SuperLongComponentNameThatNeedsTruncation",
      hasFilePath: true,
      filePath: "src/components/SuperLongComponentNameThatNeedsTruncation.tsx",
    },
  },
  {
    id: "context-menu-long-tag",
    label: "Context Menu (Long Tag)",
    description: "Long custom element tag",
    component: "context-menu",
    props: {
      tagName: "my-custom-interactive-web-component",
      hasFilePath: false,
    },
  },

  // ══════════════════════════════════════════════════════════════════════════
  // TOOLBAR STATES
  // ══════════════════════════════════════════════════════════════════════════
  {
    id: "toolbar-default",
    label: "Toolbar (Default)",
    description: "Inactive, enabled state",
    component: "toolbar",
    props: {
      isToolbarActive: false,
      isToolbarEnabled: true,
    },
  },
  {
    id: "toolbar-active",
    label: "Toolbar (Active)",
    description: "Selection mode active",
    component: "toolbar",
    props: {
      isToolbarActive: true,
      isToolbarEnabled: true,
      toolbarHistoryItemCount: 3,
    },
  },
  {
    id: "toolbar-disabled",
    label: "Toolbar (Disabled)",
    description: "Toggle switch off",
    component: "toolbar",
    props: {
      isToolbarActive: false,
      isToolbarEnabled: false,
    },
  },
  {
    id: "toolbar-active-disabled",
    label: "Toolbar (Active + Disabled)",
    description: "Active but toggle off",
    component: "toolbar",
    props: {
      isToolbarActive: true,
      isToolbarEnabled: false,
    },
  },
  {
    id: "toolbar-collapsed-bottom",
    label: "Toolbar (Collapsed Bottom)",
    description: "Minimized, snapped to bottom edge",
    component: "toolbar",
    props: {
      isToolbarActive: false,
      isToolbarEnabled: true,
      isToolbarCollapsed: true,
      toolbarSnapEdge: "bottom",
    },
  },
  {
    id: "toolbar-collapsed-top",
    label: "Toolbar (Collapsed Top)",
    description: "Minimized, snapped to top edge",
    component: "toolbar",
    props: {
      isToolbarActive: false,
      isToolbarEnabled: true,
      isToolbarCollapsed: true,
      toolbarSnapEdge: "top",
    },
  },
  {
    id: "toolbar-collapsed-left",
    label: "Toolbar (Collapsed Left)",
    description: "Minimized, snapped to left edge",
    component: "toolbar",
    props: {
      isToolbarActive: false,
      isToolbarEnabled: true,
      isToolbarCollapsed: true,
      toolbarSnapEdge: "left",
    },
  },
  {
    id: "toolbar-collapsed-right",
    label: "Toolbar (Collapsed Right)",
    description: "Minimized, snapped to right edge",
    component: "toolbar",
    props: {
      isToolbarActive: false,
      isToolbarEnabled: true,
      isToolbarCollapsed: true,
      toolbarSnapEdge: "right",
    },
  },
  {
    id: "toolbar-history-read",
    label: "Toolbar (History Read)",
    description: "Inbox icon, no unread items",
    component: "toolbar",
    props: {
      isToolbarActive: true,
      isToolbarEnabled: true,
      toolbarHistoryItemCount: 5,
      toolbarHasUnreadHistoryItems: false,
    },
  },
  {
    id: "toolbar-history-unread",
    label: "Toolbar (History Unread)",
    description: "Inbox icon with unread indicator",
    component: "toolbar",
    props: {
      isToolbarActive: true,
      isToolbarEnabled: true,
      toolbarHistoryItemCount: 3,
      toolbarHasUnreadHistoryItems: true,
    },
  },

  // ══════════════════════════════════════════════════════════════════════════
  // HISTORY DROPDOWN STATES
  // ══════════════════════════════════════════════════════════════════════════
  {
    id: "history-empty",
    label: "History (Empty)",
    description: "No copied elements yet",
    component: "history-dropdown",
    props: {
      historyItems: [],
    },
  },
  {
    id: "history-single-item",
    label: "History (Single Item)",
    description: "One copied element",
    component: "history-dropdown",
    props: {
      historyItems: [
        {
          id: "history-1",
          content: "<Button />",
          elementName: "Button",
          tagName: "button",
          componentName: "Button",
          isComment: false,
          timestamp: Date.now() - 30_000,
        },
      ],
    },
  },
  {
    id: "history-multiple-items",
    label: "History (Multiple Items)",
    description: "Several copied elements",
    component: "history-dropdown",
    props: {
      historyItems: [
        {
          id: "history-1",
          content: "<Header />",
          elementName: "Header",
          tagName: "header",
          componentName: "Header",
          isComment: false,
          timestamp: Date.now() - 15_000,
        },
        {
          id: "history-2",
          content: "<Navigation />",
          elementName: "Navigation",
          tagName: "nav",
          componentName: "Navigation",
          isComment: false,
          timestamp: Date.now() - 120_000,
        },
        {
          id: "history-3",
          content: "<Footer />",
          elementName: "Footer",
          tagName: "footer",
          componentName: "Footer",
          isComment: false,
          timestamp: Date.now() - 3_600_000,
        },
      ],
    },
  },
  {
    id: "history-with-comments",
    label: "History (With Comments)",
    description: "Items with comment annotations",
    component: "history-dropdown",
    props: {
      historyItems: [
        {
          id: "history-1",
          content: "<Card />",
          elementName: "Card",
          tagName: "div",
          componentName: "Card",
          isComment: true,
          commentText: "make it bigger",
          timestamp: Date.now() - 10_000,
        },
        {
          id: "history-2",
          content: "<Sidebar />",
          elementName: "Sidebar",
          tagName: "aside",
          componentName: "Sidebar",
          isComment: true,
          commentText: "add dark mode support",
          timestamp: Date.now() - 300_000,
        },
        {
          id: "history-3",
          content: "<Button />",
          elementName: "Button",
          tagName: "button",
          componentName: "Button",
          isComment: false,
          timestamp: Date.now() - 7_200_000,
        },
      ],
    },
  },
  {
    id: "history-tag-only",
    label: "History (Tag Only)",
    description: "Items without component names",
    component: "history-dropdown",
    props: {
      historyItems: [
        {
          id: "history-1",
          content: "<section />",
          elementName: "section",
          tagName: "section",
          isComment: false,
          timestamp: Date.now() - 60_000,
        },
        {
          id: "history-2",
          content: "<div />",
          elementName: "div",
          tagName: "div",
          isComment: false,
          timestamp: Date.now() - 180_000,
        },
      ],
    },
  },
  {
    id: "history-long-names",
    label: "History (Long Names)",
    description: "Long component names truncation",
    component: "history-dropdown",
    props: {
      historyItems: [
        {
          id: "history-1",
          content: "<InteractiveDataVisualizationChart />",
          elementName: "InteractiveDataVisualizationChart",
          tagName: "div",
          componentName: "InteractiveDataVisualizationChart",
          isComment: true,
          commentText: "add tooltips on hover with data values and percentage",
          timestamp: Date.now() - 5_000,
        },
        {
          id: "history-2",
          content: "<SuperLongComponentNameWrapper />",
          elementName: "SuperLongComponentNameWrapper",
          tagName: "custom-interactive-element",
          componentName: "SuperLongComponentNameWrapper",
          isComment: false,
          timestamp: Date.now() - 86_400_000,
        },
      ],
    },
  },
  {
    id: "history-many-items",
    label: "History (Many Items)",
    description: "Scrollable list with many items",
    component: "history-dropdown",
    props: {
      historyItems: [
        {
          id: "history-1",
          content: "<Header />",
          elementName: "Header",
          tagName: "header",
          componentName: "Header",
          isComment: false,
          timestamp: Date.now() - 10_000,
        },
        {
          id: "history-2",
          content: "<Navigation />",
          elementName: "Navigation",
          tagName: "nav",
          componentName: "Navigation",
          isComment: true,
          commentText: "make it sticky",
          timestamp: Date.now() - 60_000,
        },
        {
          id: "history-3",
          content: "<Card />",
          elementName: "Card",
          tagName: "div",
          componentName: "Card",
          isComment: false,
          timestamp: Date.now() - 300_000,
        },
        {
          id: "history-4",
          content: "<Button />",
          elementName: "Button",
          tagName: "button",
          componentName: "Button",
          isComment: true,
          commentText: "increase padding",
          timestamp: Date.now() - 600_000,
        },
        {
          id: "history-5",
          content: "<Footer />",
          elementName: "Footer",
          tagName: "footer",
          componentName: "Footer",
          isComment: false,
          timestamp: Date.now() - 1_800_000,
        },
        {
          id: "history-6",
          content: "<Sidebar />",
          elementName: "Sidebar",
          tagName: "aside",
          componentName: "Sidebar",
          isComment: false,
          timestamp: Date.now() - 3_600_000,
        },
        {
          id: "history-7",
          content: "<Modal />",
          elementName: "Modal",
          tagName: "dialog",
          componentName: "Modal",
          isComment: true,
          commentText: "add animation",
          timestamp: Date.now() - 7_200_000,
        },
        {
          id: "history-8",
          content: "<Form />",
          elementName: "Form",
          tagName: "form",
          componentName: "Form",
          isComment: false,
          timestamp: Date.now() - 43_200_000,
        },
      ],
    },
  },

  // ══════════════════════════════════════════════════════════════════════════
  // ANIMATION SEQUENCES
  // ══════════════════════════════════════════════════════════════════════════
  {
    id: "anim-copy-flow",
    label: "Copy Flow",
    description: "idle → copying → ✓ copied",
    component: "label",
    props: {
      tagName: "button",
      componentName: "Button",
      status: "idle",
      hasAgent: false,
    },
    animationSequence: [
      {
        props: {
          tagName: "button",
          componentName: "Button",
          status: "idle",
          hasAgent: false,
        },
        durationMs: 1500,
      },
      {
        props: {
          tagName: "button",
          componentName: "Button",
          status: "copying",
          hasAgent: false,
          statusText: "Grabbing…",
        },
        durationMs: 2000,
      },
      {
        props: {
          tagName: "button",
          componentName: "Button",
          status: "copied",
          hasAgent: false,
          hasOnDismiss: false,
          hasOnUndo: false,
          showMoreOptions: true,
        },
        durationMs: 2000,
      },
    ],
  },
  {
    id: "anim-agent-flow",
    label: "Agent Flow",
    description: "prompt → thinking → done",
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
    animationSequence: [
      {
        props: {
          tagName: "div",
          componentName: "Card",
          status: "idle",
          hasAgent: true,
          isAgentConnected: true,
          isPromptMode: true,
          inputValue: "",
        },
        durationMs: 1000,
      },
      {
        props: {
          tagName: "div",
          componentName: "Card",
          status: "idle",
          hasAgent: true,
          isAgentConnected: true,
          isPromptMode: true,
          inputValue: "make it",
        },
        durationMs: 400,
      },
      {
        props: {
          tagName: "div",
          componentName: "Card",
          status: "idle",
          hasAgent: true,
          isAgentConnected: true,
          isPromptMode: true,
          inputValue: "make it bigger",
        },
        durationMs: 800,
      },
      {
        props: {
          tagName: "div",
          componentName: "Card",
          status: "copying",
          hasAgent: true,
          isAgentConnected: true,
          inputValue: "make it bigger",
          statusText: "Thinking…",
        },
        durationMs: 1500,
      },
      {
        props: {
          tagName: "div",
          componentName: "Card",
          status: "copying",
          hasAgent: true,
          isAgentConnected: true,
          inputValue: "make it bigger",
          statusText: "Applying changes…",
        },
        durationMs: 1500,
      },
      {
        props: {
          tagName: "div",
          componentName: "Card",
          status: "copied",
          hasAgent: true,
          isAgentConnected: true,
          statusText: "Applied changes",
          supportsUndo: true,
          supportsFollowUp: true,
          showMoreOptions: true,
        },
        durationMs: 2500,
      },
    ],
  },
  {
    id: "anim-error-flow",
    label: "Error Flow",
    description: "idle → copying → error",
    component: "label",
    props: {
      tagName: "form",
      componentName: "Form",
      status: "idle",
      hasAgent: false,
    },
    animationSequence: [
      {
        props: {
          tagName: "form",
          componentName: "Form",
          status: "idle",
          hasAgent: false,
        },
        durationMs: 1500,
      },
      {
        props: {
          tagName: "form",
          componentName: "Form",
          status: "copying",
          hasAgent: false,
          statusText: "Grabbing…",
        },
        durationMs: 2000,
      },
      {
        props: {
          tagName: "form",
          componentName: "Form",
          status: "error",
          error: "Failed to copy element",
          hasOnRetry: true,
          hasOnAcknowledge: true,
        },
        durationMs: 2500,
      },
    ],
  },
  {
    id: "anim-discard-flow",
    label: "Discard Prompt",
    description: "prompt → pending dismiss → cancelled",
    component: "label",
    props: {
      tagName: "header",
      componentName: "Header",
      status: "idle",
      hasAgent: true,
      isAgentConnected: true,
      isPromptMode: true,
      inputValue: "change color",
    },
    animationSequence: [
      {
        props: {
          tagName: "header",
          componentName: "Header",
          status: "idle",
          hasAgent: true,
          isAgentConnected: true,
          isPromptMode: true,
          inputValue: "change color",
        },
        durationMs: 1500,
      },
      {
        props: {
          tagName: "header",
          componentName: "Header",
          status: "idle",
          hasAgent: true,
          isPromptMode: true,
          isPendingDismiss: true,
        },
        durationMs: 2000,
      },
      {
        props: {
          tagName: "header",
          componentName: "Header",
          status: "idle",
          hasAgent: true,
          isAgentConnected: true,
          isPromptMode: true,
          inputValue: "change color",
        },
        durationMs: 1500,
      },
    ],
  },
  {
    id: "anim-abort-flow",
    label: "Abort Operation",
    description: "copying → pending abort → idle",
    component: "label",
    props: {
      tagName: "section",
      componentName: "Section",
      status: "copying",
      hasAgent: true,
      isAgentConnected: true,
      inputValue: "add animation",
      statusText: "Thinking…",
    },
    animationSequence: [
      {
        props: {
          tagName: "section",
          componentName: "Section",
          status: "copying",
          hasAgent: true,
          isAgentConnected: true,
          inputValue: "add animation",
          statusText: "Thinking…",
        },
        durationMs: 1500,
      },
      {
        props: {
          tagName: "section",
          componentName: "Section",
          status: "copying",
          hasAgent: true,
          isPendingAbort: true,
        },
        durationMs: 2000,
      },
      {
        props: {
          tagName: "section",
          componentName: "Section",
          status: "idle",
          hasAgent: true,
          isAgentConnected: true,
          isPromptMode: true,
          inputValue: "",
        },
        durationMs: 1500,
      },
    ],
  },
  {
    id: "anim-toolbar-toggle",
    label: "Toolbar Toggle",
    description: "inactive → active → inactive",
    component: "toolbar",
    props: {
      isToolbarActive: false,
      isToolbarEnabled: true,
    },
    animationSequence: [
      {
        props: { isToolbarActive: false, isToolbarEnabled: true },
        durationMs: 1500,
      },
      {
        props: { isToolbarActive: true, isToolbarEnabled: true },
        durationMs: 2000,
      },
      {
        props: { isToolbarActive: false, isToolbarEnabled: true },
        durationMs: 1500,
      },
    ],
  },
  {
    id: "anim-toolbar-enable",
    label: "Toolbar Enable",
    description: "disabled → enabled → disabled",
    component: "toolbar",
    props: {
      isToolbarActive: false,
      isToolbarEnabled: false,
    },
    animationSequence: [
      {
        props: { isToolbarActive: false, isToolbarEnabled: false },
        durationMs: 1500,
      },
      {
        props: { isToolbarActive: false, isToolbarEnabled: true },
        durationMs: 2000,
      },
      {
        props: { isToolbarActive: false, isToolbarEnabled: false },
        durationMs: 1500,
      },
    ],
  },
  {
    id: "anim-followup-flow",
    label: "Follow-up",
    description: "copied → follow-up → new result",
    component: "label",
    props: {
      tagName: "nav",
      componentName: "Navbar",
      status: "copied",
      hasAgent: true,
      isAgentConnected: true,
      statusText: "Done",
      supportsUndo: true,
      supportsFollowUp: true,
      showMoreOptions: true,
    },
    animationSequence: [
      {
        props: {
          tagName: "nav",
          componentName: "Navbar",
          status: "copied",
          hasAgent: true,
          isAgentConnected: true,
          statusText: "Done",
          supportsUndo: true,
          supportsFollowUp: true,
          showMoreOptions: true,
        },
        durationMs: 2000,
      },
      {
        props: {
          tagName: "nav",
          componentName: "Navbar",
          status: "copying",
          hasAgent: true,
          isAgentConnected: true,
          inputValue: "also make it sticky",
          statusText: "Thinking…",
        },
        durationMs: 2000,
      },
      {
        props: {
          tagName: "nav",
          componentName: "Navbar",
          status: "copied",
          hasAgent: true,
          isAgentConnected: true,
          statusText: "Applied 2 changes",
          supportsUndo: true,
          supportsFollowUp: true,
          showMoreOptions: true,
        },
        durationMs: 2000,
      },
    ],
  },
  {
    id: "anim-undo-flow",
    label: "Undo Flow",
    description: "copied → undo → idle",
    component: "label",
    props: {
      tagName: "div",
      componentName: "Modal",
      status: "copied",
      hasAgent: true,
      isAgentConnected: true,
      statusText: "Applied changes",
      supportsUndo: true,
      showMoreOptions: true,
    },
    animationSequence: [
      {
        props: {
          tagName: "div",
          componentName: "Modal",
          status: "copied",
          hasAgent: true,
          isAgentConnected: true,
          statusText: "Applied changes",
          supportsUndo: true,
          supportsFollowUp: true,
          showMoreOptions: true,
        },
        durationMs: 2000,
      },
      {
        props: {
          tagName: "div",
          componentName: "Modal",
          status: "idle",
          hasAgent: true,
          isAgentConnected: true,
          isPromptMode: true,
          inputValue: "",
        },
        durationMs: 2000,
      },
    ],
  },
  {
    id: "anim-retry-flow",
    label: "Retry After Error",
    description: "error → retry → ✓ copied",
    component: "label",
    props: {
      tagName: "table",
      componentName: "DataTable",
      status: "error",
      error: "Connection timeout",
      hasOnRetry: true,
      hasOnAcknowledge: true,
    },
    animationSequence: [
      {
        props: {
          tagName: "table",
          componentName: "DataTable",
          status: "error",
          error: "Connection timeout",
          hasOnRetry: true,
          hasOnAcknowledge: true,
        },
        durationMs: 2000,
      },
      {
        props: {
          tagName: "table",
          componentName: "DataTable",
          status: "copying",
          statusText: "Retrying…",
        },
        durationMs: 1500,
      },
      {
        props: {
          tagName: "table",
          componentName: "DataTable",
          status: "copied",
          hasOnDismiss: false,
          hasOnUndo: false,
          showMoreOptions: true,
        },
        durationMs: 2000,
      },
    ],
  },
  {
    id: "anim-agent-error-flow",
    label: "Agent Error",
    description: "prompt → thinking → error",
    component: "label",
    props: {
      tagName: "aside",
      componentName: "Sidebar",
      status: "idle",
      hasAgent: true,
      isAgentConnected: true,
      isPromptMode: true,
      inputValue: "",
    },
    animationSequence: [
      {
        props: {
          tagName: "aside",
          componentName: "Sidebar",
          status: "idle",
          hasAgent: true,
          isAgentConnected: true,
          isPromptMode: true,
          inputValue: "",
        },
        durationMs: 1000,
      },
      {
        props: {
          tagName: "aside",
          componentName: "Sidebar",
          status: "idle",
          hasAgent: true,
          isAgentConnected: true,
          isPromptMode: true,
          inputValue: "make it collapsible",
        },
        durationMs: 800,
      },
      {
        props: {
          tagName: "aside",
          componentName: "Sidebar",
          status: "copying",
          hasAgent: true,
          isAgentConnected: true,
          statusText: "Thinking…",
        },
        durationMs: 2000,
      },
      {
        props: {
          tagName: "aside",
          componentName: "Sidebar",
          status: "error",
          hasAgent: true,
          error: "Agent failed to respond",
          hasOnRetry: true,
          hasOnAcknowledge: true,
        },
        durationMs: 2500,
      },
    ],
  },
  {
    id: "anim-acknowledge-error",
    label: "Acknowledge Error",
    description: "error → ok → dismissed",
    component: "label",
    props: {
      tagName: "ul",
      componentName: "List",
      status: "error",
      error: "Element not found",
      hasOnRetry: true,
      hasOnAcknowledge: true,
    },
    animationSequence: [
      {
        props: {
          tagName: "ul",
          componentName: "List",
          status: "error",
          error: "Element not found",
          hasOnRetry: true,
          hasOnAcknowledge: true,
        },
        durationMs: 2500,
      },
      {
        props: { tagName: "ul", componentName: "List", status: "idle" },
        durationMs: 2000,
      },
    ],
  },
  {
    id: "anim-connect-agent",
    label: "Agent Connect",
    description: "disconnected → connected → prompt",
    component: "label",
    props: {
      tagName: "footer",
      componentName: "Footer",
      status: "idle",
      hasAgent: true,
      isAgentConnected: false,
    },
    animationSequence: [
      {
        props: {
          tagName: "footer",
          componentName: "Footer",
          status: "idle",
          hasAgent: true,
          isAgentConnected: false,
        },
        durationMs: 2000,
      },
      {
        props: {
          tagName: "footer",
          componentName: "Footer",
          status: "idle",
          hasAgent: true,
          isAgentConnected: true,
          isPromptMode: true,
          inputValue: "",
        },
        durationMs: 2500,
      },
    ],
  },
  {
    id: "anim-context-menu-flow",
    label: "Context Menu",
    description: "context menu options",
    component: "context-menu",
    props: {
      tagName: "article",
      componentName: "BlogPost",
      hasFilePath: false,
    },
    animationSequence: [
      {
        props: {
          tagName: "article",
          componentName: "BlogPost",
          hasFilePath: false,
        },
        durationMs: 2000,
      },
      {
        props: {
          tagName: "article",
          componentName: "BlogPost",
          hasFilePath: true,
          filePath: "src/components/BlogPost.tsx",
        },
        durationMs: 2500,
      },
      {
        props: {
          tagName: "article",
          componentName: "BlogPost",
          hasFilePath: false,
        },
        durationMs: 2000,
      },
    ],
  },
  {
    id: "anim-toolbar-collapse-bottom",
    label: "Toolbar Collapse (Bottom)",
    description: "expanded → collapsed → expanded",
    component: "toolbar",
    props: {
      isToolbarActive: true,
      isToolbarEnabled: true,
      isToolbarCollapsed: false,
      toolbarSnapEdge: "bottom",
    },
    animationSequence: [
      {
        props: {
          isToolbarActive: true,
          isToolbarEnabled: true,
          isToolbarCollapsed: false,
          toolbarSnapEdge: "bottom",
        },
        durationMs: 2000,
      },
      {
        props: {
          isToolbarActive: true,
          isToolbarEnabled: true,
          isToolbarCollapsed: true,
          toolbarSnapEdge: "bottom",
        },
        durationMs: 2000,
      },
      {
        props: {
          isToolbarActive: true,
          isToolbarEnabled: true,
          isToolbarCollapsed: false,
          toolbarSnapEdge: "bottom",
        },
        durationMs: 2000,
      },
    ],
  },
  {
    id: "anim-toolbar-collapse-right",
    label: "Toolbar Collapse (Right)",
    description: "expanded → collapsed → expanded",
    component: "toolbar",
    props: {
      isToolbarActive: true,
      isToolbarEnabled: true,
      isToolbarCollapsed: false,
      toolbarSnapEdge: "right",
    },
    animationSequence: [
      {
        props: {
          isToolbarActive: true,
          isToolbarEnabled: true,
          isToolbarCollapsed: false,
          toolbarSnapEdge: "right",
        },
        durationMs: 2000,
      },
      {
        props: {
          isToolbarActive: true,
          isToolbarEnabled: true,
          isToolbarCollapsed: true,
          toolbarSnapEdge: "right",
        },
        durationMs: 2000,
      },
      {
        props: {
          isToolbarActive: true,
          isToolbarEnabled: true,
          isToolbarCollapsed: false,
          toolbarSnapEdge: "right",
        },
        durationMs: 2000,
      },
    ],
  },
  {
    id: "anim-copy-with-file",
    label: "Copy with File Path",
    description: "idle → copying → ✓ copied",
    component: "label",
    props: {
      tagName: "span",
      componentName: "Badge",
      status: "idle",
      filePath: "src/components/Badge.tsx",
    },
    animationSequence: [
      {
        props: {
          tagName: "span",
          componentName: "Badge",
          status: "idle",
          filePath: "src/components/Badge.tsx",
        },
        durationMs: 1500,
      },
      {
        props: {
          tagName: "span",
          componentName: "Badge",
          status: "copying",
          filePath: "src/components/Badge.tsx",
          statusText: "Grabbing…",
        },
        durationMs: 2000,
      },
      {
        props: {
          tagName: "span",
          componentName: "Badge",
          status: "copied",
          filePath: "src/components/Badge.tsx",
          hasOnDismiss: false,
          hasOnUndo: false,
          showMoreOptions: true,
        },
        durationMs: 2000,
      },
    ],
  },
  {
    id: "anim-multiple-elements",
    label: "Multiple Elements",
    description: "1 → 5 selected → copying → ✓ copied",
    component: "label",
    props: {
      tagName: "li",
      componentName: "ListItem",
      status: "idle",
      elementsCount: 1,
    },
    animationSequence: [
      {
        props: {
          tagName: "li",
          componentName: "ListItem",
          status: "idle",
          elementsCount: 1,
        },
        durationMs: 2000,
      },
      {
        props: {
          tagName: "li",
          componentName: "ListItem",
          status: "idle",
          elementsCount: 5,
        },
        durationMs: 2000,
      },
      {
        props: {
          tagName: "li",
          componentName: "ListItem",
          status: "copying",
          elementsCount: 5,
          statusText: "Grabbing 5…",
        },
        durationMs: 2000,
      },
      {
        props: {
          tagName: "li",
          componentName: "ListItem",
          status: "copied",
          elementsCount: 5,
          hasOnDismiss: false,
          hasOnUndo: false,
          showMoreOptions: true,
        },
        durationMs: 2000,
      },
    ],
  },
  {
    id: "anim-long-operation",
    label: "Long Operation",
    description: "copying with status updates",
    component: "label",
    props: {
      tagName: "main",
      componentName: "Dashboard",
      status: "copying",
      hasAgent: true,
      isAgentConnected: true,
      statusText: "Starting…",
    },
    animationSequence: [
      {
        props: {
          tagName: "main",
          componentName: "Dashboard",
          status: "idle",
          hasAgent: true,
          isAgentConnected: true,
          isPromptMode: true,
          inputValue: "redesign the layout",
        },
        durationMs: 1500,
      },
      {
        props: {
          tagName: "main",
          componentName: "Dashboard",
          status: "copying",
          hasAgent: true,
          isAgentConnected: true,
          statusText: "Analyzing…",
        },
        durationMs: 1500,
      },
      {
        props: {
          tagName: "main",
          componentName: "Dashboard",
          status: "copying",
          hasAgent: true,
          isAgentConnected: true,
          statusText: "Generating code…",
        },
        durationMs: 1500,
      },
      {
        props: {
          tagName: "main",
          componentName: "Dashboard",
          status: "copying",
          hasAgent: true,
          isAgentConnected: true,
          statusText: "Applying changes…",
        },
        durationMs: 1500,
      },
      {
        props: {
          tagName: "main",
          componentName: "Dashboard",
          status: "copied",
          hasAgent: true,
          isAgentConnected: true,
          statusText: "Done",
          supportsUndo: true,
          supportsFollowUp: true,
          showMoreOptions: true,
        },
        durationMs: 2000,
      },
    ],
  },
  {
    id: "anim-reply-to-prompt",
    label: "Reply to Prompt",
    description: "completed → edit with previous",
    component: "label",
    props: {
      tagName: "div",
      componentName: "Card",
      status: "copied",
      hasAgent: true,
      isAgentConnected: true,
      statusText: "Done",
      supportsFollowUp: true,
      showMoreOptions: true,
    },
    animationSequence: [
      {
        props: {
          tagName: "div",
          componentName: "Card",
          status: "copied",
          hasAgent: true,
          isAgentConnected: true,
          statusText: "Done",
          supportsUndo: true,
          supportsFollowUp: true,
          showMoreOptions: true,
        },
        durationMs: 2000,
      },
      {
        props: {
          tagName: "div",
          componentName: "Card",
          status: "idle",
          hasAgent: true,
          isAgentConnected: true,
          isPromptMode: true,
          inputValue: "",
          previousPrompt: "make it bigger",
          replyToPrompt: "make it bigger",
        },
        durationMs: 2500,
      },
      {
        props: {
          tagName: "div",
          componentName: "Card",
          status: "idle",
          hasAgent: true,
          isAgentConnected: true,
          isPromptMode: true,
          inputValue: "also add shadow",
          previousPrompt: "make it bigger",
          replyToPrompt: "make it bigger",
        },
        durationMs: 1500,
      },
    ],
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

const STORAGE_KEY_THEME = "react-grab-design-system-theme";
const STORAGE_KEY_STARRED = "react-grab-design-system-starred";

const generateRandomSuffix = (length: number): string => {
  const chars =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

const elongateProps = (
  props: DesignSystemStateProps,
): DesignSystemStateProps => {
  const elongateString = (value: string | undefined): string | undefined => {
    if (!value) return value;
    return value + generateRandomSuffix(20 + Math.floor(Math.random() * 30));
  };

  return {
    ...props,
    tagName: elongateString(props.tagName),
    componentName: elongateString(props.componentName),
    filePath: elongateString(props.filePath),
    statusText: elongateString(props.statusText),
    error: elongateString(props.error),
    inputValue: elongateString(props.inputValue),
    replyToPrompt: elongateString(props.replyToPrompt),
    previousPrompt: elongateString(props.previousPrompt),
    dismissButtonText: elongateString(props.dismissButtonText),
  };
};

const loadTheme = (): boolean => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_THEME);
    if (saved === "light") return false;
    return true;
  } catch {
    return true;
  }
};

const saveTheme = (isDark: boolean): void => {
  try {
    localStorage.setItem(STORAGE_KEY_THEME, isDark ? "dark" : "light");
  } catch {}
};

const loadStarred = (): Set<string> => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_STARRED);
    if (!saved) return new Set();
    return new Set(JSON.parse(saved) as string[]);
  } catch {
    return new Set();
  }
};

const saveStarred = (starred: Set<string>): void => {
  try {
    localStorage.setItem(STORAGE_KEY_STARRED, JSON.stringify([...starred]));
  } catch {}
};

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

const createToggleButtonStyle = (
  theme: ThemeColors,
): Record<string, string> => ({
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

const createCardContainerStyle = (
  theme: ThemeColors,
): Record<string, string> => ({
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

const createCardContentStyle = (
  theme: ThemeColors,
): Record<string, string> => ({
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
  "font-family": "ui-monospace, SFMono-Regular, monospace",
});

interface StateCardProps {
  state: DesignSystemState;
  theme: ThemeColors;
  getBounds: () => OverlayBounds | undefined;
  registerCell: (element: HTMLDivElement) => void;
  onRefresh: () => void;
  getTargetDisplayText: () => string;
  isStarred: boolean;
  onToggleStar: () => void;
  isScrambled: boolean;
}

const StateCard = (props: StateCardProps) => {
  const [isCardRefreshing, setIsCardRefreshing] = createSignal(false);
  const [isPlaying, setIsPlaying] = createSignal(false);
  const [frameIndex, setFrameIndex] = createSignal(0);

  let animationTimeout: ReturnType<typeof setTimeout> | undefined;

  const clearAnimationTimeout = () => {
    if (animationTimeout) {
      clearTimeout(animationTimeout);
      animationTimeout = undefined;
    }
  };

  const hasAnimation = () => Boolean(props.state.animationSequence?.length);
  const frameCount = () => props.state.animationSequence?.length ?? 0;

  const boundsAnchor = () => {
    const bounds = props.getBounds();
    if (!bounds) return null;
    return {
      x: bounds.x + bounds.width / 2,
      y: bounds.y + bounds.height,
      width: bounds.width,
    };
  };

  const currentProps = (): DesignSystemStateProps => {
    const baseProps =
      hasAnimation() && props.state.animationSequence
        ? props.state.animationSequence[frameIndex()].props
        : props.state.props;
    return props.isScrambled ? elongateProps(baseProps) : baseProps;
  };

  const scheduleNextFrame = () => {
    if (!props.state.animationSequence) return;

    const sequence = props.state.animationSequence;
    const currentFrame = sequence[frameIndex()];

    animationTimeout = setTimeout(() => {
      const nextIndex = (frameIndex() + 1) % sequence.length;
      setFrameIndex(nextIndex);

      if (isPlaying()) {
        scheduleNextFrame();
      }
    }, currentFrame.durationMs);
  };

  const handleTogglePlay = (event: MouseEvent) => {
    event.stopPropagation();
    if (isPlaying()) {
      setIsPlaying(false);
      clearAnimationTimeout();
    } else {
      setIsPlaying(true);
      scheduleNextFrame();
    }
  };

  const handleSliderChange = (event: Event) => {
    const inputElement = event.target as HTMLInputElement;
    const selectedFrameIndex = Number(inputElement.value);
    setFrameIndex(selectedFrameIndex);
    if (isPlaying()) {
      setIsPlaying(false);
      clearAnimationTimeout();
    }
  };

  onCleanup(() => {
    clearAnimationTimeout();
  });

  const handleCardRefresh = (event: MouseEvent) => {
    event.stopPropagation();
    setIsCardRefreshing(true);
    setFrameIndex(0);
    setIsPlaying(false);
    clearAnimationTimeout();
    props.onRefresh();
    queueMicrotask(() => setIsCardRefreshing(false));
  };

  const handleToggleStar = (event: MouseEvent) => {
    event.stopPropagation();
    props.onToggleStar();
  };

  return (
    <div style={createCardContainerStyle(props.theme)}>
      <div style={createCardHeaderStyle(props.theme)}>
        <div
          style={{
            display: "flex",
            "flex-direction": "column",
            gap: `${CARD_TITLE_GAP_PX}px`,
            flex: "1",
            "min-width": "0",
          }}
        >
          <div style={{ display: "flex", "align-items": "center", gap: "6px" }}>
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
            <Show when={hasAnimation()}>
              <span
                style={{
                  color: props.theme.descriptionText,
                  "font-size": "10px",
                  "font-weight": "500",
                }}
              >
                {frameIndex() + 1}/{frameCount()}
              </span>
            </Show>
          </div>
          <span
            style={{
              color: props.theme.descriptionText,
              "font-size": `${CARD_DESCRIPTION_FONT_SIZE_PX}px`,
              "line-height": "1.3",
            }}
          >
            {props.state.description}
          </span>
          <Show when={hasAnimation()}>
            <div
              style={{
                display: "flex",
                "align-items": "center",
                gap: "8px",
                "margin-top": "8px",
              }}
            >
              <button
                onClick={handleTogglePlay}
                style={{
                  display: "flex",
                  "align-items": "center",
                  "justify-content": "center",
                  width: "20px",
                  height: "20px",
                  padding: "0",
                  "background-color": "transparent",
                  border: `1px solid ${props.theme.cardBorder}`,
                  "border-radius": "4px",
                  color: props.theme.titleText,
                  "font-size": "10px",
                  cursor: "pointer",
                  "flex-shrink": "0",
                  transition: `all ${TRANSITION_DURATION}`,
                }}
                title={isPlaying() ? "Pause" : "Play"}
              >
                {isPlaying() ? "⏸" : "▶"}
              </button>
              <input
                type="range"
                min="0"
                max={frameCount() - 1}
                value={frameIndex()}
                onInput={handleSliderChange}
                style={{
                  flex: "1",
                  height: "4px",
                  cursor: "pointer",
                  "accent-color": props.theme.titleText,
                }}
              />
            </div>
          </Show>
        </div>
        <div
          style={{
            display: "flex",
            "align-items": "center",
            gap: "4px",
            "flex-shrink": "0",
          }}
        >
          <button
            onClick={handleToggleStar}
            style={{
              display: "flex",
              "align-items": "center",
              "justify-content": "center",
              width: `${REFRESH_BUTTON_SIZE_PX}px`,
              height: `${REFRESH_BUTTON_SIZE_PX}px`,
              padding: "0",
              "background-color": "transparent",
              border: `1px solid ${props.isStarred ? "rgba(250, 204, 21, 0.5)" : props.theme.cardBorder}`,
              "border-radius": `${REFRESH_BUTTON_BORDER_RADIUS_PX}px`,
              color: props.isStarred
                ? "rgba(250, 204, 21, 1)"
                : props.theme.descriptionText,
              "font-size": `${TOGGLE_BUTTON_FONT_SIZE_PX}px`,
              cursor: "pointer",
              transition: `all ${TRANSITION_DURATION}`,
            }}
            title={props.isStarred ? "Unstar this card" : "Star this card"}
          >
            {props.isStarred ? "★" : "☆"}
          </button>
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
            }}
            title="Refresh this card"
          >
            ↻
          </button>
        </div>
      </div>

      <div style={createCardContentStyle(props.theme)}>
        <Show when={!isCardRefreshing()}>
          <Show
            when={
              props.state.component !== "toolbar" &&
              props.state.component !== "history-dropdown"
            }
          >
            <div
              ref={(element) => props.registerCell(element)}
              style={createTargetStyle(props.theme)}
            >
              {props.getTargetDisplayText()}
            </div>
          </Show>

          <Show when={props.state.component === "label"}>
            <SelectionLabel
              tagName={currentProps().tagName}
              componentName={currentProps().componentName}
              elementsCount={currentProps().elementsCount}
              selectionBounds={props.getBounds()}
              mouseX={boundsAnchor()?.x}
              visible={true}
              status={currentProps().status}
              hasAgent={currentProps().hasAgent}
              isAgentConnected={currentProps().isAgentConnected}
              isPromptMode={currentProps().isPromptMode}
              inputValue={currentProps().inputValue}
              replyToPrompt={currentProps().replyToPrompt}
              statusText={currentProps().statusText}
              isPendingDismiss={currentProps().isPendingDismiss}
              isPendingAbort={currentProps().isPendingAbort}
              error={currentProps().error}
              isContextMenuOpen={currentProps().isContextMenuOpen}
              supportsUndo={currentProps().supportsUndo}
              supportsFollowUp={currentProps().supportsFollowUp}
              filePath={currentProps().filePath}
              dismissButtonText={currentProps().dismissButtonText}
              previousPrompt={currentProps().previousPrompt}
              onOpen={currentProps().filePath ? () => {} : undefined}
              onInputChange={() => {}}
              onSubmit={() => {}}
              onToggleExpand={() => {}}
              onConfirmDismiss={() => {}}
              onCancelDismiss={() => {}}
              onConfirmAbort={() => {}}
              onCancelAbort={() => {}}
              onAcknowledgeError={
                currentProps().hasOnAcknowledge !== false ? () => {} : undefined
              }
              onRetry={
                currentProps().hasOnRetry !== false ? () => {} : undefined
              }
              onDismiss={
                currentProps().hasOnDismiss !== false ? () => {} : undefined
              }
              onUndo={currentProps().hasOnUndo !== false ? () => {} : undefined}
              onFollowUpSubmit={() => {}}
              onAbort={() => {}}
              onShowContextMenu={
                currentProps().showMoreOptions ? () => {} : undefined
              }
            />
          </Show>

          <Show when={props.state.component === "context-menu"}>
            <ContextMenu
              position={
                boundsAnchor()
                  ? { x: boundsAnchor()!.x, y: boundsAnchor()!.y }
                  : null
              }
              selectionBounds={props.getBounds() ?? null}
              tagName={currentProps().tagName}
              componentName={currentProps().componentName}
              hasFilePath={currentProps().hasFilePath ?? false}
              actions={[
                {
                  id: "copy",
                  label: "Copy",
                  shortcut: "C",
                  onAction: () => {},
                },
                { id: "copy-html", label: "Copy HTML", onAction: () => {} },
                {
                  id: "open",
                  label: "Open",
                  shortcut: "O",
                  enabled: currentProps().hasFilePath ?? false,
                  onAction: () => {},
                },
                {
                  id: "comment",
                  label: "Comment",
                  shortcut: "Enter",
                  onAction: () => {},
                },
              ]}
              onDismiss={() => {}}
              onHide={() => {}}
            />
          </Show>

          <Show when={props.state.component === "toolbar"}>
            <ToolbarContent
              isActive={currentProps().isToolbarActive ?? false}
              enabled={currentProps().isToolbarEnabled ?? true}
              isCollapsed={currentProps().isToolbarCollapsed}
              snapEdge={currentProps().toolbarSnapEdge}
              historyButton={
                <Show
                  when={
                    (currentProps().isToolbarEnabled ?? true) &&
                    (currentProps().toolbarHistoryItemCount ?? 0) > 0
                  }
                >
                  <div class="grid grid-cols-[1fr] opacity-100 transition-all duration-150 ease-out">
                    <div class="relative overflow-visible min-w-0">
                      <button class="contain-layout flex items-center justify-center cursor-pointer interactive-scale touch-hitbox mr-1.5">
                        <IconClock
                          size={14}
                          class="text-[#B3B3B3] transition-colors"
                        />
                      </button>
                    </div>
                  </div>
                </Show>
              }
            />
          </Show>

          <Show when={props.state.component === "history-dropdown"}>
            <div
              style={{
                position: "absolute",
                bottom: `${CARD_CONTENT_PADDING_PX}px`,
                left: "50%",
                transform: "translateX(-50%)",
              }}
            >
              <div ref={(element) => props.registerCell(element)}>
                <ToolbarContent
                  isActive={true}
                  enabled={true}
                  historyButton={
                    <div class="grid grid-cols-[1fr] opacity-100 transition-all duration-150 ease-out">
                      <div class="relative overflow-visible min-w-0">
                        <button class="contain-layout flex items-center justify-center cursor-pointer interactive-scale touch-hitbox mr-1.5">
                          <IconClock
                            size={14}
                            class="text-[#B3B3B3] transition-colors"
                          />
                        </button>
                      </div>
                    </div>
                  }
                />
              </div>
            </div>
            <HistoryDropdown
              position={
                boundsAnchor()
                  ? {
                      ...boundsAnchor()!,
                      edge: "top" as const,
                      toolbarWidth: boundsAnchor()!.width,
                    }
                  : null
              }
              items={currentProps().historyItems ?? []}
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
        "font-family": "ui-monospace, SFMono-Regular, monospace",
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
  const [isDarkMode, setIsDarkMode] = createSignal(loadTheme());
  const [isRefreshing, setIsRefreshing] = createSignal(false);
  const [starredIds, setStarredIds] = createSignal<Set<string>>(loadStarred());
  const [searchQuery, setSearchQuery] = createSignal("");
  const [isScrambled, setIsScrambled] = createSignal(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setCellRefs(new Map());
    queueMicrotask(() => setIsRefreshing(false));
  };

  const handleToggleTheme = () => {
    setIsDarkMode((prev) => {
      const newValue = !prev;
      saveTheme(newValue);
      return newValue;
    });
  };

  const handleToggleStar = (id: string) => {
    setStarredIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      saveStarred(next);
      return next;
    });
  };

  const isStarred = (id: string): boolean => starredIds().has(id);

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

  const getTargetDisplayText = (state: DesignSystemState): string => {
    if (state.component === "toolbar") {
      return "";
    }
    if (state.props.elementsCount && state.props.elementsCount > 1) {
      return `<${state.props.elementsCount} elements>`;
    }
    return `<${state.props.componentName || state.props.tagName || "element"} />`;
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

  const hasAnimation = (state: DesignSystemState): boolean =>
    Boolean(state.animationSequence?.length);

  const matchesSearch = (state: DesignSystemState): boolean => {
    const query = searchQuery().toLowerCase().trim();
    if (!query) return true;
    return (
      state.label.toLowerCase().includes(query) ||
      state.description.toLowerCase().includes(query) ||
      state.id.toLowerCase().includes(query) ||
      (state.props.componentName?.toLowerCase().includes(query) ?? false) ||
      (state.props.tagName?.toLowerCase().includes(query) ?? false)
    );
  };

  const starredStates = () =>
    DESIGN_SYSTEM_STATES.filter(
      (state) => starredIds().has(state.id) && matchesSearch(state),
    );
  const labelStates = () =>
    DESIGN_SYSTEM_STATES.filter(
      (state) =>
        state.component === "label" &&
        !state.props.hasAgent &&
        !hasAnimation(state) &&
        matchesSearch(state),
    );
  const contextMenuStates = () =>
    DESIGN_SYSTEM_STATES.filter(
      (state) =>
        state.component === "context-menu" &&
        !hasAnimation(state) &&
        matchesSearch(state),
    );
  const toolbarStates = () =>
    DESIGN_SYSTEM_STATES.filter(
      (state) =>
        state.component === "toolbar" &&
        !hasAnimation(state) &&
        matchesSearch(state),
    );
  const agentLabelStates = () =>
    DESIGN_SYSTEM_STATES.filter(
      (state) =>
        state.component === "label" &&
        state.props.hasAgent &&
        !hasAnimation(state) &&
        matchesSearch(state),
    );
  const historyDropdownStates = () =>
    DESIGN_SYSTEM_STATES.filter(
      (state) =>
        state.component === "history-dropdown" &&
        !hasAnimation(state) &&
        matchesSearch(state),
    );
  const flowStates = () =>
    DESIGN_SYSTEM_STATES.filter(
      (state) => hasAnimation(state) && matchesSearch(state),
    );

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
        <div style={{ display: "flex", "align-items": "center", gap: "10px" }}>
          <svg
            width="24"
            height="24"
            viewBox="0 0 294 294"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <g clip-path="url(#clip0_logo)">
              <mask
                id="mask0_logo"
                style="mask-type:luminance"
                maskUnits="userSpaceOnUse"
                x="0"
                y="0"
                width="294"
                height="294"
              >
                <path d="M294 0H0V294H294V0Z" fill="white" />
              </mask>
              <g mask="url(#mask0_logo)">
                <path
                  d="M144.599 47.4924C169.712 27.3959 194.548 20.0265 212.132 30.1797C227.847 39.2555 234.881 60.3243 231.926 89.516C231.677 92.0069 231.328 94.5423 230.94 97.1058L228.526 110.14C228.517 110.136 228.505 110.132 228.495 110.127C228.486 110.165 228.479 110.203 228.468 110.24L216.255 105.741C216.256 105.736 216.248 105.728 216.248 105.723C207.915 103.125 199.421 101.075 190.82 99.5888L190.696 99.5588L173.526 97.2648L173.511 97.2631C173.492 97.236 173.467 97.2176 173.447 97.1905C163.862 96.2064 154.233 95.7166 144.599 95.7223C134.943 95.7162 125.295 96.219 115.693 97.2286C110.075 105.033 104.859 113.118 100.063 121.453C95.2426 129.798 90.8624 138.391 86.939 147.193C90.8624 155.996 95.2426 164.588 100.063 172.933C104.866 181.302 110.099 189.417 115.741 197.245C115.749 197.245 115.758 197.246 115.766 197.247L115.752 197.27L115.745 197.283L115.754 197.296L126.501 211.013L126.574 211.089C132.136 217.767 138.126 224.075 144.507 229.974L144.609 230.082L154.572 238.287C154.539 238.319 154.506 238.35 154.472 238.38C154.485 238.392 154.499 238.402 154.513 238.412L143.846 247.482L143.827 247.497C126.56 261.128 109.472 268.745 94.8019 268.745C88.5916 268.837 82.4687 267.272 77.0657 264.208C61.3496 255.132 54.3164 234.062 57.2707 204.871C57.528 202.307 57.8806 199.694 58.2904 197.054C28.3363 185.327 9.52301 167.51 9.52301 147.193C9.52301 129.042 24.2476 112.396 50.9901 100.375C53.3443 99.3163 55.7938 98.3058 58.2904 97.3526C57.8806 94.7023 57.528 92.0803 57.2707 89.516C54.3164 60.3243 61.3496 39.2555 77.0657 30.1797C94.6494 20.0265 119.486 27.3959 144.599 47.4924ZM70.6423 201.315C70.423 202.955 70.2229 204.566 70.0704 206.168C67.6686 229.567 72.5478 246.628 83.3615 252.988L83.5176 253.062C95.0399 259.717 114.015 254.426 134.782 238.38C125.298 229.45 116.594 219.725 108.764 209.314C95.8516 207.742 83.0977 205.066 70.6423 201.315ZM80.3534 163.438C77.34 171.677 74.8666 180.104 72.9484 188.664C81.1787 191.224 89.5657 193.247 98.0572 194.724L98.4618 194.813C95.2115 189.865 92.0191 184.66 88.9311 179.378C85.8433 174.097 83.003 168.768 80.3534 163.438ZM60.759 110.203C59.234 110.839 57.7378 111.475 56.27 112.11C34.7788 121.806 22.3891 134.591 22.3891 147.193C22.3891 160.493 36.4657 174.297 60.7494 184.26C63.7439 171.581 67.8124 159.182 72.9104 147.193C67.822 135.23 63.7566 122.855 60.759 110.203ZM98.4137 99.6404C89.8078 101.145 81.3075 103.206 72.9676 105.809C74.854 114.203 77.2741 122.468 80.2132 130.554L80.3059 130.939C82.9938 125.6 85.8049 120.338 88.8834 115.008C91.9618 109.679 95.1544 104.569 98.4137 99.6404ZM94.9258 38.5215C90.9331 38.4284 86.9866 39.3955 83.4891 41.3243C72.6291 47.6015 67.6975 64.5954 70.0424 87.9446L70.0416 88.2194C70.194 89.8208 70.3941 91.4325 70.6134 93.0624C83.0737 89.3364 95.8263 86.6703 108.736 85.0924C116.57 74.6779 125.28 64.9532 134.773 56.0249C119.877 44.5087 105.895 38.5215 94.9258 38.5215ZM205.737 41.3148C202.268 39.398 198.355 38.4308 194.394 38.5099L194.29 38.512C183.321 38.512 169.34 44.4991 154.444 56.0153C163.93 64.9374 172.634 74.6557 180.462 85.064C193.375 86.6345 206.128 89.3102 218.584 93.0624C218.812 91.4325 219.003 89.8118 219.165 88.2098C221.548 64.7099 216.65 47.6164 205.737 41.3148ZM144.552 64.3097C138.104 70.2614 132.054 76.6306 126.443 83.3765C132.39 82.995 138.426 82.8046 144.552 82.8046C150.727 82.8046 156.778 83.0143 162.707 83.3765C157.08 76.6293 151.015 70.2596 144.552 64.3097Z"
                  fill={theme().titleText}
                />
                <path
                  d="M144.598 47.4924C169.712 27.3959 194.547 20.0265 212.131 30.1797C227.847 39.2555 234.88 60.3243 231.926 89.516C231.677 92.0069 231.327 94.5423 230.941 97.1058L228.526 110.14L228.496 110.127C228.487 110.165 228.478 110.203 228.469 110.24L216.255 105.741L216.249 105.723C207.916 103.125 199.42 101.075 190.82 99.5888L190.696 99.5588L173.525 97.2648L173.511 97.263C173.492 97.236 173.468 97.2176 173.447 97.1905C163.863 96.2064 154.234 95.7166 144.598 95.7223C134.943 95.7162 125.295 96.219 115.693 97.2286C110.075 105.033 104.859 113.118 100.063 121.453C95.2426 129.798 90.8622 138.391 86.939 147.193C90.8622 155.996 95.2426 164.588 100.063 172.933C104.866 181.302 110.099 189.417 115.741 197.245L115.766 197.247L115.752 197.27L115.745 197.283L115.754 197.296L126.501 211.013L126.574 211.089C132.136 217.767 138.126 224.075 144.506 229.974L144.61 230.082L154.572 238.287C154.539 238.319 154.506 238.35 154.473 238.38L154.512 238.412L143.847 247.482L143.827 247.497C126.56 261.13 109.472 268.745 94.8018 268.745C88.5915 268.837 82.4687 267.272 77.0657 264.208C61.3496 255.132 54.3162 234.062 57.2707 204.871C57.528 202.307 57.8806 199.694 58.2904 197.054C28.3362 185.327 9.52298 167.51 9.52298 147.193C9.52298 129.042 24.2476 112.396 50.9901 100.375C53.3443 99.3163 55.7938 98.3058 58.2904 97.3526C57.8806 94.7023 57.528 92.0803 57.2707 89.516C54.3162 60.3243 61.3496 39.2555 77.0657 30.1797C94.6493 20.0265 119.486 27.3959 144.598 47.4924ZM70.6422 201.315C70.423 202.955 70.2229 204.566 70.0704 206.168C67.6686 229.567 72.5478 246.628 83.3615 252.988L83.5175 253.062C95.0399 259.717 114.015 254.426 134.782 238.38C125.298 229.45 116.594 219.725 108.764 209.314C95.8515 207.742 83.0977 205.066 70.6422 201.315ZM80.3534 163.438C77.34 171.677 74.8666 180.104 72.9484 188.664C81.1786 191.224 89.5657 193.247 98.0572 194.724L98.4618 194.813C95.2115 189.865 92.0191 184.66 88.931 179.378C85.8433 174.097 83.003 168.768 80.3534 163.438ZM60.7589 110.203C59.234 110.839 57.7378 111.475 56.2699 112.11C34.7788 121.806 22.3891 134.591 22.3891 147.193C22.3891 160.493 36.4657 174.297 60.7494 184.26C63.7439 171.581 67.8124 159.182 72.9103 147.193C67.822 135.23 63.7566 122.855 60.7589 110.203ZM98.4137 99.6404C89.8078 101.145 81.3075 103.206 72.9676 105.809C74.8539 114.203 77.2741 122.468 80.2132 130.554L80.3059 130.939C82.9938 125.6 85.8049 120.338 88.8834 115.008C91.9618 109.679 95.1544 104.569 98.4137 99.6404ZM94.9258 38.5215C90.9331 38.4284 86.9866 39.3955 83.4891 41.3243C72.629 47.6015 67.6975 64.5954 70.0424 87.9446L70.0415 88.2194C70.194 89.8208 70.3941 91.4325 70.6134 93.0624C83.0737 89.3364 95.8262 86.6703 108.736 85.0924C116.57 74.6779 125.28 64.9532 134.772 56.0249C119.877 44.5087 105.895 38.5215 94.9258 38.5215ZM205.737 41.3148C202.268 39.398 198.355 38.4308 194.394 38.5099L194.291 38.512C183.321 38.512 169.34 44.4991 154.443 56.0153C163.929 64.9374 172.634 74.6557 180.462 85.064C193.374 86.6345 206.129 89.3102 218.584 93.0624C218.813 91.4325 219.003 89.8118 219.166 88.2098C221.548 64.7099 216.65 47.6164 205.737 41.3148ZM144.551 64.3097C138.103 70.2614 132.055 76.6306 126.443 83.3765C132.389 82.995 138.427 82.8046 144.551 82.8046C150.727 82.8046 156.779 83.0143 162.707 83.3765C157.079 76.6293 151.015 70.2596 144.551 64.3097Z"
                  fill="#FF40E0"
                />
              </g>
              <mask
                id="mask1_logo"
                style="mask-type:luminance"
                maskUnits="userSpaceOnUse"
                x="102"
                y="84"
                width="161"
                height="162"
              >
                <path
                  d="M235.282 84.827L102.261 112.259L129.693 245.28L262.714 217.848L235.282 84.827Z"
                  fill="white"
                />
              </mask>
              <g mask="url(#mask1_logo)">
                <path
                  d="M136.863 129.916L213.258 141.224C220.669 142.322 222.495 152.179 215.967 155.856L187.592 171.843L184.135 204.227C183.339 211.678 173.564 213.901 169.624 207.526L129.021 141.831C125.503 136.14 130.245 128.936 136.863 129.916Z"
                  fill="#FF40E0"
                  stroke="#FF40E0"
                  stroke-width="0.817337"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </g>
            </g>
            <defs>
              <clipPath id="clip0_logo">
                <rect width="294" height="294" fill="white" />
              </clipPath>
            </defs>
          </svg>
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
        </div>
        <div
          style={{
            display: "flex",
            "align-items": "center",
            gap: `${HEADER_BUTTONS_GAP_PX}px`,
            flex: "1",
            "max-width": "400px",
          }}
        >
          <input
            type="text"
            placeholder="Search states…"
            value={searchQuery()}
            onInput={(event) => setSearchQuery(event.currentTarget.value)}
            style={{
              flex: "1",
              padding: "6px 12px",
              "border-radius": "6px",
              border: `1px solid ${theme().cardBorder}`,
              "background-color": theme().cardBackground,
              color: theme().titleText,
              "font-size": "13px",
              "font-family": "inherit",
              outline: "none",
              transition: `all ${TRANSITION_DURATION}`,
            }}
          />
        </div>
        <div
          style={{
            display: "flex",
            "align-items": "center",
            gap: `${HEADER_BUTTONS_GAP_PX}px`,
          }}
        >
          <button
            onClick={() => setIsScrambled((prev) => !prev)}
            style={{
              ...createToggleButtonStyle(theme()),
              "background-color": isScrambled()
                ? "rgba(215, 95, 203, 0.2)"
                : theme().toggleBackground,
              "border-color": isScrambled()
                ? "rgba(215, 95, 203, 0.5)"
                : theme().toggleBorder,
            }}
          >
            {isScrambled() ? "✓ Scramble" : "Scramble"}
          </button>
          <button
            onClick={handleRefresh}
            style={createToggleButtonStyle(theme())}
          >
            ↻ Refresh
          </button>
          <button
            onClick={handleToggleTheme}
            style={createToggleButtonStyle(theme())}
          >
            {isDarkMode() ? "Dark" : "Light"}
          </button>
        </div>
      </div>

      <Show when={!isRefreshing()}>
        {/* Starred Section */}
        <Show when={starredStates().length > 0}>
          <div style={{ padding: `${GAP_PX}px 24px` }}>
            <span
              style={{
                ...sectionTitleStyle(),
                color: "rgba(250, 204, 21, 0.8)",
              }}
            >
              ★ Starred ({starredStates().length})
            </span>
            <div style={gridStyle()}>
              <For each={starredStates()}>
                {(state) => (
                  <StateCard
                    state={state}
                    theme={theme()}
                    getBounds={() => getBoundsForCell(state.id)}
                    registerCell={(element) => registerCell(state.id, element)}
                    onRefresh={createRefreshHandler(state.id)}
                    getTargetDisplayText={() => getTargetDisplayText(state)}
                    isStarred={isStarred(state.id)}
                    onToggleStar={() => handleToggleStar(state.id)}
                    isScrambled={isScrambled()}
                  />
                )}
              </For>
            </div>
          </div>
        </Show>

        {/* Flows Section */}
        <Show when={flowStates().length > 0}>
          <div style={{ padding: `${GAP_PX}px 24px` }}>
            <span style={sectionTitleStyle()}>Flows</span>
            <div style={gridStyle()}>
              <For each={flowStates()}>
                {(state) => (
                  <StateCard
                    state={state}
                    theme={theme()}
                    getBounds={() => getBoundsForCell(state.id)}
                    registerCell={(element) => registerCell(state.id, element)}
                    onRefresh={createRefreshHandler(state.id)}
                    getTargetDisplayText={() => getTargetDisplayText(state)}
                    isStarred={isStarred(state.id)}
                    onToggleStar={() => handleToggleStar(state.id)}
                    isScrambled={isScrambled()}
                  />
                )}
              </For>
            </div>
          </div>
        </Show>

        {/* Selection Label Section */}
        <Show when={labelStates().length > 0}>
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
                    getTargetDisplayText={() => getTargetDisplayText(state)}
                    isStarred={isStarred(state.id)}
                    onToggleStar={() => handleToggleStar(state.id)}
                    isScrambled={isScrambled()}
                  />
                )}
              </For>
            </div>
          </div>
        </Show>

        {/* Context Menu Section */}
        <Show when={contextMenuStates().length > 0}>
          <div style={{ padding: `${GAP_PX}px 24px` }}>
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
                    getTargetDisplayText={() => getTargetDisplayText(state)}
                    isStarred={isStarred(state.id)}
                    onToggleStar={() => handleToggleStar(state.id)}
                    isScrambled={isScrambled()}
                  />
                )}
              </For>
            </div>
          </div>
        </Show>

        {/* Toolbar Section */}
        <Show when={toolbarStates().length > 0}>
          <div style={{ padding: `${GAP_PX}px 24px` }}>
            <span style={sectionTitleStyle()}>Toolbar</span>
            <div style={gridStyle()}>
              <For each={toolbarStates()}>
                {(state) => (
                  <StateCard
                    state={state}
                    theme={theme()}
                    getBounds={() => getBoundsForCell(state.id)}
                    registerCell={(element) => registerCell(state.id, element)}
                    onRefresh={createRefreshHandler(state.id)}
                    getTargetDisplayText={() => getTargetDisplayText(state)}
                    isStarred={isStarred(state.id)}
                    onToggleStar={() => handleToggleStar(state.id)}
                    isScrambled={isScrambled()}
                  />
                )}
              </For>
            </div>
          </div>
        </Show>

        {/* History Dropdown Section */}
        <Show when={historyDropdownStates().length > 0}>
          <div style={{ padding: `${GAP_PX}px 24px` }}>
            <span style={sectionTitleStyle()}>History Dropdown</span>
            <div style={gridStyle()}>
              <For each={historyDropdownStates()}>
                {(state) => (
                  <StateCard
                    state={state}
                    theme={theme()}
                    getBounds={() => getBoundsForCell(state.id)}
                    registerCell={(element) => registerCell(state.id, element)}
                    onRefresh={createRefreshHandler(state.id)}
                    getTargetDisplayText={() => getTargetDisplayText(state)}
                    isStarred={isStarred(state.id)}
                    onToggleStar={() => handleToggleStar(state.id)}
                    isScrambled={isScrambled()}
                  />
                )}
              </For>
            </div>
          </div>
        </Show>

        {/* Agent States Section */}
        <Show when={agentLabelStates().length > 0}>
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
                    getTargetDisplayText={() => getTargetDisplayText(state)}
                    isStarred={isStarred(state.id)}
                    onToggleStar={() => handleToggleStar(state.id)}
                    isScrambled={isScrambled()}
                  />
                )}
              </For>
            </div>
          </div>
        </Show>

        {/* No Results */}
        <Show
          when={
            searchQuery().trim() &&
            starredStates().length +
              flowStates().length +
              labelStates().length +
              contextMenuStates().length +
              toolbarStates().length +
              historyDropdownStates().length +
              agentLabelStates().length ===
              0
          }
        >
          <div style={{ padding: "48px 24px", "text-align": "center" }}>
            <span
              style={{ color: theme().descriptionText, "font-size": "14px" }}
            >
              No states match "{searchQuery()}"
            </span>
          </div>
        </Show>
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
    "https://fonts.googleapis.com/css2?family=Geist:wght@500&display=swap";
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
