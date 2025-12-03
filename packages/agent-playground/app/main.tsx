import { createRoot } from "react-dom/client";
import { App } from "./App";

const PROVIDER = import.meta.env.VITE_PROVIDER ?? "claude";
console.log("PROVIDER", PROVIDER);

const loadProvider = async () => {
  if (PROVIDER === "ami") {
    return await import("@react-grab/ami/client");
  } else if (PROVIDER === "cursor") {
    return await import("@react-grab/cursor/client");
  } else if (PROVIDER === "claude") {
    return await import("@react-grab/claude-code/client");
  }
  throw new Error(`Unknown provider: ${PROVIDER}`);
};

loadProvider().then((mod) => {
  mod.attachAgent();
  createRoot(document.getElementById("root")!).render(<App />);
});
