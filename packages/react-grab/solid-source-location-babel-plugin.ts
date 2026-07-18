import { types, type PluginObj } from "@babel/core";
import { SOLID_SOURCE_LOCATION_ATTRIBUTE } from "./src/utils/resolve-solid-source-location.js";

const SOURCE_COLUMN_OFFSET = 1;

export const solidSourceLocationBabelPlugin: PluginObj = {
  name: "solid-source-location",
  visitor: {
    Program: (path, state) => {
      const filename = state.file.opts.filenameRelative ?? state.file.opts.filename;
      if (!filename) return;

      path.traverse({
        JSXOpeningElement: (openingElementPath) => {
          const openingElement = openingElementPath.node;
          const elementName = openingElement.name;
          const sourceStart = openingElement.loc?.start;
          if (
            !types.isJSXIdentifier(elementName) ||
            elementName.name[0] !== elementName.name[0]?.toLowerCase() ||
            !sourceStart
          ) {
            return;
          }

          const hasSourceLocation = openingElement.attributes.some(
            (attribute) =>
              types.isJSXAttribute(attribute) &&
              types.isJSXIdentifier(attribute.name, { name: SOLID_SOURCE_LOCATION_ATTRIBUTE }),
          );
          if (hasSourceLocation) return;

          openingElement.attributes.push(
            types.jsxAttribute(
              types.jsxIdentifier(SOLID_SOURCE_LOCATION_ATTRIBUTE),
              types.stringLiteral(
                `${filename}:${sourceStart.line}:${sourceStart.column + SOURCE_COLUMN_OFFSET}`,
              ),
            ),
          );
        },
      });
    },
  },
};
