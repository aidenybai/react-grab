import { isJSXElementOrFragment } from "../utils/jsx.js";

function isFunctionNode(node) {
  return ["FunctionDeclaration", "FunctionExpression", "ArrowFunctionExpression"].includes(
    node?.type,
  );
}
function getPropertyName(memberExpr) {
  if (!memberExpr?.property) return null;
  if (!memberExpr.computed && memberExpr.property.type === "Identifier") {
    return memberExpr.property.name;
  }
  if (memberExpr.property.type === "Literal" && typeof memberExpr.property.value === "string") {
    return memberExpr.property.value;
  }
  return null;
}
const ruleDefinition = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Enforce using Solid's `<For />` component for mapping an array to JSX elements.",
      recommended: "warn",
    },
    fixable: "code",
    schema: [],
    messages: {
      preferFor:
        "Use Solid's `<For />` component for efficiently rendering lists. Array#map causes DOM elements to be recreated.",
      preferForOrIndex:
        "Use Solid's `<For />` component or `<Index />` component for rendering lists. Array#map causes DOM elements to be recreated.",
    },
  },
  defaultOptions: [],
  createOnce(context) {
    const reportPreferFor = (node) => {
      const jsxExpressionContainerNode = node.parent;
      const arrayNode = node.callee.object;
      const mapFnNode = node.arguments[0];
      context.report({
        node,
        messageId: "preferFor",
        fix: (fixer) => {
          const beforeArray = [jsxExpressionContainerNode.range[0], arrayNode.range[0]];
          const betweenArrayAndMapFn = [arrayNode.range[1], mapFnNode.range[0]];
          const afterMapFn = [mapFnNode.range[1], jsxExpressionContainerNode.range[1]];
          return [
            fixer.replaceTextRange(beforeArray, "<For each={"),
            fixer.replaceTextRange(betweenArrayAndMapFn, "}>{"),
            fixer.replaceTextRange(afterMapFn, "}</For>"),
          ];
        },
      });
    };
    return {
      CallExpression(node) {
        const callOrChain = node.parent?.type === "ChainExpression" ? node.parent : node;
        if (
          callOrChain.parent?.type === "JSXExpressionContainer" &&
          isJSXElementOrFragment(callOrChain.parent.parent)
        ) {
          if (
            node.callee?.type === "MemberExpression" &&
            getPropertyName(node.callee) === "map" &&
            node.arguments?.length === 1 &&
            isFunctionNode(node.arguments[0])
          ) {
            const mapFnNode = node.arguments[0];
            if (mapFnNode.params.length === 1 && mapFnNode.params[0].type !== "RestElement") {
              reportPreferFor(node);
            } else {
              context.report({ node, messageId: "preferForOrIndex" });
            }
          }
        }
      },
    };
  },
};

export default ruleDefinition;
