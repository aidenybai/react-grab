import type { Cookie as PlaywrightCookie } from "playwright-core";
import type { DecryptedCookie } from "./cookies.js";
import { CHROME_EPOCH_OFFSET_SECONDS } from "./constants.js";

const SAME_SITE_MAP: Record<number, "Strict" | "Lax" | "None"> = {
  0: "None",
  1: "Lax",
  2: "Strict",
};

export const toPlaywrightCookies = (
  cookies: DecryptedCookie[],
): PlaywrightCookie[] => {
  return cookies
    .filter((cookie) => cookie.value)
    .map((cookie) => {
      let expiresUnixSeconds: number | undefined;

      if (cookie.hasExpires && cookie.expiresUtc > 0) {
        const chromeSeconds = cookie.expiresUtc / 1000000;
        expiresUnixSeconds = chromeSeconds - CHROME_EPOCH_OFFSET_SECONDS;
      }

      return {
        name: cookie.name,
        value: cookie.value,
        domain: cookie.hostKey,
        path: cookie.path || "/",
        expires: expiresUnixSeconds ?? -1,
        httpOnly: cookie.isHttpOnly,
        secure: cookie.isSecure,
        sameSite: SAME_SITE_MAP[cookie.sameSite] || "Lax",
      };
    });
};
