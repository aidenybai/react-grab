import { fileURLToPath } from "node:url";

const REACT_GRAB_DEVELOPMENT_CORE_PATH = fileURLToPath(
  new URL("./e2e-react-grab-development/dist/core/index.js", import.meta.url),
);

export const REACT_GRAB_DEVELOPMENT_ALIASES = {
  "react-grab/core": REACT_GRAB_DEVELOPMENT_CORE_PATH,
  "react-grab/primitives": "@react-grab/e2e-development/primitives",
  "react-grab": "@react-grab/e2e-development",
};
