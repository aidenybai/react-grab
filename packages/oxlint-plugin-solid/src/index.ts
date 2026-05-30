import { eslintCompatPlugin } from "@oxlint/plugins";
import componentsReturnOnce from "./rules/components-return-once.js";
import eventHandlers from "./rules/event-handlers.js";
import imports from "./rules/imports.js";
import jsxNoDuplicateProps from "./rules/jsx-no-duplicate-props.js";
import jsxNoScriptUrl from "./rules/jsx-no-script-url.js";
import jsxNoUndef from "./rules/jsx-no-undef.js";
import jsxUsesVars from "./rules/jsx-uses-vars.js";
import noArrayHandlers from "./rules/no-array-handlers.js";
import noDestructure from "./rules/no-destructure.js";
import noInnerhtml from "./rules/no-innerhtml.js";
import noProxyApis from "./rules/no-proxy-apis.js";
import noReactDeps from "./rules/no-react-deps.js";
import noReactSpecificProps from "./rules/no-react-specific-props.js";
import noUnknownNamespaces from "./rules/no-unknown-namespaces.js";
import preferClasslist from "./rules/prefer-classlist.js";
import preferFor from "./rules/prefer-for.js";
import preferShow from "./rules/prefer-show.js";
import reactivity from "./rules/reactivity.js";
import selfClosingComp from "./rules/self-closing-comp.js";
import styleProp from "./rules/style-prop.js";

const plugin = eslintCompatPlugin({
  meta: { name: "oxlint-plugin-solidjs" },
  rules: {
    "components-return-once": componentsReturnOnce,
    "event-handlers": eventHandlers,
    "imports": imports,
    "jsx-no-duplicate-props": jsxNoDuplicateProps,
    "jsx-no-script-url": jsxNoScriptUrl,
    "jsx-no-undef": jsxNoUndef,
    "jsx-uses-vars": jsxUsesVars,
    "no-array-handlers": noArrayHandlers,
    "no-destructure": noDestructure,
    "no-innerhtml": noInnerhtml,
    "no-proxy-apis": noProxyApis,
    "no-react-deps": noReactDeps,
    "no-react-specific-props": noReactSpecificProps,
    "no-unknown-namespaces": noUnknownNamespaces,
    "prefer-classlist": preferClasslist,
    "prefer-for": preferFor,
    "prefer-show": preferShow,
    "reactivity": reactivity,
    "self-closing-comp": selfClosingComp,
    "style-prop": styleProp,
  },
  configs: {
    recommended: {
      rules: {
        "solid/jsx-no-duplicate-props": "error",
        "solid/jsx-no-undef": "error",
        "solid/jsx-uses-vars": "error",
        "solid/no-unknown-namespaces": "error",
        "solid/no-innerhtml": "error",
        "solid/jsx-no-script-url": "error",
        "solid/components-return-once": "warn",
        "solid/no-destructure": "error",
        "solid/prefer-for": "error",
        "solid/reactivity": "warn",
        "solid/event-handlers": "warn",
        "solid/imports": "warn",
        "solid/style-prop": "warn",
        "solid/no-react-deps": "warn",
        "solid/no-react-specific-props": "warn",
        "solid/self-closing-comp": "warn",
        "solid/no-array-handlers": "off",
        "solid/prefer-show": "off",
        "solid/no-proxy-apis": "off",
        "solid/prefer-classlist": "off",
      },
    },
  },
});

export default plugin;
