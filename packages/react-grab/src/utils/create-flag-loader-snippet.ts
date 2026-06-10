export const FLAG_LOADER_QUERY_PARAM = "grab";
export const FLAG_LOADER_STORAGE_KEY = "react-grab:flag-enabled";
export const FLAG_LOADER_DEFAULT_SCRIPT_SRC = "https://unpkg.com/react-grab/dist/index.global.js";

export interface FlagLoaderOptions {
  flag?: string;
  src?: string;
}

export const createFlagLoaderSnippet = (options: FlagLoaderOptions = {}): string => {
  const flag = JSON.stringify(options.flag ?? FLAG_LOADER_QUERY_PARAM);
  const src = JSON.stringify(options.src ?? FLAG_LOADER_DEFAULT_SCRIPT_SRC);
  const storageKey = JSON.stringify(FLAG_LOADER_STORAGE_KEY);
  return `(function () {
  try {
    var flagValue = new URLSearchParams(window.location.search).get(${flag});
    if (flagValue === "1" || flagValue === "true") {
      window.sessionStorage.setItem(${storageKey}, "true");
    } else if (flagValue === "0" || flagValue === "false") {
      window.sessionStorage.removeItem(${storageKey});
    }
    if (window.sessionStorage.getItem(${storageKey}) !== "true") return;
    var script = document.createElement("script");
    script.src = ${src};
    script.crossOrigin = "anonymous";
    document.head.appendChild(script);
  } catch (error) {}
})();`;
};
