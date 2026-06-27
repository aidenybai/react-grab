let cachedIsAutomatedBrowser: boolean | undefined;

const hasAutomationGlobal = (): boolean => {
  const global = globalThis as Record<string, unknown>;
  return Boolean(
    // Playwright injects these when running scripts in the page.
    global.__playwright__ ||
      global.__pwInitScripts ||
      // Puppeteer / generic CDP automation markers.
      global.__puppeteer__ ||
      global.domAutomation ||
      global.domAutomationController ||
      // Selenium / WebDriver markers.
      global._Selenium_IDE_Recorder ||
      global._selenium ||
      global.callSelenium,
  );
};

const hasSeleniumDocumentMarker = (): boolean => {
  if (typeof document === "undefined") return false;
  const documentWithMarkers = document as Document & Record<string, unknown>;
  return Boolean(
    documentWithMarkers.__selenium_unwrapped ||
      documentWithMarkers.__webdriver_evaluate ||
      documentWithMarkers.__driver_evaluate ||
      documentWithMarkers.__fxdriver_evaluate ||
      documentWithMarkers.__webdriver_script_function ||
      // ChromeDriver injects a $cdc_* helper array on document.
      documentWithMarkers.$cdc_asdjflasutopfhvcZLmcfl_ ||
      documentWithMarkers.$chrome_asyncScriptInfo,
  );
};

export const isAutomatedBrowser = (shouldRevalidate?: boolean): boolean => {
  if (shouldRevalidate) {
    cachedIsAutomatedBrowser = undefined;
  }
  if (cachedIsAutomatedBrowser !== undefined) {
    return cachedIsAutomatedBrowser;
  }

  const isWebdriver = typeof navigator !== "undefined" && navigator.webdriver === true;
  const isHeadlessUserAgent =
    typeof navigator !== "undefined" && /HeadlessChrome/i.test(navigator.userAgent);

  cachedIsAutomatedBrowser =
    isWebdriver || isHeadlessUserAgent || hasAutomationGlobal() || hasSeleniumDocumentMarker();
  return cachedIsAutomatedBrowser;
};
