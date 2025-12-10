# @react-grab/codex

OpenAI Codex provider for React Grab.

## Installation

```bash
npm install @react-grab/codex
```

## Usage

### Server

The server runs on port `7567` and interfaces with the Codex SDK. Add to your `package.json`:

```json
{
  "scripts": {
    "dev": "npx @react-grab/codex@latest && next dev"
  }
}
```

> **Note:** You must have [Codex](https://github.com/openai/codex) installed (`npm i -g @openai/codex`).

### Client

Add the client script to your HTML:

```html
<script src="//unpkg.com/@react-grab/codex/dist/client.global.js"></script>
```

Or import programmatically:

```ts
import "@react-grab/codex/client";
```

## Features

- **Follow-ups**: Continue conversations with the same thread
- **Undo**: Undo the last change made by Codex
- **Streaming**: Real-time status updates during execution
