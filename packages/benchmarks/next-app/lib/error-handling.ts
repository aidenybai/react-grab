export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    code: string,
    statusCode = 500,
    isOperational = true,
  ) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    const message = id
      ? `${resource} with id "${id}" not found`
      : `${resource} not found`;
    super(message, "NOT_FOUND", 404);
    this.name = "NotFoundError";
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Authentication required") {
    super(message, "UNAUTHORIZED", 401);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "You do not have permission to perform this action") {
    super(message, "FORBIDDEN", 403);
    this.name = "ForbiddenError";
  }
}

export class ValidationError extends AppError {
  public readonly fields: Record<string, string[]>;

  constructor(fields: Record<string, string[]>) {
    super("Validation failed", "VALIDATION_ERROR", 422);
    this.name = "ValidationError";
    this.fields = fields;
  }
}

export class RateLimitError extends AppError {
  public readonly retryAfter: number;

  constructor(retryAfter: number) {
    super("Too many requests", "RATE_LIMIT", 429);
    this.name = "RateLimitError";
    this.retryAfter = retryAfter;
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "An unexpected error occurred";
}

export function formatErrorForDisplay(error: unknown): {
  title: string;
  message: string;
} {
  if (error instanceof NotFoundError) {
    return { title: "Not Found", message: error.message };
  }
  if (error instanceof UnauthorizedError) {
    return { title: "Unauthorized", message: "Please sign in to continue." };
  }
  if (error instanceof ForbiddenError) {
    return { title: "Access Denied", message: error.message };
  }
  if (error instanceof ValidationError) {
    return {
      title: "Validation Error",
      message: "Please check your input and try again.",
    };
  }
  return { title: "Error", message: getErrorMessage(error) };
}
