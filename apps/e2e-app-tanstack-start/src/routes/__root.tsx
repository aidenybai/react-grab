import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { ReactGrabClient } from "../react-grab-client";

const RootDocument = (props: Readonly<{ children: ReactNode }>) => (
  <html lang="en">
    <head>
      <HeadContent />
    </head>
    <body style={{ margin: 0, fontFamily: "system-ui, sans-serif" }}>
      {props.children}
      <ReactGrabClient />
      <Scripts />
    </body>
  </html>
);

const RootComponent = () => (
  <RootDocument>
    <Outlet />
  </RootDocument>
);

export const Route = createRootRoute({
  component: RootComponent,
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "React Grab E2E (TanStack Start)" },
    ],
  }),
});
