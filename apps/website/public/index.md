# React Grab

> Grab any element in your app and give it to Cursor, Claude Code, or other AI coding agents.

React Grab is an open-source dev-only script that adds an element picker to React apps in development. Hover any element, press a hotkey, and the file path, component name, and HTML source are copied to your clipboard ready to paste into your agent.

## How It Works

Once installed, hover over any UI element in your browser and press:

- **⌘C** (Cmd+C) on Mac
- **Ctrl+C** on Windows/Linux

The element's context (file name, React component, and HTML source) is copied to your clipboard. For example:

```
<a class="ml-auto inline-block text-sm" href="#">
  Forgot your password?
</a>
in LoginForm at components/login-form.tsx:46:19
```

## Quick Install

Run this command at your project root:

```bash
npx grab@latest init -y
```

The CLI auto-detects your framework and configures everything.

## Links

- [Install guide](https://react-grab.com/install.md)
- [Full documentation](https://react-grab.com/llms-full.txt)
- [Changelog](https://react-grab.com/changelog.md)
- [Privacy policy](https://react-grab.com/privacy.md)
- [Sitemap](https://react-grab.com/sitemap.md)
- [GitHub repository](https://github.com/aidenybai/react-grab)
- [Discord community](https://discord.com/invite/G7zxfUzkm7)
