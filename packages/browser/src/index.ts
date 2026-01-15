export {
  dumpCookies,
  findInstalledBrowsers,
  getDefaultBrowser,
  type DecryptedCookie,
  type DumpCookiesOptions,
} from "./utils/cookies.js";

export {
  SUPPORTED_BROWSERS,
  BROWSER_DISPLAY_NAMES,
  DEFAULT_SERVER_PORT,
  DEFAULT_NAVIGATION_TIMEOUT_MS,
  COOKIE_PREVIEW_LIMIT,
  type SupportedBrowser,
} from "./utils/constants.js";

export { toPlaywrightCookies } from "./utils/playwright-cookies.js";

export {
  saveSession,
  getSession,
  deleteSession,
  listSessions,
} from "./utils/sessions.js";

export { applyStealthScripts } from "./utils/stealth.js";

export {
  installLinuxDeps,
  detectPackageManager,
  isLinux,
  type InstallDepsResult,
} from "./utils/linux-deps.js";

export {
  checkChromiumInstalled,
  installChromium,
  ensureChromiumInstalled,
} from "./utils/chromium.js";

export {
  serve,
  spawnServer,
  getServerInfo,
  isServerRunning,
  isServerHealthy,
  stopServer,
  deleteServerInfo,
  type BrowserServer,
  type ServeOptions,
  type SpawnServerOptions,
} from "./server.js";

export {
  connect,
  findPageByTargetId,
  type BrowserClient,
  type PageOptions,
  type ServerInfo,
  type SnapshotOptions,
} from "./client.js";

export { getSnapshotScript, clearSnapshotScriptCache } from "./snapshot/index.js";

export type {
  ViewportSize,
  GetPageRequest,
  GetPageResponse,
  ListPagesResponse,
  ServerInfoResponse,
} from "./types.js";
