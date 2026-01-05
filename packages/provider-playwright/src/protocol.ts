export type CommandMethod =
  | "navigateFrame"
  | "reload"
  | "goBack"
  | "goForward"
  | "setViewportSize"
  | "setContent"
  | "mouse.move"
  | "mouse.down"
  | "mouse.up"
  | "mouse.click"
  | "mouse.wheel"
  | "keyboard.down"
  | "keyboard.up"
  | "keyboard.insertText"
  | "keyboard.type"
  | "touch.tap"
  | "querySelector"
  | "querySelectorAll"
  | "getContentQuads"
  | "getBoundingBox"
  | "click"
  | "fill"
  | "selectText"
  | "check"
  | "selectOption"
  | "setInputFiles"
  | "focus"
  | "dragAndDrop"
  | "blur"
  | "hover"
  | "scrollIntoView"
  | "textContent"
  | "innerText"
  | "innerHTML"
  | "getAttribute"
  | "getProperty"
  | "isVisible"
  | "isEnabled"
  | "isChecked"
  | "evaluate"
  | "evaluateHandle"
  | "addInitScript"
  | "screenshot"
  | "pdf"
  | "waitForSelector"
  | "waitForFunction"
  | "waitForLoadState"
  | "waitForTimeout"
  | "handleDialog"
  | "getFrames"
  | "getConsoleMessages"
  | "getPageErrors"
  | "video.start"
  | "video.stop"
  | "tracing.start"
  | "tracing.stop"
  | "route.add"
  | "network.getRequests"
  | "network.clearCache"
  | "cookies.get"
  | "cookies.add"
  | "cookies.clear"
  | "storage.get"
  | "storage.set"
  | "storage.clear"
  | "permissions.grant"
  | "permissions.query"
  | "geolocation.set"
  | "emulation.setTimezone"
  | "emulation.setLocale"
  | "emulation.setColorScheme"
  | "emulation.setReducedMotion"
  | "emulation.setOffline"
  | "emulation.setUserAgent"
  | "clipboard.read"
  | "clipboard.write"
  | "accessibility.snapshot"
  | "page.bringToFront"
  | "page.close"
  | "page.title"
  | "page.url"
  | "exposeFunction"
  | "exposeFunction.resolve"
  | "expect.toBeVisible"
  | "expect.toBeHidden"
  | "expect.toHaveText"
  | "expect.toHaveValue"
  | "expect.toHaveAttribute"
  | "expect.toHaveClass"
  | "expect.toBeEnabled"
  | "expect.toBeChecked"
  | "expect.toHaveCount"
  | "ping";

export interface Command {
  id: string;
  method: CommandMethod;

  url?: string;
  frameId?: string;
  referrer?: string;
  html?: string;

  width?: number;
  height?: number;

  x?: number;
  y?: number;
  deltaX?: number;
  deltaY?: number;
  button?: number;
  clickCount?: number;

  key?: string;
  code?: string;
  text?: string;
  delay?: number;
  modifiers?: {
    shift?: boolean;
    ctrl?: boolean;
    alt?: boolean;
    meta?: boolean;
  };

  selector?: string;
  position?: { x: number; y: number };

  value?: string;
  values?: string[];
  checked?: boolean;

  files?: Array<{
    name: string;
    mimeType: string;
    buffer: ArrayBuffer;
  }>;

  name?: string;

  expression?: string;
  script?: string;
  args?: unknown[];

  fullPage?: boolean;
  clip?: { x: number; y: number; width: number; height: number };
  type?: "png" | "jpeg";
  quality?: number;
  omitBackground?: boolean;
  animations?: "disabled" | "allow";

  scale?: number;
  displayHeaderFooter?: boolean;
  printBackground?: boolean;
  landscape?: boolean;
  format?: string;

  state?: "attached" | "detached" | "visible" | "hidden";
  timeout?: number;

  action?: "accept" | "dismiss";
  promptText?: string;

  sourceSelector?: string;
  targetSelector?: string;
  sourcePosition?: { x: number; y: number };
  targetPosition?: { x: number; y: number };

  storageType?: "local" | "session";
  entries?: Array<{ name: string; value: string }>;

  cookies?: Array<{
    name: string;
    value: string;
    path?: string;
    domain?: string;
    expires?: number;
    secure?: boolean;
    sameSite?: "Strict" | "Lax" | "None";
  }>;

  permissions?: string[];
  latitude?: number;
  longitude?: number;
  accuracy?: number;

  timezoneId?: string;
  locale?: string;
  colorScheme?: "light" | "dark";
  reducedMotion?: "reduce" | "no-preference";
  offline?: boolean;
  userAgent?: string;

  root?: string;
  interestingOnly?: boolean;

  expected?: string | string[] | number;
  useInnerText?: boolean;

  callId?: string;
  result?: unknown;
}

export interface Response {
  id: string;
  success: boolean;
  error?: string;

  newDocumentId?: string;

  found?: boolean;
  elementId?: string;
  count?: number;
  quads?: Array<Array<{ x: number; y: number }>>;

  x?: number;
  y?: number;
  width?: number;
  height?: number;

  result?: unknown;

  selectedValues?: string[];

  handleId?: string;

  frames?: Array<{ id: string; url: string; name: string }>;

  messages?: unknown[];
  errors?: unknown[];

  pass?: boolean;
  message?: string;
  actual?: unknown;

  title?: string;
  tree?: unknown;
  entries?: Array<{ name: string; value: string }>;
  cookies?: Array<{
    name: string;
    value: string;
    domain: string;
    path: string;
    expires: number;
    httpOnly: boolean;
    secure: boolean;
    sameSite: "Strict" | "Lax" | "None";
  }>;
  requests?: Array<{
    url: string;
    type: string;
    duration: number;
    size: number;
    startTime: number;
  }>;
}

export interface WebSocketRelay {
  send(command: Omit<Command, "id">): Promise<Response>;
  close(): void;
  isConnected(): boolean;
}

export interface ClientReadyMessage {
  type: "client-ready";
}

export interface RelayReadyMessage {
  type: "relay-ready";
}

export type Message =
  | Command
  | Response
  | ClientReadyMessage
  | RelayReadyMessage;
