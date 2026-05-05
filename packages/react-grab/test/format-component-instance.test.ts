import { describe, expect, it } from "vite-plus/test";
import { formatComponentInstance } from "../src/utils/format-component-instance.js";

describe("formatComponentInstance", () => {
  it("renders a self-closing tag for a component with no props", () => {
    expect(formatComponentInstance({ name: "Button", props: null })).toBe("<Button />");
    expect(formatComponentInstance({ name: "Button", props: {} })).toBe("<Button />");
  });

  it("renders string props as quoted JSX attributes", () => {
    expect(
      formatComponentInstance({
        name: "Link",
        props: { href: "/forgot", className: "btn" },
      }),
    ).toBe('<Link href="/forgot" className="btn" />');
  });

  it("renders numeric and boolean primitives in braces", () => {
    expect(
      formatComponentInstance({
        name: "Counter",
        props: { count: 42, ready: false },
      }),
    ).toBe("<Counter count={42} ready={false} />");
  });

  it("renders true booleans as the bare attribute name", () => {
    expect(formatComponentInstance({ name: "Input", props: { disabled: true } })).toBe(
      "<Input disabled />",
    );
  });

  it("renders functions as a Function placeholder with the name", () => {
    const handleClick = (): void => {};
    expect(
      formatComponentInstance({
        name: "Button",
        props: { onClick: handleClick },
      }),
    ).toBe("<Button onClick={[Function: handleClick]} />");
  });

  it("renders anonymous functions without a Function name", () => {
    expect(
      formatComponentInstance({
        name: "Button",
        props: { onClick: () => {} },
      }),
    ).toBe("<Button onClick={[Function: onClick]} />");
  });

  it("renders arrays compactly with their item count", () => {
    expect(formatComponentInstance({ name: "List", props: { items: [1, 2, 3] } })).toBe(
      "<List items={[3 items]} />",
    );
  });

  it("renders empty arrays distinctly", () => {
    expect(formatComponentInstance({ name: "List", props: { items: [] } })).toBe(
      "<List items={[]} />",
    );
  });

  it("renders generic object props as a placeholder", () => {
    expect(
      formatComponentInstance({
        name: "Card",
        props: { meta: { id: "abc" } },
      }),
    ).toBe("<Card meta={{...}} />");
  });

  it("skips children, key, ref, and dangerouslySetInnerHTML", () => {
    expect(
      formatComponentInstance({
        name: "Item",
        props: {
          children: "hello",
          key: "item-1",
          ref: { current: null },
          dangerouslySetInnerHTML: { __html: "<b>x</b>" },
          label: "Click",
        },
      }),
    ).toBe('<Item label="Click" />');
  });

  it("skips internal-looking props with double-underscore or $$ prefixes", () => {
    expect(
      formatComponentInstance({
        name: "Comp",
        props: { __dev: true, $$typeof: "react.element", visible: true },
      }),
    ).toBe("<Comp visible />");
  });

  it("truncates long string values", () => {
    const longText = "x".repeat(200);
    const formatted = formatComponentInstance({
      name: "Comp",
      props: { text: longText },
    });
    expect(formatted).toContain("...");
    expect(formatted.length).toBeLessThan(longText.length);
  });

  it("limits the number of rendered props with an overflow marker", () => {
    expect(
      formatComponentInstance({
        name: "Comp",
        props: { a: 1, b: 2, c: 3, d: 4, e: 5, f: 6 },
      }),
    ).toBe("<Comp a={1} b={2} c={3} d={4} /* +2 more */ />");
  });

  it("handles undefined values by omitting them entirely", () => {
    expect(formatComponentInstance({ name: "Comp", props: { a: undefined, b: 1 } })).toBe(
      "<Comp b={1} />",
    );
  });

  it("handles null values explicitly", () => {
    expect(formatComponentInstance({ name: "Comp", props: { value: null } })).toBe(
      "<Comp value={null} />",
    );
  });
});
