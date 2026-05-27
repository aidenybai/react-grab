import { jsxPropName } from "../utils/jsx.js";

function isHtmlLike(str) {
  return /<[a-z][\s\S]*>/i.test(str.trim());
}
function getStringIfConstant(node) {
  if (!node) return null;
  if (node.type === "Literal" && typeof node.value === "string") return node.value;
  if (node.type === "TemplateLiteral" && node.expressions.length === 0) {
    return node.quasis[0]?.value?.cooked ?? null;
  }
  return null;
}
const ruleDefinition = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow usage of the innerHTML attribute, which can often lead to security vulnerabilities.",
      recommended: "error",
    },
    fixable: "code",
    hasSuggestions: true,
    schema: [
      {
        type: "object",
        properties: {
          allowStatic: {
            description:
              "if the innerHTML value is guaranteed to be a static HTML string (i.e. no user input), allow it",
            type: "boolean",
            default: true,
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      dangerous:
        "The innerHTML attribute is dangerous; passing unsanitized input can lead to security vulnerabilities.",
      conflict:
        "The innerHTML attribute should not be used on an element with child elements; they will be overwritten.",
      notHtml: "The string passed to innerHTML does not appear to be valid HTML.",
      useInnerText: "For text content, using innerText is clearer and safer.",
      dangerouslySetInnerHTML:
        "The dangerouslySetInnerHTML prop is not supported; use innerHTML instead.",
    },
  },
  defaultOptions: [{ allowStatic: true }],
  createOnce(context) {
    return {
      JSXAttribute(node) {
        const allowStatic = Boolean(context.options?.[0]?.allowStatic ?? true);
        if (jsxPropName(node) === "dangerouslySetInnerHTML") {
          if (
            node.value?.type === "JSXExpressionContainer" &&
            node.value.expression.type === "ObjectExpression" &&
            node.value.expression.properties.length === 1
          ) {
            const htmlProp = node.value.expression.properties[0];
            if (
              htmlProp.type === "Property" &&
              htmlProp.key.type === "Identifier" &&
              htmlProp.key.name === "__html"
            ) {
              context.report({
                node,
                messageId: "dangerouslySetInnerHTML",
                fix: (fixer) => {
                  const propRange = node.range;
                  const valueRange = htmlProp.value.range;
                  return [
                    fixer.replaceTextRange([propRange[0], valueRange[0]], "innerHTML={"),
                    fixer.replaceTextRange([valueRange[1], propRange[1]], "}"),
                  ];
                },
              });
            } else {
              context.report({ node, messageId: "dangerouslySetInnerHTML" });
            }
          } else {
            context.report({ node, messageId: "dangerouslySetInnerHTML" });
          }
          return;
        } else if (jsxPropName(node) !== "innerHTML") {
          return;
        }
        if (allowStatic) {
          const innerHtmlNode =
            node.value?.type === "JSXExpressionContainer" ? node.value.expression : node.value;
          const innerHtml = innerHtmlNode && getStringIfConstant(innerHtmlNode);
          if (typeof innerHtml === "string") {
            if (isHtmlLike(innerHtml)) {
              if (
                node.parent?.parent?.type === "JSXElement" &&
                node.parent.parent.children?.length
              ) {
                context.report({
                  node: node.parent.parent,
                  messageId: "conflict",
                });
              }
            } else {
              context.report({
                node,
                messageId: "notHtml",
                suggest: [
                  {
                    fix: (fixer) => fixer.replaceText(node.name, "innerText"),
                    messageId: "useInnerText",
                  },
                ],
              });
            }
          } else {
            context.report({ node, messageId: "dangerous" });
          }
        } else {
          context.report({ node, messageId: "dangerous" });
        }
      },
    };
  },
};

export default ruleDefinition;
