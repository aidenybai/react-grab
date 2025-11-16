import { InstallTabsClient } from "./install-tabs-client";

interface InstallTab {
  id: string;
  label: string;
  fileName: string;
  description: string;
  code: string;
  changedLines?: number[];
}

export const installTabsData: InstallTab[] = [
  {
    id: "next-app",
    label: "Next.js (App)",
    fileName: "app/layout.tsx",
    description: "Add this inside of your app/layout.tsx:",
    code: `import Script from "next/script";

export default function RootLayout({ children }) {
  return (
    <html>
      <head>
        {/* put this in the <head> */}
        {process.env.NODE_ENV === "development" && (
          <Script
            src="//unpkg.com/react-grab/dist/index.global.js"
            crossOrigin="anonymous"
            strategy="beforeInteractive"
            data-enabled="true"
          />
        )}
        {/* rest of your scripts go under */}
      </head>
      <body>{children}</body>
    </html>
  );
}`,
    changedLines: [8, 9, 10, 11, 12, 13, 14, 15],
  },
  {
    id: "next-pages",
    label: "Next.js (Pages)",
    fileName: "pages/_document.tsx",
    description: "Add this into your pages/_document.tsx:",
    code: `import { Html, Head, Main, NextScript } from "next/document";
import Script from "next/script";

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* put this in the <Head> */}
        {process.env.NODE_ENV === "development" && (
          <Script
            src="//unpkg.com/react-grab/dist/index.global.js"
            crossOrigin="anonymous"
            strategy="beforeInteractive"
            data-enabled="true"
          />
        )}
        {/* rest of your scripts go under */}
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}`,
    changedLines: [9, 10, 11, 12, 13, 14, 15, 16],
  },
  {
    id: "vite",
    label: "Vite",
    fileName: "index.html",
    description: "Example index.html with React Grab enabled in development:",
    code: `<!doctype html>
<html lang="en">
  <head>
    <script type="module">
      // first npm i react-grab
      // then in head:
      if (import.meta.env.DEV) {
        import("react-grab");
      }
    </script>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`,
    changedLines: [4, 5, 6, 7, 8, 9, 10],
  },
];

export { InstallTabsClient as InstallTabs };
