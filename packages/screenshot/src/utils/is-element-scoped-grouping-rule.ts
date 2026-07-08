// @container and @scope rules apply based on a specific ancestor's layout or
// DOM proximity rather than document-wide conditions, so identical
// tag/class/ancestor-key chains no longer guarantee identical matched rules.
// Detected by feature fields since cross-realm rules fail instanceof checks.
export const isElementScopedGroupingRule = (rule: CSSRule): boolean =>
  "containerName" in rule || "start" in rule;
