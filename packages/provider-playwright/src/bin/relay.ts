#!/usr/bin/env node
import http from "http";
import { createRelay, type PlaywrightRelay } from "../relay";
import { DEFAULT_PORT } from "../constants";

const port = parseInt(process.env.PORT ?? String(DEFAULT_PORT), 10);
const httpPort = port + 1;

const executePlaywrightCode = async (
  relay: PlaywrightRelay,
  code: string,
): Promise<unknown> => {
  const page = {
    evaluate: async (fn: (() => unknown) | string) => {
      const expression = typeof fn === "function" ? `(${fn.toString()})()` : fn;
      const response = await relay.evaluate(expression);
      return (response as { result?: unknown }).result;
    },
    click: (selector: string) => relay.click(selector),
    fill: (selector: string, value: string) => relay.fill(selector, value),
    textContent: (selector: string) => relay.textContent(selector),
    innerText: (selector: string) => relay.innerText(selector),
    innerHTML: (selector: string) => relay.innerHTML(selector),
    getAttribute: (selector: string, name: string) =>
      relay.getAttribute(selector, name),
    isVisible: (selector: string) => relay.isVisible(selector),
    isEnabled: (selector: string) => relay.isEnabled(selector),
    isChecked: (selector: string) => relay.isChecked(selector),
    check: (selector: string) => relay.check(selector),
    uncheck: (selector: string) => relay.uncheck(selector),
    selectOption: (selector: string, values: string | string[]) =>
      relay.selectOption(selector, Array.isArray(values) ? values : [values]),
    hover: (selector: string) => relay.hover(selector),
    focus: (selector: string) => relay.focus(selector),
    blur: (selector: string) => relay.blur(selector),
    screenshot: (options?: { selector?: string; fullPage?: boolean }) =>
      relay.screenshot(options),
    title: () =>
      relay
        .sendCommand("page.title")
        .then((r) => (r as { title?: string }).title),
    url: () =>
      relay
        .sendCommand("page.url")
        .then((r) => (r as { result?: string }).result),
    goto: (url: string) => relay.sendCommand("navigateFrame", { url }),
    reload: () => relay.sendCommand("reload"),
    goBack: () => relay.sendCommand("goBack"),
    goForward: () => relay.sendCommand("goForward"),
    waitForSelector: (
      selector: string,
      options?: {
        state?: "attached" | "detached" | "visible" | "hidden";
        timeout?: number;
      },
    ) => relay.waitForSelector(selector, options),
    waitForTimeout: (timeout: number) =>
      relay.sendCommand("waitForTimeout", { timeout }),
    accessibility: () =>
      relay
        .sendCommand("accessibility.snapshot")
        .then((r) => (r as { tree?: unknown }).tree),
  };

  const asyncFn = new Function(
    "page",
    `return (async () => { return ${code}; })()`,
  );
  return asyncFn(page);
};

const main = async () => {
  const relay = createRelay({
    port,
    onClientConnect: () => console.log("[relay] client connected"),
    onClientDisconnect: () => console.log("[relay] client disconnected"),
    onError: (error) => console.error("[relay] error:", error.message),
  });

  await relay.start();
  console.log(`[relay] WebSocket listening on ws://localhost:${port}`);

  const httpServer = http.createServer(async (req, res) => {
    res.setHeader("Content-Type", "application/json");

    if (req.method === "POST" && req.url === "/exec") {
      let body = "";
      req.on("data", (chunk) => (body += chunk));
      req.on("end", async () => {
        try {
          const { code } = JSON.parse(body) as { code: string };

          if (!relay.isClientConnected()) {
            res.statusCode = 503;
            res.end(
              JSON.stringify({
                success: false,
                error: "No browser client connected",
              }),
            );
            return;
          }

          const result = await executePlaywrightCode(relay, code);
          res.end(JSON.stringify({ success: true, result }));
        } catch (error) {
          res.statusCode = 500;
          res.end(
            JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : String(error),
            }),
          );
        }
      });
    } else if (req.method === "GET" && req.url === "/status") {
      res.end(JSON.stringify({ connected: relay.isClientConnected() }));
    } else {
      res.statusCode = 404;
      res.end(JSON.stringify({ error: "Not found" }));
    }
  });

  httpServer.listen(httpPort, () => {
    console.log(`[relay] HTTP API listening on http://localhost:${httpPort}`);
  });

  const shutdown = async () => {
    console.log("\n[relay] shutting down...");
    httpServer.close();
    await relay.stop();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
};

main().catch((error) => {
  console.error("[relay] failed to start:", error.message);
  process.exit(1);
});
