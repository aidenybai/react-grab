import { execSync } from "node:child_process";

// Build react-grab's dist once before the Vite and Next dev servers start, so
// neither serves a page that imports a half-written bundle. Replaces the build
// step that used to live in the (single) webServer command.
export default function globalSetup() {
  execSync("pnpm --filter react-grab build", { stdio: "inherit" });
}
