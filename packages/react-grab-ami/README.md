# @react-grab/ami

Ami agent provider for React Grab. This is a client-only provider that connects to the ami.dev

## Installation

```bash
npm install @react-grab/ami
# or
pnpm add @react-grab/ami
# or
bun add @react-grab/ami
# or
yarn add @react-grab/ami
```

## Usage

```tsx
import { init } from "react-grab/core";
import { createAmiAgentProvider } from "@react-grab/ami/client";

const agentProvider = createAmiAgentProvider();

init({
  agent: {
    provider: agentProvider,
  },
});
```

## Configuration

You can optionally pass a custom project ID:

```tsx
const agentProvider = createAmiAgentProvider("my-project-id");
```
