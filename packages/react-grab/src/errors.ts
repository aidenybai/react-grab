export class ReactGrabError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ReactGrabError";
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
