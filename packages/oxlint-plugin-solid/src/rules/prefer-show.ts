import { isJSXElementOrFragment } from "../utils/jsx.js";

const EXPENSIVE_TYPES = ["JSXElement", "JSXFragment", "Identifier"];
const ruleDefinition = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Enforce using Solid's `<Show />` component for conditionally showing content. Solid's compiler covers this case, so it's a stylistic rule only.",
      recommended: "warn",
    },
    fixable: "code",
    schema: [],
    messages: {
      preferShowAnd: "Use Solid's `<Show />` component for conditionally showing content.",
      preferShowTernary:
        "Use Solid's `<Show />` component for conditionally showing content with a fallback.",
    },
  },
  defaultOptions: [],
  createOnce(context) {
    const putIntoJSX = (node) => {
      const text = context.sourceCode.getText(node);
      return isJSXElementOrFragment(node) ? text : `{${text}}`;
    };
    const logicalExpressionHandler = (node) => {
      if (node.operator === "&&" && EXPENSIVE_TYPES.includes(node.right?.type)) {
        context.report({
          node,
          messageId: "preferShowAnd",
          fix: (fixer) =>
            fixer.replaceText(
              node.parent?.type === "JSXExpressionContainer" &&
                isJSXElementOrFragment(node.parent.parent)
                ? node.parent
                : node,
              `<Show when={${context.sourceCode.getText(node.left)}}>${putIntoJSX(node.right)}</Show>`,
            ),
        });
      }
    };
    const conditionalExpressionHandler = (node) => {
      if (
        EXPENSIVE_TYPES.includes(node.consequent?.type) ||
        EXPENSIVE_TYPES.includes(node.alternate?.type)
      ) {
        context.report({
          node,
          messageId: "preferShowTernary",
          fix: (fixer) =>
            fixer.replaceText(
              node.parent?.type === "JSXExpressionContainer" &&
                isJSXElementOrFragment(node.parent.parent)
                ? node.parent
                : node,
              `<Show when={${context.sourceCode.getText(node.test)}} fallback={${context.sourceCode.getText(node.alternate)}}>${putIntoJSX(node.consequent)}</Show>`,
            ),
        });
      }
    };
    return {
      JSXExpressionContainer(node) {
        if (!isJSXElementOrFragment(node.parent)) {
          return;
        }
        if (node.expression?.type === "LogicalExpression") {
          logicalExpressionHandler(node.expression);
        } else if (
          node.expression?.type === "ArrowFunctionExpression" &&
          node.expression.body?.type === "LogicalExpression"
        ) {
          logicalExpressionHandler(node.expression.body);
        } else if (node.expression?.type === "ConditionalExpression") {
          conditionalExpressionHandler(node.expression);
        } else if (
          node.expression?.type === "ArrowFunctionExpression" &&
          node.expression.body?.type === "ConditionalExpression"
        ) {
          conditionalExpressionHandler(node.expression.body);
        }
      },
    };
  },
};

export default ruleDefinition;
