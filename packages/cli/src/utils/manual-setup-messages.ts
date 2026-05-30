/**
 * Manual-setup error messages shown when the CLI cannot locate the
 * canonical entry file for a framework. The bodies are static templates,
 * but live here (rather than inline in transform.ts) so they're easier to
 * audit and keep in sync with the docs.
 */

export const NEXT_PAGES_ROUTER_NOT_FOUND_MESSAGE = [
  "Could not find pages/_document.tsx or pages/_document.jsx.",
  "",
  "To set up React Grab with Pages Router, create pages/_document.tsx with:",
  "",
  '  import { Html, Head, Main, NextScript } from "next/document";',
  '  import Script from "next/script";',
  "",
  "  export default function Document() {",
  "    return (",
  "      <Html>",
  "        <Head>",
  '          {process.env.NODE_ENV === "development" && (',
  '            <Script src="//unpkg.com/react-grab/dist/index.global.js" strategy="beforeInteractive" />',
  "          )}",
  "        </Head>",
  "        <body>",
  "          <Main />",
  "          <NextScript />",
  "        </body>",
  "      </Html>",
  "    );",
  "  }",
].join("\n");

export const TANSTACK_ROOT_NOT_FOUND_MESSAGE = [
  "Could not find src/routes/__root.tsx or app/routes/__root.tsx.",
  "",
  "To set up React Grab with TanStack Start, add this to your root route component:",
  "",
  '  import { useEffect } from "react";',
  "",
  "  useEffect(() => {",
  "    if (import.meta.env.DEV) {",
  '      void import("react-grab");',
  "    }",
  "  }, []);",
].join("\n");
