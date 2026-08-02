let cachedIsNextProject: boolean | undefined;

const hasNextAssetScript = (shouldAllowCrossOrigin = false): boolean => {
  const documentUrl = new URL(document.baseURI);
  return Array.from(document.scripts).some((script) => {
    if (!script.src) return false;
    try {
      const scriptUrl = new URL(script.src, documentUrl);
      return (
        (shouldAllowCrossOrigin || scriptUrl.origin === documentUrl.origin) &&
        scriptUrl.pathname.includes("/_next/static/")
      );
    } catch {
      return false;
    }
  });
};

const hasNextFlightDataScript = (): boolean =>
  Array.from(document.scripts).some((script) => script.textContent?.includes("self.__next_f.push"));

export const isNextProjectRuntime = (shouldRevalidate?: boolean): boolean => {
  if (shouldRevalidate) {
    cachedIsNextProject = undefined;
  }
  cachedIsNextProject ??=
    typeof document !== "undefined" &&
    Boolean(
      document.getElementById("__NEXT_DATA__") ||
      document.querySelector("nextjs-portal") ||
      hasNextAssetScript() ||
      (hasNextFlightDataScript() && hasNextAssetScript(true)),
    );
  return cachedIsNextProject;
};
