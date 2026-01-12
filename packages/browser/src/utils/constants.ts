export type SupportedBrowser =
  | "chrome"
  | "edge"
  | "brave"
  | "arc"
  | "dia"
  | "helium";

export const SUPPORTED_BROWSERS: SupportedBrowser[] = [
  "chrome",
  "edge",
  "brave",
  "arc",
  "dia",
  "helium",
];

export const BROWSER_DISPLAY_NAMES: Record<SupportedBrowser, string> = {
  chrome: "Chrome",
  edge: "Microsoft Edge",
  brave: "Brave",
  arc: "Arc",
  dia: "Dia",
  helium: "Helium",
};

export const COOKIE_DB_PATHS: Record<
  SupportedBrowser,
  Record<"darwin" | "win32" | "linux", string>
> = {
  chrome: {
    darwin: "Library/Application Support/Google/Chrome/Default/Cookies",
    win32: "AppData\\Local\\Google\\Chrome\\User Data\\Default\\Cookies",
    linux: ".config/google-chrome/Default/Cookies",
  },
  edge: {
    darwin: "Library/Application Support/Microsoft Edge/Default/Cookies",
    win32: "AppData\\Local\\Microsoft\\Edge\\User Data\\Default\\Cookies",
    linux: ".config/microsoft-edge/Default/Cookies",
  },
  brave: {
    darwin:
      "Library/Application Support/BraveSoftware/Brave-Browser/Default/Cookies",
    win32:
      "AppData\\Local\\BraveSoftware\\Brave-Browser\\User Data\\Default\\Cookies",
    linux: ".config/BraveSoftware/Brave-Browser/Default/Cookies",
  },
  arc: {
    darwin: "Library/Application Support/Arc/User Data/Default/Cookies",
    win32: "AppData\\Local\\Arc\\User Data\\Default\\Cookies",
    linux: ".config/arc/Default/Cookies",
  },
  dia: {
    darwin: "Library/Application Support/Dia/User Data/Default/Cookies",
    win32: "AppData\\Local\\Dia\\User Data\\Default\\Cookies",
    linux: ".config/dia/Default/Cookies",
  },
  helium: {
    darwin: "Library/Application Support/net.imput.helium/Default/Cookies",
    win32: "AppData\\Local\\Helium\\User Data\\Default\\Cookies",
    linux: ".config/helium/Default/Cookies",
  },
};

export const KEYCHAIN_SERVICE_NAMES: Record<SupportedBrowser, string> = {
  chrome: "Chrome Safe Storage",
  edge: "Microsoft Edge Safe Storage",
  brave: "Brave Safe Storage",
  arc: "Arc Safe Storage",
  dia: "Dia Safe Storage",
  helium: "Helium Storage Key",
};

export const LINUX_SECRET_LABELS: Record<SupportedBrowser, string> = {
  chrome: "chrome",
  edge: "microsoft-edge",
  brave: "brave",
  arc: "arc",
  dia: "dia",
  helium: "helium",
};

export const LOCAL_STATE_PATHS: Record<SupportedBrowser, string> = {
  chrome: "AppData\\Local\\Google\\Chrome\\User Data\\Local State",
  edge: "AppData\\Local\\Microsoft\\Edge\\User Data\\Local State",
  brave: "AppData\\Local\\BraveSoftware\\Brave-Browser\\User Data\\Local State",
  arc: "AppData\\Local\\Arc\\User Data\\Local State",
  dia: "AppData\\Local\\Dia\\User Data\\Local State",
  helium: "AppData\\Local\\Helium\\User Data\\Local State",
};

export const PBKDF2_ITERATIONS_DARWIN = 1003;
export const PBKDF2_ITERATIONS_LINUX = 1;

export const CHROME_EPOCH_OFFSET_SECONDS = 11644473600;

export const ENCRYPTED_COOKIE_PREFIX = Buffer.from("v10");

export const AES_BLOCK_SIZE = 16;
export const AES_KEY_LENGTH = 16;
export const DARWIN_DIGEST_SIZE = 32;
export const AES_GCM_NONCE_LENGTH = 12;
export const AES_GCM_TAG_LENGTH = 16;

export const DEFAULT_SERVER_PORT = 9222;
export const DEFAULT_CDP_PORT = 9223;
export const DEFAULT_NAVIGATION_TIMEOUT_MS = 5000;
export const COOKIE_PREVIEW_LIMIT = 10;
export const MAX_CDP_READY_ATTEMPTS = 10;
export const CDP_READY_DELAY_MS = 300;
export const MAX_SERVER_SPAWN_ATTEMPTS = 50;
export const SERVER_SPAWN_DELAY_MS = 200;
