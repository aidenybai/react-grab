# React Grab

Grab any element in your app and give it to Cursor, Claude Code, or other AI coding agents.

## OBJECTIVE

Install React Grab in a React project to enable element grabbing for AI coding agents.

## DONE WHEN

- [ ] React Grab package is installed
- [ ] Framework integration is configured (Next.js, Vite, or Webpack)
- [ ] Running the dev server shows the grab overlay when pressing the activation key

## INSTALLATION

### CLI (Recommended)

Run this command at your project root. Use the `-y` flag to skip interactive prompts:

```bash
npx -y grab@latest init -y
```

The CLI will auto-detect your framework and configure everything automatically.

### Init Options

```
Options:
  -f, --framework        Override detected framework [choices: "next", "vite", "webpack"]
  -p, --package-manager  Override detected package manager [choices: "npm", "yarn", "pnpm", "bun"]
  -r, --router           Next.js router type [choices: "app", "pages"]
  -k, --key              Activation key (e.g., "Meta+K", "Ctrl+Shift+G", "Space")
  -y, --yes              Skip all prompts and use auto-detected/default values
      --skip-install     Only modify config files, skip package install
```

### Examples

```bash
npx -y grab@latest init -y                         # Auto-detect and install without prompts
npx -y grab@latest init -f next -r app -y          # Configure for Next.js App Router
npx -y grab@latest init -k "Meta+K" -y             # Set activation key to Cmd+K / Win+K
```

## MANUAL INSTALLATION

If CLI fails, install manually based on your framework:

### 1. Install the package

```bash
npm install react-grab@latest
# or yarn add react-grab@latest
# or pnpm add react-grab@latest
# or bun add react-grab@latest
```

### 2. Configure for your framework

#### Next.js (App Router)

Add to `app/layout.tsx`:

```jsx
import Script from "next/script";

export default function RootLayout({ children }) {
  return (
    <html>
      <head>
        {process.env.NODE_ENV === "development" && (
          <Script
            src="//unpkg.com/react-grab/dist/index.global.js"
            crossOrigin="anonymous"
            strategy="beforeInteractive"
          />
        )}
      </head>
      <body>{children}</body>
    </html>
  );
}
```

#### Next.js (Pages Router)

Add to `pages/_document.tsx`:

```jsx
import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {process.env.NODE_ENV === "development" && (
          <Script
            src="//unpkg.com/react-grab/dist/index.global.js"
            crossOrigin="anonymous"
            strategy="beforeInteractive"
          />
        )}
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
```

#### Vite

Add to `index.html`:

```html
<head>
  <script type="module">
    if (import.meta.env.DEV) {
      import("react-grab");
    }
  </script>
</head>
```

#### Webpack

Add to your main entry file (e.g., `src/index.tsx`):

```tsx
if (process.env.NODE_ENV === "development") {
  import("react-grab");
}
```

## VERIFICATION

1. Start your development server
2. Open your app in the browser
3. Hover over any UI element and press **Cmd+C** (Mac) or **Ctrl+C** (Windows/Linux)
4. The element's context should be copied to your clipboard

Expected clipboard output format:

```
<a class="ml-auto inline-block text-sm" href="#">
  Forgot your password?
</a>
in LoginForm at components/login-form.tsx:46:19
```

## CONFIGURATION (OPTIONAL)

Customize React Grab behavior:

```bash
npx -y grab@latest config -k "Meta+K"              # Set activation key to Cmd+K / Win+K
npx -y grab@latest config -m hold --hold-duration 150   # Use hold mode with 150ms delay
npx -y grab@latest config --context-lines 5        # Include 5 lines of context
```

## TROUBLESHOOTING

- **Overlay not showing**: Ensure you're in development mode (`NODE_ENV=development`)
- **Copy not working**: Check if another extension is capturing the keyboard shortcut
- **Framework not detected**: Use `-f` flag to specify framework manually

## RESOURCES

- Documentation: https://react-grab.com/llms.txt
- GitHub: https://github.com/aidenybai/react-grab
