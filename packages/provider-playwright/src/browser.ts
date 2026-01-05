import type { WebSocketRelay } from "./protocol";
import { ReactGrabPage } from "./page-delegate";

export interface BrowserContextOptions {
  viewport?: { width: number; height: number };
  userAgent?: string;
  locale?: string;
  timezoneId?: string;
  colorScheme?: "light" | "dark";
  reducedMotion?: "reduce" | "no-preference";
  geolocation?: { latitude: number; longitude: number; accuracy?: number };
  permissions?: string[];
  offline?: boolean;
}

export class ReactGrabBrowserContext {
  private relay: WebSocketRelay;
  private pages: ReactGrabPage[] = [];
  private options: BrowserContextOptions;

  constructor(relay: WebSocketRelay, options: BrowserContextOptions = {}) {
    this.relay = relay;
    this.options = options;
  }

  async newPage(): Promise<ReactGrabPage> {
    const page = new ReactGrabPage(this.relay);

    if (this.options.viewport) {
      await this.relay.send({
        method: "setViewportSize",
        width: this.options.viewport.width,
        height: this.options.viewport.height,
      });
    }

    if (this.options.userAgent) {
      await this.relay.send({
        method: "emulation.setUserAgent",
        userAgent: this.options.userAgent,
      });
    }

    if (this.options.locale) {
      await this.relay.send({
        method: "emulation.setLocale",
        locale: this.options.locale,
      });
    }

    if (this.options.timezoneId) {
      await this.relay.send({
        method: "emulation.setTimezone",
        timezoneId: this.options.timezoneId,
      });
    }

    if (this.options.colorScheme) {
      await this.relay.send({
        method: "emulation.setColorScheme",
        colorScheme: this.options.colorScheme,
      });
    }

    if (this.options.reducedMotion) {
      await this.relay.send({
        method: "emulation.setReducedMotion",
        reducedMotion: this.options.reducedMotion,
      });
    }

    if (this.options.geolocation) {
      await this.relay.send({
        method: "geolocation.set",
        latitude: this.options.geolocation.latitude,
        longitude: this.options.geolocation.longitude,
        accuracy: this.options.geolocation.accuracy,
      });
    }

    if (this.options.permissions) {
      await this.relay.send({
        method: "permissions.grant",
        permissions: this.options.permissions,
      });
    }

    if (this.options.offline !== undefined) {
      await this.relay.send({
        method: "emulation.setOffline",
        offline: this.options.offline,
      });
    }

    this.pages.push(page);
    return page;
  }

  getPages(): ReactGrabPage[] {
    return [...this.pages];
  }

  async close(): Promise<void> {
    for (const page of this.pages) {
      await page.close();
    }
    this.pages = [];
  }
}

export class ReactGrabBrowser {
  private relay: WebSocketRelay;
  private contexts: ReactGrabBrowserContext[] = [];

  constructor(relay: WebSocketRelay) {
    this.relay = relay;
  }

  async newContext(
    options: BrowserContextOptions = {},
  ): Promise<ReactGrabBrowserContext> {
    const context = new ReactGrabBrowserContext(this.relay, options);
    this.contexts.push(context);
    return context;
  }

  async newPage(): Promise<ReactGrabPage> {
    const context = await this.newContext();
    return context.newPage();
  }

  getContexts(): ReactGrabBrowserContext[] {
    return [...this.contexts];
  }

  async close(): Promise<void> {
    for (const context of this.contexts) {
      await context.close();
    }
    this.contexts = [];
  }

  isConnected(): boolean {
    return this.relay.isConnected();
  }
}
