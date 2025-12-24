export const isValidSelection = (
  selection: Selection | null,
): selection is Selection =>
  Boolean(selection && !selection.isCollapsed && selection.rangeCount > 0);

