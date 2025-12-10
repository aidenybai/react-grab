import { Command } from "commander";
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import {
  createProxyMiddleware,
  responseInterceptor,
} from "http-proxy-middleware";
import prompts from "prompts";
import { highlighter } from "../utils/highlighter.js";
import { logger } from "../utils/logger.js";
import { spinner } from "../utils/spinner.js";

const DEFAULT_PROXY_PORT = 2000;
const REACT_GRAB_SCRIPT =
  '<script src="//unpkg.com/react-grab/dist/index.global.js"></script>';

const buildProviderScript = (provider: string): string =>
  `<script src="//unpkg.com/${provider}/dist/client.global.js"></script>`;

const findAvailablePort = async (
  startingPort: number,
  hostname: string,
): Promise<number> => {
  return new Promise((resolve) => {
    const server = createServer();
    server.listen(startingPort, hostname, () => {
      server.close(() => resolve(startingPort));
    });
    server.on("error", () => {
      resolve(findAvailablePort(startingPort + 1, hostname));
    });
  });
};

const parseTargetUrl = (urlInput: string): string => {
  if (urlInput.startsWith("http://") || urlInput.startsWith("https://")) {
    return urlInput;
  }
  return `http://${urlInput}`;
};

const resolveTargetUrl = async (initialUrl: string): Promise<string> => {
  try {
    const response = await fetch(initialUrl, {
      method: "HEAD",
      redirect: "follow",
    });
    return response.url;
  } catch {
    return initialUrl;
  }
};

export const start = new Command()
  .name("start")
  .alias("proxy")
  .description("start a proxy server for a given URL")
  .argument("[url]", "target URL to proxy (e.g., localhost:3000)")
  .option(
    "-p, --port <port>",
    "starting port for the proxy server",
    String(DEFAULT_PROXY_PORT),
  )
  .option(
    "--host <hostname>",
    "hostname to bind the proxy server to",
    "localhost",
  )
  .option(
    "--provider <package>",
    "provider package to run via npx (e.g., @react-grab/cursor)",
  )
  .action(async (urlArg, opts) => {
    let url = urlArg;
    let provider = opts.provider;

    if (!url) {
      const { targetUrl: promptedUrl } = await prompts({
        type: "text",
        name: "targetUrl",
        message: "Enter the target URL to proxy:",
        initial: "localhost:3000",
      });

      if (!promptedUrl) {
        logger.break();
        process.exit(1);
      }

      url = promptedUrl;

      if (!provider) {
        const { selectedProvider } = await prompts({
          type: "select",
          name: "selectedProvider",
          message: `Select a ${highlighter.info("provider")} to use:`,
          choices: [
            { title: "None", value: "" },
            { title: "Claude Code", value: "@react-grab/claude-code" },
            { title: "Cursor", value: "@react-grab/cursor" },
            { title: "Opencode", value: "@react-grab/opencode" },
            { title: "Codex", value: "@react-grab/codex" },
            { title: "Gemini", value: "@react-grab/gemini" },
            { title: "Ami", value: "@react-grab/ami" },
          ],
        });

        if (selectedProvider === undefined) {
          logger.break();
          process.exit(1);
        }

        provider = selectedProvider || undefined;
      }

      logger.break();
    }

    const parsedUrl = parseTargetUrl(url);
    const targetUrl = await resolveTargetUrl(parsedUrl);
    const startingPort = parseInt(opts.port, 10);
    const hostname = opts.host || "localhost";

    if (isNaN(startingPort) || startingPort < 1 || startingPort > 65535) {
      logger.break();
      logger.error(
        "Invalid port number. Please provide a port between 1 and 65535.",
      );
      logger.break();
      process.exit(1);
    }

    const proxyPort = await findAvailablePort(startingPort, hostname);

    const scriptsToInject = provider
      ? REACT_GRAB_SCRIPT + buildProviderScript(provider)
      : REACT_GRAB_SCRIPT;

    const injectScript = (html: string): string => {
      const headCloseIndex = html.indexOf("</head>");
      if (headCloseIndex !== -1) {
        return (
          html.slice(0, headCloseIndex) +
          scriptsToInject +
          html.slice(headCloseIndex)
        );
      }
      const bodyCloseIndex = html.indexOf("</body>");
      if (bodyCloseIndex !== -1) {
        return (
          html.slice(0, bodyCloseIndex) +
          scriptsToInject +
          html.slice(bodyCloseIndex)
        );
      }
      return html + scriptsToInject;
    };

    const proxyMiddleware = createProxyMiddleware({
      target: targetUrl,
      changeOrigin: true,
      followRedirects: false,
      ws: true,
      selfHandleResponse: true,
      cookieDomainRewrite: {
        "*": "",
      },
      autoRewrite: true,
      preserveHeaderKeyCase: true,
      xfwd: true,
      on: {
        error: (_error, _request, response) => {
          if ("writeHead" in response && !response.headersSent) {
            response.writeHead(503, { "Content-Type": "text/plain" });
            response.end(`Proxy error: Unable to connect to ${targetUrl}`);
          }
        },
        proxyReq: (proxyRequest) => {
          proxyRequest.removeHeader("accept-encoding");
        },
        proxyRes: responseInterceptor(async (responseBuffer, proxyResponse) => {
          const contentType = proxyResponse.headers["content-type"] || "";
          const isHtml = contentType.includes("text/html");

          if (!isHtml) {
            return responseBuffer;
          }

          const html = responseBuffer.toString("utf-8");
          return injectScript(html);
        }),
      },
    });

    const server = createServer((request, response) => {
      proxyMiddleware(request, response, (error) => {
        if (error) {
          logger.error(`Request error: ${error}`);
          response.writeHead(500);
          response.end("Internal Server Error");
        }
      });
    });

    server.on("upgrade", proxyMiddleware.upgrade!);

    const startSpinner = spinner("Starting.").start();

    const showSuccess = () => {
      startSpinner.succeed(`Open in your browser: http://${hostname}:${proxyPort}`);

      const commandParts = ["npx react-grab@latest start", url];
      if (opts.port !== String(DEFAULT_PROXY_PORT)) {
        commandParts.push(`--port=${opts.port}`);
      }
      if (hostname !== "localhost") {
        commandParts.push(`--host=${hostname}`);
      }
      if (provider) {
        commandParts.push(`--provider=${provider}`);
      }
      logger.break();
      logger.log(highlighter.dim(`$ ${commandParts.join(" ")}`));
    };

    let isServerReady = false;
    let isProviderReady = !provider;

    const checkReady = () => {
      if (isServerReady && isProviderReady) {
        showSuccess();
      }
    };

    server.listen(proxyPort, hostname, () => {
      isServerReady = true;
      checkReady();
    });

    if (provider) {
      const providerProcess = spawn("npx", [`${provider}@latest`], {
        stdio: "ignore",
        shell: true,
        detached: false,
      });

      const cleanup = () => {
        if (!providerProcess.killed) {
          providerProcess.kill();
        }
      };

      process.on("exit", cleanup);
      process.on("SIGINT", () => {
        cleanup();
        process.exit(0);
      });
      process.on("SIGTERM", () => {
        cleanup();
        process.exit(0);
      });

      providerProcess.on("error", (error) => {
        startSpinner.fail(`Failed to start provider: ${error.message}`);
      });

      providerProcess.on("spawn", () => {
        isProviderReady = true;
        checkReady();
      });

      providerProcess.on("close", (code) => {
        if (code !== 0 && code !== null) {
          logger.error(`Provider exited with code ${code}`);
        }
      });
    }

    server.on("error", (error) => {
      logger.break();
      logger.error(`Server error: ${error.message}`);
      logger.break();
      process.exit(1);
    });
  });
