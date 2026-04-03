import { LOGO_SVG } from "./logo-svg.js";
import { fetchLatestVersion } from "../utils/fetch-latest-version.js";

export const logIntro = () => {
  try {
    const version = process.env.VERSION;
    const logoDataUri = `data:image/svg+xml;base64,${btoa(LOGO_SVG)}`;
    console.log(
      `%cReact Grab${version ? ` v${version}` : ""}%c\nhttps://react-grab.com`,
      `background: #330039; color: #ffffff; border: 1px solid #d75fcb; padding: 4px 4px 4px 24px; border-radius: 4px; background-image: url("${logoDataUri}"); background-size: 16px 16px; background-repeat: no-repeat; background-position: 4px center; display: inline-block; margin-bottom: 4px;`,
      "",
    );
    if (process.env.DISTRIBUTION !== "npm") {
      void fetchLatestVersion().then((latestVersion) => {
        if (latestVersion) {
          console.warn(
            `[React Grab] v${version} is outdated (latest: v${latestVersion})`,
          );
        }
      });
    }
  } catch {}
};
