const isJavaScriptProtocol =
  /^[\u0000-\u001F ]*j[\r\n\t]*a[\r\n\t]*v[\r\n\t]*a[\r\n\t]*s[\r\n\t]*c[\r\n\t]*r[\r\n\t]*i[\r\n\t]*p[\r\n\t]*t[\r\n\t]*:/i;
function getStaticStringValue(node, scope) {
  if (!node) return null;
  if (node.type === "Literal" && typeof node.value === "string") return node.value;
  if (node.type === "TemplateLiteral" && node.expressions.length === 0) {
    return node.quasis[0]?.value?.cooked ?? null;
  }
  if (node.type === "Identifier" && scope) {
    const variable = scope.set?.get?.(node.name);
    const def = variable?.defs?.[0];
    if (
      def?.node?.type === "VariableDeclarator" &&
      def.node.parent?.kind === "const" &&
      def.node.init
    ) {
      return getStaticStringValue(def.node.init, scope);
    }
  }
  return null;
}
const ruleDefinition = {
  meta: {
    type: "problem",
    docs: {
      description: "Disallow javascript: URLs.",
      recommended: "error",
    },
    schema: [],
    messages: {
      noJSURL: "For security, don't use javascript: URLs. Use event handlers instead if you can.",
    },
  },
  defaultOptions: [],
  createOnce(context) {
    return {
      JSXAttribute(node) {
        if (node.name?.type === "JSXIdentifier" && node.value) {
          const valueNode =
            node.value.type === "JSXExpressionContainer" ? node.value.expression : node.value;
          const scope = context.sourceCode?.getScope?.(node);
          const link = getStaticStringValue(valueNode, scope);
          if (typeof link === "string" && isJavaScriptProtocol.test(link)) {
            context.report({
              node: node.value,
              messageId: "noJSURL",
            });
          }
        }
      },
    };
  },
};

export default ruleDefinition;
