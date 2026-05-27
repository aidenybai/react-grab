interface ThemeWatcherResult {
  theme: "dark";
  cleanup: () => void;
}

export const watchAppTheme = (
  host: HTMLElement,
  onChange?: (reactGrabTheme: "dark") => void,
): ThemeWatcherResult => {
  host.setAttribute("data-rg-theme", "dark");
  onChange?.("dark");

  return {
    theme: "dark",
    cleanup: () => {},
  };
};
