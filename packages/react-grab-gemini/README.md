# @react-grab/gemini

[Gemini CLI](https://github.com/google-gemini/gemini-cli) integration for React Grab.

## Prerequisites

You need to have Gemini CLI installed globally:

```bash
npm install -g @google/gemini-cli
```

## Installation

```bash
npm install @react-grab/gemini
# or
pnpm add @react-grab/gemini
```

## Usage

### 1. Start the server

```bash
npx @react-grab/gemini
```

This will start the React Grab bridge server on port 5568.

### 2. Add the client to your app

Add the client script to your HTML:

```html
<script src="//unpkg.com/@react-grab/gemini/dist/client.global.js"></script>
```

Or import it in your JavaScript:

```javascript
import "@react-grab/gemini/client";
```

### 3. Use React Grab

Once both the server and client are running, React Grab will automatically use Gemini CLI to process your requests when you select elements in your React app.

## How it works

1. The server spawns Gemini CLI with `gemini -p "prompt" --output-format stream-json`
2. It streams the responses back to the browser via Server-Sent Events (SSE)
3. The client attaches to React Grab and forwards element selections to the server

## Configuration

### Server URL

By default, the client connects to `http://localhost:5568`. You can customize this:

```javascript
import { createGeminiAgentProvider } from "@react-grab/gemini/client";

const provider = createGeminiAgentProvider({
  serverUrl: "http://localhost:5568",
});
```

## License

MIT
