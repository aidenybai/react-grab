let cachedIsAutomatedBrowser: boolean | undefined;

export const isAutomatedBrowser = (): boolean => {
  cachedIsAutomatedBrowser ??=
    typeof navigator !== "undefined" &&
    (navigator.webdriver === true || /HeadlessChrome/i.test(navigator.userAgent));
  return cachedIsAutomatedBrowser;
};
