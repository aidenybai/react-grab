import type { Plugin } from "../../types.js";
import { appendStackContext } from "../../utils/append-stack-context.js";
import { formatElementStack } from "../../utils/format-element-stack.js";
import { mergeStackContext } from "../../utils/merge-stack-context.js";
import { getReactStackContext } from "../source/react.js";
import {
  resolveElementSourceInfo,
  resolveElementComponentName,
  resolveElementStack,
} from "../source/index.js";

export const frameworkSourcePlugin: Plugin = {
  name: "framework-source",
  hooks: {
    resolveElementSource: (element) => resolveElementSourceInfo(element),
    resolveElementComponentName: (element) =>
      resolveElementComponentName(element),
    resolveElementStackContext: async (element, options) => {
      const maxLines = options?.maxLines ?? 3;
      const reactStackContext = await getReactStackContext(element, {
        maxLines,
      });
      const stack = await resolveElementStack(element);
      const frameworkStackContext = formatElementStack(stack, { maxLines });

      if (!reactStackContext) return frameworkStackContext;
      if (!frameworkStackContext) return reactStackContext;
      return mergeStackContext(
        reactStackContext,
        frameworkStackContext,
        maxLines,
      );
    },
    transformSnippet: async (snippet, element) => {
      const stack = await resolveElementStack(element);
      const stackContext = formatElementStack(stack);
      if (!stackContext) return snippet;
      if (snippet.includes(stackContext)) return snippet;
      return appendStackContext(snippet, stackContext);
    },
  },
};
