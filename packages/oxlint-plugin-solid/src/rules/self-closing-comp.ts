import { isDOMElementName } from "../utils/jsx.js";

const voidDOMElementRegex = /^(?:area|base|br|col|embed|hr|img|input|link|meta|param|source|track|wbr)$/;
function isComponent(node) {
  return node.name?.type === "JSXIdentifier" && !isDOMElementName(node.name.name) || node.name?.type === "JSXMemberExpression";
}
function childrenIsEmpty(node) {
  return (node.parent?.children?.length ?? 0) === 0;
}
function childrenIsMultilineSpaces(node) {
  const children = node.parent?.children ?? [];
  return children.length === 1 && children[0].type === "JSXText" && children[0].value.indexOf(`
`) !== -1 && children[0].value.replace(/(?!\xA0)\s/g, "") === "";
}
const ruleDefinition = {
  meta: {
    type: "layout",
    docs: {
      description: "Disallow extra closing tags for components without children.",
      recommended: "error"
    },
    fixable: "code",
    schema: [
      {
        type: "object",
        properties: {
          component: {
            type: "string",
            description: "which Solid components should be self-closing when possible",
            enum: ["all", "none"],
            default: "all"
          },
          html: {
            type: "string",
            description: "which native elements should be self-closing when possible",
            enum: ["all", "void", "none"],
            default: "all"
          }
        },
        additionalProperties: false
      }
    ],
    messages: {
      selfClose: "Empty components are self-closing.",
      dontSelfClose: "This element should not be self-closing."
    }
  },
  defaultOptions: [],
  createOnce(context) {
    function shouldBeSelfClosedWhenPossible(node) {
      if (isComponent(node)) {
        return (context.options[0]?.component ?? "all") === "all";
      } else if (node.name?.type === "JSXIdentifier" && isDOMElementName(node.name.name)) {
        const whichHtml = context.options[0]?.html ?? "all";
        switch (whichHtml) {
          case "all":
            return true;
          case "void":
            return voidDOMElementRegex.test(node.name.name);
          case "none":
            return false;
        }
      }
      return true;
    }
    return {
      JSXOpeningElement(node) {
        const canSelfClose = childrenIsEmpty(node) || childrenIsMultilineSpaces(node);
        if (canSelfClose) {
          const shouldSelfClose = shouldBeSelfClosedWhenPossible(node);
          if (shouldSelfClose && !node.selfClosing) {
            context.report({
              node,
              messageId: "selfClose",
              fix(fixer) {
                const openingElementEnding = node.range[1] - 1;
                const closingElementEnding = node.parent?.closingElement?.range?.[1];
                if (closingElementEnding == null)
                  return null;
                return fixer.replaceTextRange([openingElementEnding, closingElementEnding], " />");
              }
            });
          } else if (!shouldSelfClose && node.selfClosing) {
            context.report({
              node,
              messageId: "dontSelfClose",
              fix(fixer) {
                const sourceCode = context.sourceCode;
                const tagName = sourceCode.getText(node.name);
                const selfCloseEnding = node.range[1];
                const lastTokens = sourceCode.getLastTokens(node, { count: 3 });
                const isSpaceBeforeSelfClose = sourceCode.isSpaceBetween?.(lastTokens[0], lastTokens[1]);
                const range = [
                  isSpaceBeforeSelfClose ? selfCloseEnding - 3 : selfCloseEnding - 2,
                  selfCloseEnding
                ];
                return fixer.replaceTextRange(range, `></${tagName}>`);
              }
            });
          }
        }
      }
    };
  }
};

export default ruleDefinition;
