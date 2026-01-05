import type { Command, Response } from "./protocol";
import {
  ELEMENT_WAIT_TIMEOUT_MS,
  ELEMENT_POLL_INTERVAL_MS,
  WAIT_POLL_INTERVAL_MS,
  SCREENSHOT_TIMEOUT_MS,
  VIDEO_READY_POLL_INTERVAL_MS,
} from "./constants";

declare const window: Window &
  typeof globalThis & {
    __playwright_handles__?: Record<string, unknown>;
    __playwright_dialog_handler__?: { action: string; promptText?: string };
    __playwright_console__?: unknown[];
    __playwright_errors__?: unknown[];
    __playwright_permissions__?: string[];
    __playwright_timezone__?: string;
    __playwright_offline__?: boolean;
    __original_fetch__?: typeof fetch;
    __playwright_exposed_calls__?: Map<string, (result: unknown) => void>;
    __playwright_init_scripts__?: string[];
  };

const findElement = async (
  selector: string,
  timeout = ELEMENT_WAIT_TIMEOUT_MS,
): Promise<Element> => {
  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    const element = document.querySelector(selector);
    if (element) return element;
    await new Promise((resolve) =>
      setTimeout(resolve, ELEMENT_POLL_INTERVAL_MS),
    );
  }
  throw new Error(`Element not found: ${selector}`);
};

const dispatchMouseEvent = (
  element: Element,
  eventType: string,
  options: MouseEventInit = {},
) => {
  const bounds = element.getBoundingClientRect();
  const event = new MouseEvent(eventType, {
    bubbles: true,
    cancelable: true,
    view: window,
    clientX: options.clientX ?? bounds.left + bounds.width / 2,
    clientY: options.clientY ?? bounds.top + bounds.height / 2,
    button: options.button ?? 0,
    buttons: options.buttons ?? 1,
    ...options,
  });
  element.dispatchEvent(event);
};

const dispatchKeyboardEvent = (
  element: Element,
  eventType: string,
  options: KeyboardEventInit,
) => {
  const event = new KeyboardEvent(eventType, {
    bubbles: true,
    cancelable: true,
    view: window,
    ...options,
  });
  element.dispatchEvent(event);
};

type HandlerFn = (command: Command) => Promise<Partial<Response>>;

export const handlers: Record<string, HandlerFn> = {
  navigateFrame: async ({ url, frameId }) => {
    if (frameId && frameId !== "main") {
      const iframe = document.querySelector<HTMLIFrameElement>(
        `iframe[data-frame-id="${frameId}"]`,
      );
      if (iframe?.contentWindow) {
        iframe.contentWindow.location.href = url!;
      }
    } else {
      window.location.href = url!;
    }
    return { newDocumentId: crypto.randomUUID() };
  },

  reload: async () => {
    window.location.reload();
    return {};
  },

  goBack: async () => {
    const canGoBack = window.history.length > 1;
    if (canGoBack) window.history.back();
    return { result: canGoBack };
  },

  goForward: async () => {
    window.history.forward();
    return { result: true };
  },

  setViewportSize: async ({ width, height }) => {
    let viewportMeta = document.querySelector('meta[name="viewport"]');
    if (!viewportMeta) {
      viewportMeta = document.createElement("meta");
      viewportMeta.setAttribute("name", "viewport");
      document.head.appendChild(viewportMeta);
    }
    viewportMeta.setAttribute("content", `width=${width}, height=${height}`);
    return { width, height };
  },

  setContent: async ({ html, frameId }) => {
    if (frameId && frameId !== "main") {
      const iframe = document.querySelector<HTMLIFrameElement>(
        `iframe[data-frame-id="${frameId}"]`,
      );
      if (iframe?.contentDocument) {
        iframe.contentDocument.open();
        iframe.contentDocument.write(html!);
        iframe.contentDocument.close();
      }
    } else {
      document.documentElement.innerHTML = html!;
    }
    return {};
  },

  "mouse.move": async ({ x, y }) => {
    const element = document.elementFromPoint(x!, y!);
    if (element)
      dispatchMouseEvent(element, "mousemove", { clientX: x, clientY: y });
    return {};
  },

  "mouse.down": async ({ x, y, button = 0 }) => {
    const element = document.elementFromPoint(x!, y!);
    if (element)
      dispatchMouseEvent(element, "mousedown", {
        clientX: x,
        clientY: y,
        button,
      });
    return {};
  },

  "mouse.up": async ({ x, y, button = 0 }) => {
    const element = document.elementFromPoint(x!, y!);
    if (element)
      dispatchMouseEvent(element, "mouseup", {
        clientX: x,
        clientY: y,
        button,
      });
    return {};
  },

  "mouse.click": async ({ x, y, button = 0, clickCount = 1 }) => {
    const element = document.elementFromPoint(x!, y!);
    if (element) {
      dispatchMouseEvent(element, "mousedown", {
        clientX: x,
        clientY: y,
        button,
      });
      dispatchMouseEvent(element, "mouseup", {
        clientX: x,
        clientY: y,
        button,
      });
      dispatchMouseEvent(element, "click", { clientX: x, clientY: y, button });
      if (clickCount === 2) {
        dispatchMouseEvent(element, "dblclick", {
          clientX: x,
          clientY: y,
          button,
        });
      }
    }
    return {};
  },

  "mouse.wheel": async ({ x, y, deltaX = 0, deltaY = 0 }) => {
    const element = document.elementFromPoint(x!, y!);
    if (element) {
      element.dispatchEvent(
        new WheelEvent("wheel", {
          bubbles: true,
          cancelable: true,
          clientX: x,
          clientY: y,
          deltaX,
          deltaY,
          deltaMode: WheelEvent.DOM_DELTA_PIXEL,
        }),
      );
    }
    return {};
  },

  "keyboard.down": async ({ key, code, modifiers = {} }) => {
    const activeElement = document.activeElement || document.body;
    dispatchKeyboardEvent(activeElement, "keydown", {
      key: key!,
      code: code || key!,
      shiftKey: modifiers.shift,
      ctrlKey: modifiers.ctrl,
      altKey: modifiers.alt,
      metaKey: modifiers.meta,
    });
    return {};
  },

  "keyboard.up": async ({ key, code, modifiers = {} }) => {
    const activeElement = document.activeElement || document.body;
    dispatchKeyboardEvent(activeElement, "keyup", {
      key: key!,
      code: code || key!,
      shiftKey: modifiers.shift,
      ctrlKey: modifiers.ctrl,
      altKey: modifiers.alt,
      metaKey: modifiers.meta,
    });
    return {};
  },

  "keyboard.insertText": async ({ text }) => {
    const activeElement = document.activeElement;
    if (!activeElement) return {};
    const inputElement = activeElement as
      | HTMLInputElement
      | HTMLTextAreaElement;
    if ("value" in inputElement) {
      const selectionStart =
        inputElement.selectionStart ?? inputElement.value.length;
      const selectionEnd =
        inputElement.selectionEnd ?? inputElement.value.length;
      inputElement.value =
        inputElement.value.slice(0, selectionStart) +
        text +
        inputElement.value.slice(selectionEnd);
      inputElement.selectionStart = inputElement.selectionEnd =
        selectionStart + text!.length;
      inputElement.dispatchEvent(new Event("input", { bubbles: true }));
    } else if ((activeElement as HTMLElement).isContentEditable) {
      document.execCommand("insertText", false, text);
    }
    return {};
  },

  "keyboard.type": async ({ text, delay = 0 }) => {
    const inputElement = document.activeElement as
      | HTMLInputElement
      | HTMLTextAreaElement;
    for (const character of text!) {
      dispatchKeyboardEvent(inputElement, "keydown", { key: character });
      dispatchKeyboardEvent(inputElement, "keypress", { key: character });
      if ("value" in inputElement) {
        inputElement.value += character;
        inputElement.dispatchEvent(new Event("input", { bubbles: true }));
      }
      dispatchKeyboardEvent(inputElement, "keyup", { key: character });
      if (delay > 0) await new Promise((resolve) => setTimeout(resolve, delay));
    }
    return {};
  },

  "touch.tap": async ({ x, y }) => {
    const element = document.elementFromPoint(x!, y!);
    if (element) {
      const touch = new Touch({
        identifier: Date.now(),
        target: element,
        clientX: x!,
        clientY: y!,
      });
      element.dispatchEvent(
        new TouchEvent("touchstart", {
          bubbles: true,
          touches: [touch],
          targetTouches: [touch],
        }),
      );
      element.dispatchEvent(
        new TouchEvent("touchend", {
          bubbles: true,
          touches: [],
          targetTouches: [],
        }),
      );
    }
    return {};
  },

  querySelector: async ({ selector, frameId }) => {
    const rootDocument = frameId
      ? document.querySelector<HTMLIFrameElement>(
          `iframe[data-frame-id="${frameId}"]`,
        )?.contentDocument
      : document;
    const element = rootDocument?.querySelector(selector!);
    return {
      found: !!element,
      elementId: element ? crypto.randomUUID() : undefined,
    };
  },

  querySelectorAll: async ({ selector, frameId }) => {
    const rootDocument = frameId
      ? document.querySelector<HTMLIFrameElement>(
          `iframe[data-frame-id="${frameId}"]`,
        )?.contentDocument
      : document;
    const elements = rootDocument?.querySelectorAll(selector!);
    return { count: elements?.length ?? 0 };
  },

  getContentQuads: async ({ selector }) => {
    const element = await findElement(selector!);
    const bounds = element.getBoundingClientRect();
    return {
      quads: [
        [
          { x: bounds.left, y: bounds.top },
          { x: bounds.right, y: bounds.top },
          { x: bounds.right, y: bounds.bottom },
          { x: bounds.left, y: bounds.bottom },
        ],
      ],
    };
  },

  getBoundingBox: async ({ selector }) => {
    const element = await findElement(selector!);
    const bounds = element.getBoundingClientRect();
    return {
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
    };
  },

  click: async ({ selector, position, button = 0, clickCount = 1 }) => {
    const element = await findElement(selector!);
    const bounds = element.getBoundingClientRect();
    const clickX = position?.x ?? bounds.left + bounds.width / 2;
    const clickY = position?.y ?? bounds.top + bounds.height / 2;

    if ("focus" in element) (element as HTMLElement).focus();
    dispatchMouseEvent(element, "mousedown", {
      clientX: clickX,
      clientY: clickY,
      button,
    });
    dispatchMouseEvent(element, "mouseup", {
      clientX: clickX,
      clientY: clickY,
      button,
    });
    dispatchMouseEvent(element, "click", {
      clientX: clickX,
      clientY: clickY,
      button,
    });
    if (clickCount === 2) {
      dispatchMouseEvent(element, "dblclick", {
        clientX: clickX,
        clientY: clickY,
        button,
      });
    }
    return {};
  },

  fill: async ({ selector, value }) => {
    const inputElement = (await findElement(selector!)) as
      | HTMLInputElement
      | HTMLTextAreaElement;
    if ("focus" in inputElement) inputElement.focus();
    inputElement.value = "";
    inputElement.value = value!;
    inputElement.dispatchEvent(new Event("input", { bubbles: true }));
    inputElement.dispatchEvent(new Event("change", { bubbles: true }));
    return {};
  },

  selectText: async ({ selector }) => {
    const inputElement = (await findElement(selector!)) as
      | HTMLInputElement
      | HTMLTextAreaElement;
    inputElement.select?.();
    return {};
  },

  check: async ({ selector, checked = true }) => {
    const checkboxElement = (await findElement(selector!)) as HTMLInputElement;
    if (checkboxElement.checked !== checked) checkboxElement.click();
    return {};
  },

  selectOption: async ({ selector, values }) => {
    const selectElement = (await findElement(selector!)) as HTMLSelectElement;
    for (const option of Array.from(selectElement.options)) {
      option.selected =
        values!.includes(option.value) ||
        values!.includes(option.textContent || "");
    }
    selectElement.dispatchEvent(new Event("change", { bubbles: true }));
    return {
      selectedValues: Array.from(selectElement.selectedOptions).map(
        (option) => option.value,
      ),
    };
  },

  setInputFiles: async ({ selector, files }) => {
    const fileInputElement = (await findElement(selector!)) as HTMLInputElement;
    const dataTransfer = new DataTransfer();
    for (const fileData of files!) {
      const blob = new Blob([fileData.buffer], { type: fileData.mimeType });
      dataTransfer.items.add(
        new File([blob], fileData.name, { type: fileData.mimeType }),
      );
    }
    fileInputElement.files = dataTransfer.files;
    fileInputElement.dispatchEvent(new Event("change", { bubbles: true }));
    return {};
  },

  focus: async ({ selector }) => {
    const element = (await findElement(selector!)) as HTMLElement;
    element.focus();
    return {};
  },

  blur: async ({ selector }) => {
    const element = (await findElement(selector!)) as HTMLElement;
    element.blur();
    return {};
  },

  hover: async ({ selector }) => {
    const element = await findElement(selector!);
    const bounds = element.getBoundingClientRect();
    dispatchMouseEvent(element, "mouseenter");
    dispatchMouseEvent(element, "mouseover");
    dispatchMouseEvent(element, "mousemove", {
      clientX: bounds.left + bounds.width / 2,
      clientY: bounds.top + bounds.height / 2,
    });
    return {};
  },

  scrollIntoView: async ({ selector }) => {
    const element = await findElement(selector!);
    element.scrollIntoView({
      behavior: "instant",
      block: "center",
      inline: "center",
    });
    return {};
  },

  textContent: async ({ selector }) => {
    const element = await findElement(selector!);
    return { result: element.textContent };
  },

  innerText: async ({ selector }) => {
    const element = (await findElement(selector!)) as HTMLElement;
    return { result: element.innerText };
  },

  innerHTML: async ({ selector }) => {
    const element = await findElement(selector!);
    return { result: element.innerHTML };
  },

  getAttribute: async ({ selector, name }) => {
    const element = await findElement(selector!);
    return { result: element.getAttribute(name!) };
  },

  getProperty: async ({ selector, name }) => {
    const element = (await findElement(selector!)) as unknown as Record<
      string,
      unknown
    >;
    return { result: element[name!] };
  },

  isVisible: async ({ selector }) => {
    const element = document.querySelector(selector!) as HTMLElement;
    if (!element) return { result: false };
    const computedStyle = window.getComputedStyle(element);
    const bounds = element.getBoundingClientRect();
    const isVisible =
      computedStyle.display !== "none" &&
      computedStyle.visibility !== "hidden" &&
      parseFloat(computedStyle.opacity) > 0 &&
      bounds.width > 0 &&
      bounds.height > 0;
    return { result: isVisible };
  },

  isEnabled: async ({ selector }) => {
    const element = document.querySelector(selector!) as HTMLInputElement;
    return { result: element ? !element.disabled : false };
  },

  isChecked: async ({ selector }) => {
    const element = document.querySelector(selector!) as HTMLInputElement;
    return { result: element?.checked ?? false };
  },

  evaluate: async ({ expression, args = [] }) => {
    const evaluateFunction = new Function(
      "...args",
      `return (async () => { return (${expression}); })(...args)`,
    );
    const result = await evaluateFunction(...args);
    return { result };
  },

  evaluateHandle: async ({ expression, args = [] }) => {
    const evaluateFunction = new Function(
      "...args",
      `return (${expression})(...args)`,
    );
    const handle = await evaluateFunction(...args);
    const handleId = crypto.randomUUID();
    (window as Record<string, unknown>).__playwright_handles__ ??= {};
    (window as Record<string, Record<string, unknown>>).__playwright_handles__[
      handleId
    ] = handle;
    return { handleId };
  },

  screenshot: async ({
    selector,
    fullPage = false,
    clip,
    type = "png",
    quality,
  }) => {
    let captureBounds: { x: number; y: number; width: number; height: number };

    if (clip) {
      captureBounds = clip;
    } else if (selector) {
      const element = await findElement(selector);
      const elementBounds = element.getBoundingClientRect();
      captureBounds = {
        x: elementBounds.x,
        y: elementBounds.y,
        width: elementBounds.width,
        height: elementBounds.height,
      };
    } else if (fullPage) {
      captureBounds = {
        x: 0,
        y: 0,
        width: window.innerWidth,
        height: window.innerHeight,
      };
    } else {
      captureBounds = {
        x: 0,
        y: 0,
        width: window.innerWidth,
        height: window.innerHeight,
      };
    }

    const displayStream = await navigator.mediaDevices.getDisplayMedia({
      video: { displaySurface: "browser" },
      preferCurrentTab: true,
    } as DisplayMediaStreamOptions);

    const videoElement = document.createElement("video");
    videoElement.srcObject = displayStream;
    videoElement.autoplay = true;
    videoElement.playsInline = true;

    await new Promise<void>((resolve, reject) => {
      const timeoutId = setTimeout(
        () =>
          reject(new Error("Screenshot timeout: video metadata not loaded")),
        SCREENSHOT_TIMEOUT_MS,
      );
      videoElement.onloadedmetadata = () => {
        clearTimeout(timeoutId);
        void videoElement.play();
        resolve();
      };
      videoElement.onerror = () => {
        clearTimeout(timeoutId);
        reject(new Error("Screenshot failed: video error"));
      };
    });

    await new Promise<void>((resolve) => {
      const checkVideoReady = () => {
        if (videoElement.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA)
          resolve();
        else setTimeout(checkVideoReady, VIDEO_READY_POLL_INTERVAL_MS);
      };
      checkVideoReady();
    });

    const canvas = document.createElement("canvas");
    const canvasContext = canvas.getContext("2d")!;

    const scaleX = videoElement.videoWidth / window.innerWidth;
    const scaleY = videoElement.videoHeight / window.innerHeight;
    const scaledBounds = {
      x: captureBounds.x * scaleX,
      y: captureBounds.y * scaleY,
      width: captureBounds.width * scaleX,
      height: captureBounds.height * scaleY,
    };

    canvas.width = scaledBounds.width;
    canvas.height = scaledBounds.height;
    canvasContext.drawImage(
      videoElement,
      scaledBounds.x,
      scaledBounds.y,
      scaledBounds.width,
      scaledBounds.height,
      0,
      0,
      scaledBounds.width,
      scaledBounds.height,
    );

    displayStream.getTracks().forEach((track) => track.stop());
    videoElement.srcObject = null;

    const mimeType = type === "jpeg" ? "image/jpeg" : "image/png";
    return { result: canvas.toDataURL(mimeType, quality ? quality / 100 : 1) };
  },

  pdf: async () => {
    throw new Error(
      "UNSUPPORTED: page.pdf() is not available in browser context",
    );
  },

  "video.start": async () => {
    throw new Error(
      "UNSUPPORTED: page.video() is not available in browser context",
    );
  },

  "video.stop": async () => {
    throw new Error(
      "UNSUPPORTED: page.video() is not available in browser context",
    );
  },

  "tracing.start": async () => {
    throw new Error("UNSUPPORTED: tracing is not available in browser context");
  },

  "tracing.stop": async () => {
    throw new Error("UNSUPPORTED: tracing is not available in browser context");
  },

  waitForSelector: async ({
    selector,
    state = "visible",
    timeout = ELEMENT_WAIT_TIMEOUT_MS,
  }) => {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      const element = document.querySelector(selector!) as HTMLElement;
      if (state === "attached" && element) return {};
      if (state === "detached" && !element) return {};
      if (state === "visible" && element) {
        const computedStyle = window.getComputedStyle(element);
        if (
          computedStyle.display !== "none" &&
          computedStyle.visibility !== "hidden"
        )
          return {};
      }
      if (
        state === "hidden" &&
        (!element || window.getComputedStyle(element).display === "none")
      )
        return {};
      await new Promise((resolve) =>
        setTimeout(resolve, WAIT_POLL_INTERVAL_MS),
      );
    }
    throw new Error(
      `Timeout waiting for selector "${selector}" to be ${state}`,
    );
  },

  waitForFunction: async ({
    expression,
    args = [],
    timeout = ELEMENT_WAIT_TIMEOUT_MS,
  }) => {
    const startTime = Date.now();
    const evaluateFunction = new Function(
      "...args",
      `return (${expression})(...args)`,
    );
    while (Date.now() - startTime < timeout) {
      const result = await evaluateFunction(...args);
      if (result) return { result };
      await new Promise((resolve) =>
        setTimeout(resolve, WAIT_POLL_INTERVAL_MS),
      );
    }
    throw new Error("Timeout waiting for function");
  },

  waitForLoadState: async ({
    state = "load",
    timeout = ELEMENT_WAIT_TIMEOUT_MS,
  }) => {
    if (state === "domcontentloaded" && document.readyState !== "loading")
      return {};
    if (state === "load" && document.readyState === "complete") return {};

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(
        () => reject(new Error(`Timeout waiting for ${state}`)),
        timeout,
      );
      const eventName =
        state === "domcontentloaded" ? "DOMContentLoaded" : "load";
      window.addEventListener(
        eventName,
        () => {
          clearTimeout(timeoutId);
          resolve({});
        },
        { once: true },
      );
    });
  },

  waitForTimeout: async ({ timeout }) => {
    await new Promise((resolve) => setTimeout(resolve, timeout));
    return {};
  },

  handleDialog: async ({ action, promptText }) => {
    (window as Record<string, unknown>).__playwright_dialog_handler__ = {
      action,
      promptText,
    };
    return {};
  },

  getFrames: async () => {
    const iframeElements = document.querySelectorAll("iframe");
    return {
      frames: Array.from(iframeElements).map((iframe, index) => ({
        id: iframe.getAttribute("data-frame-id") || `frame-${index}`,
        url: iframe.src,
        name: iframe.name,
      })),
    };
  },

  getConsoleMessages: async () => {
    return {
      messages:
        (window as Record<string, unknown[]>).__playwright_console__ ?? [],
    };
  },

  getPageErrors: async () => {
    return {
      errors: (window as Record<string, unknown[]>).__playwright_errors__ ?? [],
    };
  },

  "route.add": async () => {
    throw new Error(
      "UNSUPPORTED: page.route() requires Service Worker for true request interception",
    );
  },

  "network.getRequests": async () => {
    const resourceEntries = performance.getEntriesByType(
      "resource",
    ) as PerformanceResourceTiming[];
    return {
      requests: resourceEntries.map((entry) => ({
        url: entry.name,
        type: entry.initiatorType,
        duration: entry.duration,
        size: entry.transferSize,
        startTime: entry.startTime,
      })),
    };
  },

  "network.clearCache": async () => {
    performance.clearResourceTimings();
    return {};
  },

  "cookies.get": async () => {
    const parsedCookies = document.cookie
      .split(";")
      .map((cookieString) => {
        const [name, ...valueParts] = cookieString.trim().split("=");
        return {
          name,
          value: valueParts.join("="),
          domain: window.location.hostname,
          path: "/",
          expires: -1,
          httpOnly: false,
          secure: window.location.protocol === "https:",
          sameSite: "Lax" as const,
        };
      })
      .filter((cookie) => cookie.name);
    return { cookies: parsedCookies };
  },

  "cookies.add": async ({ cookies }) => {
    for (const cookie of cookies!) {
      let cookieString = `${cookie.name}=${cookie.value}`;
      if (cookie.path) cookieString += `; path=${cookie.path}`;
      if (cookie.domain) cookieString += `; domain=${cookie.domain}`;
      if (cookie.expires)
        cookieString += `; expires=${new Date(cookie.expires * 1000).toUTCString()}`;
      if (cookie.secure) cookieString += "; secure";
      if (cookie.sameSite) cookieString += `; samesite=${cookie.sameSite}`;
      document.cookie = cookieString;
    }
    return {};
  },

  "cookies.clear": async () => {
    const cookieStrings = document.cookie.split(";");
    for (const cookieString of cookieStrings) {
      const [name] = cookieString.trim().split("=");
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
    }
    return {};
  },

  "storage.get": async ({ storageType = "local" }) => {
    const storageInstance =
      storageType === "session" ? sessionStorage : localStorage;
    const entries: Array<{ name: string; value: string }> = [];
    for (let index = 0; index < storageInstance.length; index++) {
      const name = storageInstance.key(index);
      if (name)
        entries.push({ name, value: storageInstance.getItem(name) || "" });
    }
    return { entries };
  },

  "storage.set": async ({ storageType = "local", entries }) => {
    const storageInstance =
      storageType === "session" ? sessionStorage : localStorage;
    for (const { name, value } of entries!) {
      storageInstance.setItem(name, value);
    }
    return {};
  },

  "storage.clear": async ({ storageType = "local" }) => {
    const storageInstance =
      storageType === "session" ? sessionStorage : localStorage;
    storageInstance.clear();
    return {};
  },

  "permissions.grant": async ({ permissions }) => {
    (window as Record<string, string[]>).__playwright_permissions__ =
      permissions!;
    return {};
  },

  "permissions.query": async ({ name }) => {
    try {
      const permissionStatus = await navigator.permissions.query({
        name: name as PermissionName,
      });
      return { result: permissionStatus.state };
    } catch {
      return { result: "denied" };
    }
  },

  "geolocation.set": async ({ latitude, longitude, accuracy = 0 }) => {
    const mockGeolocationPosition = {
      coords: {
        latitude,
        longitude,
        accuracy,
        altitude: null,
        altitudeAccuracy: null,
        heading: null,
        speed: null,
      },
      timestamp: Date.now(),
    };

    navigator.geolocation.getCurrentPosition = (successCallback) => {
      successCallback(mockGeolocationPosition as GeolocationPosition);
    };

    navigator.geolocation.watchPosition = (successCallback) => {
      successCallback(mockGeolocationPosition as GeolocationPosition);
      return 1;
    };

    return {};
  },

  "emulation.setTimezone": async ({ timezoneId }) => {
    (window as Record<string, string>).__playwright_timezone__ = timezoneId!;
    return {};
  },

  "emulation.setLocale": async ({ locale }) => {
    Object.defineProperty(navigator, "language", {
      value: locale,
      writable: true,
    });
    Object.defineProperty(navigator, "languages", {
      value: [locale],
      writable: true,
    });
    return {};
  },

  "emulation.setColorScheme": async ({ colorScheme }) => {
    const styleElement =
      document.getElementById("playwright-color-scheme") ||
      document.createElement("style");
    styleElement.id = "playwright-color-scheme";
    if (colorScheme === "dark") {
      styleElement.textContent = ":root { color-scheme: dark; }";
      document.documentElement.style.colorScheme = "dark";
    } else if (colorScheme === "light") {
      styleElement.textContent = ":root { color-scheme: light; }";
      document.documentElement.style.colorScheme = "light";
    }
    if (!styleElement.parentNode) document.head.appendChild(styleElement);
    return {};
  },

  "emulation.setReducedMotion": async ({ reducedMotion }) => {
    const styleElement =
      document.getElementById("playwright-reduced-motion") ||
      document.createElement("style");
    styleElement.id = "playwright-reduced-motion";
    styleElement.textContent =
      reducedMotion === "reduce"
        ? "*, *::before, *::after { animation-duration: 0s !important; transition-duration: 0s !important; }"
        : "";
    if (!styleElement.parentNode) document.head.appendChild(styleElement);
    return {};
  },

  "emulation.setOffline": async ({ offline }) => {
    (window as Record<string, boolean>).__playwright_offline__ = offline!;
    if (offline) {
      const originalFetchFunction =
        (window as Record<string, typeof fetch>).__original_fetch__ ||
        window.fetch;
      (window as Record<string, typeof fetch>).__original_fetch__ =
        originalFetchFunction;
      window.fetch = async () => {
        throw new TypeError("Failed to fetch");
      };
    } else if ((window as Record<string, typeof fetch>).__original_fetch__) {
      window.fetch = (
        window as Record<string, typeof fetch>
      ).__original_fetch__;
    }
    return {};
  },

  "emulation.setUserAgent": async ({ userAgent }) => {
    Object.defineProperty(navigator, "userAgent", {
      value: userAgent,
      writable: true,
    });
    return {};
  },

  dragAndDrop: async ({
    sourceSelector,
    targetSelector,
    sourcePosition,
    targetPosition,
  }) => {
    const sourceElement = await findElement(sourceSelector!);
    const targetElement = await findElement(targetSelector!);

    const sourceBounds = sourceElement.getBoundingClientRect();
    const targetBounds = targetElement.getBoundingClientRect();

    const sourceX =
      sourcePosition?.x ?? sourceBounds.left + sourceBounds.width / 2;
    const sourceY =
      sourcePosition?.y ?? sourceBounds.top + sourceBounds.height / 2;
    const targetX =
      targetPosition?.x ?? targetBounds.left + targetBounds.width / 2;
    const targetY =
      targetPosition?.y ?? targetBounds.top + targetBounds.height / 2;

    const dataTransfer = new DataTransfer();

    sourceElement.dispatchEvent(
      new DragEvent("dragstart", {
        bubbles: true,
        cancelable: true,
        dataTransfer,
        clientX: sourceX,
        clientY: sourceY,
      }),
    );
    sourceElement.dispatchEvent(
      new DragEvent("drag", {
        bubbles: true,
        cancelable: true,
        dataTransfer,
        clientX: sourceX,
        clientY: sourceY,
      }),
    );
    targetElement.dispatchEvent(
      new DragEvent("dragenter", {
        bubbles: true,
        cancelable: true,
        dataTransfer,
        clientX: targetX,
        clientY: targetY,
      }),
    );
    targetElement.dispatchEvent(
      new DragEvent("dragover", {
        bubbles: true,
        cancelable: true,
        dataTransfer,
        clientX: targetX,
        clientY: targetY,
      }),
    );
    targetElement.dispatchEvent(
      new DragEvent("drop", {
        bubbles: true,
        cancelable: true,
        dataTransfer,
        clientX: targetX,
        clientY: targetY,
      }),
    );
    sourceElement.dispatchEvent(
      new DragEvent("dragend", {
        bubbles: true,
        cancelable: true,
        dataTransfer,
        clientX: targetX,
        clientY: targetY,
      }),
    );

    return {};
  },

  "clipboard.read": async () => {
    try {
      const clipboardText = await navigator.clipboard.readText();
      return { result: clipboardText };
    } catch {
      return { result: null, error: "Clipboard access denied" };
    }
  },

  "clipboard.write": async ({ text }) => {
    try {
      await navigator.clipboard.writeText(text!);
      return { result: true };
    } catch {
      return { result: false, error: "Clipboard access denied" };
    }
  },

  "accessibility.snapshot": async ({ root, interestingOnly = true }) => {
    const IMPLICIT_ROLE_MAP: Record<string, string> = {
      a: "link",
      button: "button",
      input: "textbox",
      select: "combobox",
      textarea: "textbox",
      img: "img",
      nav: "navigation",
      main: "main",
      header: "banner",
      footer: "contentinfo",
      form: "form",
      table: "table",
      ul: "list",
      ol: "list",
      li: "listitem",
      h1: "heading",
      h2: "heading",
      h3: "heading",
      h4: "heading",
      h5: "heading",
      h6: "heading",
    };

    const buildAccessibilityTree = (element: Element): object | null => {
      const role =
        element.getAttribute("role") ||
        IMPLICIT_ROLE_MAP[element.tagName.toLowerCase()] ||
        null;
      const name =
        element.getAttribute("aria-label") ||
        (element as HTMLElement).innerText?.slice(0, 100);

      if (interestingOnly && !role && !name) return null;

      const node: Record<string, unknown> = {
        role: role || "generic",
        name: name || "",
      };

      if (
        element.getAttribute("aria-disabled") === "true" ||
        (element as HTMLInputElement).disabled
      ) {
        node.disabled = true;
      }
      if (element.getAttribute("aria-checked")) {
        node.checked = element.getAttribute("aria-checked") === "true";
      }
      if ((element as HTMLInputElement).value !== undefined) {
        node.value = (element as HTMLInputElement).value;
      }

      const childNodes: object[] = [];
      for (const childElement of element.children) {
        const childNode = buildAccessibilityTree(childElement);
        if (childNode) childNodes.push(childNode);
      }
      if (childNodes.length > 0) node.children = childNodes;

      return node;
    };

    const rootElement = root ? await findElement(root) : document.body;
    return { tree: buildAccessibilityTree(rootElement) };
  },

  "page.bringToFront": async () => {
    window.focus();
    return {};
  },

  "page.close": async () => {
    window.close();
    return {};
  },

  "page.title": async () => ({ title: document.title }),

  "page.url": async () => ({ result: window.location.href }),

  exposeFunction: async ({ name }) => {
    (window as Record<string, (...args: unknown[]) => Promise<unknown>>)[
      name!
    ] = async (...args: unknown[]) => {
      return new Promise((resolve) => {
        const callId = crypto.randomUUID();
        (
          window as Record<string, Map<string, (result: unknown) => void>>
        ).__playwright_exposed_calls__ ??= new Map();
        (
          window as Record<string, Map<string, (result: unknown) => void>>
        ).__playwright_exposed_calls__.set(callId, resolve);
        window.dispatchEvent(
          new CustomEvent("playwright:exposed-call", {
            detail: { name, args, callId },
          }),
        );
      });
    };
    return {};
  },

  "exposeFunction.resolve": async ({ callId, result }) => {
    const exposedCalls = (
      window as Record<string, Map<string, (result: unknown) => void>>
    ).__playwright_exposed_calls__;
    const resolveFunction = exposedCalls?.get(callId!);
    if (resolveFunction) {
      resolveFunction(result);
      exposedCalls.delete(callId!);
    }
    return {};
  },

  addInitScript: async ({ script }) => {
    const initScripts = ((
      window as Record<string, string[]>
    ).__playwright_init_scripts__ ??= []);
    initScripts.push(script!);
    const executeScript = new Function(script!);
    executeScript();
    return {};
  },

  "expect.toBeVisible": async ({
    selector,
    timeout = ELEMENT_WAIT_TIMEOUT_MS,
  }) => {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      const element = document.querySelector(selector!) as HTMLElement;
      if (element) {
        const computedStyle = window.getComputedStyle(element);
        const bounds = element.getBoundingClientRect();
        if (
          computedStyle.display !== "none" &&
          computedStyle.visibility !== "hidden" &&
          bounds.width > 0 &&
          bounds.height > 0
        ) {
          return { pass: true };
        }
      }
      await new Promise((resolve) =>
        setTimeout(resolve, WAIT_POLL_INTERVAL_MS),
      );
    }
    return { pass: false, message: `Element ${selector} is not visible` };
  },

  "expect.toBeHidden": async ({
    selector,
    timeout = ELEMENT_WAIT_TIMEOUT_MS,
  }) => {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      const element = document.querySelector(selector!) as HTMLElement;
      if (!element) return { pass: true };
      const computedStyle = window.getComputedStyle(element);
      if (
        computedStyle.display === "none" ||
        computedStyle.visibility === "hidden"
      ) {
        return { pass: true };
      }
      await new Promise((resolve) =>
        setTimeout(resolve, WAIT_POLL_INTERVAL_MS),
      );
    }
    return { pass: false, message: `Element ${selector} is still visible` };
  },

  "expect.toHaveText": async ({
    selector,
    expected,
    timeout = ELEMENT_WAIT_TIMEOUT_MS,
    useInnerText = false,
  }) => {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      const element = document.querySelector(selector!) as HTMLElement;
      const actualText = useInnerText
        ? element?.innerText
        : element?.textContent;
      if (actualText?.includes(expected as string)) {
        return { pass: true, actual: actualText };
      }
      await new Promise((resolve) =>
        setTimeout(resolve, WAIT_POLL_INTERVAL_MS),
      );
    }
    const element = document.querySelector(selector!) as HTMLElement;
    return {
      pass: false,
      actual: useInnerText ? element?.innerText : element?.textContent,
      expected,
    };
  },

  "expect.toHaveValue": async ({
    selector,
    expected,
    timeout = ELEMENT_WAIT_TIMEOUT_MS,
  }) => {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      const inputElement = document.querySelector(
        selector!,
      ) as HTMLInputElement;
      if (inputElement?.value === expected) {
        return { pass: true, actual: inputElement.value };
      }
      await new Promise((resolve) =>
        setTimeout(resolve, WAIT_POLL_INTERVAL_MS),
      );
    }
    const inputElement = document.querySelector(selector!) as HTMLInputElement;
    return { pass: false, actual: inputElement?.value, expected };
  },

  "expect.toHaveAttribute": async ({
    selector,
    name,
    expected,
    timeout = ELEMENT_WAIT_TIMEOUT_MS,
  }) => {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      const element = document.querySelector(selector!);
      const actualValue = element?.getAttribute(name!);
      if (
        expected === undefined ? actualValue !== null : actualValue === expected
      ) {
        return { pass: true, actual: actualValue };
      }
      await new Promise((resolve) =>
        setTimeout(resolve, WAIT_POLL_INTERVAL_MS),
      );
    }
    const element = document.querySelector(selector!);
    return { pass: false, actual: element?.getAttribute(name!), expected };
  },

  "expect.toHaveClass": async ({
    selector,
    expected,
    timeout = ELEMENT_WAIT_TIMEOUT_MS,
  }) => {
    const startTime = Date.now();
    const expectedClassNames = Array.isArray(expected)
      ? expected
      : [expected as string];
    while (Date.now() - startTime < timeout) {
      const element = document.querySelector(selector!);
      if (
        element &&
        expectedClassNames.every((className) =>
          element.classList.contains(className),
        )
      ) {
        return { pass: true, actual: Array.from(element.classList) };
      }
      await new Promise((resolve) =>
        setTimeout(resolve, WAIT_POLL_INTERVAL_MS),
      );
    }
    const element = document.querySelector(selector!);
    return {
      pass: false,
      actual: element ? Array.from(element.classList) : [],
      expected: expectedClassNames,
    };
  },

  "expect.toBeEnabled": async ({
    selector,
    timeout = ELEMENT_WAIT_TIMEOUT_MS,
  }) => {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      const inputElement = document.querySelector(
        selector!,
      ) as HTMLInputElement;
      if (inputElement && !inputElement.disabled) {
        return { pass: true };
      }
      await new Promise((resolve) =>
        setTimeout(resolve, WAIT_POLL_INTERVAL_MS),
      );
    }
    return { pass: false, message: `Element ${selector} is disabled` };
  },

  "expect.toBeChecked": async ({
    selector,
    timeout = ELEMENT_WAIT_TIMEOUT_MS,
  }) => {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      const checkboxElement = document.querySelector(
        selector!,
      ) as HTMLInputElement;
      if (checkboxElement?.checked) {
        return { pass: true };
      }
      await new Promise((resolve) =>
        setTimeout(resolve, WAIT_POLL_INTERVAL_MS),
      );
    }
    return { pass: false, message: `Element ${selector} is not checked` };
  },

  "expect.toHaveCount": async ({
    selector,
    expected,
    timeout = ELEMENT_WAIT_TIMEOUT_MS,
  }) => {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      const elementCount = document.querySelectorAll(selector!).length;
      if (elementCount === expected) {
        return { pass: true, actual: elementCount };
      }
      await new Promise((resolve) =>
        setTimeout(resolve, WAIT_POLL_INTERVAL_MS),
      );
    }
    return {
      pass: false,
      actual: document.querySelectorAll(selector!).length,
      expected,
    };
  },

  ping: async () => {
    return { result: "pong" };
  },
};

export const handleCommand = async (command: Command): Promise<Response> => {
  const handler = handlers[command.method];
  if (!handler) {
    return {
      id: command.id,
      success: false,
      error: `Unknown command method: ${command.method}`,
    };
  }

  try {
    const result = await handler(command);
    return { id: command.id, success: true, ...result };
  } catch (error) {
    return {
      id: command.id,
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
};

if (typeof window !== "undefined") {
  (window as Record<string, unknown[]>).__playwright_console__ = [];
  (window as Record<string, unknown[]>).__playwright_errors__ = [];

  const originalConsole = { ...console };
  (["log", "warn", "error", "info", "debug"] as const).forEach((method) => {
    (console as Record<string, (...args: unknown[]) => void>)[method] = (
      ...args: unknown[]
    ) => {
      (window as Record<string, unknown[]>).__playwright_console__.push({
        type: method,
        args,
        timestamp: Date.now(),
      });
      (originalConsole as Record<string, (...args: unknown[]) => void>)[method](
        ...args,
      );
    };
  });

  window.addEventListener("error", (event) => {
    (window as Record<string, unknown[]>).__playwright_errors__.push({
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      timestamp: Date.now(),
    });
  });

  const originalAlert = window.alert;
  const originalConfirm = window.confirm;
  const originalPrompt = window.prompt;

  window.alert = (message) => {
    const handler = (window as Record<string, { action: string }>)
      .__playwright_dialog_handler__;
    if (handler?.action === "dismiss") return;
    originalAlert(message);
  };

  window.confirm = (message) => {
    const handler = (window as Record<string, { action: string }>)
      .__playwright_dialog_handler__;
    if (handler) {
      delete (window as Record<string, unknown>).__playwright_dialog_handler__;
      return handler.action === "accept";
    }
    return originalConfirm(message);
  };

  window.prompt = (message, defaultValue) => {
    const handler = (
      window as Record<string, { action: string; promptText?: string }>
    ).__playwright_dialog_handler__;
    if (handler) {
      delete (window as Record<string, unknown>).__playwright_dialog_handler__;
      return handler.action === "accept"
        ? (handler.promptText ?? defaultValue ?? "")
        : null;
    }
    return originalPrompt(message, defaultValue);
  };
}
