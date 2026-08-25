interface NavigatorUAData {
  platform: string;
}

export const idle = (
  fn: (deadline?: IdleDeadline) => void,
  { fast = false }: { fast?: boolean } = {},
): void => {
  if (fast) return fn();
  if ("requestIdleCallback" in window) {
    requestIdleCallback(fn, { timeout: 50 });
  } else {
    setTimeout(fn, 1);
  }
};

export const isIOS = (): boolean => {
  if (typeof navigator === "undefined") return false;
  const uaData = (navigator as Navigator & { userAgentData?: NavigatorUAData }).userAgentData;
  if (uaData) {
    return uaData.platform === "iOS";
  }

  const ua = navigator.userAgent || "";
  const isAppleMobile = /iPhone|iPad|iPod/.test(ua);
  const isIPadOS = navigator.maxTouchPoints > 2 && /Macintosh/.test(ua);
  return isAppleMobile || isIPadOS;
};

export const isSafari = (): boolean => {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  const uaLower = ua.toLowerCase();

  const isSafariUA =
    uaLower.includes("safari") &&
    !uaLower.includes("chrome") &&
    !uaLower.includes("crios") &&
    !uaLower.includes("fxios") &&
    !uaLower.includes("android");

  const isWebKit = /applewebkit/i.test(ua);
  const isMobile = /mobile/i.test(ua);
  const missingSafariToken = !/safari/i.test(ua);

  const isUIWebView = isWebKit && isMobile && missingSafariToken;

  const isWeChatUA = /(micromessenger|wxwork|wecom|windowswechat|macwechat)/i.test(ua);

  const isBaiduUA = /(baiduboxapp|baidubrowser|baidusearch|baiduboxlite)/i.test(uaLower);

  const isIOSWebKit = /ipad|iphone|ipod/.test(uaLower) && isWebKit;

  return isSafariUA || isUIWebView || isWeChatUA || isBaiduUA || isIOSWebKit;
};

export const isFirefox = (): boolean => {
  if (typeof navigator === "undefined") return false;
  const ua = (navigator.userAgent || "").toLowerCase();
  return ua.includes("firefox") || ua.includes("fxios");
};
