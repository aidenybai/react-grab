import { jsxGetAllProps } from "../utils/jsx.js";

const ruleDefinition = {
  meta: {
    type: "problem",
    docs: {
      description: "Disallow passing the same prop twice in JSX.",
      recommended: "error",
    },
    schema: [
      {
        type: "object",
        properties: {
          ignoreCase: {
            type: "boolean",
            description: "Consider two prop names differing only by case to be the same.",
            default: false,
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      noDuplicateProps: "Duplicate props are not allowed.",
      noDuplicateClass:
        "Duplicate `class` props are not allowed; while it might seem to work, it can break unexpectedly. Use `classList` instead.",
      noDuplicateChildren: "Using {{used}} at the same time is not allowed.",
    },
  },
  defaultOptions: [],
  createOnce(context) {
    return {
      JSXOpeningElement(node) {
        const ignoreCase = context.options[0]?.ignoreCase ?? false;
        const props = new Set();
        const checkPropName = (name, propNode) => {
          let normalizedName = name;
          if (ignoreCase || name.startsWith("on")) {
            normalizedName = name
              .toLowerCase()
              .replace(/^on(?:capture)?:/, "on")
              .replace(/^(?:attr|prop):/, "");
          }
          if (props.has(normalizedName)) {
            context.report({
              node: propNode,
              messageId: normalizedName === "class" ? "noDuplicateClass" : "noDuplicateProps",
            });
          }
          props.add(normalizedName);
        };
        for (const [name, propNode] of jsxGetAllProps(node.attributes ?? [])) {
          checkPropName(name, propNode);
        }
        const hasChildrenProp = props.has("children");
        const hasChildren = (node.parent?.children?.length ?? 0) > 0;
        const hasInnerHTML = props.has("innerHTML") || props.has("innerhtml");
        const hasTextContent = props.has("textContent") || props.has("textcontent");
        const used = [
          hasChildrenProp && "`props.children`",
          hasChildren && "JSX children",
          hasInnerHTML && "`props.innerHTML`",
          hasTextContent && "`props.textContent`",
        ].filter(Boolean);
        if (used.length > 1) {
          context.report({
            node,
            messageId: "noDuplicateChildren",
            data: { used: used.join(", ") },
          });
        }
      },
    };
  },
};

export default ruleDefinition;
