import { isDOMElementName } from "../utils/jsx.js";

const AUTO_COMPONENTS = ["Show", "For", "Index", "Switch", "Match"];
const SOURCE_MODULE = "solid-js";
const formatList = (strings) => {
  if (strings.length === 0) return "";
  if (strings.length === 1) return `'${strings[0]}'`;
  if (strings.length === 2) return `'${strings[0]}' and '${strings[1]}'`;
  const last = strings.length - 1;
  return `${strings
    .slice(0, last)
    .map((s) => `'${s}'`)
    .join(", ")}, and '${strings[last]}'`;
};
function getCommentBefore(node, sourceCode) {
  return sourceCode
    .getCommentsBefore(node)
    .find((comment) => comment.loc.end.line >= node.loc.start.line - 1);
}
function appendImports(fixer, sourceCode, importNode, identifiers) {
  const identifiersString = identifiers.join(", ");
  const reversedSpecifiers = importNode.specifiers.slice().reverse();
  const lastSpecifier = reversedSpecifiers.find((s) => s.type === "ImportSpecifier");
  if (lastSpecifier) {
    return fixer.insertTextAfter(lastSpecifier, `, ${identifiersString}`);
  }
  const otherSpecifier = importNode.specifiers.find(
    (s) => s.type === "ImportDefaultSpecifier" || s.type === "ImportNamespaceSpecifier",
  );
  if (otherSpecifier) {
    return fixer.insertTextAfter(otherSpecifier, `, { ${identifiersString} }`);
  }
  if (importNode.specifiers.length === 0) {
    const [importToken, maybeBrace] = sourceCode.getFirstTokens(importNode, { count: 2 });
    if (maybeBrace?.value === "{") {
      return fixer.insertTextAfter(maybeBrace, ` ${identifiersString} `);
    } else {
      return importToken
        ? fixer.insertTextAfter(importToken, ` { ${identifiersString} } from`)
        : null;
    }
  }
  return null;
}
function insertImports(fixer, sourceCode, source, identifiers) {
  const identifiersString = identifiers.join(", ");
  const programNode = sourceCode.ast;
  const firstImport = programNode.body.find((n) => n.type === "ImportDeclaration");
  if (firstImport) {
    return fixer.insertTextBeforeRange(
      (getCommentBefore(firstImport, sourceCode) ?? firstImport).range,
      `import { ${identifiersString} } from "${source}";
`,
    );
  }
  return fixer.insertTextBeforeRange(
    [0, 0],
    `import { ${identifiersString} } from "${source}";
`,
  );
}
const ruleDefinition = {
  meta: {
    type: "problem",
    docs: {
      description: "Disallow references to undefined variables in JSX. Handles custom directives.",
      url: "https://github.com/solidjs-community/eslint-plugin-solid/blob/main/packages/eslint-plugin-solid/docs/jsx-no-undef.md",
    },
    fixable: "code",
    schema: [
      {
        type: "object",
        properties: {
          allowGlobals: {
            type: "boolean",
            description:
              "When true, the rule will consider the global scope when checking for defined components.",
            default: false,
          },
          autoImport: {
            type: "boolean",
            description:
              'Automatically import certain components from `"solid-js"` if they are undefined.',
            default: true,
          },
          typescriptEnabled: {
            type: "boolean",
            description: "Adjusts behavior not to conflict with TypeScript's type checking.",
            default: false,
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      undefined: "'{{identifier}}' is not defined.",
      customDirectiveUndefined: "Custom directive '{{identifier}}' is not defined.",
      autoImport: "{{imports}} should be imported from '{{source}}'.",
    },
  },
  defaultOptions: [],
  createOnce(context) {
    const missingComponentsSet = new Set();
    function checkIdentifierInJSX(node, opts = {}) {
      let scope = context.sourceCode?.getScope?.(node);
      if (!scope) return;
      const sourceCode = context.sourceCode;
      const sourceType = sourceCode.ast.sourceType;
      const scopeUpperBound =
        !(context.options?.[0]?.allowGlobals ?? false) && sourceType === "module"
          ? "module"
          : "global";
      const variables = [...scope.variables];
      if (node.name === "this") return;
      while (scope.type !== scopeUpperBound && scope.type !== "global" && scope.upper) {
        scope = scope.upper;
        variables.push(...scope.variables);
      }
      if (scope.childScopes.length) {
        variables.push(...scope.childScopes[0].variables);
        if (scope.childScopes[0].childScopes.length) {
          variables.push(...scope.childScopes[0].childScopes[0].variables);
        }
      }
      if (variables.find((variable) => variable.name === node.name)) {
        return;
      }
      if (
        opts.isComponent &&
        context.options?.[0]?.autoImport !== false &&
        AUTO_COMPONENTS.includes(node.name) &&
        !missingComponentsSet.has(node.name)
      ) {
        missingComponentsSet.add(node.name);
      } else if (opts.isCustomDirective) {
        context.report({
          node,
          messageId: "customDirectiveUndefined",
          data: { identifier: node.name },
        });
      } else if (!(context.options?.[0]?.typescriptEnabled ?? false)) {
        context.report({
          node,
          messageId: "undefined",
          data: { identifier: node.name },
        });
      }
    }
    return {
      JSXOpeningElement(node) {
        let n;
        switch (node.name.type) {
          case "JSXIdentifier":
            if (!isDOMElementName(node.name.name)) {
              checkIdentifierInJSX(node.name, { isComponent: true });
            }
            break;
          case "JSXMemberExpression":
            n = node.name;
            do {
              n = n.object;
            } while (n && n.type !== "JSXIdentifier");
            if (n) {
              checkIdentifierInJSX(n);
            }
            break;
          default:
            break;
        }
      },
      "JSXAttribute > JSXNamespacedName": (node) => {
        if (
          node.namespace?.type === "JSXIdentifier" &&
          node.namespace.name === "use" &&
          node.name?.type === "JSXIdentifier"
        ) {
          checkIdentifierInJSX(node.name, { isCustomDirective: true });
        }
      },
      "Program:exit": (programNode) => {
        const missingComponents = Array.from(missingComponentsSet.values());
        if (context.options?.[0]?.autoImport !== false && missingComponents.length) {
          const importNode = programNode.body.find(
            (n) =>
              n.type === "ImportDeclaration" &&
              n.importKind !== "type" &&
              n.source.type === "Literal" &&
              n.source.value === SOURCE_MODULE,
          );
          if (importNode) {
            context.report({
              node: importNode,
              messageId: "autoImport",
              data: {
                imports: formatList(missingComponents),
                source: SOURCE_MODULE,
              },
              fix: (fixer) => {
                return appendImports(fixer, context.sourceCode, importNode, missingComponents);
              },
            });
          } else {
            context.report({
              node: programNode,
              messageId: "autoImport",
              data: {
                imports: formatList(missingComponents),
                source: SOURCE_MODULE,
              },
              fix: (fixer) => {
                return insertImports(fixer, context.sourceCode, "solid-js", missingComponents);
              },
            });
          }
        }
      },
    };
  },
};

export default ruleDefinition;
