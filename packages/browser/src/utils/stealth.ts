import type { BrowserContext } from "playwright-core";

const STEALTH_SCRIPTS = `
Object.defineProperty(navigator, 'webdriver', { get: () => undefined });

Object.defineProperty(navigator, 'plugins', {
  get: () => [
    { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
    { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai', description: '' },
    { name: 'Native Client', filename: 'internal-nacl-plugin', description: '' },
  ],
});

Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });

Object.defineProperty(navigator, 'platform', { get: () => 'MacIntel' });

Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 8 });

Object.defineProperty(navigator, 'deviceMemory', { get: () => 8 });

window.chrome = {
  runtime: {},
  loadTimes: () => {},
  csi: () => {},
  app: {},
};

if (navigator.permissions?.query) {
  const originalQuery = navigator.permissions.query.bind(navigator.permissions);
  navigator.permissions.query = (parameters) => (
    parameters.name === 'notifications'
      ? Promise.resolve({ state: Notification.permission })
      : originalQuery(parameters)
  );
}

if (navigator.connection) {
  Object.defineProperty(navigator.connection, 'rtt', { get: () => 50 });
}

const getParameter = WebGLRenderingContext.prototype.getParameter;
WebGLRenderingContext.prototype.getParameter = function(parameter) {
  if (parameter === 37445) return 'Intel Inc.';
  if (parameter === 37446) return 'Intel Iris OpenGL Engine';
  return getParameter.call(this, parameter);
};
`;

export const applyStealthScripts = async (
  context: BrowserContext,
): Promise<void> => {
  await context.addInitScript(STEALTH_SCRIPTS);
};
