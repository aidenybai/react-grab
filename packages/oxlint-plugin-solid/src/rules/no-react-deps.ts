import { trackImports } from "../utils/imports.js";
import { trace } from "../utils/trace.js";

function isFunctionNode(node) {
  return ["FunctionDeclaration", "FunctionExpression", "ArrowFunctionExpression"].includes(
    node?.type,
  );
}
const ruleDefinition = {
  meta: {
    type: "problem",
    docs: {
      description: "Disallow usage of dependency arrays in `createEffect` and `createMemo`.",
      recommended: "error",
    },
    fixable: "code",
    schema: [],
    messages: {
      noUselessDep:
        "In Solid, `{{name}}` doesn't accept a dependency array because it automatically tracks its dependencies. If you really need to override the list of dependencies, use `on`.",
    },
  },
  defaultOptions: [],
  createOnce(context) {
    const tracker = trackImports();
    return {
      before() {
        tracker.clear();
      },
      Program() {
        tracker.clear();
      },
      ImportDeclaration(node) {
        tracker.handleImportDeclaration(node);
      },
      CallExpression(node) {
        if (
          node.callee?.type === "Identifier" &&
          tracker.matchImport(["createEffect", "createMemo"], node.callee.name) &&
          node.arguments?.length === 2 &&
          node.arguments.every((arg) => arg.type !== "SpreadElement")
        ) {
          const [arg0, arg1] = node.arguments.map((arg) => trace(arg, context));
          if (isFunctionNode(arg0) && arg0.params.length === 0 && arg1.type === "ArrayExpression") {
            context.report({
              node: node.arguments[1],
              messageId: "noUselessDep",
              data: { name: node.callee.name },
              fix: arg1 === node.arguments[1] ? (fixer) => fixer.remove(arg1) : undefined,
            });
          }
        }
      },
    };
  },
};

export default ruleDefinition;
