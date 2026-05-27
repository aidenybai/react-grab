import { jsxHasProp, jsxPropName } from "../utils/jsx.js";

const ruleDefinition = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Enforce using the classlist prop over importing a classnames helper. The classlist prop accepts an object `{ [class: string]: boolean }` just like classnames.",
      recommended: "warn",
    },
    fixable: "code",
    deprecated: true,
    schema: [
      {
        type: "object",
        properties: {
          classnames: {
            type: "array",
            description: "An array of names to treat as `classnames` functions",
            default: ["cn", "clsx", "classnames"],
            items: { type: "string" },
            minItems: 1,
            uniqueItems: true,
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      preferClasslist:
        "The classlist prop should be used instead of {{ classnames }} to efficiently set classes based on an object.",
    },
  },
  defaultOptions: [],
  createOnce(context) {
    return {
      JSXAttribute(node) {
        const classnames = context.options?.[0]?.classnames ?? ["cn", "clsx", "classnames"];
        if (
          ["class", "className"].indexOf(jsxPropName(node)) === -1 ||
          jsxHasProp(node.parent?.attributes ?? [], "classlist")
        ) {
          return;
        }
        if (node.value?.type === "JSXExpressionContainer") {
          const expr = node.value.expression;
          if (
            expr.type === "CallExpression" &&
            expr.callee?.type === "Identifier" &&
            classnames.indexOf(expr.callee.name) !== -1 &&
            expr.arguments?.length === 1 &&
            expr.arguments[0].type === "ObjectExpression"
          ) {
            context.report({
              node,
              messageId: "preferClasslist",
              data: { classnames: expr.callee.name },
              fix: (fixer) => {
                const attrRange = node.range;
                const objectRange = expr.arguments[0].range;
                return [
                  fixer.replaceTextRange([attrRange[0], objectRange[0]], "classlist={"),
                  fixer.replaceTextRange([objectRange[1], attrRange[1]], "}"),
                ];
              },
            });
          }
        }
      },
    };
  },
};

export default ruleDefinition;
