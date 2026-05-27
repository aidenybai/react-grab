import { jsxPropName } from "../utils/jsx.js";

function toKebabCase(str) {
  return str.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
}
function parseStyleString(str) {
  const result = {};
  for (const decl of str.split(";")) {
    const trimmed = decl.trim();
    if (!trimmed)
      continue;
    const i = trimmed.indexOf(":");
    if (i === -1)
      return;
    const prop = trimmed.slice(0, i).trim();
    const value = trimmed.slice(i + 1).trim();
    if (!prop)
      return;
    result[prop] = value;
  }
  return result;
}
function getPropertyName(node, scope) {
  if (!node.computed) {
    if (node.key?.type === "Identifier")
      return node.key.name;
    if (node.key?.type === "Literal" && typeof node.key.value === "string")
      return node.key.value;
  }
  if (node.computed && node.key) {
    const val = getStaticValue(node.key, scope);
    if (val && typeof val.value === "string")
      return val.value;
  }
  return null;
}
function getStaticValue(node, _scope) {
  if (!node)
    return null;
  if (node.type === "Literal")
    return { value: node.value };
  if (node.type === "TemplateLiteral" && node.expressions.length === 0) {
    return { value: node.quasis[0]?.value?.cooked ?? null };
  }
  return null;
}
const CSS_PROPERTIES = new Set(buildCssPropertyList());
function buildCssPropertyList() {
  const props = [
    "display",
    "position",
    "top",
    "right",
    "bottom",
    "left",
    "float",
    "clear",
    "z-index",
    "overflow",
    "overflow-x",
    "overflow-y",
    "overflow-wrap",
    "visibility",
    "opacity",
    "clip",
    "clip-path",
    "flex",
    "flex-basis",
    "flex-direction",
    "flex-flow",
    "flex-grow",
    "flex-shrink",
    "flex-wrap",
    "order",
    "justify-content",
    "align-content",
    "align-items",
    "align-self",
    "place-content",
    "place-items",
    "place-self",
    "grid",
    "grid-area",
    "grid-auto-columns",
    "grid-auto-flow",
    "grid-auto-rows",
    "grid-column",
    "grid-column-end",
    "grid-column-gap",
    "grid-column-start",
    "grid-gap",
    "grid-row",
    "grid-row-end",
    "grid-row-gap",
    "grid-row-start",
    "grid-template",
    "grid-template-areas",
    "grid-template-columns",
    "grid-template-rows",
    "gap",
    "row-gap",
    "column-gap",
    "width",
    "height",
    "min-width",
    "max-width",
    "min-height",
    "max-height",
    "margin",
    "margin-top",
    "margin-right",
    "margin-bottom",
    "margin-left",
    "margin-block",
    "margin-block-start",
    "margin-block-end",
    "margin-inline",
    "margin-inline-start",
    "margin-inline-end",
    "padding",
    "padding-top",
    "padding-right",
    "padding-bottom",
    "padding-left",
    "padding-block",
    "padding-block-start",
    "padding-block-end",
    "padding-inline",
    "padding-inline-start",
    "padding-inline-end",
    "box-sizing",
    "inline-size",
    "block-size",
    "min-inline-size",
    "max-inline-size",
    "min-block-size",
    "max-block-size",
    "border",
    "border-top",
    "border-right",
    "border-bottom",
    "border-left",
    "border-width",
    "border-top-width",
    "border-right-width",
    "border-bottom-width",
    "border-left-width",
    "border-style",
    "border-top-style",
    "border-right-style",
    "border-bottom-style",
    "border-left-style",
    "border-color",
    "border-top-color",
    "border-right-color",
    "border-bottom-color",
    "border-left-color",
    "border-radius",
    "border-top-left-radius",
    "border-top-right-radius",
    "border-bottom-left-radius",
    "border-bottom-right-radius",
    "border-image",
    "border-image-outset",
    "border-image-repeat",
    "border-image-slice",
    "border-image-source",
    "border-image-width",
    "border-collapse",
    "border-spacing",
    "border-block",
    "border-block-color",
    "border-block-end",
    "border-block-end-color",
    "border-block-end-style",
    "border-block-end-width",
    "border-block-start",
    "border-block-start-color",
    "border-block-start-style",
    "border-block-start-width",
    "border-block-style",
    "border-block-width",
    "border-inline",
    "border-inline-color",
    "border-inline-end",
    "border-inline-end-color",
    "border-inline-end-style",
    "border-inline-end-width",
    "border-inline-start",
    "border-inline-start-color",
    "border-inline-start-style",
    "border-inline-start-width",
    "border-inline-style",
    "border-inline-width",
    "border-start-start-radius",
    "border-start-end-radius",
    "border-end-start-radius",
    "border-end-end-radius",
    "background",
    "background-attachment",
    "background-blend-mode",
    "background-clip",
    "background-color",
    "background-image",
    "background-origin",
    "background-position",
    "background-position-x",
    "background-position-y",
    "background-repeat",
    "background-size",
    "color",
    "font",
    "font-family",
    "font-feature-settings",
    "font-kerning",
    "font-language-override",
    "font-optical-sizing",
    "font-size",
    "font-size-adjust",
    "font-stretch",
    "font-style",
    "font-synthesis",
    "font-variant",
    "font-variant-alternates",
    "font-variant-caps",
    "font-variant-east-asian",
    "font-variant-ligatures",
    "font-variant-numeric",
    "font-variant-position",
    "font-variation-settings",
    "font-weight",
    "letter-spacing",
    "line-break",
    "line-height",
    "text-align",
    "text-align-last",
    "text-combine-upright",
    "text-decoration",
    "text-decoration-color",
    "text-decoration-line",
    "text-decoration-skip-ink",
    "text-decoration-style",
    "text-decoration-thickness",
    "text-emphasis",
    "text-emphasis-color",
    "text-emphasis-position",
    "text-emphasis-style",
    "text-indent",
    "text-justify",
    "text-orientation",
    "text-overflow",
    "text-rendering",
    "text-shadow",
    "text-transform",
    "text-underline-offset",
    "text-underline-position",
    "white-space",
    "word-break",
    "word-spacing",
    "word-wrap",
    "writing-mode",
    "direction",
    "unicode-bidi",
    "hyphens",
    "tab-size",
    "quotes",
    "list-style",
    "list-style-image",
    "list-style-position",
    "list-style-type",
    "table-layout",
    "caption-side",
    "empty-cells",
    "transform",
    "transform-box",
    "transform-origin",
    "transform-style",
    "perspective",
    "perspective-origin",
    "backface-visibility",
    "animation",
    "animation-delay",
    "animation-direction",
    "animation-duration",
    "animation-fill-mode",
    "animation-iteration-count",
    "animation-name",
    "animation-play-state",
    "animation-timing-function",
    "transition",
    "transition-delay",
    "transition-duration",
    "transition-property",
    "transition-timing-function",
    "filter",
    "backdrop-filter",
    "mix-blend-mode",
    "isolation",
    "box-shadow",
    "outline",
    "outline-color",
    "outline-offset",
    "outline-style",
    "outline-width",
    "object-fit",
    "object-position",
    "resize",
    "contain",
    "content",
    "counter-increment",
    "counter-reset",
    "counter-set",
    "aspect-ratio",
    "container",
    "container-name",
    "container-type",
    "scroll-behavior",
    "scroll-margin",
    "scroll-margin-top",
    "scroll-margin-right",
    "scroll-margin-bottom",
    "scroll-margin-left",
    "scroll-margin-block",
    "scroll-margin-block-start",
    "scroll-margin-block-end",
    "scroll-margin-inline",
    "scroll-margin-inline-start",
    "scroll-margin-inline-end",
    "scroll-padding",
    "scroll-padding-top",
    "scroll-padding-right",
    "scroll-padding-bottom",
    "scroll-padding-left",
    "scroll-padding-block",
    "scroll-padding-block-start",
    "scroll-padding-block-end",
    "scroll-padding-inline",
    "scroll-padding-inline-start",
    "scroll-padding-inline-end",
    "scroll-snap-align",
    "scroll-snap-stop",
    "scroll-snap-type",
    "overscroll-behavior",
    "overscroll-behavior-x",
    "overscroll-behavior-y",
    "overscroll-behavior-block",
    "overscroll-behavior-inline",
    "cursor",
    "caret-color",
    "pointer-events",
    "touch-action",
    "user-select",
    "appearance",
    "will-change",
    "image-rendering",
    "columns",
    "column-count",
    "column-fill",
    "column-gap",
    "column-rule",
    "column-rule-color",
    "column-rule-style",
    "column-rule-width",
    "column-span",
    "column-width",
    "page-break-after",
    "page-break-before",
    "page-break-inside",
    "break-after",
    "break-before",
    "break-inside",
    "orphans",
    "widows",
    "all",
    "accent-color",
    "color-scheme",
    "forced-color-adjust",
    "print-color-adjust",
    "inset",
    "inset-block",
    "inset-block-start",
    "inset-block-end",
    "inset-inline",
    "inset-inline-start",
    "inset-inline-end",
    "mask",
    "mask-border",
    "mask-border-mode",
    "mask-border-outset",
    "mask-border-repeat",
    "mask-border-slice",
    "mask-border-source",
    "mask-border-width",
    "mask-clip",
    "mask-composite",
    "mask-image",
    "mask-mode",
    "mask-origin",
    "mask-position",
    "mask-repeat",
    "mask-size",
    "mask-type",
    "shape-image-threshold",
    "shape-margin",
    "shape-outside",
    "-webkit-appearance",
    "-webkit-font-smoothing",
    "-webkit-line-clamp",
    "-webkit-overflow-scrolling",
    "-webkit-tap-highlight-color",
    "-webkit-text-fill-color",
    "-webkit-text-stroke",
    "-webkit-text-stroke-color",
    "-webkit-text-stroke-width",
    "-webkit-text-size-adjust",
    "-moz-appearance",
    "-moz-osx-font-smoothing",
    "-ms-overflow-style",
    "-ms-text-size-adjust",
    "fill",
    "stroke",
    "stroke-dasharray",
    "stroke-dashoffset",
    "stroke-linecap",
    "stroke-linejoin",
    "stroke-miterlimit",
    "stroke-opacity",
    "stroke-width",
    "fill-opacity",
    "fill-rule",
    "paint-order",
    "dominant-baseline",
    "text-anchor",
    "block-size",
    "inline-size"
  ];
  return props;
}
const lengthPercentageRegex = /\b(?:width|height|margin|padding|border-width|font-size)\b/i;
const ruleDefinition = {
  meta: {
    type: "problem",
    docs: {
      description: "Require CSS properties in the `style` prop to be valid and kebab-cased (ex. 'font-size'), not camel-cased (ex. 'fontSize') like in React, " + "and that property values with dimensions are strings, not numbers with implicit 'px' units.",
      url: "https://github.com/solidjs-community/eslint-plugin-solid/blob/main/packages/eslint-plugin-solid/docs/style-prop.md"
    },
    fixable: "code",
    schema: [
      {
        type: "object",
        properties: {
          styleProps: {
            description: "an array of prop names to treat as a CSS style object",
            default: ["style"],
            type: "array",
            items: { type: "string" },
            minItems: 1,
            uniqueItems: true
          },
          allowString: {
            description: "if allowString is set to true, this rule will not convert a style string literal into a style object (not recommended for performance)",
            type: "boolean",
            default: false
          }
        },
        additionalProperties: false
      }
    ],
    messages: {
      kebabStyleProp: "Use {{ kebabName }} instead of {{ name }}.",
      invalidStyleProp: "{{ name }} is not a valid CSS property.",
      numericStyleValue: 'This CSS property value should be a string with a unit; Solid does not automatically append a "px" unit.',
      stringStyle: "Use an object for the style prop instead of a string."
    }
  },
  defaultOptions: [],
  createOnce(context) {
    return {
      JSXAttribute(node) {
        const allowString = Boolean(context.options?.[0]?.allowString);
        const styleProps = context.options?.[0]?.styleProps || ["style"];
        if (styleProps.indexOf(jsxPropName(node)) === -1)
          return;
        const style = node.value?.type === "JSXExpressionContainer" ? node.value.expression : node.value;
        if (!style) {
          return;
        } else if (style.type === "Literal" && typeof style.value === "string" && !allowString) {
          let objectStyles;
          try {
            objectStyles = parseStyleString(style.value);
          } catch {}
          context.report({
            node: style,
            messageId: "stringStyle",
            fix: objectStyles && ((fixer) => fixer.replaceText(node.value, `{${JSON.stringify(objectStyles)}}`))
          });
        } else if (style.type === "TemplateLiteral" && !allowString) {
          context.report({ node: style, messageId: "stringStyle" });
        } else if (style.type === "ObjectExpression") {
          const properties = style.properties.filter((p) => p.type === "Property");
          for (const prop of properties) {
            const scope = context.sourceCode?.getScope?.(prop);
            const name = getPropertyName(prop, scope);
            if (name && !name.startsWith("--") && !CSS_PROPERTIES.has(name)) {
              const kebabName = toKebabCase(name);
              if (CSS_PROPERTIES.has(kebabName)) {
                context.report({
                  node: prop.key,
                  messageId: "kebabStyleProp",
                  data: { name, kebabName },
                  fix: (fixer) => fixer.replaceText(prop.key, `"${kebabName}"`)
                });
              } else {
                context.report({
                  node: prop.key,
                  messageId: "invalidStyleProp",
                  data: { name }
                });
              }
            } else if (!name || !name.startsWith("--") && lengthPercentageRegex.test(name)) {
              const value = getStaticValue(prop.value)?.value;
              if (typeof value === "number" && value !== 0) {
                context.report({ node: prop.value, messageId: "numericStyleValue" });
              }
            }
          }
        }
      }
    };
  }
};

export default ruleDefinition;
