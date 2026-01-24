export const isExtensionContext = (): boolean => {
  const global = globalThis as {
    chrome?: { runtime?: { id?: string } };
    browser?: { runtime?: { id?: string } };
  };
  return Boolean(global.chrome?.runtime?.id || global.browser?.runtime?.id);
};
