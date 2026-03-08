import type { Plugin } from "../../types.js";
import { appendStackContext } from "../../utils/append-stack-context.js";
import {
  getFrameworkComponentName,
  getFrameworkSourceInfo,
  getFrameworkStackContext,
} from "../../utils/get-framework-source-info.js";

export const frameworkSourcePlugin: Plugin = {
  name: "framework-source",
  hooks: {
    resolveElementSource: (element) => getFrameworkSourceInfo(element),
    resolveElementComponentName: (element) => getFrameworkComponentName(element),
    resolveElementStackContext: (element, options) =>
      getFrameworkStackContext(element, options),
    transformSnippet: async (snippet, element) => {
      const stackContext = getFrameworkStackContext(element);
      if (!stackContext) return snippet;
      if (snippet.includes(stackContext)) return snippet;
      return appendStackContext(snippet, stackContext);
    },
  },
};
