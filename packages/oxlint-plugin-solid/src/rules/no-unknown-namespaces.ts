import { isDOMElementName } from "../utils/jsx.js";

const knownNamespaces = ["on", "oncapture", "use", "prop", "attr", "bool"];
const styleNamespaces = ["style", "class"];
const otherNamespaces = ["xmlns", "xlink"];
const ruleDefinition = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Enforce using only Solid-specific namespaced attribute names (i.e. `'on:'` in `<div on:click={...} />`).",
      recommended: "error",
    },
    hasSuggestions: true,
    schema: [
      {
        type: "object",
        properties: {
          allowedNamespaces: {
            description: "an array of additional namespace names to allow",
            type: "array",
            items: { type: "string" },
            default: [],
            minItems: 1,
            uniqueItems: true,
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      unknown: `'{{namespace}}:' is not one of Solid's special prefixes for JSX attributes (${knownNamespaces.map((n) => `'${n}:'`).join(", ")}).`,
      style:
        "Using the '{{namespace}}:' special prefix is potentially confusing, prefer the '{{namespace}}' prop instead.",
      component: "Namespaced props have no effect on components.",
      "component-suggest": "Replace {{namespace}}:{{name}} with {{name}}.",
    },
  },
  defaultOptions: [],
  createOnce(context) {
    return {
      "JSXAttribute > JSXNamespacedName"(node) {
        const explicitlyAllowedNamespaces = context.options?.[0]?.allowedNamespaces;
        const openingElement = node.parent?.parent;
        if (
          openingElement?.name?.type === "JSXIdentifier" &&
          !isDOMElementName(openingElement.name.name)
        ) {
          context.report({
            node,
            messageId: "component",
            suggest: [
              {
                messageId: "component-suggest",
                data: { namespace: node.namespace.name, name: node.name.name },
                fix: (fixer) => fixer.replaceText(node, node.name.name),
              },
            ],
          });
          return;
        }
        const namespace = node.namespace?.name;
        if (
          !(
            knownNamespaces.includes(namespace) ||
            otherNamespaces.includes(namespace) ||
            explicitlyAllowedNamespaces?.includes(namespace)
          )
        ) {
          if (styleNamespaces.includes(namespace)) {
            context.report({
              node,
              messageId: "style",
              data: { namespace },
            });
          } else {
            context.report({
              node,
              messageId: "unknown",
              data: { namespace },
            });
          }
        }
      },
    };
  },
};

export default ruleDefinition;
