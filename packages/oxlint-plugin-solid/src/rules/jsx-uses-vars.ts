const ruleDefinition = {
  meta: {
    type: "problem",
    docs: {
      description: "Prevent variables used in JSX from being marked as unused.",
      recommended: "error"
    },
    schema: [],
    messages: {}
  },
  defaultOptions: [],
  createOnce(context) {
    const markUsed = (name, node) => {
      context.sourceCode?.markVariableAsUsed?.(name, node);
    };
    return {
      JSXOpeningElement(node) {
        switch (node.name?.type) {
          case "JSXNamespacedName":
            return;
          case "JSXIdentifier":
            markUsed(node.name.name, node.name);
            break;
          case "JSXMemberExpression": {
            let parent = node.name.object;
            while (parent?.type === "JSXMemberExpression") {
              parent = parent.object;
            }
            if (parent?.type === "JSXIdentifier") {
              markUsed(parent.name, parent);
            }
            break;
          }
        }
      },
      "JSXAttribute > JSXNamespacedName"(node) {
        if (node.namespace?.type === "JSXIdentifier" && node.namespace.name === "use" && node.name?.type === "JSXIdentifier") {
          markUsed(node.name.name, node.name);
        }
      }
    };
  }
};

export default ruleDefinition;
