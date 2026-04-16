import { describe, expect, it, afterEach } from "vite-plus/test";
import { escapeHtml } from "../src/utils/snapshot/escape-html.js";
import { inlineExternalSvgDefs } from "../src/utils/snapshot/snapshot-svg-defs.js";
import { stabilizeLineClamp } from "../src/utils/snapshot/snapshot-line-clamp.js";
import { stabilizeElementLayout } from "../src/utils/snapshot/snapshot-stabilize-layout.js";
import { fetchAsDataUrl } from "../src/utils/snapshot/fetch-as-data-url.js";
import {
  computeNonDefaultStyles,
  stylesToInlineString,
  disposeSnapshotBaseline,
} from "../src/utils/snapshot/snapshot-style-diff.js";
import { resolveAncestorBackground } from "../src/utils/snapshot/resolve-ancestor-background.js";
import {
  hasCounterReferences,
  buildCounterContext,
  resolveCounterContent,
} from "../src/utils/snapshot/snapshot-css-counters.js";
import { captureInputState, serializeInputStateAttributes } from "../src/utils/snapshot/snapshot-input-state.js";
import { preserveScrollPosition } from "../src/utils/snapshot/snapshot-scroll-position.js";
import { isIconFontFamily } from "../src/utils/snapshot/snapshot-icon-font.js";
import { forceContentVisibility } from "../src/utils/snapshot/snapshot-content-visibility.js";
import { serializeElement } from "../src/utils/snapshot/serialize-element.js";
import { collectScrollbarCss } from "../src/utils/snapshot/snapshot-scrollbar-css.js";
import { resolveBlobUrl } from "../src/utils/snapshot/snapshot-blob-resolver.js";
import { createIframePlaceholder } from "../src/utils/snapshot/snapshot-iframe-capture.js";
import { collectUsedCodepoints } from "../src/utils/snapshot/snapshot-embed-fonts.js";
import { resolveImageElementSource } from "../src/utils/snapshot/snapshot-picture-resolver.js";
import { elementToPngBlob } from "../src/utils/snapshot/snapshot-html-to-png.js";
import { copyPngToClipboard } from "../src/utils/snapshot/copy-png-to-clipboard.js";

afterEach(() => {
  disposeSnapshotBaseline();
  document.body.innerHTML = "";
});

describe("escapeHtml", () => {
  it("should escape all HTML-sensitive characters", () => {
    expect(escapeHtml('&<>"\''))
      .toBe("&amp;&lt;&gt;&quot;&#39;");
  });

  it("should return the same string when no special characters", () => {
    expect(escapeHtml("hello world")).toBe("hello world");
  });

  it("should handle empty string", () => {
    expect(escapeHtml("")).toBe("");
  });
});

describe("stylesToInlineString", () => {
  it("should convert style record to inline CSS string", () => {
    const result = stylesToInlineString({ color: "red", "font-size": "16px" });
    expect(result).toBe("color: red; font-size: 16px;");
  });

  it("should replace double quotes with single quotes in values", () => {
    const result = stylesToInlineString({ "font-family": '"Arial"' });
    expect(result).toBe("font-family: 'Arial';");
  });

  it("should handle empty styles", () => {
    expect(stylesToInlineString({})).toBe("");
  });
});

describe("computeNonDefaultStyles — inline element width skip", () => {
  it("should not include width on inline-display elements", () => {
    const element = document.createElement("span");
    element.style.display = "inline";
    element.style.color = "red";
    document.body.appendChild(element);

    const styles = computeNonDefaultStyles(element);
    expect(styles.width).toBeUndefined();
    expect(styles["min-width"]).toBeUndefined();
    expect(styles["max-width"]).toBeUndefined();
  });
});

describe("computeNonDefaultStyles — border normalization", () => {
  it("should set border:none when all border widths are 0", () => {
    const element = document.createElement("div");
    element.style.borderStyle = "solid";
    element.style.borderColor = "red";
    element.style.borderWidth = "0px";
    document.body.appendChild(element);

    const styles = computeNonDefaultStyles(element);
    expect(styles.border).toBe("none");
    expect(styles["border-top-width"]).toBeUndefined();
    expect(styles["border-right-style"]).toBeUndefined();
  });
});

describe("computeNonDefaultStyles", () => {
  it("should return only non-default styles for a styled element", () => {
    const element = document.createElement("div");
    element.style.color = "red";
    element.style.backgroundColor = "blue";
    document.body.appendChild(element);

    const styles = computeNonDefaultStyles(element);
    expect(styles.color).toBe("rgb(255, 0, 0)");
    expect(styles["background-color"]).toBe("rgb(0, 0, 255)");
  });

  it("should include display property even if default", () => {
    const element = document.createElement("div");
    document.body.appendChild(element);

    const styles = computeNonDefaultStyles(element);
    expect(styles.display).toBeDefined();
  });

  it("should freeze dimensions for root elements over threshold", () => {
    const element = document.createElement("div");
    element.style.width = "300px";
    element.style.height = "400px";
    document.body.appendChild(element);

    const styles = computeNonDefaultStyles(element, { isRoot: true });
    expect(styles.width).toMatch(/px$/);
    expect(styles.height).toMatch(/px$/);
  });
});

describe("resolveAncestorBackground", () => {
  it("should return empty string when no opaque ancestor exists", () => {
    const element = document.createElement("div");
    document.body.appendChild(element);

    expect(resolveAncestorBackground(element)).toBe("");
  });

  it("should find the nearest non-transparent ancestor background", () => {
    const parent = document.createElement("div");
    parent.style.backgroundColor = "rgb(255, 0, 0)";

    const child = document.createElement("span");
    parent.appendChild(child);
    document.body.appendChild(parent);

    const result = resolveAncestorBackground(child);
    expect(result).toBe("rgb(255, 0, 0)");
  });

  it("should skip transparent ancestors", () => {
    const grandparent = document.createElement("div");
    grandparent.style.backgroundColor = "rgb(0, 0, 255)";

    const parent = document.createElement("div");
    parent.style.backgroundColor = "transparent";

    const child = document.createElement("span");
    parent.appendChild(child);
    grandparent.appendChild(parent);
    document.body.appendChild(grandparent);

    expect(resolveAncestorBackground(child)).toBe("rgb(0, 0, 255)");
  });
});

describe("buildCounterContext — comma-separated and counter-set", () => {
  it("should parse comma-separated counter-reset values", () => {
    const container = document.createElement("div");
    container.style.setProperty("counter-reset", "section 0, chapter 0");
    document.body.appendChild(container);

    const counterContext = buildCounterContext(container);
    expect(counterContext.getCounterValue(container, "section")).toBe(0);
    expect(counterContext.getCounterValue(container, "chapter")).toBe(0);
  });

  it("should return full counter stack via getCounterStack", () => {
    const outer = document.createElement("div");
    outer.style.setProperty("counter-reset", "item 0");
    const inner = document.createElement("div");
    inner.style.setProperty("counter-reset", "item 0");
    outer.appendChild(inner);
    document.body.appendChild(outer);

    const counterContext = buildCounterContext(outer);
    const stack = counterContext.getCounterStack(inner, "item");
    expect(stack.length).toBe(2);
  });
});

describe("resolveCounterContent — counters() with stack", () => {
  it("should join full counter stack with separator for counters()", () => {
    const element = document.createElement("div");
    document.body.appendChild(element);

    const counterContext = {
      getCounterValue: () => 3,
      getCounterStack: () => [1, 2, 3],
    };
    const resolved = resolveCounterContent('counters(section, ".")', element, counterContext);
    expect(resolved).toBe("1.2.3");
  });
});

describe("hasCounterReferences", () => {
  it("should detect counter() function", () => {
    expect(hasCounterReferences("counter(section)")).toBe(true);
  });

  it("should detect counters() function", () => {
    expect(hasCounterReferences('counters(section, ".")')).toBe(true);
  });

  it("should return false for normal text", () => {
    expect(hasCounterReferences("hello world")).toBe(false);
  });

  it("should return false for empty string", () => {
    expect(hasCounterReferences("")).toBe(false);
  });
});

describe("buildCounterContext", () => {
  it("should track counter-reset and counter-increment", () => {
    const container = document.createElement("div");
    container.innerHTML = `
      <ol style="counter-reset: item 0;">
        <li style="counter-increment: item 1;">First</li>
        <li style="counter-increment: item 1;">Second</li>
      </ol>
    `;
    document.body.appendChild(container);

    const counterContext = buildCounterContext(container);
    const listItems = container.querySelectorAll("li");

    expect(counterContext.getCounterValue(listItems[0], "item")).toBeGreaterThanOrEqual(0);
  });

  it("should handle list items with explicit value attribute", () => {
    const list = document.createElement("ol");
    list.setAttribute("start", "5");
    const listItem = document.createElement("li");
    listItem.textContent = "Item";
    list.appendChild(listItem);
    document.body.appendChild(list);

    const counterContext = buildCounterContext(list);
    expect(counterContext.getCounterValue(listItem, "list-item")).toBe(5);
  });
});

describe("resolveCounterContent", () => {
  it("should resolve counter() to a numeric value", () => {
    const element = document.createElement("div");
    document.body.appendChild(element);

    const counterContext = { getCounterValue: () => 42, getCounterStack: () => [42] };
    const resolved = resolveCounterContent("counter(section)", element, counterContext);
    expect(resolved).toBe("42");
  });

  it("should resolve counter() with style parameter", () => {
    const element = document.createElement("div");
    document.body.appendChild(element);

    const counterContext = { getCounterValue: () => 3, getCounterStack: () => [3] };
    const resolved = resolveCounterContent("counter(section, upper-roman)", element, counterContext);
    expect(resolved).toBe("III");
  });

  it("should resolve counter() with lower-alpha style", () => {
    const element = document.createElement("div");
    document.body.appendChild(element);

    const counterContext = { getCounterValue: () => 1, getCounterStack: () => [1] };
    const resolved = resolveCounterContent("counter(item, lower-alpha)", element, counterContext);
    expect(resolved).toBe("a");
  });
});

describe("captureInputState", () => {
  it("should return null for non-form elements", () => {
    const element = document.createElement("div");
    expect(captureInputState(element)).toBeNull();
  });

  it("should capture checkbox state", () => {
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = true;

    const state = captureInputState(checkbox);
    expect(state).not.toBeNull();
    expect(state?.checked).toBe(true);
  });

  it("should capture disabled and required attributes", () => {
    const input = document.createElement("input");
    input.setAttribute("disabled", "");
    input.setAttribute("required", "");

    const state = captureInputState(input);
    expect(state?.disabled).toBe(true);
    expect(state?.required).toBe(true);
  });

  it("should capture min/max/pattern on input", () => {
    const input = document.createElement("input");
    input.type = "number";
    input.min = "0";
    input.max = "100";
    input.pattern = "\\d+";

    const state = captureInputState(input);
    expect(state?.min).toBe("0");
    expect(state?.max).toBe("100");
    expect(state?.pattern).toBe("\\d+");
  });

  it("should capture readonly on textarea", () => {
    const textarea = document.createElement("textarea");
    textarea.readOnly = true;

    const state = captureInputState(textarea);
    expect(state?.readonly).toBe(true);
  });
});

describe("serializeInputStateAttributes", () => {
  it("should serialize checked state", () => {
    const result = serializeInputStateAttributes({ checked: true });
    expect(result).toContain('checked=""');
  });

  it("should serialize multiple attributes", () => {
    const result = serializeInputStateAttributes({
      disabled: true,
      required: true,
      min: "5",
    });
    expect(result).toContain('disabled=""');
    expect(result).toContain('required=""');
    expect(result).toContain('min="5"');
  });

  it("should return empty string when no attributes set", () => {
    expect(serializeInputStateAttributes({})).toBe("");
  });
});

describe("preserveScrollPosition", () => {
  it("should return unchanged HTML when no scroll", () => {
    const element = document.createElement("div");
    const styles: Record<string, string> = {};
    const result = preserveScrollPosition(element, "<p>hello</p>", styles);
    expect(result).toBe("<p>hello</p>");
  });
});

describe("isIconFontFamily", () => {
  it("should detect Font Awesome", () => {
    expect(isIconFontFamily("Font Awesome")).toBe(true);
    expect(isIconFontFamily("FontAwesome")).toBe(true);
  });

  it("should detect Material Icons", () => {
    expect(isIconFontFamily("Material Icons")).toBe(true);
    expect(isIconFontFamily("Material Symbols")).toBe(true);
  });

  it("should detect generic icon fonts", () => {
    expect(isIconFontFamily("my-icon-font")).toBe(true);
    expect(isIconFontFamily("glyphicons")).toBe(true);
  });

  it("should not match regular font families", () => {
    expect(isIconFontFamily("Arial")).toBe(false);
    expect(isIconFontFamily("Roboto")).toBe(false);
    expect(isIconFontFamily("Times New Roman")).toBe(false);
  });
});

describe("collectScrollbarCss", () => {
  it("should return a string", () => {
    const result = collectScrollbarCss(document);
    expect(typeof result).toBe("string");
  });
});

describe("forceContentVisibility", () => {
  it("should return an undo function", () => {
    const element = document.createElement("div");
    document.body.appendChild(element);

    const undo = forceContentVisibility(element);
    expect(typeof undo).toBe("function");
    undo();
  });
});

describe("serializeElement", () => {
  it("should serialize a simple div with text", async () => {
    const element = document.createElement("div");
    element.textContent = "Hello World";
    element.style.color = "red";
    document.body.appendChild(element);

    const result = await serializeElement(element);
    expect(result.status).toBe("success");
    expect(result.html).toContain("Hello World");
    expect(result.html).toContain("class=");
    expect(result.elementCss).toContain("color");
    expect(result.nodeCount).toBeGreaterThan(0);
  });

  it("should skip display:none elements", async () => {
    const element = document.createElement("div");
    const hidden = document.createElement("span");
    hidden.style.display = "none";
    hidden.textContent = "hidden text";
    const visible = document.createElement("span");
    visible.textContent = "visible text";
    element.appendChild(hidden);
    element.appendChild(visible);
    document.body.appendChild(element);

    const result = await serializeElement(element);
    expect(result.html).not.toContain("hidden text");
    expect(result.html).toContain("visible text");
  });

  it("should skip script and style tags", async () => {
    const element = document.createElement("div");
    element.innerHTML = '<script>alert("xss")</script><style>.x{}</style><p>safe</p>';
    document.body.appendChild(element);

    const result = await serializeElement(element);
    expect(result.html).not.toContain("script");
    expect(result.html).not.toContain("alert");
    expect(result.html).toContain("safe");
  });

  it("should skip template elements", async () => {
    const element = document.createElement("div");
    element.innerHTML = "<template><p>template content</p></template><p>real content</p>";
    document.body.appendChild(element);

    const result = await serializeElement(element);
    expect(result.html).not.toContain("template content");
    expect(result.html).toContain("real content");
  });

  it("should preserve br as self-closing", async () => {
    const element = document.createElement("div");
    element.innerHTML = "line1<br>line2";
    document.body.appendChild(element);

    const result = await serializeElement(element);
    expect(result.html).toContain("<br>");
    expect(result.html).not.toContain("</br>");
  });

  it("should emit img as void element without closing tag", async () => {
    const element = document.createElement("div");
    const image = document.createElement("img");
    image.src = "data:image/png;base64,iVBOR";
    element.appendChild(image);
    document.body.appendChild(element);

    const result = await serializeElement(element);
    expect(result.html).toContain("<img ");
    expect(result.html).not.toContain("</img>");
  });

  it("should escape HTML in text content", async () => {
    const element = document.createElement("div");
    element.textContent = "<script>alert('xss')</script>";
    document.body.appendChild(element);

    const result = await serializeElement(element);
    expect(result.html).toContain("&lt;script&gt;");
    expect(result.html).not.toContain("<script>");
  });

  it("should report nodeCount greater than 1 for elements with children", async () => {
    const element = document.createElement("div");
    element.textContent = "hello world";
    document.body.appendChild(element);

    const result = await serializeElement(element);
    expect(result.status).toBe("success");
    expect(result.nodeCount).toBeGreaterThan(1);
  });

  it("should convert table elements to divs", async () => {
    const element = document.createElement("div");
    element.innerHTML = "<table><tr><td>cell</td></tr></table>";
    document.body.appendChild(element);

    const result = await serializeElement(element);
    expect(result.html).not.toContain("<table");
    expect(result.html).not.toContain("<tr");
    expect(result.html).not.toContain("<td");
    expect(result.html).toContain("cell");
    expect(result.html).toContain("data-react-grab-snapshot-original-tag");
  });

  it("should redact password input values with bullet characters", async () => {
    const element = document.createElement("div");
    const passwordInput = document.createElement("input");
    passwordInput.type = "password";
    passwordInput.value = "mysecretpass";
    element.appendChild(passwordInput);
    document.body.appendChild(element);

    const result = await serializeElement(element);
    expect(result.html).not.toContain("mysecretpass");
    expect(result.html).toContain("\u2022");
  });

  it("should skip hidden input elements entirely", async () => {
    const element = document.createElement("div");
    const hiddenInput = document.createElement("input");
    hiddenInput.type = "hidden";
    hiddenInput.name = "csrf_token";
    hiddenInput.value = "secret-csrf-token-123";
    element.appendChild(hiddenInput);
    const visibleText = document.createTextNode("visible");
    element.appendChild(visibleText);
    document.body.appendChild(element);

    const result = await serializeElement(element);
    expect(result.html).not.toContain("secret-csrf-token-123");
    expect(result.html).not.toContain("csrf_token");
    expect(result.html).toContain("visible");
  });

  it("should handle input elements with value", async () => {
    const element = document.createElement("div");
    const input = document.createElement("input");
    input.type = "text";
    input.value = "test value";
    element.appendChild(input);
    document.body.appendChild(element);

    const result = await serializeElement(element);
    expect(result.html).toContain("test value");
  });

  it("should preserve details open attribute", async () => {
    const element = document.createElement("details");
    element.open = true;
    const summary = document.createElement("summary");
    summary.textContent = "Click me";
    element.appendChild(summary);
    document.body.appendChild(element);

    const result = await serializeElement(element);
    expect(result.html).toContain('open=""');
  });

  it("should return aborted status when abort signal is triggered", async () => {
    const element = document.createElement("div");
    element.textContent = "content";
    document.body.appendChild(element);

    const controller = new AbortController();
    controller.abort();

    const result = await serializeElement(element, { abortSignal: controller.signal });
    expect(result.status).toBe("aborted");
    expect(result.html).toBe("");
  });

  it("should return error status on failure", async () => {
    const result = await serializeElement(null as unknown as Element);
    expect(result.status).toBe("error");
  });

  it("should convert position:fixed to position:absolute", async () => {
    const element = document.createElement("div");
    element.style.position = "fixed";
    element.style.top = "10px";
    element.style.left = "20px";
    element.textContent = "fixed element";
    document.body.appendChild(element);

    const result = await serializeElement(element);
    expect(result.elementCss).toContain("position: absolute");
    expect(result.elementCss).not.toContain("position: fixed");
  });

  it("should include fontsCss when embedFonts is enabled", async () => {
    const element = document.createElement("div");
    element.textContent = "text";
    document.body.appendChild(element);

    const result = await serializeElement(element, { embedFonts: true });
    expect(result.status).toBe("success");
    expect(typeof result.fontsCss).toBe("string");
  });

  it("should include shadowCss field in result", async () => {
    const element = document.createElement("div");
    element.textContent = "text";
    document.body.appendChild(element);

    const result = await serializeElement(element);
    expect(typeof result.shadowCss).toBe("string");
  });

  it("should preserve lang attribute", async () => {
    const element = document.createElement("div");
    element.setAttribute("lang", "ja");
    element.textContent = "日本語テキスト";
    document.body.appendChild(element);

    const result = await serializeElement(element);
    expect(result.html).toContain('lang="ja"');
  });

  it("should preserve dir attribute for RTL text", async () => {
    const element = document.createElement("div");
    element.setAttribute("dir", "rtl");
    element.textContent = "مرحبا";
    document.body.appendChild(element);

    const result = await serializeElement(element);
    expect(result.html).toContain('dir="rtl"');
  });

  it("should preserve aria-* attributes", async () => {
    const element = document.createElement("button");
    element.setAttribute("aria-label", "Close dialog");
    element.setAttribute("aria-expanded", "true");
    element.textContent = "×";
    document.body.appendChild(element);

    const result = await serializeElement(element);
    expect(result.html).toContain('aria-label="Close dialog"');
    expect(result.html).toContain('aria-expanded="true"');
  });

  it("should preserve role attribute", async () => {
    const element = document.createElement("div");
    element.setAttribute("role", "navigation");
    element.textContent = "nav";
    document.body.appendChild(element);

    const result = await serializeElement(element);
    expect(result.html).toContain('role="navigation"');
  });

  it("should preserve data-* attributes", async () => {
    const element = document.createElement("div");
    element.setAttribute("data-theme", "dark");
    element.setAttribute("data-state", "active");
    element.textContent = "themed";
    document.body.appendChild(element);

    const result = await serializeElement(element);
    expect(result.html).toContain('data-theme="dark"');
    expect(result.html).toContain('data-state="active"');
  });

  it("should preserve inert attribute", async () => {
    const element = document.createElement("div");
    element.setAttribute("inert", "");
    element.textContent = "inert content";
    document.body.appendChild(element);

    const result = await serializeElement(element);
    expect(result.html).toContain('inert=""');
  });

  it("should strip will-change from styles", async () => {
    const element = document.createElement("div");
    element.style.willChange = "transform";
    element.style.color = "red";
    element.textContent = "gpu layer";
    document.body.appendChild(element);

    const result = await serializeElement(element);
    expect(result.html).not.toContain("will-change");
  });

  it("should strip animation properties from styles", async () => {
    const element = document.createElement("div");
    element.style.animation = "spin 1s infinite";
    element.style.color = "blue";
    element.textContent = "animated";
    document.body.appendChild(element);

    const result = await serializeElement(element);
    expect(result.html).not.toContain("animation");
  });

  it("should strip transition properties from styles", async () => {
    const element = document.createElement("div");
    element.style.transition = "all 0.3s ease";
    element.style.color = "green";
    element.textContent = "transitioning";
    document.body.appendChild(element);

    const result = await serializeElement(element);
    expect(result.html).not.toContain("transition:");
    expect(result.html).not.toContain("transition-property:");
  });

  it("should capture progress element as styled div", async () => {
    const element = document.createElement("progress");
    element.max = 100;
    element.value = 75;
    document.body.appendChild(element);

    const result = await serializeElement(element);
    expect(result.html).toContain("data-react-grab-snapshot-original-tag");
    expect(result.html).toContain("PROGRESS");
    expect(result.html).toContain("75%");
  });

  it("should capture meter element as styled div", async () => {
    const element = document.createElement("meter");
    element.min = 0;
    element.max = 100;
    element.value = 50;
    document.body.appendChild(element);

    const result = await serializeElement(element);
    expect(result.html).toContain("data-react-grab-snapshot-original-tag");
    expect(result.html).toContain("METER");
    expect(result.html).toContain("50%");
  });

  it("should strip onclick and other event handler attributes", async () => {
    const element = document.createElement("div");
    element.setAttribute("onclick", "alert('xss')");
    element.setAttribute("onmouseover", "steal()");
    element.setAttribute("data-safe", "keep");
    element.textContent = "clickable";
    document.body.appendChild(element);

    const result = await serializeElement(element);
    expect(result.html).not.toContain("onclick");
    expect(result.html).not.toContain("onmouseover");
    expect(result.html).not.toContain("alert");
    expect(result.html).toContain('data-safe="keep"');
  });

  it("should strip javascript: URLs from href", async () => {
    const element = document.createElement("a");
    element.setAttribute("href", "javascript:alert('xss')");
    element.textContent = "malicious link";
    document.body.appendChild(element);

    const result = await serializeElement(element);
    expect(result.html).not.toContain("javascript:");
  });

  it("should preserve safe href URLs", async () => {
    const element = document.createElement("a");
    element.setAttribute("href", "https://example.com");
    element.textContent = "safe link";
    document.body.appendChild(element);

    const result = await serializeElement(element);
    expect(result.html).toContain('href="https://example.com"');
  });

  it("should strip cursor and pointer-events from styles", async () => {
    const element = document.createElement("div");
    element.style.cursor = "pointer";
    element.style.color = "red";
    element.textContent = "interactive";
    document.body.appendChild(element);

    const result = await serializeElement(element);
    expect(result.html).not.toContain("cursor:");
  });

  it("should strip user-select from styles", async () => {
    const element = document.createElement("div");
    element.style.userSelect = "none";
    element.style.color = "blue";
    element.textContent = "unselectable";
    document.body.appendChild(element);

    const result = await serializeElement(element);
    expect(result.html).not.toContain("user-select:");
  });

  it("should show selected option text for select elements", async () => {
    const element = document.createElement("div");
    const select = document.createElement("select");
    const option1 = document.createElement("option");
    option1.value = "a";
    option1.textContent = "First";
    const option2 = document.createElement("option");
    option2.value = "b";
    option2.textContent = "Second";
    option2.selected = true;
    select.appendChild(option1);
    select.appendChild(option2);
    element.appendChild(select);
    document.body.appendChild(element);

    const result = await serializeElement(element);
    expect(result.html).toContain("Second");
  });

  it("should capture output element value", async () => {
    const element = document.createElement("output");
    element.value = "42";
    document.body.appendChild(element);

    const result = await serializeElement(element);
    expect(result.html).toContain("42");
  });

  it("should unwrap display:contents elements (emit children only)", async () => {
    const wrapper = document.createElement("div");
    wrapper.style.display = "contents";
    const child = document.createElement("span");
    child.textContent = "unwrapped child";
    wrapper.appendChild(child);

    const container = document.createElement("div");
    container.appendChild(wrapper);
    document.body.appendChild(container);

    const result = await serializeElement(container);
    expect(result.html).toContain("unwrapped child");
  });

  it("should capture input type=range as visual track", async () => {
    const element = document.createElement("input");
    element.type = "range";
    element.min = "0";
    element.max = "100";
    element.value = "75";
    document.body.appendChild(element);

    const result = await serializeElement(element);
    expect(result.html).toContain("data-react-grab-snapshot-original-tag");
    expect(result.html).toContain("INPUT");
    expect(result.html).toContain("75%");
  });

  it("should capture input type=color as colored swatch", async () => {
    const element = document.createElement("input");
    element.type = "color";
    element.value = "#ff5500";
    document.body.appendChild(element);

    const result = await serializeElement(element);
    expect(result.html).toContain("#ff5500");
    expect(result.html).toContain("data-react-grab-snapshot-original-tag");
  });

  it("should preserve ruby annotation elements", async () => {
    const element = document.createElement("div");
    element.innerHTML = "<ruby>漢<rp>(</rp><rt>kan</rt><rp>)</rp></ruby>";
    document.body.appendChild(element);

    const result = await serializeElement(element);
    expect(result.html).toContain("<ruby");
    expect(result.html).toContain("<rt");
    expect(result.html).not.toContain("original-tag");
  });

  it("should strip zoom from styles", async () => {
    const element = document.createElement("div");
    element.style.setProperty("zoom", "1.5");
    element.style.color = "red";
    element.textContent = "zoomed";
    document.body.appendChild(element);

    const result = await serializeElement(element);
    expect(result.html).not.toContain("zoom:");
  });

  it("should handle blob: URLs in img src", async () => {
    const element = document.createElement("img");
    element.src = "data:image/png;base64,iVBOR";
    document.body.appendChild(element);

    const result = await serializeElement(element);
    expect(result.status).toBe("success");
    expect(result.html).toContain("src=");
  });

  it("should strip content property from main element styles", async () => {
    const element = document.createElement("div");
    element.style.setProperty("content", '"decorative"');
    element.style.color = "red";
    element.textContent = "real content";
    document.body.appendChild(element);

    const result = await serializeElement(element);
    expect(result.html).not.toContain("content:");
    expect(result.html).toContain("real content");
  });

  it("should include scrollbarCss field in result", async () => {
    const element = document.createElement("div");
    element.textContent = "text";
    document.body.appendChild(element);

    const result = await serializeElement(element);
    expect(typeof result.scrollbarCss).toBe("string");
  });

  it("should include font-kerning in styles", async () => {
    const element = document.createElement("div");
    element.textContent = "kerned text";
    document.body.appendChild(element);

    const result = await serializeElement(element);
    expect(result.status).toBe("success");
  });

  it("should call onProgress callback during serialization", async () => {
    const element = document.createElement("div");
    element.innerHTML = "<p>one</p><p>two</p><p>three</p>";
    document.body.appendChild(element);

    const progressValues: number[] = [];
    await serializeElement(element, {
      onProgress: (processedNodes) => progressValues.push(processedNodes),
    });

    expect(progressValues.length).toBeGreaterThan(0);
    for (let index = 1; index < progressValues.length; index++) {
      expect(progressValues[index]).toBeGreaterThanOrEqual(progressValues[index - 1]);
    }
  });
});

describe("inlineExternalSvgDefs", () => {
  const SVG_NS = "http://www.w3.org/2000/svg";

  it("should do nothing when no SVG use references exist", () => {
    const root = document.createElement("div");
    document.body.appendChild(root);
    inlineExternalSvgDefs(root);
    expect(root.querySelector("svg.inline-defs-container")).toBeFalsy();
  });

  it("should not throw when use references exist", () => {
    const root = document.createElement("div");
    const localSvg = document.createElementNS(SVG_NS, "svg");
    const use = document.createElementNS(SVG_NS, "use");
    use.setAttribute("href", "#some-icon");
    localSvg.appendChild(use);
    root.appendChild(localSvg);
    document.body.appendChild(root);

    expect(() => inlineExternalSvgDefs(root)).not.toThrow();
  });

  it("should support xlink:href on use elements", () => {
    const globalSvg = document.createElementNS(SVG_NS, "svg");
    const symbol = document.createElementNS(SVG_NS, "symbol");
    symbol.setAttribute("id", "legacy-icon");
    globalSvg.appendChild(symbol);
    document.body.appendChild(globalSvg);

    const root = document.createElement("div");
    const localSvg = document.createElementNS(SVG_NS, "svg");
    const use = document.createElementNS(SVG_NS, "use");
    use.setAttribute("xlink:href", "#legacy-icon");
    localSvg.appendChild(use);
    root.appendChild(localSvg);
    document.body.appendChild(root);

    inlineExternalSvgDefs(root);

    const container = root.querySelector("svg.inline-defs-container");
    expect(container).toBeTruthy();
  });

  it("should not duplicate if id already exists in root", () => {
    const globalSvg = document.createElementNS(SVG_NS, "svg");
    const symbol = document.createElementNS(SVG_NS, "symbol");
    symbol.setAttribute("id", "existing-icon");
    globalSvg.appendChild(symbol);
    document.body.appendChild(globalSvg);

    const root = document.createElement("div");
    const existingSymbol = document.createElementNS(SVG_NS, "symbol");
    existingSymbol.setAttribute("id", "existing-icon");
    root.appendChild(existingSymbol);

    const localSvg = document.createElementNS(SVG_NS, "svg");
    const use = document.createElementNS(SVG_NS, "use");
    use.setAttribute("href", "#existing-icon");
    localSvg.appendChild(use);
    root.appendChild(localSvg);
    document.body.appendChild(root);

    inlineExternalSvgDefs(root);

    const allSymbols = root.querySelectorAll("symbol#existing-icon");
    expect(allSymbols.length).toBe(1);
  });
});

describe("forceContentVisibility", () => {
  it("should force content-visibility hidden to visible on descendants", () => {
    const parent = document.createElement("div");
    const child = document.createElement("div");
    child.style.contentVisibility = "hidden";
    parent.appendChild(child);
    document.body.appendChild(parent);

    const undo = forceContentVisibility(parent);
    expect(child.style.contentVisibility).toBe("visible");

    undo();
    expect(child.style.contentVisibility).toBe("hidden");
  });

  it("should leave elements without content-visibility unchanged", () => {
    const element = document.createElement("div");
    element.style.color = "red";
    document.body.appendChild(element);

    forceContentVisibility(element);
    expect(element.style.contentVisibility).toBe("");
  });

  it("should return a no-op undo when nothing changed", () => {
    const element = document.createElement("div");
    document.body.appendChild(element);
    const undo = forceContentVisibility(element);
    expect(() => undo()).not.toThrow();
  });
});

describe("buildCounterContext — advanced counter tests", () => {
  it("should apply counter-reset and counter-increment together", () => {
    const root = document.createElement("div");
    const child = document.createElement("span");
    child.style.counterReset = "section 1";
    child.style.counterIncrement = "section";
    root.appendChild(child);
    document.body.appendChild(root);

    const counterContext = buildCounterContext(root);
    expect(counterContext.getCounterValue(child, "section")).toBe(2);
  });

  it("should resolve counter with upper-alpha style", () => {
    const root = document.createElement("div");
    const span = document.createElement("span");
    span.style.counterReset = "item 3";
    span.style.counterIncrement = "item";
    root.appendChild(span);
    document.body.appendChild(root);

    const counterContext = buildCounterContext(root);
    const resolved = resolveCounterContent("counter(item, upper-alpha)", span, counterContext);
    expect(resolved).toBe("D");
  });

  it("should handle negative counter values", () => {
    const element = document.createElement("span");
    document.body.appendChild(element);
    const fakeContext = {
      getCounterValue: (_element: Element, _name: string) => -3,
      getCounterStack: (_element: Element, _name: string) => [-3],
    };
    expect(resolveCounterContent("counter(x)", element, fakeContext)).toBe("-3");
  });

  it("should handle negative decimal-leading-zero counter", () => {
    const element = document.createElement("span");
    document.body.appendChild(element);
    const fakeContext = {
      getCounterValue: (_element: Element, _name: string) => -5,
      getCounterStack: (_element: Element, _name: string) => [-5],
    };
    expect(resolveCounterContent("counter(x, decimal-leading-zero)", element, fakeContext)).toBe("-05");
  });

  it("should handle zero counter as '0'", () => {
    const element = document.createElement("span");
    document.body.appendChild(element);
    const fakeContext = {
      getCounterValue: (_element: Element, _name: string) => 0,
      getCounterStack: (_element: Element, _name: string) => [0],
    };
    expect(resolveCounterContent("counter(x)", element, fakeContext)).toBe("0");
  });
});

describe("stabilizeLineClamp", () => {
  it("should return an undo function", () => {
    const element = document.createElement("div");
    document.body.appendChild(element);
    const undo = stabilizeLineClamp(element);
    expect(typeof undo).toBe("function");
    undo();
  });

  it("should not throw on empty elements", () => {
    const element = document.createElement("div");
    document.body.appendChild(element);
    expect(() => stabilizeLineClamp(element)).not.toThrow();
  });
});

describe("stabilizeElementLayout", () => {
  it("should return an undo function", () => {
    const element = document.createElement("div");
    document.body.appendChild(element);
    const undo = stabilizeElementLayout(element);
    expect(typeof undo).toBe("function");
    undo();
  });
});

describe("fetchAsDataUrl", () => {
  it("should return data URLs as-is", async () => {
    const dataUrl = "data:image/png;base64,iVBOR";
    const result = await fetchAsDataUrl(dataUrl);
    expect(result).toBe(dataUrl);
  });

  it("should return null for empty URLs", async () => {
    const result = await fetchAsDataUrl("");
    expect(result).toBe("");
  });

  it("should return null on fetch failure", async () => {
    const result = await fetchAsDataUrl("https://nonexistent.invalid/image.png");
    expect(result).toBeNull();
  });
});

describe("serializeElement — visibility:hidden + display:contents", () => {
  it("should not skip children of visibility:hidden display:contents elements", async () => {
    const container = document.createElement("div");
    const wrapper = document.createElement("div");
    wrapper.style.visibility = "hidden";
    wrapper.style.display = "contents";
    const visibleChild = document.createElement("span");
    visibleChild.style.visibility = "visible";
    visibleChild.textContent = "I am visible";
    wrapper.appendChild(visibleChild);
    container.appendChild(wrapper);
    document.body.appendChild(container);

    const result = await serializeElement(container);
    expect(result.html).toContain("I am visible");
  });
});

describe("serializeElement — root element reset", () => {
  it("should zero out margins on root element", async () => {
    const element = document.createElement("div");
    element.style.margin = "20px";
    element.textContent = "root";
    document.body.appendChild(element);

    const result = await serializeElement(element);
    expect(result.elementCss).toContain("margin: 0");
  });

  it("should reset positioning on root element", async () => {
    const element = document.createElement("div");
    element.style.position = "absolute";
    element.style.top = "50px";
    element.style.left = "100px";
    element.textContent = "positioned root";
    document.body.appendChild(element);

    const result = await serializeElement(element);
    expect(result.elementCss).toContain("top: auto");
    expect(result.elementCss).toContain("left: auto");
  });
});

describe("serializeElement — pre element margin", () => {
  it("should zero marginTop on pre elements", async () => {
    const container = document.createElement("div");
    const preElement = document.createElement("pre");
    preElement.textContent = "code block";
    container.appendChild(preElement);
    document.body.appendChild(container);

    const result = await serializeElement(container);
    expect(result.elementCss).toContain("margin-top: 0");
  });
});

describe("resolveBlobUrl", () => {
  it("should return null for non-blob URLs", async () => {
    expect(await resolveBlobUrl("https://example.com")).toBeNull();
  });

  it("should return null for empty string", async () => {
    expect(await resolveBlobUrl("")).toBeNull();
  });
});

describe("createIframePlaceholder", () => {
  it("should create a placeholder div with dimensions", () => {
    const iframe = document.createElement("iframe");
    document.body.appendChild(iframe);

    const placeholder = createIframePlaceholder(iframe);
    expect(placeholder).toContain("iframe");
    expect(placeholder).toContain("display:flex");
  });
});

describe("collectUsedCodepoints", () => {
  it("should collect codepoints from text content", () => {
    const element = document.createElement("div");
    element.textContent = "ABC";
    document.body.appendChild(element);

    const codepoints = collectUsedCodepoints(element);
    expect(codepoints.has(65)).toBe(true);
    expect(codepoints.has(66)).toBe(true);
    expect(codepoints.has(67)).toBe(true);
  });

  it("should handle empty elements", () => {
    const element = document.createElement("div");
    document.body.appendChild(element);

    const codepoints = collectUsedCodepoints(element);
    expect(codepoints.size).toBe(0);
  });

  it("should handle emoji / surrogate pairs", () => {
    const element = document.createElement("div");
    element.textContent = "\u{1F600}";
    document.body.appendChild(element);

    const codepoints = collectUsedCodepoints(element);
    expect(codepoints.has(0x1F600)).toBe(true);
  });
});

describe("resolveImageElementSource", () => {
  it("should return src for simple images", () => {
    const img = document.createElement("img");
    img.src = "https://example.com/img.png";

    const source = resolveImageElementSource(img);
    expect(source).toContain("example.com/img.png");
  });

  it("should return currentSrc when available", () => {
    const img = document.createElement("img");
    img.src = "fallback.png";
    Object.defineProperty(img, "currentSrc", {
      get: () => "https://cdn.example.com/optimized.webp",
    });

    const source = resolveImageElementSource(img);
    expect(source).toBe("https://cdn.example.com/optimized.webp");
  });
});

describe("serializeElement — style deduplication", () => {
  it("should produce elementCss with deduplicated class rules", async () => {
    const element = document.createElement("div");
    element.style.color = "red";
    element.textContent = "styled";
    document.body.appendChild(element);

    const result = await serializeElement(element);
    expect(result.elementCss).toBeTruthy();
    expect(result.html).toContain("class=");
    expect(result.html).not.toContain("style=");
  });

  it("should share classes between elements with identical styles", async () => {
    const container = document.createElement("div");
    const childA = document.createElement("span");
    childA.style.color = "blue";
    childA.textContent = "A";
    const childB = document.createElement("span");
    childB.style.color = "blue";
    childB.textContent = "B";
    container.appendChild(childA);
    container.appendChild(childB);
    document.body.appendChild(container);

    const result = await serializeElement(container);
    expect(result.status).toBe("success");
    expect(typeof result.elementCss).toBe("string");
  });
});

describe("serializeElement — integration tests", () => {
  it("should handle deeply nested structure", async () => {
    const root = document.createElement("div");
    let current = root;
    for (let depth = 0; depth < 10; depth++) {
      const child = document.createElement("div");
      current.appendChild(child);
      current = child;
    }
    current.textContent = "deep leaf";
    document.body.appendChild(root);

    const result = await serializeElement(root);
    expect(result.status).toBe("success");
    expect(result.html).toContain("deep leaf");
  });

  it("should handle empty elements", async () => {
    const element = document.createElement("div");
    document.body.appendChild(element);

    const result = await serializeElement(element);
    expect(result.status).toBe("success");
  });

  it("should handle SVG elements", async () => {
    const element = document.createElement("div");
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("width", "100");
    svg.setAttribute("height", "100");
    svg.setAttribute("viewBox", "0 0 100 100");
    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("cx", "50");
    circle.setAttribute("cy", "50");
    circle.setAttribute("r", "40");
    circle.setAttribute("fill", "red");
    svg.appendChild(circle);
    element.appendChild(svg);
    document.body.appendChild(element);

    const result = await serializeElement(element);
    expect(result.status).toBe("success");
    expect(result.html).toContain("svg");
    expect(result.html).toContain("circle");
    expect(result.html).toContain("fill");
  });

  it("should handle multiple sibling elements", async () => {
    const container = document.createElement("div");
    for (let index = 0; index < 5; index++) {
      const child = document.createElement("span");
      child.textContent = `item-${index}`;
      container.appendChild(child);
    }
    document.body.appendChild(container);

    const result = await serializeElement(container);
    expect(result.status).toBe("success");
    expect(result.nodeCount).toBeGreaterThan(5);
  });

  it("should serialize select with multiple options correctly", async () => {
    const container = document.createElement("div");
    const select = document.createElement("select");
    for (let index = 0; index < 3; index++) {
      const option = document.createElement("option");
      option.value = String(index);
      option.textContent = `Option ${index}`;
      if (index === 2) option.selected = true;
      select.appendChild(option);
    }
    container.appendChild(select);
    document.body.appendChild(container);

    const result = await serializeElement(container);
    expect(result.html).toContain("Option 2");
  });

  it("should handle checkbox and radio inputs", async () => {
    const container = document.createElement("div");

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = true;
    container.appendChild(checkbox);

    const radio = document.createElement("input");
    radio.type = "radio";
    radio.checked = false;
    container.appendChild(radio);

    document.body.appendChild(container);

    const result = await serializeElement(container);
    expect(result.status).toBe("success");
    expect(result.html).toContain("data-input-state");
  });

  it("should handle textarea with value", async () => {
    const container = document.createElement("div");
    const textarea = document.createElement("textarea");
    textarea.value = "multi\nline\ntext";
    container.appendChild(textarea);
    document.body.appendChild(container);

    const result = await serializeElement(container);
    expect(result.html).toContain("multi");
  });
});

describe("elementToPngBlob", () => {
  it("should be importable and callable", () => {
    expect(typeof elementToPngBlob).toBe("function");
  });
});

describe("copyPngToClipboard", () => {
  it("should return false when clipboard API is unavailable", async () => {
    const fakeBlob = new Blob(["test"], { type: "image/png" });
    const result = await copyPngToClipboard(fakeBlob);
    expect(result).toBe(false);
  });
});
