"use client";

import { useEffect } from "react";

const SCRIPT_ID = "react-grab-script";
const SCRIPT_SRC = "//unpkg.com/react-grab/dist/index.global.js";

export const ReactGrab = () => {
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    if (document.getElementById(SCRIPT_ID)) return;
    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = SCRIPT_SRC;
    script.crossOrigin = "anonymous";
    document.head.appendChild(script);
  }, []);
  return null;
};
