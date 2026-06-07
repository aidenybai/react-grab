import type { EditableProperty, EditPreview } from "../types.js";
import { formatEditableValue } from "./format-css-value.js";
import { createPreviewStyles } from "./preview-styles.js";
import { createPropPreview } from "./preview-props.js";

// Composes the two preview backends behind one surface so the panel applies,
// restores, and inspects a tweak without caring whether it lands as an inline
// style or a fiber prop override. Restore/forget fan out to both, which is
// what keeps prop overrides from leaking when the panel is dismissed through
// paths that only call `preview.restore()`.
export const createEditPreview = (element: Element): EditPreview => {
  const stylePreview = createPreviewStyles(element);
  const propPreview = createPropPreview(element);

  const apply = (property: EditableProperty, value: number | string): void => {
    if (property.source === "prop") {
      if (property.kind === "numeric" && typeof value === "number") {
        propPreview.apply(property.propPath, value);
      }
      return;
    }
    stylePreview.apply(property.cssProperties, formatEditableValue(property, value));
  };

  const restore = (): void => {
    // Roll back props first: overrideProps re-renders the subtree, which can
    // rewrite the element's inline style. Restoring inline styles afterward
    // makes our baseline the final write, so mixed CSS + prop edits both
    // revert cleanly.
    propPreview.restore();
    stylePreview.restore();
  };

  const forget = (): void => {
    stylePreview.forget();
    propPreview.forget();
  };

  const hasApplied = (): boolean =>
    stylePreview.hasAppliedStyles() || propPreview.hasAppliedProps();

  return { apply, restore, forget, hasApplied };
};
