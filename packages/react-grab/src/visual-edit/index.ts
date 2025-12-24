export {
  createVisualEditAgentProvider,
  type VisualEditAgentProviderOptions,
  type AgentCompleteResult,
} from "./provider.js";

export { createUndoableProxy, buildAncestorContext } from "./dom.js";
export { validateCode, type ValidationResult } from "./code-validation.js";
export { buildDiffContext } from "./context.js";

