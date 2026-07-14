export class ReactGrabError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "ReactGrabError";
  }
}

export class RecoverableError extends ReactGrabError {
  constructor(message: string, cause: unknown) {
    super(message, { cause });
    this.name = "RecoverableError";
  }
}

export class FreezeError extends ReactGrabError {
  constructor(cause: unknown) {
    super("Failed to freeze page", { cause });
    this.name = "FreezeError";
  }
}

export class PluginHookError extends RecoverableError {
  readonly pluginName: string;
  readonly hookName: string;

  constructor(pluginName: string, hookName: string, cause: unknown) {
    super(`Plugin hook "${hookName}" failed for "${pluginName}"`, cause);
    this.name = "PluginHookError";
    this.pluginName = pluginName;
    this.hookName = hookName;
  }
}

export class PluginCleanupError extends RecoverableError {
  readonly pluginName: string;

  constructor(pluginName: string, cause: unknown) {
    super(`Plugin cleanup failed for "${pluginName}"`, cause);
    this.name = "PluginCleanupError";
    this.pluginName = pluginName;
  }
}

export class PluginSetupError extends RecoverableError {
  readonly pluginName: string;

  constructor(pluginName: string, cause: unknown) {
    super(`Plugin setup failed for "${pluginName}"`, cause);
    this.name = "PluginSetupError";
    this.pluginName = pluginName;
  }
}

export class ContextMenuActionError extends RecoverableError {
  readonly actionId: string;

  constructor(actionId: string, cause: unknown) {
    super(`Action "${actionId}" failed`, cause);
    this.name = "ContextMenuActionError";
    this.actionId = actionId;
  }
}

export class ContextMenuActionEnabledError extends RecoverableError {
  readonly actionId: string;

  constructor(actionId: string, cause: unknown) {
    super(`Action "${actionId}" enabled check failed`, cause);
    this.name = "ContextMenuActionEnabledError";
    this.actionId = actionId;
  }
}

export class NonElementNodeError extends ReactGrabError {
  constructor() {
    super("Can't generate CSS selector for non-element node type.");
    this.name = "NonElementNodeError";
  }
}

export class SelectorTimeoutError extends ReactGrabError {
  readonly timeoutMs: number;

  constructor(timeoutMs: number) {
    super(`Timeout: Can't find a unique selector after ${timeoutMs}ms`);
    this.name = "SelectorTimeoutError";
    this.timeoutMs = timeoutMs;
  }
}

export class SelectorNotFoundError extends ReactGrabError {
  constructor() {
    super("Selector was not found.");
    this.name = "SelectorNotFoundError";
  }
}

export class CopyFailedError extends ReactGrabError {
  constructor() {
    super("Failed to copy");
    this.name = "CopyFailedError";
  }
}
