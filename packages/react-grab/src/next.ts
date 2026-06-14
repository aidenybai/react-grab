import { createElement } from "react";
import type { ReactElement } from "react";
import { createFlagLoaderSnippet } from "./utils/create-flag-loader-snippet.js";
import type { FlagLoaderOptions } from "./utils/create-flag-loader-snippet.js";

export interface ReactGrabScriptProps extends FlagLoaderOptions {
  enabled?: boolean;
}

export const ReactGrab = (props: ReactGrabScriptProps = {}): ReactElement | null =>
  props.enabled === false
    ? null
    : createElement("script", {
        dangerouslySetInnerHTML: { __html: createFlagLoaderSnippet(props) },
      });
