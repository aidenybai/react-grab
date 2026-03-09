interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateEmailStep(
  config: Record<string, unknown>,
): ValidationResult {
  const errors: string[] = [];
  if (!config.subject) errors.push("Subject is required");
  if (!config.body) errors.push("Body is required");
  return { valid: errors.length === 0, errors };
}

export function validateSmsStep(
  config: Record<string, unknown>,
): ValidationResult {
  const errors: string[] = [];
  if (!config.message) errors.push("Message is required");
  if (typeof config.message === "string" && config.message.length > 160) {
    errors.push("Message must be 160 characters or less");
  }
  return { valid: errors.length === 0, errors };
}

export function validateWebhookStep(
  config: Record<string, unknown>,
): ValidationResult {
  const errors: string[] = [];
  if (!config.url) errors.push("URL is required");
  if (typeof config.url === "string" && !config.url.startsWith("https://")) {
    errors.push("URL must use HTTPS");
  }
  return { valid: errors.length === 0, errors };
}

export function validateStep(
  type: string,
  config: Record<string, unknown>,
): ValidationResult {
  switch (type) {
    case "email":
      return validateEmailStep(config);
    case "sms":
      return validateSmsStep(config);
    case "webhook":
      return validateWebhookStep(config);
    default:
      return { valid: true, errors: [] };
  }
}
