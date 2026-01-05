import type { WebSocketRelay } from "./protocol";

class ReactGrabMouse {
  constructor(private relay: WebSocketRelay) {}

  async move(x: number, y: number): Promise<void> {
    await this.relay.send({ method: "mouse.move", x, y });
  }

  async down(options?: { button?: number }): Promise<void> {
    await this.relay.send({ method: "mouse.down", ...options });
  }

  async up(options?: { button?: number }): Promise<void> {
    await this.relay.send({ method: "mouse.up", ...options });
  }

  async click(
    x: number,
    y: number,
    options?: { button?: number; clickCount?: number },
  ): Promise<void> {
    await this.relay.send({ method: "mouse.click", x, y, ...options });
  }

  async dblclick(
    x: number,
    y: number,
    options?: { button?: number },
  ): Promise<void> {
    await this.relay.send({
      method: "mouse.click",
      x,
      y,
      clickCount: 2,
      ...options,
    });
  }

  async wheel(deltaX: number, deltaY: number): Promise<void> {
    await this.relay.send({ method: "mouse.wheel", deltaX, deltaY });
  }
}

class ReactGrabKeyboard {
  constructor(private relay: WebSocketRelay) {}

  async down(key: string): Promise<void> {
    await this.relay.send({ method: "keyboard.down", key });
  }

  async up(key: string): Promise<void> {
    await this.relay.send({ method: "keyboard.up", key });
  }

  async insertText(text: string): Promise<void> {
    await this.relay.send({ method: "keyboard.insertText", text });
  }

  async type(text: string, options?: { delay?: number }): Promise<void> {
    await this.relay.send({ method: "keyboard.type", text, ...options });
  }
}

class ReactGrabTouchscreen {
  constructor(private relay: WebSocketRelay) {}

  async tap(x: number, y: number): Promise<void> {
    await this.relay.send({ method: "touch.tap", x, y });
  }
}

export interface PageDelegate {
  readonly rawMouse: ReactGrabMouse;
  readonly rawKeyboard: ReactGrabKeyboard;
  readonly rawTouchscreen: ReactGrabTouchscreen;

  navigateFrame(
    frameId: string,
    url: string,
    referrer?: string,
  ): Promise<{ newDocumentId?: string }>;
  reload(): Promise<void>;
  goBack(): Promise<boolean>;
  goForward(): Promise<boolean>;
  setViewportSize(viewportSize: {
    width: number;
    height: number;
  }): Promise<void>;
  setContent(frameId: string, html: string): Promise<void>;
  querySelector(
    selector: string,
    frameId?: string,
  ): Promise<{ elementId?: string }>;
  querySelectorAll(
    selector: string,
    frameId?: string,
  ): Promise<{ count: number }>;
  getContentQuads(
    selector: string,
  ): Promise<{ quads: Array<Array<{ x: number; y: number }>> }>;
  getBoundingBox(
    selector: string,
  ): Promise<{ x: number; y: number; width: number; height: number } | null>;
  click(
    selector: string,
    options?: {
      position?: { x: number; y: number };
      button?: number;
      clickCount?: number;
    },
  ): Promise<void>;
  fill(selector: string, value: string): Promise<void>;
  selectText(selector: string): Promise<void>;
  check(selector: string, checked: boolean): Promise<void>;
  selectOption(selector: string, values: string[]): Promise<string[]>;
  focus(selector: string): Promise<void>;
  blur(selector: string): Promise<void>;
  hover(selector: string): Promise<void>;
  scrollIntoViewIfNeeded(selector: string): Promise<void>;
  textContent(selector: string): Promise<string | null>;
  innerText(selector: string): Promise<string>;
  innerHTML(selector: string): Promise<string>;
  getAttribute(selector: string, name: string): Promise<string | null>;
  getProperty(selector: string, name: string): Promise<unknown>;
  isVisible(selector: string): Promise<boolean>;
  isEnabled(selector: string): Promise<boolean>;
  isChecked(selector: string): Promise<boolean>;
  evaluate<T>(expression: string, args?: unknown[]): Promise<T>;
  screenshot(options?: {
    selector?: string;
    fullPage?: boolean;
    clip?: { x: number; y: number; width: number; height: number };
    type?: "png" | "jpeg";
    quality?: number;
  }): Promise<Buffer>;
  waitForSelector(
    selector: string,
    options?: { state?: string; timeout?: number },
  ): Promise<void>;
  waitForFunction(
    expression: string,
    args?: unknown[],
    options?: { timeout?: number },
  ): Promise<unknown>;
}

export class ReactGrabPage implements PageDelegate {
  private relay: WebSocketRelay;
  readonly rawMouse: ReactGrabMouse;
  readonly rawKeyboard: ReactGrabKeyboard;
  readonly rawTouchscreen: ReactGrabTouchscreen;

  constructor(relay: WebSocketRelay) {
    this.relay = relay;
    this.rawMouse = new ReactGrabMouse(relay);
    this.rawKeyboard = new ReactGrabKeyboard(relay);
    this.rawTouchscreen = new ReactGrabTouchscreen(relay);
  }

  async navigateFrame(
    frameId: string,
    url: string,
    referrer?: string,
  ): Promise<{ newDocumentId?: string }> {
    const result = await this.relay.send({
      method: "navigateFrame",
      url,
      frameId,
      referrer,
    });
    return { newDocumentId: result.newDocumentId };
  }

  async reload(): Promise<void> {
    await this.relay.send({ method: "reload" });
  }

  async goBack(): Promise<boolean> {
    const result = await this.relay.send({ method: "goBack" });
    return result.result as boolean;
  }

  async goForward(): Promise<boolean> {
    const result = await this.relay.send({ method: "goForward" });
    return result.result as boolean;
  }

  async setViewportSize(viewportSize: {
    width: number;
    height: number;
  }): Promise<void> {
    await this.relay.send({ method: "setViewportSize", ...viewportSize });
  }

  async setContent(frameId: string, html: string): Promise<void> {
    await this.relay.send({ method: "setContent", html, frameId });
  }

  async querySelector(
    selector: string,
    frameId?: string,
  ): Promise<{ elementId?: string }> {
    const result = await this.relay.send({
      method: "querySelector",
      selector,
      frameId,
    });
    return { elementId: result.elementId };
  }

  async querySelectorAll(
    selector: string,
    frameId?: string,
  ): Promise<{ count: number }> {
    const result = await this.relay.send({
      method: "querySelectorAll",
      selector,
      frameId,
    });
    return { count: result.count ?? 0 };
  }

  async getContentQuads(
    selector: string,
  ): Promise<{ quads: Array<Array<{ x: number; y: number }>> }> {
    const result = await this.relay.send({
      method: "getContentQuads",
      selector,
    });
    return { quads: result.quads ?? [] };
  }

  async getBoundingBox(
    selector: string,
  ): Promise<{ x: number; y: number; width: number; height: number } | null> {
    const result = await this.relay.send({
      method: "getBoundingBox",
      selector,
    });
    if (
      result.x !== undefined &&
      result.y !== undefined &&
      result.width !== undefined &&
      result.height !== undefined
    ) {
      return {
        x: result.x,
        y: result.y,
        width: result.width,
        height: result.height,
      };
    }
    return null;
  }

  async click(
    selector: string,
    options?: {
      position?: { x: number; y: number };
      button?: number;
      clickCount?: number;
    },
  ): Promise<void> {
    await this.relay.send({ method: "click", selector, ...options });
  }

  async fill(selector: string, value: string): Promise<void> {
    await this.relay.send({ method: "fill", selector, value });
  }

  async selectText(selector: string): Promise<void> {
    await this.relay.send({ method: "selectText", selector });
  }

  async check(selector: string, checked: boolean): Promise<void> {
    await this.relay.send({ method: "check", selector, checked });
  }

  async selectOption(selector: string, values: string[]): Promise<string[]> {
    const result = await this.relay.send({
      method: "selectOption",
      selector,
      values,
    });
    return result.selectedValues ?? [];
  }

  async focus(selector: string): Promise<void> {
    await this.relay.send({ method: "focus", selector });
  }

  async blur(selector: string): Promise<void> {
    await this.relay.send({ method: "blur", selector });
  }

  async hover(selector: string): Promise<void> {
    await this.relay.send({ method: "hover", selector });
  }

  async scrollIntoViewIfNeeded(selector: string): Promise<void> {
    await this.relay.send({ method: "scrollIntoView", selector });
  }

  async textContent(selector: string): Promise<string | null> {
    const result = await this.relay.send({ method: "textContent", selector });
    return result.result as string | null;
  }

  async innerText(selector: string): Promise<string> {
    const result = await this.relay.send({ method: "innerText", selector });
    return result.result as string;
  }

  async innerHTML(selector: string): Promise<string> {
    const result = await this.relay.send({ method: "innerHTML", selector });
    return result.result as string;
  }

  async getAttribute(selector: string, name: string): Promise<string | null> {
    const result = await this.relay.send({
      method: "getAttribute",
      selector,
      name,
    });
    return result.result as string | null;
  }

  async getProperty(selector: string, name: string): Promise<unknown> {
    const result = await this.relay.send({
      method: "getProperty",
      selector,
      name,
    });
    return result.result;
  }

  async isVisible(selector: string): Promise<boolean> {
    const result = await this.relay.send({ method: "isVisible", selector });
    return result.result as boolean;
  }

  async isEnabled(selector: string): Promise<boolean> {
    const result = await this.relay.send({ method: "isEnabled", selector });
    return result.result as boolean;
  }

  async isChecked(selector: string): Promise<boolean> {
    const result = await this.relay.send({ method: "isChecked", selector });
    return result.result as boolean;
  }

  async evaluate<T>(expression: string, args?: unknown[]): Promise<T> {
    const result = await this.relay.send({
      method: "evaluate",
      expression,
      args,
    });
    return result.result as T;
  }

  async screenshot(options?: {
    selector?: string;
    fullPage?: boolean;
    clip?: { x: number; y: number; width: number; height: number };
    type?: "png" | "jpeg";
    quality?: number;
  }): Promise<Buffer> {
    const result = await this.relay.send({ method: "screenshot", ...options });
    const base64 = (result.result as string).replace(
      /^data:image\/(png|jpeg);base64,/,
      "",
    );
    return Buffer.from(base64, "base64");
  }

  async waitForSelector(
    selector: string,
    options?: {
      state?: "attached" | "detached" | "visible" | "hidden";
      timeout?: number;
    },
  ): Promise<void> {
    await this.relay.send({ method: "waitForSelector", selector, ...options });
  }

  async waitForFunction(
    expression: string,
    args?: unknown[],
    options?: { timeout?: number },
  ): Promise<unknown> {
    const result = await this.relay.send({
      method: "waitForFunction",
      expression,
      args,
      ...options,
    });
    return result.result;
  }

  async title(): Promise<string> {
    const result = await this.relay.send({ method: "page.title" });
    return (result as unknown as { title: string }).title;
  }

  async url(): Promise<string> {
    const result = await this.relay.send({ method: "page.url" });
    return result.result as string;
  }

  async bringToFront(): Promise<void> {
    await this.relay.send({ method: "page.bringToFront" });
  }

  async close(): Promise<void> {
    await this.relay.send({ method: "page.close" });
  }
}
