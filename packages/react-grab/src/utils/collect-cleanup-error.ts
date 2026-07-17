export const collectCleanupError = (cleanup: () => void, cleanupErrors: unknown[]): void => {
  try {
    cleanup();
  } catch (error) {
    cleanupErrors.push(error);
  }
};
