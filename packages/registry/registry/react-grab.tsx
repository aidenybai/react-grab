"use client";

import Script from "next/script";

export const ReactGrab = () => {
  if (process.env.NODE_ENV !== "development") return null;
  return (
    <Script
      src="//unpkg.com/react-grab/dist/index.global.js"
      crossOrigin="anonymous"
      strategy="beforeInteractive"
    />
  );
};
