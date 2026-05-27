import { isDOMElementName } from "../utils/jsx.js";

const COMMON_EVENTS = [
  "onAnimationEnd",
  "onAnimationIteration",
  "onAnimationStart",
  "onBeforeInput",
  "onBlur",
  "onChange",
  "onClick",
  "onContextMenu",
  "onCopy",
  "onCut",
  "onDblClick",
  "onDrag",
  "onDragEnd",
  "onDragEnter",
  "onDragExit",
  "onDragLeave",
  "onDragOver",
  "onDragStart",
  "onDrop",
  "onError",
  "onFocus",
  "onFocusIn",
  "onFocusOut",
  "onGotPointerCapture",
  "onInput",
  "onInvalid",
  "onKeyDown",
  "onKeyPress",
  "onKeyUp",
  "onLoad",
  "onLostPointerCapture",
  "onMouseDown",
  "onMouseEnter",
  "onMouseLeave",
  "onMouseMove",
  "onMouseOut",
  "onMouseOver",
  "onMouseUp",
  "onPaste",
  "onPointerCancel",
  "onPointerDown",
  "onPointerEnter",
  "onPointerLeave",
  "onPointerMove",
  "onPointerOut",
  "onPointerOver",
  "onPointerUp",
  "onReset",
  "onScroll",
  "onSelect",
  "onSubmit",
  "onToggle",
  "onTouchCancel",
  "onTouchEnd",
  "onTouchMove",
  "onTouchStart",
  "onTransitionEnd",
  "onWheel"
];
const COMMON_EVENTS_MAP = new Map;
for (const event of COMMON_EVENTS) {
  COMMON_EVENTS_MAP.set(event.toLowerCase(), event);
}
const NONSTANDARD_EVENTS_MAP = {
  ondoubleclick: "onDblClick"
};
function getStaticValue(node, scope) {
  if (!node)
    return null;
  if (node.type === "Literal")
    return { value: node.value };
  if (node.type === "TemplateLiteral" && node.expressions.length === 0) {
    return { value: node.quasis[0]?.value?.cooked ?? null };
  }
  if (node.type === "Identifier" && scope) {
    const variable = scope.set?.get?.(node.name);
    const def = variable?.defs?.[0];
    if (def?.node?.type === "VariableDeclarator" && def.node.parent?.kind === "const" && def.node.init) {
      return getStaticValue(def.node.init, scope);
    }
  }
  return null;
}
const ruleDefinition = {
  meta: {
    type: "problem",
    docs: {
      description: "Enforce naming DOM element event handlers consistently and prevent Solid's analysis from misunderstanding whether a prop should be an event handler.",
      recommended: "error"
    },
    fixable: "code",
    hasSuggestions: true,
    schema: [
      {
        type: "object",
        properties: {
          ignoreCase: {
            type: "boolean",
            description: "if true, don't warn on ambiguously named event handlers like `onclick` or `onchange`",
            default: false
          },
          warnOnSpread: {
            type: "boolean",
            description: "if true, warn when spreading event handlers onto JSX. Enable for Solid < v1.6.",
            default: false
          }
        },
        additionalProperties: false
      }
    ],
    messages: {
      "detected-attr": 'The {{name}} prop is named as an event handler (starts with "on"), but Solid knows its value ({{staticValue}}) is a string or number, so it will be treated as an attribute. If this is intentional, name this prop attr:{{name}}.',
      naming: "The {{name}} prop is ambiguous. If it is an event handler, change it to {{handlerName}}. If it is an attribute, change it to {{attrName}}.",
      capitalization: "The {{name}} prop should be renamed to {{fixedName}} for readability.",
      nonstandard: "The {{name}} prop should be renamed to {{fixedName}}, because it's not a standard event handler.",
      "make-handler": "Change the {{name}} prop to {{handlerName}}.",
      "make-attr": "Change the {{name}} prop to {{attrName}}.",
      "spread-handler": "The {{name}} prop should be added as a JSX attribute, not spread in. Solid doesn't add listeners when spreading into JSX."
    }
  },
  defaultOptions: [],
  createOnce(context) {
    return {
      JSXAttribute(node) {
        const openingElement = node.parent;
        if (openingElement?.name?.type !== "JSXIdentifier" || !isDOMElementName(openingElement.name.name)) {
          return;
        }
        if (node.name?.type === "JSXNamespacedName") {
          return;
        }
        const { name } = node.name ?? {};
        if (!name || !/^on[a-zA-Z]/.test(name)) {
          return;
        }
        let staticValue = null;
        if (node.value?.type === "JSXExpressionContainer" && node.value.expression.type !== "JSXEmptyExpression" && node.value.expression.type !== "ArrayExpression" && (staticValue = getStaticValue(node.value.expression, context.sourceCode?.getScope?.(node))) !== null && (typeof staticValue.value === "string" || typeof staticValue.value === "number")) {
          context.report({
            node,
            messageId: "detected-attr",
            data: { name, staticValue: staticValue.value }
          });
        } else if (node.value === null || node.value?.type === "Literal") {
          context.report({
            node,
            messageId: "detected-attr",
            data: { name, staticValue: node.value !== null ? node.value.value : true }
          });
        } else if (!context.options[0]?.ignoreCase) {
          const lowercaseHandlerName = name.toLowerCase();
          if (NONSTANDARD_EVENTS_MAP[lowercaseHandlerName]) {
            const fixedName = NONSTANDARD_EVENTS_MAP[lowercaseHandlerName];
            context.report({
              node: node.name,
              messageId: "nonstandard",
              data: { name, fixedName },
              fix: (fixer) => fixer.replaceText(node.name, fixedName)
            });
          } else if (COMMON_EVENTS_MAP.has(lowercaseHandlerName)) {
            const fixedName = COMMON_EVENTS_MAP.get(lowercaseHandlerName);
            if (fixedName !== name) {
              context.report({
                node: node.name,
                messageId: "capitalization",
                data: { name, fixedName },
                fix: (fixer) => fixer.replaceText(node.name, fixedName)
              });
            }
          } else if (name[2] === name[2].toLowerCase()) {
            const handlerName = `on${name[2].toUpperCase()}${name.slice(3)}`;
            const attrName = `attr:${name}`;
            context.report({
              node: node.name,
              messageId: "naming",
              data: { name, attrName, handlerName },
              suggest: [
                {
                  messageId: "make-handler",
                  data: { name, handlerName },
                  fix: (fixer) => fixer.replaceText(node.name, handlerName)
                },
                {
                  messageId: "make-attr",
                  data: { name, attrName },
                  fix: (fixer) => fixer.replaceText(node.name, attrName)
                }
              ]
            });
          }
        }
      },
      Property(node) {
        if (context.options[0]?.warnOnSpread && node.parent?.type === "ObjectExpression" && node.parent.parent?.type === "JSXSpreadAttribute" && node.parent.parent.parent?.type === "JSXOpeningElement") {
          const openingElement = node.parent.parent.parent;
          if (openingElement.name?.type === "JSXIdentifier" && isDOMElementName(openingElement.name.name)) {
            if (node.key?.type === "Identifier" && /^on/.test(node.key.name)) {
              const handlerName = node.key.name;
              context.report({
                node,
                messageId: "spread-handler",
                data: { name: node.key.name },
                *fix(fixer) {
                  const commaAfter = context.sourceCode.getTokenAfter(node);
                  yield fixer.remove(node.parent.properties.length === 1 ? node.parent.parent : node);
                  if (commaAfter?.value === ",") {
                    yield fixer.remove(commaAfter);
                  }
                  yield fixer.insertTextAfter(node.parent.parent, ` ${handlerName}={${context.sourceCode.getText(node.value)}}`);
                }
              });
            }
          }
        }
      }
    };
  }
};

export default ruleDefinition;
