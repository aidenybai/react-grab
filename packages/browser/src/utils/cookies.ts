import { execSync } from "node:child_process";
import { createDecipheriv, pbkdf2Sync } from "node:crypto";
import { existsSync } from "node:fs";
import { homedir, platform } from "node:os";
import { join } from "node:path";
import Database from "better-sqlite3";
import {
  AES_BLOCK_SIZE,
  AES_KEY_LENGTH,
  COOKIE_DB_PATHS,
  DARWIN_DIGEST_SIZE,
  ENCRYPTED_COOKIE_PREFIX,
  KEYCHAIN_SERVICE_NAMES,
  LINUX_SECRET_LABELS,
  PBKDF2_ITERATIONS_DARWIN,
  PBKDF2_ITERATIONS_LINUX,
  SUPPORTED_BROWSERS,
  type SupportedBrowser,
} from "./constants.js";

export interface DecryptedCookie {
  creationUtc: number;
  hostKey: string;
  name: string;
  value: string;
  path: string;
  expiresUtc: number;
  isSecure: boolean;
  isHttpOnly: boolean;
  lastAccessUtc: number;
  hasExpires: boolean;
  isPersistent: boolean;
  priority: number;
  sameSite: number;
  sourceScheme: number;
}

export interface DumpCookiesOptions {
  domain?: string;
  limit?: number;
}

interface RawCookieRow {
  creation_utc: number;
  host_key: string;
  name: string;
  value: string;
  path: string;
  expires_utc: number;
  is_secure: number;
  is_httponly: number;
  last_access_utc: number;
  has_expires: number;
  is_persistent: number;
  priority: number;
  encrypted_value: Buffer | null;
  samesite: number;
  source_scheme: number;
}

const getCookieDbPath = (browser: SupportedBrowser): string => {
  const currentPlatform = platform() as "darwin" | "win32" | "linux";
  const relativePath = COOKIE_DB_PATHS[browser][currentPlatform];
  return join(homedir(), relativePath);
};

const getSafeStorageKeyDarwin = (browser: SupportedBrowser): string => {
  const serviceName = KEYCHAIN_SERVICE_NAMES[browser];
  const result = execSync(
    `security find-generic-password -w -s "${serviceName}"`,
    { encoding: "utf-8" },
  );
  return result.trim();
};

const trySecretLookup = (command: string): string | null => {
  try {
    const result = execSync(command, { encoding: "utf-8", timeout: 5000 });
    return result.trim() || null;
  } catch {
    return null;
  }
};

const getSafeStorageKeyLinux = (browser: SupportedBrowser): string => {
  const label = LINUX_SECRET_LABELS[browser];

  const lookups = [
    `secret-tool lookup application ${label}`,
    `secret-tool lookup xdg:schema chrome_libsecret_os_crypt_password_v2`,
    `secret-tool lookup xdg:schema chrome_libsecret_os_crypt_password_v1`,
  ];

  for (const command of lookups) {
    const result = trySecretLookup(command);
    if (result) return result;
  }

  return "peanuts";
};

const getSafeStorageKey = (browser: SupportedBrowser): string => {
  if (platform() === "linux") {
    return getSafeStorageKeyLinux(browser);
  }
  return getSafeStorageKeyDarwin(browser);
};

const decryptCookieValue = (
  encryptedData: Buffer,
  safeStorageKey: string,
): string => {
  if (encryptedData.length === 0) {
    return "";
  }

  const hasEncryptedPrefix =
    encryptedData[0] === ENCRYPTED_COOKIE_PREFIX[0] &&
    encryptedData[1] === ENCRYPTED_COOKIE_PREFIX[1] &&
    encryptedData[2] === ENCRYPTED_COOKIE_PREFIX[2];

  if (!hasEncryptedPrefix) {
    return "";
  }

  const iv = Buffer.alloc(AES_BLOCK_SIZE, " ");
  const salt = Buffer.from("saltysalt");
  const iterations =
    platform() === "linux" ? PBKDF2_ITERATIONS_LINUX : PBKDF2_ITERATIONS_DARWIN;

  const key = pbkdf2Sync(safeStorageKey, salt, iterations, AES_KEY_LENGTH, "sha1");
  const encryptedPayload = encryptedData.subarray(3);

  const decipher = createDecipheriv("aes-128-cbc", key, iv);
  decipher.setAutoPadding(false);
  const decrypted = Buffer.concat([
    decipher.update(encryptedPayload),
    decipher.final(),
  ]);

  const paddingLength = decrypted[decrypted.length - 1];
  if (paddingLength < 1 || paddingLength > AES_BLOCK_SIZE) {
    return "";
  }

  for (let index = 0; index < paddingLength; index++) {
    if (decrypted[decrypted.length - 1 - index] !== paddingLength) {
      return "";
    }
  }

  const unpaddedData = decrypted.subarray(0, decrypted.length - paddingLength);
  const valueWithoutDigest =
    platform() === "linux" ? unpaddedData : unpaddedData.subarray(DARWIN_DIGEST_SIZE);

  return valueWithoutDigest.toString("utf-8");
};

export const dumpCookies = (
  browser: SupportedBrowser,
  options?: DumpCookiesOptions,
): DecryptedCookie[] => {
  const dbPath = getCookieDbPath(browser);

  if (!existsSync(dbPath)) {
    throw new Error(`Cookie database not found at ${dbPath}`);
  }

  const safeStorageKey = getSafeStorageKey(browser);
  const database = new Database(dbPath, { readonly: true });

  let query = `
    SELECT creation_utc, host_key, name, value, path, expires_utc, is_secure, is_httponly,
           last_access_utc, has_expires, is_persistent, priority, encrypted_value, samesite, source_scheme
    FROM cookies
  `;

  const params: (string | number)[] = [];

  if (options?.domain) {
    query += ` WHERE host_key LIKE ?`;
    params.push(`%${options.domain}%`);
  }

  if (options?.limit) {
    query += ` LIMIT ?`;
    params.push(options.limit);
  }

  const statement = database.prepare(query);
  const rows = statement.all(...params) as RawCookieRow[];
  database.close();

  const cookies: DecryptedCookie[] = [];

  for (const row of rows) {
    let cookieValue = row.value;

    if (row.encrypted_value && row.encrypted_value.length > 0) {
      cookieValue = decryptCookieValue(row.encrypted_value, safeStorageKey);
    }

    cookies.push({
      creationUtc: row.creation_utc,
      hostKey: row.host_key,
      name: row.name,
      value: cookieValue,
      path: row.path,
      expiresUtc: row.expires_utc,
      isSecure: row.is_secure === 1,
      isHttpOnly: row.is_httponly === 1,
      lastAccessUtc: row.last_access_utc,
      hasExpires: row.has_expires === 1,
      isPersistent: row.is_persistent === 1,
      priority: row.priority,
      sameSite: row.samesite,
      sourceScheme: row.source_scheme,
    });
  }

  return cookies;
};

export const findInstalledBrowsers = (): SupportedBrowser[] => {
  const installedBrowsers: SupportedBrowser[] = [];

  for (const browser of SUPPORTED_BROWSERS) {
    const dbPath = getCookieDbPath(browser);
    if (existsSync(dbPath)) {
      installedBrowsers.push(browser);
    }
  }

  return installedBrowsers;
};

const DEFAULT_BROWSER_BUNDLE_MAP: Record<string, SupportedBrowser> = {
  "com.google.chrome": "chrome",
  "com.microsoft.edgemac": "edge",
  "com.brave.browser": "brave",
  "company.thebrowser.browser": "arc",
  "com.aspect.dia": "dia",
  "net.imput.helium": "helium",
};

export const getDefaultBrowser = (): SupportedBrowser | null => {
  if (platform() !== "darwin") {
    return null;
  }

  try {
    const result = execSync(
      "defaults read ~/Library/Preferences/com.apple.LaunchServices/com.apple.launchservices.secure LSHandlers",
      { encoding: "utf-8", timeout: 5000 },
    );

    const httpsHandlerMatch = result.match(
      /LSHandlerRoleAll\s*=\s*"([^"]+)";\s*LSHandlerURLScheme\s*=\s*https;/,
    );

    if (httpsHandlerMatch) {
      const bundleId = httpsHandlerMatch[1].toLowerCase();
      const browser = DEFAULT_BROWSER_BUNDLE_MAP[bundleId];
      if (browser && findInstalledBrowsers().includes(browser)) {
        return browser;
      }
    }
  } catch {}

  return null;
};
