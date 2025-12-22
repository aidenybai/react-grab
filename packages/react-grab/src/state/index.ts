export {
  stateMachine,
  createInitialContext,
  hasAgentProvider,
  hasElement,
  hasNativeSelection,
  hasInputText,
  isToggleMode,
  hasPendingClick,
  canUndo,
  canRedo,
  hasActiveAgentSessions,
  isAgentStreaming,
  hasLastCopiedElement,
  hasNoActiveConfirmationLabels,
} from "./machine.js";
export type {
  GrabMachineContext,
  GrabMachineEvent,
  GrabMachineInput,
  PendingClickData,
} from "./machine.js";
