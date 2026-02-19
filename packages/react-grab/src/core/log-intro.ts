import { LOGO_SVG } from "../constants.js";
import { isExtensionContext } from "../utils/is-extension-context.js";

export const logIntro = () => {
  try {
    const version = process.env.VERSION;
    const logoDataUri = `data:image/svg+xml;base64,${btoa(LOGO_SVG)}`;
    console.log(
      `%cReact Grab${version ? ` v${version}` : ""}%c\nhttps://react-grab.com`,
      `background: #330039; color: #ffffff; border: 1px solid #d75fcb; padding: 4px 4px 4px 24px; border-radius: 4px; background-image: url("${logoDataUri}"); background-size: 16px 16px; background-repeat: no-repeat; background-position: 4px center; display: inline-block; margin-bottom: 4px;`,
      "",
    );
    if (navigator.onLine && version && !isExtensionContext()) {
      fetch(
        `https://www.react-grab.com/api/version?source=browser&t=${Date.now()}`,
        {
          referrerPolicy: "origin",
          keepalive: true,
          priority: "low",
          cache: "no-store",
        } as RequestInit,
      )
        .then((response) => response.text())
        .then((latestVersion) => {
          if (latestVersion && latestVersion !== version) {
            console.warn(
              `[React Grab] v${version} is outdated (latest: v${latestVersion})`,
            );
          }
        })
        .catch(() => null);
    }
    // HACK: Entire intro log is best-effort; never block initialization
  } catch {}
};
