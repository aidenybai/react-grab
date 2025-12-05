# @react-grab/opencode

Opencode integration for React Grab - Send UI element context directly to the Opencode terminal AI coding agent.

## Installation

### Server Setup

The server runs on port `6567` and interfaces with the Opencode CLI. Add to your `package.json`:

```json
{
  "scripts": {
    "dev": "npx @react-grab/opencode@latest && next dev"
  }
}
```

> **Note:** You must have [Opencode](https://opencode.ai) installed (`npm i -g opencode-ai@latest`).

### Client Setup

```html
<script src="//unpkg.com/react-grab/dist/index.global.js"></script>
<!-- add this in the <head> -->
<script src="//unpkg.com/@react-grab/opencode/dist/client.global.js"></script>
```

Or using Next.js `Script` component in your `app/layout.tsx`:

```jsx
import Script from "next/script";

export default function RootLayout({ children }) {
  return (
    <html>
      <head>
        {process.env.NODE_ENV === "development" && (
          <>
            <Script
              src="//unpkg.com/react-grab/dist/index.global.js"
              strategy="beforeInteractive"
            />
            <Script
              src="//unpkg.com/@react-grab/opencode/dist/client.global.js"
              strategy="lazyOnload"
            />
          </>
        )}
      </head>
      <body>{children}</body>
    </html>
  );
}
```

## Usage

1. Start the Opencode server alongside your dev server
2. Press `Cmd/Ctrl + Shift + E` to activate React Grab
3. Click on any element to select it
4. Type your prompt (e.g., "make this button blue")
5. The prompt will be sent to Opencode with the element context

## Options

You can configure the Opencode agent provider:

```typescript
import { createOpencodeAgentProvider } from "@react-grab/opencode/client";

const provider = createOpencodeAgentProvider({
  serverUrl: "http://localhost:6567", // Custom server URL
  getOptions: () => ({
    model: "claude-sonnet-4-20250514",  // AI model to use
    agent: "build",                      // Agent type: "build" or "plan"
    directory: "/path/to/project",       // Project directory
  }),
});
```

## License

MIT
