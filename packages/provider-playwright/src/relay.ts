import { WebSocketServer, WebSocket } from "ws";
import type { Command, Response, Message, CommandMethod } from "./protocol";
import { DEFAULT_PORT, COMMAND_TIMEOUT_MS } from "./constants";

export interface RelayOptions {
  port?: number;
  onClientConnect?: () => void;
  onClientDisconnect?: () => void;
  onError?: (error: Error) => void;
}

export interface PlaywrightRelay {
  start: () => Promise<void>;
  stop: () => Promise<void>;
  waitForClient: () => Promise<void>;
  isClientConnected: () => boolean;
  sendCommand: (
    method: CommandMethod,
    params?: Partial<Omit<Command, "id" | "method">>,
  ) => Promise<Response>;
  click: (selector: string) => Promise<Response>;
  fill: (selector: string, value: string) => Promise<Response>;
  textContent: (selector: string) => Promise<Response>;
  innerText: (selector: string) => Promise<Response>;
  innerHTML: (selector: string) => Promise<Response>;
  getAttribute: (selector: string, name: string) => Promise<Response>;
  waitForSelector: (
    selector: string,
    options?: {
      state?: "attached" | "detached" | "visible" | "hidden";
      timeout?: number;
    },
  ) => Promise<Response>;
  evaluate: (expression: string, args?: unknown[]) => Promise<Response>;
  screenshot: (options?: {
    selector?: string;
    fullPage?: boolean;
  }) => Promise<Response>;
  isVisible: (selector: string) => Promise<Response>;
  isEnabled: (selector: string) => Promise<Response>;
  isChecked: (selector: string) => Promise<Response>;
  focus: (selector: string) => Promise<Response>;
  blur: (selector: string) => Promise<Response>;
  hover: (selector: string) => Promise<Response>;
  check: (selector: string, checked?: boolean) => Promise<Response>;
  uncheck: (selector: string) => Promise<Response>;
  selectOption: (selector: string, values: string[]) => Promise<Response>;
}

export const createRelay = (options: RelayOptions = {}): PlaywrightRelay => {
  const port = options.port ?? DEFAULT_PORT;

  let server: WebSocketServer | null = null;
  let clientSocket: WebSocket | null = null;
  let isClientReady = false;
  let clientReadyResolvers: Array<() => void> = [];
  const pendingCommands = new Map<
    string,
    { resolve: (response: Response) => void; reject: (error: Error) => void }
  >();

  const handleClientMessage = (data: Buffer) => {
    try {
      const message: Message = JSON.parse(data.toString());

      if ("type" in message && message.type === "client-ready") {
        isClientReady = true;
        for (const resolver of clientReadyResolvers) {
          resolver();
        }
        clientReadyResolvers = [];
        return;
      }

      if ("id" in message && "success" in message) {
        const response = message as Response;
        const pending = pendingCommands.get(response.id);
        if (pending) {
          pending.resolve(response);
          pendingCommands.delete(response.id);
        }
      }
    } catch (error) {
      options.onError?.(
        error instanceof Error ? error : new Error(String(error)),
      );
    }
  };

  const start = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      try {
        server = new WebSocketServer({ port });

        server.on("connection", (socket) => {
          clientSocket = socket;
          isClientReady = false;

          socket.on("message", handleClientMessage);

          socket.on("close", () => {
            clientSocket = null;
            isClientReady = false;
            options.onClientDisconnect?.();
          });

          socket.on("error", (error) => {
            options.onError?.(error);
          });

          const readyMessage = { type: "relay-ready" };
          socket.send(JSON.stringify(readyMessage));
          options.onClientConnect?.();
        });

        server.on("listening", () => {
          resolve();
        });

        server.on("error", (error) => {
          reject(error);
        });
      } catch (error) {
        reject(error);
      }
    });
  };

  const stop = (): Promise<void> => {
    return new Promise((resolve) => {
      for (const [id, pending] of pendingCommands) {
        pending.reject(new Error("Relay stopped"));
        pendingCommands.delete(id);
      }

      if (clientSocket) {
        clientSocket.close();
        clientSocket = null;
      }

      if (server) {
        server.close(() => {
          server = null;
          resolve();
        });
      } else {
        resolve();
      }
    });
  };

  const waitForClient = (): Promise<void> => {
    if (isClientReady) {
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      clientReadyResolvers.push(resolve);
    });
  };

  const isClientConnected = () =>
    isClientReady && clientSocket?.readyState === WebSocket.OPEN;

  const sendCommand = (
    method: CommandMethod,
    params: Partial<Omit<Command, "id" | "method">> = {},
  ): Promise<Response> => {
    return new Promise((resolve, reject) => {
      if (!isClientConnected()) {
        reject(new Error("Client not connected"));
        return;
      }

      const commandId = crypto.randomUUID();
      const command: Command = { id: commandId, method, ...params };

      const timeoutId = setTimeout(() => {
        pendingCommands.delete(commandId);
        reject(new Error(`Command ${method} timed out`));
      }, COMMAND_TIMEOUT_MS);

      pendingCommands.set(commandId, {
        resolve: (response) => {
          clearTimeout(timeoutId);
          resolve(response);
        },
        reject: (error) => {
          clearTimeout(timeoutId);
          reject(error);
        },
      });

      clientSocket!.send(JSON.stringify(command));
    });
  };

  const click = (selector: string) => sendCommand("click", { selector });

  const fill = (selector: string, value: string) =>
    sendCommand("fill", { selector, value });

  const textContent = (selector: string) =>
    sendCommand("textContent", { selector });

  const innerText = (selector: string) =>
    sendCommand("innerText", { selector });

  const innerHTML = (selector: string) =>
    sendCommand("innerHTML", { selector });

  const getAttribute = (selector: string, name: string) =>
    sendCommand("getAttribute", { selector, name });

  const waitForSelector = (
    selector: string,
    options?: {
      state?: "attached" | "detached" | "visible" | "hidden";
      timeout?: number;
    },
  ) => sendCommand("waitForSelector", { selector, ...options });

  const isEnabled = (selector: string) =>
    sendCommand("isEnabled", { selector });

  const isChecked = (selector: string) =>
    sendCommand("isChecked", { selector });

  const uncheck = (selector: string) =>
    sendCommand("check", { selector, checked: false });

  const evaluate = (expression: string, args?: unknown[]) =>
    sendCommand("evaluate", { expression, args });

  const screenshot = (options?: { selector?: string; fullPage?: boolean }) =>
    sendCommand("screenshot", options);

  const isVisible = (selector: string) =>
    sendCommand("isVisible", { selector });

  const focus = (selector: string) => sendCommand("focus", { selector });

  const blur = (selector: string) => sendCommand("blur", { selector });

  const hover = (selector: string) => sendCommand("hover", { selector });

  const check = (selector: string, checked = true) =>
    sendCommand("check", { selector, checked });

  const selectOption = (selector: string, values: string[]) =>
    sendCommand("selectOption", { selector, values });

  return {
    start,
    stop,
    waitForClient,
    isClientConnected,
    sendCommand,
    click,
    fill,
    textContent,
    innerText,
    innerHTML,
    getAttribute,
    waitForSelector,
    evaluate,
    screenshot,
    isVisible,
    isEnabled,
    isChecked,
    focus,
    blur,
    hover,
    check,
    uncheck,
    selectOption,
  };
};
