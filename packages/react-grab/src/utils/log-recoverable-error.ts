export const logRecoverableError = (context: string, error: unknown): void => {
  if (process.env.NODE_ENV !== "production") {
    console.warn(`[react-grab] ${context}:`, error);
  }
};
