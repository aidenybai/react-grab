const getFunctionName = (node) => {
  if (
    (node.type === "FunctionDeclaration" || node.type === "FunctionExpression") &&
    node.id != null
  ) {
    return node.id.name;
  }
  if (node.parent?.type === "VariableDeclarator" && node.parent.id.type === "Identifier") {
    return node.parent.id.name;
  }
  return null;
};
const isNothing = (node) => {
  if (!node) return true;
  switch (node.type) {
    case "Literal":
      return [null, undefined, false, ""].includes(node.value);
    case "JSXFragment":
      return !node.children || node.children.every(isNothing);
    default:
      return false;
  }
};
const getLineLength = (loc) => loc.end.line - loc.start.line + 1;
const ruleDefinition = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow early returns in components. Solid components only run once, and so conditionals should be inside JSX.",
      url: "https://github.com/solidjs-community/eslint-plugin-solid/blob/main/packages/eslint-plugin-solid/docs/components-return-once.md",
    },
    fixable: "code",
    schema: [],
    messages: {
      noEarlyReturn:
        "Solid components run once, so an early return breaks reactivity. Move the condition inside a JSX element, such as a fragment or <Show />.",
      noConditionalReturn:
        "Solid components run once, so a conditional return breaks reactivity. Move the condition inside a JSX element, such as a fragment or <Show />.",
    },
  },
  defaultOptions: [],
  createOnce(context) {
    const functionStack = [];
    const putIntoJSX = (node) => {
      const text = context.sourceCode.getText(node);
      return node.type === "JSXElement" || node.type === "JSXFragment" ? text : `{${text}}`;
    };
    const currentFunction = () => functionStack[functionStack.length - 1];
    const onFunctionEnter = (node) => {
      let lastReturn = undefined;
      if (node.body.type === "BlockStatement") {
        const last = node.body.body.findLast((n) => !n.type.endsWith("Declaration"));
        if (last && last.type === "ReturnStatement") {
          lastReturn = last;
        }
      }
      functionStack.push({ isComponent: false, lastReturn, earlyReturns: [] });
    };
    const onFunctionExit = (node) => {
      if (
        getFunctionName(node)?.match(/^[a-z]/) ||
        node.parent?.type === "JSXExpressionContainer" ||
        (node.parent?.type === "CallExpression" &&
          node.parent.arguments.some((n) => n === node) &&
          !node.parent.callee?.name?.match(/^[A-Z]/))
      ) {
        currentFunction().isComponent = false;
      }
      if (currentFunction().isComponent) {
        currentFunction().earlyReturns.forEach((earlyReturn) => {
          context.report({
            node: earlyReturn,
            messageId: "noEarlyReturn",
          });
        });
        const argument = currentFunction().lastReturn?.argument;
        if (argument?.type === "ConditionalExpression") {
          const sourceCode = context.sourceCode;
          context.report({
            node: argument.parent,
            messageId: "noConditionalReturn",
            fix: (fixer) => {
              const { test, consequent, alternate } = argument;
              const conditions = [{ test, consequent }];
              let fallback = alternate;
              while (fallback.type === "ConditionalExpression") {
                conditions.push({ test: fallback.test, consequent: fallback.consequent });
                fallback = fallback.alternate;
              }
              if (conditions.length >= 2) {
                const fallbackStr = !isNothing(fallback)
                  ? ` fallback={${sourceCode.getText(fallback)}}`
                  : "";
                return fixer.replaceText(
                  argument,
                  `<Switch${fallbackStr}>
${conditions.map(
  ({ test: test2, consequent: consequent2 }) =>
    `<Match when={${sourceCode.getText(test2)}}>${putIntoJSX(consequent2)}</Match>`,
).join(`
`)}
</Switch>`,
                );
              }
              if (isNothing(consequent)) {
                return fixer.replaceText(
                  argument,
                  `<Show when={!(${sourceCode.getText(test)})}>${putIntoJSX(alternate)}</Show>`,
                );
              }
              if (
                isNothing(fallback) ||
                getLineLength(consequent.loc) >= getLineLength(alternate.loc) * 1.5
              ) {
                const fallbackStr = !isNothing(fallback)
                  ? ` fallback={${sourceCode.getText(fallback)}}`
                  : "";
                return fixer.replaceText(
                  argument,
                  `<Show when={${sourceCode.getText(test)}}${fallbackStr}>${putIntoJSX(consequent)}</Show>`,
                );
              }
              return fixer.replaceText(argument, `<>${putIntoJSX(argument)}</>`);
            },
          });
        } else if (argument?.type === "LogicalExpression") {
          if (argument.operator === "&&") {
            const sourceCode = context.sourceCode;
            context.report({
              node: argument,
              messageId: "noConditionalReturn",
              fix: (fixer) => {
                const { left: test, right: consequent } = argument;
                return fixer.replaceText(
                  argument,
                  `<Show when={${sourceCode.getText(test)}}>${putIntoJSX(consequent)}</Show>`,
                );
              },
            });
          } else {
            context.report({
              node: argument,
              messageId: "noConditionalReturn",
            });
          }
        }
      }
      functionStack.pop();
    };
    return {
      FunctionDeclaration: onFunctionEnter,
      FunctionExpression: onFunctionEnter,
      ArrowFunctionExpression: onFunctionEnter,
      "FunctionDeclaration:exit": onFunctionExit,
      "FunctionExpression:exit": onFunctionExit,
      "ArrowFunctionExpression:exit": onFunctionExit,
      JSXElement() {
        if (functionStack.length) {
          currentFunction().isComponent = true;
        }
      },
      JSXFragment() {
        if (functionStack.length) {
          currentFunction().isComponent = true;
        }
      },
      ReturnStatement(node) {
        if (functionStack.length && node !== currentFunction().lastReturn) {
          currentFunction().earlyReturns.push(node);
        }
      },
    };
  },
};

export default ruleDefinition;
