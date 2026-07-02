let cachedIsAutomatedBrowser: boolean | undefined;

const hasAutomationGlobal = (): boolean => {
  const global = globalThis as Record<string, unknown>;
  return Boolean(
    global.__playwright__ ||
      global.__pwInitScripts ||
      global.__puppeteer__ ||
      global.domAutomation ||
      global.domAutomationController ||
      global._Selenium_IDE_Recorder ||
      global._selenium ||
      global.callSelenium,
  );
};

const hasWebdriverDocumentMarker = (): boolean => {
  if (typeof document === "undefined") return false;
  const markers = document as Document & Record<string, unknown>;
  return Boolean(
    markers.__selenium_unwrapped ||
      markers.__webdriver_evaluate ||
      markers.__driver_evaluate ||
      markers.__fxdriver_evaluate ||
      markers.__webdriver_script_function ||
      // ChromeDriver injects this oddly-named helper array on document.
      markers.$cdc_asdjflasutopfhvcZLmcfl_ ||
      markers.$chrome_asyncScriptInfo,
  );
};

const hasAutomationNavigatorSignal = (): boolean =>
  typeof navigator !== "undefined" &&
  (navigator.webdriver === true || /HeadlessChrome/i.test(navigator.userAgent));

export const isAutomatedBrowser = (): boolean => {
  cachedIsAutomatedBrowser ??=
    hasAutomationNavigatorSignal() || hasAutomationGlobal() || hasWebdriverDocumentMarker();
  return cachedIsAutomatedBrowser;
};
