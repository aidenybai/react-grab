import { test, expect } from "./fixtures.js";

const PLACEHOLDER_TARGET_STYLE = {
  position: "fixed",
  top: "220px",
  left: "220px",
  zIndex: "9999",
  padding: "8px 10px",
  background: "white",
  border: "1px solid #111",
};

test.describe("Framework Source Metadata", () => {
  test("should resolve Solid runtime handler source without build plugins", async ({
    reactGrab,
  }) => {
    const solidFilePath = "src/components/counter.tsx";

    await reactGrab.page.evaluate(
      ({ filePath, targetStyle }) => {
        const element = document.createElement("button");
        element.id = "solid-metadata-target";
        element.textContent = "Solid Metadata Target";
        Object.assign(element.style, targetStyle);
        let count = 0;
        const setCount = (
          updater: (currentValue: number) => number,
        ): number => {
          count = updater(count);
          return count;
        };
        const solidHandler = () => setCount((countValue) => countValue + 1);
        Reflect.set(element, "$$click", solidHandler);
        document.body.appendChild(element);

        (
          window as {
            __REACT_GRAB_SOLID_RUNTIME_MODULES__?: Array<{
              url: string;
              content: string;
            }>;
          }
        ).__REACT_GRAB_SOLID_RUNTIME_MODULES__ = [
          {
            url: `http://127.0.0.1:5175/${filePath}`,
            content: `
              const template = () => {
                const element = document.createElement("button");
                element.$$click = ${String(solidHandler)};
                return element;
              };
              createComponent(template, { location: "${filePath}:14:2" });
            `,
          },
        ];
      },
      { filePath: solidFilePath, targetStyle: PLACEHOLDER_TARGET_STYLE },
    );

    const source = await reactGrab.page.evaluate(async () => {
      const api = (
        window as {
          __REACT_GRAB__?: {
            getSource: (element: Element) => Promise<unknown>;
          };
        }
      ).__REACT_GRAB__;
      const element = document.querySelector("#solid-metadata-target");
      if (!api || !element) return null;
      return api.getSource(element);
    });

    expect(source).toEqual({
      filePath: solidFilePath,
      lineNumber: 14,
      componentName: null,
    });

    const stackContext = await reactGrab.page.evaluate(async () => {
      const api = (
        window as {
          __REACT_GRAB__?: {
            getStackContext: (element: Element) => Promise<string>;
          };
        }
      ).__REACT_GRAB__;
      const element = document.querySelector("#solid-metadata-target");
      if (!api || !element) return "";
      return api.getStackContext(element);
    });

    expect(stackContext).toContain(`${solidFilePath}:14:2`);

    await reactGrab.activate();
    await reactGrab.hoverElement("#solid-metadata-target");
    await reactGrab.waitForSelectionBox();
    await reactGrab.waitForSelectionSource();

    const selectionFilePath = await reactGrab.page.evaluate(() => {
      const api = (
        window as {
          __REACT_GRAB__?: {
            getState: () => { selectionFilePath: string | null };
          };
        }
      ).__REACT_GRAB__;
      return api?.getState().selectionFilePath ?? null;
    });
    expect(selectionFilePath).toBe(solidFilePath);

    await reactGrab.clickElement("#solid-metadata-target");

    const clipboard = await reactGrab.getClipboardContent();
    expect(clipboard).toContain(`${solidFilePath}:14:2`);
  });

  test("should resolve Vue inspector metadata with line and column", async ({
    reactGrab,
  }) => {
    await reactGrab.page.evaluate((targetStyle) => {
      const element = document.createElement("div");
      element.id = "vue-inspector-target";
      element.textContent = "Vue Inspector Target";
      element.setAttribute("data-v-inspector", "src/components/Card.vue:33:9");
      Object.assign(element.style, targetStyle);
      (
        element as {
          __vueParentComponent?: Record<string, unknown>;
        }
      ).__vueParentComponent = {
        type: {
          __file: "/workspace/vue/src/components/Card.vue",
          __name: "VueCard",
        },
      };
      document.body.appendChild(element);
    }, PLACEHOLDER_TARGET_STYLE);

    const source = await reactGrab.page.evaluate(async () => {
      const api = (
        window as {
          __REACT_GRAB__?: {
            getSource: (element: Element) => Promise<unknown>;
          };
        }
      ).__REACT_GRAB__;
      const element = document.querySelector("#vue-inspector-target");
      if (!api || !element) return null;
      return api.getSource(element);
    });

    expect(source).toEqual({
      filePath: "src/components/Card.vue",
      lineNumber: 33,
      componentName: "VueCard",
    });

    const stackContext = await reactGrab.page.evaluate(async () => {
      const api = (
        window as {
          __REACT_GRAB__?: {
            getStackContext: (element: Element) => Promise<string>;
          };
        }
      ).__REACT_GRAB__;
      const element = document.querySelector("#vue-inspector-target");
      if (!api || !element) return "";
      return api.getStackContext(element);
    });

    expect(stackContext).toContain("VueCard");
    expect(stackContext).toContain("src/components/Card.vue:33:9");
  });

  test("should resolve Vue runtime metadata when inspector attribute is absent", async ({
    reactGrab,
  }) => {
    const vueRuntimeFilePath = "/workspace/vue/src/components/Fallback.vue";

    await reactGrab.page.evaluate(
      ({ filePath, targetStyle }) => {
        const element = document.createElement("div");
        element.id = "vue-runtime-target";
        element.textContent = "Vue Runtime Target";
        Object.assign(element.style, targetStyle);
        (
          element as {
            __vueParentComponent?: Record<string, unknown>;
          }
        ).__vueParentComponent = {
          type: {
            __file: filePath,
            __name: "VueFallback",
          },
        };
        document.body.appendChild(element);
      },
      { filePath: vueRuntimeFilePath, targetStyle: PLACEHOLDER_TARGET_STYLE },
    );

    const source = await reactGrab.page.evaluate(async () => {
      const api = (
        window as {
          __REACT_GRAB__?: {
            getSource: (element: Element) => Promise<unknown>;
          };
        }
      ).__REACT_GRAB__;
      const element = document.querySelector("#vue-runtime-target");
      if (!api || !element) return null;
      return api.getSource(element);
    });

    expect(source).toEqual({
      filePath: vueRuntimeFilePath,
      lineNumber: null,
      componentName: "VueFallback",
    });

    const stackContext = await reactGrab.page.evaluate(async () => {
      const api = (
        window as {
          __REACT_GRAB__?: {
            getStackContext: (element: Element) => Promise<string>;
          };
        }
      ).__REACT_GRAB__;
      const element = document.querySelector("#vue-runtime-target");
      if (!api || !element) return "";
      return api.getStackContext(element);
    });

    expect(stackContext).toContain("VueFallback");
    expect(stackContext).toContain(vueRuntimeFilePath);
  });

  test("should resolve Svelte metadata from __svelte_meta", async ({
    reactGrab,
  }) => {
    await reactGrab.page.evaluate((targetStyle) => {
      const element = document.createElement("button");
      element.id = "svelte-metadata-target";
      element.textContent = "Svelte Metadata Target";
      Object.assign(element.style, targetStyle);
      (
        element as {
          __svelte_meta?: Record<string, unknown>;
        }
      ).__svelte_meta = {
        parent: {
          type: "component",
          file: "src/App.svelte",
          line: 19,
          column: 4,
          parent: null,
          componentTag: "Counter",
        },
        loc: {
          file: "src/lib/Counter.svelte",
          line: 8,
          column: 0,
        },
      };
      document.body.appendChild(element);
    }, PLACEHOLDER_TARGET_STYLE);

    const source = await reactGrab.page.evaluate(async () => {
      const api = (
        window as {
          __REACT_GRAB__?: {
            getSource: (element: Element) => Promise<unknown>;
          };
        }
      ).__REACT_GRAB__;
      const element = document.querySelector("#svelte-metadata-target");
      if (!api || !element) return null;
      return api.getSource(element);
    });

    expect(source).toEqual({
      filePath: "src/lib/Counter.svelte",
      lineNumber: 8,
      componentName: "Counter",
    });

    const stackContext = await reactGrab.page.evaluate(async () => {
      const api = (
        window as {
          __REACT_GRAB__?: {
            getStackContext: (element: Element) => Promise<string>;
          };
        }
      ).__REACT_GRAB__;
      const element = document.querySelector("#svelte-metadata-target");
      if (!api || !element) return "";
      return api.getStackContext(element);
    });

    expect(stackContext).toContain("Counter");
    expect(stackContext).toContain("src/lib/Counter.svelte:8:1");
  });
});
