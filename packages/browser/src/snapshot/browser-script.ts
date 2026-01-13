let cachedScript: string | null = null;

const getBrowserConstantsCode = (): string => `
var MAX_STRING_LENGTH = 500;
var MAX_ARRAY_ITEMS = 10;
var MAX_OBJECT_KEYS = 20;
var MAX_HOOKS_ITERATION = 20;
var DEFAULT_COMPONENT_TREE_DEPTH = 50;
var MAX_NAME_LENGTH = 900;
var SNAPSHOT_AGE_WARNING_MS = 5000;
var INTERACTABLE_ROLES = new Set([
  'button', 'checkbox', 'combobox', 'gridcell', 'link', 'listbox',
  'menu', 'menubar', 'menuitem', 'menuitemcheckbox', 'menuitemradio',
  'option', 'radio', 'radiogroup', 'scrollbar', 'searchbox', 'slider',
  'spinbutton', 'switch', 'tab', 'tablist', 'textbox', 'tree',
  'treegrid', 'treeitem'
]);
`;

export const getSnapshotScript = (): string => {
  if (cachedScript) return cachedScript;

  cachedScript = `
(function() {
  if (window.__REACT_GRAB_SNAPSHOT__) return;

  ${getBrowserConstantsCode()}
  ${getDomUtilsCode()}
  ${getYamlCode()}
  ${getRoleUtilsCode()}
  ${getReactUtilsCode()}
  ${getAriaSnapshotCode()}

  window.__REACT_GRAB_SNAPSHOT__ = getSnapshot;
})();
`;

  return cachedScript;
};

const getDomUtilsCode = (): string => `
let cacheStyle;
let cachesCounter = 0;

function beginDOMCaches() {
  ++cachesCounter;
  cacheStyle = cacheStyle || new Map();
}

function endDOMCaches() {
  if (!--cachesCounter) {
    cacheStyle = undefined;
  }
}

function getElementComputedStyle(element, pseudo) {
  const cache = cacheStyle;
  const cacheKey = pseudo ? undefined : element;
  if (cache && cacheKey && cache.has(cacheKey)) return cache.get(cacheKey);
  const style = element.ownerDocument && element.ownerDocument.defaultView
    ? element.ownerDocument.defaultView.getComputedStyle(element, pseudo)
    : undefined;
  if (cache && cacheKey) cache.set(cacheKey, style);
  return style;
}

function parentElementOrShadowHost(element) {
  if (element.parentElement) return element.parentElement;
  if (!element.parentNode) return;
  if (element.parentNode.nodeType === 11 && element.parentNode.host)
    return element.parentNode.host;
}

function enclosingShadowRootOrDocument(element) {
  let node = element;
  while (node.parentNode) node = node.parentNode;
  if (node.nodeType === 11 || node.nodeType === 9)
    return node;
}

function closestCrossShadow(element, css, scope) {
  while (element) {
    const closest = element.closest(css);
    if (scope && closest !== scope && closest?.contains(scope)) return;
    if (closest) return closest;
    element = enclosingShadowHost(element);
  }
}

function enclosingShadowHost(element) {
  while (element.parentElement) element = element.parentElement;
  return parentElementOrShadowHost(element);
}

function isElementStyleVisibilityVisible(element, style) {
  style = style || getElementComputedStyle(element);
  if (!style) return true;
  if (style.visibility !== "visible") return false;
  const detailsOrSummary = element.closest("details,summary");
  if (detailsOrSummary !== element && detailsOrSummary?.nodeName === "DETAILS" && !detailsOrSummary.open)
    return false;
  return true;
}

function computeBox(element) {
  const style = getElementComputedStyle(element);
  if (!style) return { visible: true, inline: false };
  const cursor = style.cursor;
  if (style.display === "contents") {
    for (let child = element.firstChild; child; child = child.nextSibling) {
      if (child.nodeType === 1 && isElementVisible(child))
        return { visible: true, inline: false, cursor };
      if (child.nodeType === 3 && isVisibleTextNode(child))
        return { visible: true, inline: true, cursor };
    }
    return { visible: false, inline: false, cursor };
  }
  if (!isElementStyleVisibilityVisible(element, style))
    return { cursor, visible: false, inline: false };
  const rect = element.getBoundingClientRect();
  return { rect, cursor, visible: rect.width > 0 && rect.height > 0, inline: style.display === "inline" };
}

function isElementVisible(element) {
  return computeBox(element).visible;
}

function isVisibleTextNode(node) {
  const range = node.ownerDocument.createRange();
  range.selectNode(node);
  const rect = range.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

function elementSafeTagName(element) {
  const tagName = element.tagName;
  if (typeof tagName === "string") return tagName.toUpperCase();
  if (element instanceof HTMLFormElement) return "FORM";
  return element.tagName.toUpperCase();
}

function normalizeWhiteSpace(text) {
  return text.split("\\u00A0").map(chunk =>
    chunk.replace(/\\r\\n/g, "\\n").replace(/[\\u200b\\u00ad]/g, "").replace(/\\s\\s*/g, " ")
  ).join("\\u00A0").trim();
}
`;

const getYamlCode = (): string => `
function yamlEscapeKeyIfNeeded(str) {
  if (!yamlStringNeedsQuotes(str)) return str;
  return "'" + str.replace(/'/g, "''") + "'";
}

function yamlEscapeValueIfNeeded(str) {
  if (!yamlStringNeedsQuotes(str)) return str;
  return '"' + str.replace(/[\\\\"\x00-\\x1f\\x7f-\\x9f]/g, c => {
    switch (c) {
      case "\\\\": return "\\\\\\\\";
      case '"': return '\\\\"';
      case "\\b": return "\\\\b";
      case "\\f": return "\\\\f";
      case "\\n": return "\\\\n";
      case "\\r": return "\\\\r";
      case "\\t": return "\\\\t";
      default:
        const code = c.charCodeAt(0);
        return "\\\\x" + code.toString(16).padStart(2, "0");
    }
  }) + '"';
}

function yamlStringNeedsQuotes(str) {
  if (str.length === 0) return true;
  if (/^\\s|\\s$/.test(str)) return true;
  if (/[\\x00-\\x08\\x0b\\x0c\\x0e-\\x1f\\x7f-\\x9f]/.test(str)) return true;
  if (/^-/.test(str)) return true;
  if (/[\\n:](\\s|$)/.test(str)) return true;
  if (/\\s#/.test(str)) return true;
  if (/[\\n\\r]/.test(str)) return true;
  if (/^[&*\\],?!>|@"'#%]/.test(str)) return true;
  if (/[{}\`]/.test(str)) return true;
  if (/^\\[/.test(str)) return true;
  if (!isNaN(Number(str)) || ["y","n","yes","no","true","false","on","off","null"].includes(str.toLowerCase())) return true;
  return false;
}
`;

const getRoleUtilsCode = (): string => `
const validRoles = ["alert","alertdialog","application","article","banner","blockquote","button","caption","cell","checkbox","code","columnheader","combobox","complementary","contentinfo","definition","deletion","dialog","directory","document","emphasis","feed","figure","form","generic","grid","gridcell","group","heading","img","insertion","link","list","listbox","listitem","log","main","mark","marquee","math","meter","menu","menubar","menuitem","menuitemcheckbox","menuitemradio","navigation","none","note","option","paragraph","presentation","progressbar","radio","radiogroup","region","row","rowgroup","rowheader","scrollbar","search","searchbox","separator","slider","spinbutton","status","strong","subscript","superscript","switch","tab","table","tablist","tabpanel","term","textbox","time","timer","toolbar","tooltip","tree","treegrid","treeitem"];

let cacheAccessibleName;
let cacheIsHidden;
let cachePointerEvents;
let ariaCachesCounter = 0;

function beginAriaCaches() {
  beginDOMCaches();
  ++ariaCachesCounter;
  cacheAccessibleName = cacheAccessibleName || new Map();
  cacheIsHidden = cacheIsHidden || new Map();
  cachePointerEvents = cachePointerEvents || new Map();
}

function endAriaCaches() {
  if (!--ariaCachesCounter) {
    cacheAccessibleName = undefined;
    cacheIsHidden = undefined;
    cachePointerEvents = undefined;
  }
  endDOMCaches();
}

function hasExplicitAccessibleName(e) {
  return e.hasAttribute("aria-label") || e.hasAttribute("aria-labelledby");
}

const kAncestorPreventingLandmark = "article:not([role]), aside:not([role]), main:not([role]), nav:not([role]), section:not([role]), [role=article], [role=complementary], [role=main], [role=navigation], [role=region]";

const kGlobalAriaAttributes = [
  ["aria-atomic", undefined],["aria-busy", undefined],["aria-controls", undefined],["aria-current", undefined],
  ["aria-describedby", undefined],["aria-details", undefined],["aria-dropeffect", undefined],["aria-flowto", undefined],
  ["aria-grabbed", undefined],["aria-hidden", undefined],["aria-keyshortcuts", undefined],
  ["aria-label", ["caption","code","deletion","emphasis","generic","insertion","paragraph","presentation","strong","subscript","superscript"]],
  ["aria-labelledby", ["caption","code","deletion","emphasis","generic","insertion","paragraph","presentation","strong","subscript","superscript"]],
  ["aria-live", undefined],["aria-owns", undefined],["aria-relevant", undefined],["aria-roledescription", ["generic"]]
];

function hasGlobalAriaAttribute(element, forRole) {
  return kGlobalAriaAttributes.some(([attr, prohibited]) => !prohibited?.includes(forRole || "") && element.hasAttribute(attr));
}

function hasTabIndex(element) {
  return !Number.isNaN(Number(String(element.getAttribute("tabindex"))));
}

function isFocusable(element) {
  return !isNativelyDisabled(element) && (isNativelyFocusable(element) || hasTabIndex(element));
}

function isNativelyFocusable(element) {
  const tagName = elementSafeTagName(element);
  if (["BUTTON","DETAILS","SELECT","TEXTAREA"].includes(tagName)) return true;
  if (tagName === "A" || tagName === "AREA") return element.hasAttribute("href");
  if (tagName === "INPUT") return !element.hidden;
  return false;
}

function isNativelyDisabled(element) {
  const isNativeFormControl = ["BUTTON","INPUT","SELECT","TEXTAREA","OPTION","OPTGROUP"].includes(elementSafeTagName(element));
  return isNativeFormControl && (element.hasAttribute("disabled") || belongsToDisabledFieldSet(element));
}

function belongsToDisabledFieldSet(element) {
  const fieldSetElement = element?.closest("FIELDSET[DISABLED]");
  if (!fieldSetElement) return false;
  const legendElement = fieldSetElement.querySelector(":scope > LEGEND");
  return !legendElement || !legendElement.contains(element);
}

const inputTypeToRole = {button:"button",checkbox:"checkbox",image:"button",number:"spinbutton",radio:"radio",range:"slider",reset:"button",submit:"button"};

function getIdRefs(element, ref) {
  if (!ref) return [];
  const root = enclosingShadowRootOrDocument(element);
  if (!root) return [];
  try {
    const ids = ref.split(" ").filter(id => !!id);
    const result = [];
    for (const id of ids) {
      const firstElement = root.querySelector("#" + CSS.escape(id));
      if (firstElement && !result.includes(firstElement)) result.push(firstElement);
    }
    return result;
  } catch { return []; }
}

const kImplicitRoleByTagName = {
  A: e => e.hasAttribute("href") ? "link" : null,
  AREA: e => e.hasAttribute("href") ? "link" : null,
  ARTICLE: () => "article", ASIDE: () => "complementary", BLOCKQUOTE: () => "blockquote", BUTTON: () => "button",
  CAPTION: () => "caption", CODE: () => "code", DATALIST: () => "listbox", DD: () => "definition",
  DEL: () => "deletion", DETAILS: () => "group", DFN: () => "term", DIALOG: () => "dialog", DT: () => "term",
  EM: () => "emphasis", FIELDSET: () => "group", FIGURE: () => "figure",
  FOOTER: e => closestCrossShadow(e, kAncestorPreventingLandmark) ? null : "contentinfo",
  FORM: e => hasExplicitAccessibleName(e) ? "form" : null,
  H1: () => "heading", H2: () => "heading", H3: () => "heading", H4: () => "heading", H5: () => "heading", H6: () => "heading",
  HEADER: e => closestCrossShadow(e, kAncestorPreventingLandmark) ? null : "banner",
  HR: () => "separator", HTML: () => "document",
  IMG: e => e.getAttribute("alt") === "" && !e.getAttribute("title") && !hasGlobalAriaAttribute(e) && !hasTabIndex(e) ? "presentation" : "img",
  INPUT: e => {
    const type = e.type.toLowerCase();
    if (type === "search") return e.hasAttribute("list") ? "combobox" : "searchbox";
    if (["email","tel","text","url",""].includes(type)) {
      const list = getIdRefs(e, e.getAttribute("list"))[0];
      return list && elementSafeTagName(list) === "DATALIST" ? "combobox" : "textbox";
    }
    if (type === "hidden") return null;
    if (type === "file") return "button";
    return inputTypeToRole[type] || "textbox";
  },
  INS: () => "insertion", LI: () => "listitem", MAIN: () => "main", MARK: () => "mark", MATH: () => "math",
  MENU: () => "list", METER: () => "meter", NAV: () => "navigation", OL: () => "list", OPTGROUP: () => "group",
  OPTION: () => "option", OUTPUT: () => "status", P: () => "paragraph", PROGRESS: () => "progressbar",
  SEARCH: () => "search", SECTION: e => hasExplicitAccessibleName(e) ? "region" : null,
  SELECT: e => e.hasAttribute("multiple") || e.size > 1 ? "listbox" : "combobox",
  STRONG: () => "strong", SUB: () => "subscript", SUP: () => "superscript", SVG: () => "img",
  TABLE: () => "table", TBODY: () => "rowgroup",
  TD: e => { const table = closestCrossShadow(e, "table"); const role = table ? getExplicitAriaRole(table) : ""; return role === "grid" || role === "treegrid" ? "gridcell" : "cell"; },
  TEXTAREA: () => "textbox", TFOOT: () => "rowgroup",
  TH: e => { const scope = e.getAttribute("scope"); if (scope === "col" || scope === "colgroup") return "columnheader"; if (scope === "row" || scope === "rowgroup") return "rowheader"; return "columnheader"; },
  THEAD: () => "rowgroup", TIME: () => "time", TR: () => "row", UL: () => "list"
};

function getExplicitAriaRole(element) {
  const roles = (element.getAttribute("role") || "").split(" ").map(role => role.trim());
  return roles.find(role => validRoles.includes(role)) || null;
}

function getImplicitAriaRole(element) {
  const fn = kImplicitRoleByTagName[elementSafeTagName(element)];
  return fn ? fn(element) : null;
}

function hasPresentationConflictResolution(element, role) {
  return hasGlobalAriaAttribute(element, role) || isFocusable(element);
}

function getAriaRole(element) {
  const explicitRole = getExplicitAriaRole(element);
  if (!explicitRole) return getImplicitAriaRole(element);
  if (explicitRole === "none" || explicitRole === "presentation") {
    const implicitRole = getImplicitAriaRole(element);
    if (hasPresentationConflictResolution(element, implicitRole)) return implicitRole;
  }
  return explicitRole;
}

function getAriaBoolean(attr) {
  return attr === null ? undefined : attr.toLowerCase() === "true";
}

function isElementIgnoredForAria(element) {
  return ["STYLE","SCRIPT","NOSCRIPT","TEMPLATE"].includes(elementSafeTagName(element));
}

function isElementHiddenForAria(element) {
  if (isElementIgnoredForAria(element)) return true;
  const style = getElementComputedStyle(element);
  const isSlot = element.nodeName === "SLOT";
  if (style?.display === "contents" && !isSlot) {
    for (let child = element.firstChild; child; child = child.nextSibling) {
      if (child.nodeType === 1 && !isElementHiddenForAria(child)) return false;
      if (child.nodeType === 3 && isVisibleTextNode(child)) return false;
    }
    return true;
  }
  const isOptionInsideSelect = element.nodeName === "OPTION" && !!element.closest("select");
  if (!isOptionInsideSelect && !isSlot && !isElementStyleVisibilityVisible(element, style)) return true;
  return belongsToDisplayNoneOrAriaHiddenOrNonSlotted(element);
}

function belongsToDisplayNoneOrAriaHiddenOrNonSlotted(element) {
  let hidden = cacheIsHidden?.get(element);
  if (hidden === undefined) {
    hidden = false;
    if (element.parentElement && element.parentElement.shadowRoot && !element.assignedSlot) hidden = true;
    if (!hidden) {
      const style = getElementComputedStyle(element);
      hidden = !style || style.display === "none" || getAriaBoolean(element.getAttribute("aria-hidden")) === true;
    }
    if (!hidden) {
      const parent = parentElementOrShadowHost(element);
      if (parent) hidden = belongsToDisplayNoneOrAriaHiddenOrNonSlotted(parent);
    }
    cacheIsHidden?.set(element, hidden);
  }
  return hidden;
}

function getAriaLabelledByElements(element) {
  const ref = element.getAttribute("aria-labelledby");
  if (ref === null) return null;
  const refs = getIdRefs(element, ref);
  return refs.length ? refs : null;
}

function getElementAccessibleName(element, includeHidden) {
  let accessibleName = cacheAccessibleName?.get(element);
  if (accessibleName === undefined) {
    accessibleName = "";
    const elementProhibitsNaming = ["caption","code","definition","deletion","emphasis","generic","insertion","mark","paragraph","presentation","strong","subscript","suggestion","superscript","term","time"].includes(getAriaRole(element) || "");
    if (!elementProhibitsNaming) {
      accessibleName = normalizeWhiteSpace(getTextAlternativeInternal(element, { includeHidden, visitedElements: new Set(), embeddedInTargetElement: "self" }));
    }
    cacheAccessibleName?.set(element, accessibleName);
  }
  return accessibleName;
}

function getTextAlternativeInternal(element, options) {
  if (options.visitedElements.has(element)) return "";
  const childOptions = { ...options, embeddedInTargetElement: options.embeddedInTargetElement === "self" ? "descendant" : options.embeddedInTargetElement };

  if (!options.includeHidden) {
    const isEmbeddedInHiddenReferenceTraversal = !!options.embeddedInLabelledBy?.hidden || !!options.embeddedInLabel?.hidden;
    if (isElementIgnoredForAria(element) || (!isEmbeddedInHiddenReferenceTraversal && isElementHiddenForAria(element))) {
      options.visitedElements.add(element);
      return "";
    }
  }

  const labelledBy = getAriaLabelledByElements(element);
  if (!options.embeddedInLabelledBy) {
    const accessibleName = (labelledBy || []).map(ref => getTextAlternativeInternal(ref, { ...options, embeddedInLabelledBy: { element: ref, hidden: isElementHiddenForAria(ref) }, embeddedInTargetElement: undefined, embeddedInLabel: undefined })).join(" ");
    if (accessibleName) return accessibleName;
  }

  const role = getAriaRole(element) || "";
  const tagName = elementSafeTagName(element);

  const ariaLabel = element.getAttribute("aria-label") || "";
  if (ariaLabel.trim()) { options.visitedElements.add(element); return ariaLabel; }

  if (!["presentation","none"].includes(role)) {
    if (tagName === "INPUT" && ["button","submit","reset"].includes(element.type)) {
      options.visitedElements.add(element);
      const value = element.value || "";
      if (value.trim()) return value;
      if (element.type === "submit") return "Submit";
      if (element.type === "reset") return "Reset";
      return element.getAttribute("title") || "";
    }
    if (tagName === "INPUT" && element.type === "image") {
      options.visitedElements.add(element);
      const alt = element.getAttribute("alt") || "";
      if (alt.trim()) return alt;
      const title = element.getAttribute("title") || "";
      if (title.trim()) return title;
      return "Submit";
    }
    if (tagName === "IMG") {
      options.visitedElements.add(element);
      const alt = element.getAttribute("alt") || "";
      if (alt.trim()) return alt;
      return element.getAttribute("title") || "";
    }
    if (!labelledBy && ["BUTTON","INPUT","TEXTAREA","SELECT"].includes(tagName)) {
      const labels = element.labels;
      if (labels?.length) {
        options.visitedElements.add(element);
        return [...labels].map(label => getTextAlternativeInternal(label, { ...options, embeddedInLabel: { element: label, hidden: isElementHiddenForAria(label) }, embeddedInLabelledBy: undefined, embeddedInTargetElement: undefined })).filter(name => !!name).join(" ");
      }
    }
  }

  const allowsNameFromContent = ["button","cell","checkbox","columnheader","gridcell","heading","link","menuitem","menuitemcheckbox","menuitemradio","option","radio","row","rowheader","switch","tab","tooltip","treeitem"].includes(role);
  if (allowsNameFromContent || !!options.embeddedInLabelledBy || !!options.embeddedInLabel) {
    options.visitedElements.add(element);
    const accessibleName = innerAccumulatedElementText(element, childOptions);
    const maybeTrimmedAccessibleName = options.embeddedInTargetElement === "self" ? accessibleName.trim() : accessibleName;
    if (maybeTrimmedAccessibleName) return accessibleName;
  }

  if (!["presentation","none"].includes(role) || tagName === "IFRAME") {
    options.visitedElements.add(element);
    const title = element.getAttribute("title") || "";
    if (title.trim()) return title;
  }

  options.visitedElements.add(element);
  return "";
}

function innerAccumulatedElementText(element, options) {
  const tokens = [];
  const visit = (node, skipSlotted) => {
    if (skipSlotted && node.assignedSlot) return;
    if (node.nodeType === 1) {
      const display = getElementComputedStyle(node)?.display || "inline";
      let token = getTextAlternativeInternal(node, options);
      if (display !== "inline" || node.nodeName === "BR") token = " " + token + " ";
      tokens.push(token);
    } else if (node.nodeType === 3) {
      tokens.push(node.textContent || "");
    }
  };
  const assignedNodes = element.nodeName === "SLOT" ? element.assignedNodes() : [];
  if (assignedNodes.length) {
    for (const child of assignedNodes) visit(child, false);
  } else {
    for (let child = element.firstChild; child; child = child.nextSibling) visit(child, true);
    if (element.shadowRoot) {
      for (let child = element.shadowRoot.firstChild; child; child = child.nextSibling) visit(child, true);
    }
  }
  return tokens.join("");
}

const kAriaCheckedRoles = ["checkbox","menuitemcheckbox","option","radio","switch","menuitemradio","treeitem"];
function getAriaChecked(element) {
  const tagName = elementSafeTagName(element);
  if (tagName === "INPUT" && element.indeterminate) return "mixed";
  if (tagName === "INPUT" && ["checkbox","radio"].includes(element.type)) return element.checked;
  if (kAriaCheckedRoles.includes(getAriaRole(element) || "")) {
    const checked = element.getAttribute("aria-checked");
    if (checked === "true") return true;
    if (checked === "mixed") return "mixed";
    return false;
  }
  return false;
}

const kAriaDisabledRoles = ["application","button","composite","gridcell","group","input","link","menuitem","scrollbar","separator","tab","checkbox","columnheader","combobox","grid","listbox","menu","menubar","menuitemcheckbox","menuitemradio","option","radio","radiogroup","row","rowheader","searchbox","select","slider","spinbutton","switch","tablist","textbox","toolbar","tree","treegrid","treeitem"];
function getAriaDisabled(element) {
  return isNativelyDisabled(element) || hasExplicitAriaDisabled(element);
}
function hasExplicitAriaDisabled(element, isAncestor) {
  if (!element) return false;
  if (isAncestor || kAriaDisabledRoles.includes(getAriaRole(element) || "")) {
    const attribute = (element.getAttribute("aria-disabled") || "").toLowerCase();
    if (attribute === "true") return true;
    if (attribute === "false") return false;
    return hasExplicitAriaDisabled(parentElementOrShadowHost(element), true);
  }
  return false;
}

const kAriaExpandedRoles = ["application","button","checkbox","combobox","gridcell","link","listbox","menuitem","row","rowheader","tab","treeitem","columnheader","menuitemcheckbox","menuitemradio","switch"];
function getAriaExpanded(element) {
  if (elementSafeTagName(element) === "DETAILS") return element.open;
  if (kAriaExpandedRoles.includes(getAriaRole(element) || "")) {
    const expanded = element.getAttribute("aria-expanded");
    if (expanded === null) return undefined;
    if (expanded === "true") return true;
    return false;
  }
  return undefined;
}

const kAriaLevelRoles = ["heading","listitem","row","treeitem"];
function getAriaLevel(element) {
  const native = {H1:1,H2:2,H3:3,H4:4,H5:5,H6:6}[elementSafeTagName(element)];
  if (native) return native;
  if (kAriaLevelRoles.includes(getAriaRole(element) || "")) {
    const attr = element.getAttribute("aria-level");
    const value = attr === null ? Number.NaN : Number(attr);
    if (Number.isInteger(value) && value >= 1) return value;
  }
  return 0;
}

const kAriaPressedRoles = ["button"];
function getAriaPressed(element) {
  if (kAriaPressedRoles.includes(getAriaRole(element) || "")) {
    const pressed = element.getAttribute("aria-pressed");
    if (pressed === "true") return true;
    if (pressed === "mixed") return "mixed";
  }
  return false;
}

const kAriaSelectedRoles = ["gridcell","option","row","tab","rowheader","columnheader","treeitem"];
function getAriaSelected(element) {
  if (elementSafeTagName(element) === "OPTION") return element.selected;
  if (kAriaSelectedRoles.includes(getAriaRole(element) || "")) return getAriaBoolean(element.getAttribute("aria-selected")) === true;
  return false;
}

function receivesPointerEvents(element) {
  const cache = cachePointerEvents;
  let e = element;
  let result;
  const parents = [];
  for (; e; e = parentElementOrShadowHost(e)) {
    const cached = cache?.get(e);
    if (cached !== undefined) { result = cached; break; }
    parents.push(e);
    const style = getElementComputedStyle(e);
    if (!style) { result = true; break; }
    const value = style.pointerEvents;
    if (value) { result = value !== "none"; break; }
  }
  if (result === undefined) result = true;
  for (const parent of parents) cache?.set(parent, result);
  return result;
}

function getCSSContent(element, pseudo) {
  const style = getElementComputedStyle(element, pseudo);
  if (!style) return undefined;
  const contentValue = style.content;
  if (!contentValue || contentValue === "none" || contentValue === "normal") return undefined;
  if (style.display === "none" || style.visibility === "hidden") return undefined;
  const match = contentValue.match(/^"(.*)"$/);
  if (match) {
    const content = match[1].replace(/\\\\"/g, '"');
    if (pseudo) {
      const display = style.display || "inline";
      if (display !== "inline") return " " + content + " ";
    }
    return content;
  }
  return undefined;
}
`;

const getReactUtilsCode = (): string => `
async function getReactSource(element) {
  if (!element || typeof element !== "object") return null;
  const cached = element._reactSource;
  if (cached !== undefined) return cached;
  if (element._reactSourcePromise) {
    try {
      return await element._reactSourcePromise;
    } catch {
      return null;
    }
  }
  const reactGrab = window.__REACT_GRAB__;
  if (!reactGrab || typeof reactGrab.getSource !== "function") return null;
  try {
    const promise = reactGrab.getSource(element);
    if (!promise || typeof promise.then !== "function") {
      element._reactSource = promise || null;
      return element._reactSource;
    }
    element._reactSourcePromise = promise;
    const source = await promise;
    element._reactSource = source || null;
    return element._reactSource;
  } catch {
    element._reactSource = null;
    return null;
  }
}

function findElementsByComponent(componentName, options) {
  options = options || {};
  const matchingElements = [];
  const walkDOM = async (node) => {
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const source = await getReactSource(node);
    if (source && source.componentName === componentName) {
      matchingElements.push({ element: node, source });
    }
    for (let child = node.firstChild; child; child = child.nextSibling) {
      await walkDOM(child);
    }
  };
  return walkDOM(document.body).then(() => {
    if (options.nth !== undefined) {
      return matchingElements[options.nth] || null;
    }
    return matchingElements;
  });
}

function safeSerialize(value, depth, maxDepth, seen) {
  if (depth > maxDepth) return "[max depth]";
  if (value === null) return null;
  if (value === undefined) return undefined;
  const valueType = typeof value;
  if (valueType === "string") return value.length > MAX_STRING_LENGTH ? value.slice(0, MAX_STRING_LENGTH) + "..." : value;
  if (valueType === "number" || valueType === "boolean") return value;
  if (valueType === "bigint") return "[bigint: " + value.toString() + "]";
  if (valueType === "function") return "[function]";
  if (valueType === "symbol") return "[symbol]";
  if (value instanceof Date) return "[Date: " + value.toISOString() + "]";
  if (value instanceof RegExp) return "[RegExp: " + value.toString() + "]";
  if (value instanceof Error) return "[Error: " + value.message + "]";
  if (value instanceof Map) return "[Map(" + value.size + ")]";
  if (value instanceof Set) return "[Set(" + value.size + ")]";
  if (value instanceof WeakMap) return "[WeakMap]";
  if (value instanceof WeakSet) return "[WeakSet]";
  if (value instanceof Promise) return "[Promise]";
  if (typeof ArrayBuffer !== "undefined" && value instanceof ArrayBuffer) return "[ArrayBuffer(" + value.byteLength + ")]";
  if (typeof SharedArrayBuffer !== "undefined" && value instanceof SharedArrayBuffer) return "[SharedArrayBuffer]";
  if (ArrayBuffer.isView(value)) return "[TypedArray(" + value.byteLength + ")]";
  if (typeof Element !== "undefined" && value instanceof Element) return "[Element: " + value.tagName.toLowerCase() + "]";
  if (typeof Node !== "undefined" && value instanceof Node) return "[Node: " + value.nodeName + "]";
  if (typeof Window !== "undefined" && value instanceof Window) return "[Window]";
  if (typeof Document !== "undefined" && value instanceof Document) return "[Document]";
  if (seen.has(value)) return "[circular]";
  seen.add(value);
  if (Array.isArray(value)) {
    if (value.length > MAX_ARRAY_ITEMS) return "[Array(" + value.length + ")]";
    return value.slice(0, MAX_ARRAY_ITEMS).map(item => safeSerialize(item, depth + 1, maxDepth, seen));
  }
  if (valueType === "object") {
    try {
      const proto = Object.getPrototypeOf(value);
      if (proto !== null && proto !== Object.prototype) {
        const constructorName = value.constructor?.name;
        if (constructorName && constructorName !== "Object") {
          return "[" + constructorName + "]";
        }
      }
      const keys = Object.keys(value);
      if (keys.length > MAX_OBJECT_KEYS) return "[Object(" + keys.length + " keys)]";
      const result = {};
      for (const key of keys.slice(0, MAX_OBJECT_KEYS)) {
        if (key.startsWith("_") || key.startsWith("$$") || key.startsWith("__")) continue;
        try {
          result[key] = safeSerialize(value[key], depth + 1, maxDepth, seen);
        } catch {
          result[key] = "[error reading property]";
        }
      }
      return result;
    } catch {
      return "[Object]";
    }
  }
  return "[unknown]";
}

function getElementProps(element) {
  const reactGrab = window.__REACT_GRAB__;
  if (!reactGrab) return null;
  try {
    const fiber = element._reactFiber || element[Object.keys(element).find(key => key.startsWith("__reactFiber$") || key.startsWith("__reactInternalInstance$"))];
    if (!fiber) return null;
    const props = fiber.memoizedProps;
    if (!props) return null;
    return safeSerialize(props, 0, 3, new Set());
  } catch {
    return null;
  }
}

function getElementState(element) {
  const reactGrab = window.__REACT_GRAB__;
  if (!reactGrab) return null;
  try {
    const fiber = element._reactFiber || element[Object.keys(element).find(key => key.startsWith("__reactFiber$") || key.startsWith("__reactInternalInstance$"))];
    if (!fiber) return null;
    let currentFiber = fiber;
    while (currentFiber && currentFiber.tag !== 0 && currentFiber.tag !== 1) {
      currentFiber = currentFiber.return;
    }
    if (!currentFiber || !currentFiber.memoizedState) return null;
    const states = [];
    let stateNode = currentFiber.memoizedState;
    let hookIndex = 0;
    while (stateNode && hookIndex < MAX_HOOKS_ITERATION) {
      if (stateNode.memoizedState !== undefined) {
        states.push(safeSerialize(stateNode.memoizedState, 0, 2, new Set()));
      }
      stateNode = stateNode.next;
      hookIndex++;
    }
    return states.length > 0 ? states : null;
  } catch {
    return null;
  }
}

async function getComponentTree(options) {
  options = options || {};
  const maxDepth = options.maxDepth || DEFAULT_COMPONENT_TREE_DEPTH;
  const includeProps = options.includeProps || false;
  const componentNodes = [];
  const processedFibers = new Set();

  const getFiberFromElement = (element) => {
    if (!element) return null;
    return element._reactFiber || element[Object.keys(element).find(key => key.startsWith("__reactFiber$") || key.startsWith("__reactInternalInstance$"))];
  };

  const isComponentFiber = (fiber) => {
    return fiber && (fiber.tag === 0 || fiber.tag === 1 || fiber.tag === 11 || fiber.tag === 14 || fiber.tag === 15);
  };

  const getComponentName = (fiber) => {
    if (!fiber || !fiber.type) return null;
    if (typeof fiber.type === "string") return null;
    return fiber.type.displayName || fiber.type.name || null;
  };

  const traverseFiber = async (fiber, depth, parentPath) => {
    if (!fiber || depth > maxDepth || processedFibers.has(fiber)) return;
    processedFibers.add(fiber);

    if (isComponentFiber(fiber)) {
      const name = getComponentName(fiber);
      if (name && !name.startsWith("_")) {
        const node = { name, depth, path: parentPath + "/" + name };
        if (fiber.stateNode instanceof Element) {
          const refs = window.__REACT_GRAB_REFS__;
          if (refs) {
            for (const [refId, el] of Object.entries(refs)) {
              if (el === fiber.stateNode) {
                node.ref = refId;
                break;
              }
            }
          }
          const source = await getReactSource(fiber.stateNode);
          if (source) {
            node.source = source.filePath + (source.lineNumber ? ":" + source.lineNumber : "");
          }
        }
        if (includeProps && fiber.memoizedProps) {
          node.props = safeSerialize(fiber.memoizedProps, 0, 2, new Set());
        }
        componentNodes.push(node);
        parentPath = node.path;
      }
    }

    if (fiber.child) await traverseFiber(fiber.child, depth + 1, parentPath);
    if (fiber.sibling) await traverseFiber(fiber.sibling, depth, parentPath);
  };

  const rootFiber = getFiberFromElement(document.getElementById("root") || document.getElementById("__next") || document.body.firstElementChild);
  if (rootFiber) {
    let current = rootFiber;
    while (current.return) current = current.return;
    await traverseFiber(current, 0, "");
  }

  return componentNodes;
}

window.__REACT_GRAB_FIND_BY_COMPONENT__ = findElementsByComponent;
window.__REACT_GRAB_GET_PROPS__ = getElementProps;
window.__REACT_GRAB_GET_STATE__ = getElementState;
window.__REACT_GRAB_GET_COMPONENT_TREE__ = getComponentTree;
`;

const getAriaSnapshotCode = (): string => `
let lastRef = 0;

function generateAriaTree(rootElement) {
  const options = { visibility: "ariaOrVisible", refs: "interactable", refPrefix: "", includeGenericRole: true, renderActive: true, renderCursorPointer: true };
  const visited = new Set();
  const snapshot = {
    root: { role: "fragment", name: "", children: [], element: rootElement, props: {}, box: computeBox(rootElement), receivesPointerEvents: true },
    elements: new Map(),
    refs: new Map(),
    iframeRefs: []
  };

  const visit = (ariaNode, node, parentElementVisible) => {
    if (visited.has(node)) return;
    visited.add(node);
    if (node.nodeType === Node.TEXT_NODE && node.nodeValue) {
      if (!parentElementVisible) return;
      const text = node.nodeValue;
      if (ariaNode.role !== "textbox" && text) ariaNode.children.push(node.nodeValue || "");
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const element = node;
    const isElementVisibleForAria = !isElementHiddenForAria(element);
    let visible = isElementVisibleForAria;
    if (options.visibility === "ariaOrVisible") visible = isElementVisibleForAria || isElementVisible(element);
    if (options.visibility === "ariaAndVisible") visible = isElementVisibleForAria && isElementVisible(element);
    if (options.visibility === "aria" && !visible) return;
    const ariaChildren = [];
    if (element.hasAttribute("aria-owns")) {
      const ids = element.getAttribute("aria-owns").split(/\\s+/);
      for (const id of ids) {
        const ownedElement = rootElement.ownerDocument.getElementById(id);
        if (ownedElement) ariaChildren.push(ownedElement);
      }
    }
    const childAriaNode = visible ? toAriaNode(element, options) : null;
    if (childAriaNode) {
      if (childAriaNode.ref) {
        snapshot.elements.set(childAriaNode.ref, element);
        snapshot.refs.set(element, childAriaNode.ref);
        if (childAriaNode.role === "iframe") snapshot.iframeRefs.push(childAriaNode.ref);
      }
      ariaNode.children.push(childAriaNode);
    }
    processElement(childAriaNode || ariaNode, element, ariaChildren, visible);
  };

  function processElement(ariaNode, element, ariaChildren, parentElementVisible) {
    const display = getElementComputedStyle(element)?.display || "inline";
    const treatAsBlock = display !== "inline" || element.nodeName === "BR" ? " " : "";
    if (treatAsBlock) ariaNode.children.push(treatAsBlock);
    ariaNode.children.push(getCSSContent(element, "::before") || "");
    const assignedNodes = element.nodeName === "SLOT" ? element.assignedNodes() : [];
    if (assignedNodes.length) {
      for (const child of assignedNodes) visit(ariaNode, child, parentElementVisible);
    } else {
      for (let child = element.firstChild; child; child = child.nextSibling) {
        if (!child.assignedSlot) visit(ariaNode, child, parentElementVisible);
      }
      if (element.shadowRoot) {
        for (let child = element.shadowRoot.firstChild; child; child = child.nextSibling) visit(ariaNode, child, parentElementVisible);
      }
    }
    for (const child of ariaChildren) visit(ariaNode, child, parentElementVisible);
    ariaNode.children.push(getCSSContent(element, "::after") || "");
    if (treatAsBlock) ariaNode.children.push(treatAsBlock);
    if (ariaNode.children.length === 1 && ariaNode.name === ariaNode.children[0]) ariaNode.children = [];
    if (ariaNode.role === "link" && element.hasAttribute("href")) ariaNode.props["url"] = element.getAttribute("href");
    if (ariaNode.role === "textbox" && element.hasAttribute("placeholder") && element.getAttribute("placeholder") !== ariaNode.name) ariaNode.props["placeholder"] = element.getAttribute("placeholder");
  }

  beginAriaCaches();
  try { visit(snapshot.root, rootElement, true); }
  finally { endAriaCaches(); }
  normalizeStringChildren(snapshot.root);
  normalizeGenericRoles(snapshot.root);
  return snapshot;
}

function computeAriaRef(ariaNode, options) {
  if (options.refs === "none") return;
  if (options.refs === "interactable" && (!ariaNode.box.visible || !ariaNode.receivesPointerEvents)) return;
  let ariaRef = ariaNode.element._ariaRef;
  if (!ariaRef || ariaRef.role !== ariaNode.role || ariaRef.name !== ariaNode.name) {
    ariaRef = { role: ariaNode.role, name: ariaNode.name, ref: (options.refPrefix || "") + "e" + (++lastRef) };
    ariaNode.element._ariaRef = ariaRef;
  }
  ariaNode.ref = ariaRef.ref;
  ariaNode.element.setAttribute("aria-ref", ariaRef.ref);
}

function toAriaNode(element, options) {
  const active = element.ownerDocument.activeElement === element;
  if (element.nodeName === "IFRAME") {
    const ariaNode = { role: "iframe", name: "", children: [], props: {}, element, box: computeBox(element), receivesPointerEvents: true, active };
    computeAriaRef(ariaNode, options);
    return ariaNode;
  }
  const defaultRole = options.includeGenericRole ? "generic" : null;
  const role = getAriaRole(element) || defaultRole;
  if (!role || role === "presentation" || role === "none") return null;
  const name = normalizeWhiteSpace(getElementAccessibleName(element, false) || "");
  const receivesPointerEventsValue = receivesPointerEvents(element);
  const box = computeBox(element);
  if (role === "generic" && box.inline && element.childNodes.length === 1 && element.childNodes[0].nodeType === Node.TEXT_NODE) return null;
  const result = { role, name, children: [], props: {}, element, box, receivesPointerEvents: receivesPointerEventsValue, active };
  computeAriaRef(result, options);
  if (kAriaCheckedRoles.includes(role)) result.checked = getAriaChecked(element);
  if (kAriaDisabledRoles.includes(role)) result.disabled = getAriaDisabled(element);
  if (kAriaExpandedRoles.includes(role)) result.expanded = getAriaExpanded(element);
  if (kAriaLevelRoles.includes(role)) result.level = getAriaLevel(element);
  if (kAriaPressedRoles.includes(role)) result.pressed = getAriaPressed(element);
  if (kAriaSelectedRoles.includes(role)) result.selected = getAriaSelected(element);
  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
    if (element.type !== "checkbox" && element.type !== "radio" && element.type !== "file") result.children = [element.value];
  }
  return result;
}

function normalizeGenericRoles(node) {
  const normalizeChildren = (node) => {
    const result = [];
    for (const child of node.children || []) {
      if (typeof child === "string") { result.push(child); continue; }
      const normalized = normalizeChildren(child);
      result.push(...normalized);
    }
    const removeSelf = node.role === "generic" && !node.name && result.length <= 1 && result.every(c => typeof c !== "string" && !!c.ref);
    if (removeSelf) return result;
    node.children = result;
    return [node];
  };
  normalizeChildren(node);
}

function normalizeStringChildren(rootA11yNode) {
  const flushChildren = (buffer, normalizedChildren) => {
    if (!buffer.length) return;
    const text = normalizeWhiteSpace(buffer.join(""));
    if (text) normalizedChildren.push(text);
    buffer.length = 0;
  };
  const visit = (ariaNode) => {
    const normalizedChildren = [];
    const buffer = [];
    for (const child of ariaNode.children || []) {
      if (typeof child === "string") { buffer.push(child); }
      else { flushChildren(buffer, normalizedChildren); visit(child); normalizedChildren.push(child); }
    }
    flushChildren(buffer, normalizedChildren);
    ariaNode.children = normalizedChildren.length ? normalizedChildren : [];
    if (ariaNode.children.length === 1 && ariaNode.children[0] === ariaNode.name) ariaNode.children = [];
  };
  visit(rootA11yNode);
}

function hasPointerCursor(ariaNode) { return ariaNode.box.cursor === "pointer"; }

var DEFAULT_RENDER_OPTIONS = { visibility: "ariaOrVisible", refs: "interactable", refPrefix: "", includeGenericRole: true, renderActive: true, renderCursorPointer: true };

function createAriaKey(ariaNode, renderCursorPointer, renderActive) {
  let key = ariaNode.role;
  if (ariaNode.name && ariaNode.name.length <= MAX_NAME_LENGTH) {
    const name = ariaNode.name;
    if (name) {
      const stringifiedName = name.startsWith("/") && name.endsWith("/") ? name : JSON.stringify(name);
      key += " " + stringifiedName;
    }
  }
  if (ariaNode.checked === "mixed") key += " [checked=mixed]";
  if (ariaNode.checked === true) key += " [checked]";
  if (ariaNode.disabled) key += " [disabled]";
  if (ariaNode.expanded) key += " [expanded]";
  if (ariaNode.active && renderActive) key += " [active]";
  if (ariaNode.level) key += " [level=" + ariaNode.level + "]";
  if (ariaNode.pressed === "mixed") key += " [pressed=mixed]";
  if (ariaNode.pressed === true) key += " [pressed]";
  if (ariaNode.selected === true) key += " [selected]";
  if (ariaNode.ref) {
    key += " [ref=" + ariaNode.ref + "]";
    if (renderCursorPointer && hasPointerCursor(ariaNode)) key += " [cursor=pointer]";
  }
  if (ariaNode.component) key += " [component=" + ariaNode.component + "]";
  if (ariaNode.source) key += " [source=" + ariaNode.source + "]";
  return key;
}

function getSingleInlinedTextChild(ariaNode) {
  return ariaNode?.children.length === 1 && typeof ariaNode.children[0] === "string" && !Object.keys(ariaNode.props).length ? ariaNode.children[0] : undefined;
}

function serializeReactSource(source) {
  try {
    if (!source || typeof source !== "object") return null;
    let filePath = null;
    let lineNumber = null;
    let componentName = null;
    try {
      filePath = typeof source.filePath === "string" ? source.filePath : null;
      if (filePath) {
        const lastSlash = Math.max(filePath.lastIndexOf("/"), filePath.lastIndexOf("\\\\"));
        if (lastSlash !== -1) {
          filePath = filePath.slice(lastSlash + 1);
        }
      }
    } catch {}
    try {
      lineNumber = typeof source.lineNumber === "number" ? source.lineNumber : null;
    } catch {}
    try {
      componentName = typeof source.componentName === "string" ? source.componentName : null;
    } catch {}
    return { filePath, lineNumber, componentName };
  } catch {
    return null;
  }
}

async function populateReactInfo(snapshot) {
  try {
    const nodesWithRefs = [];
    const collectNodes = (node) => {
      try {
        if (typeof node === "string") return;
        if (node.ref && node.element) {
          nodesWithRefs.push(node);
        }
        for (const child of node.children || []) {
          collectNodes(child);
        }
      } catch {}
    };
    const startNodes = snapshot.root.role === "fragment" ? snapshot.root.children : [snapshot.root];
    for (const node of startNodes) collectNodes(node);

    await Promise.all(nodesWithRefs.map(async (node) => {
      try {
        const reactGrab = window.__REACT_GRAB__;
        if (reactGrab?.getDisplayName) {
          node.component = reactGrab.getDisplayName(node.element);
        }
        const rawSource = await getReactSource(node.element);
        const source = serializeReactSource(rawSource);
        if (source?.filePath) {
          node.source = source.filePath + (source.lineNumber ? ":" + source.lineNumber : "");
        }
      } catch {}
    }));
  } catch {}
}

async function getSnapshot(options) {
  options = options || {};
  const maxDepth = options.maxDepth || 0;
  const interactableOnly = options.interactableOnly || false;
  const snapshot = generateAriaTree(document.body);
  const refsObject = {};
  for (const [ref, element] of snapshot.elements) refsObject[ref] = element;
  window.__REACT_GRAB_REFS__ = refsObject;
  window.__REACT_GRAB_SNAPSHOT_TIME__ = Date.now();

  await populateReactInfo(snapshot);

  return renderAriaTreeFiltered(snapshot, { maxDepth, interactableOnly });
}

function renderAriaTreeFiltered(ariaSnapshot, filterOptions) {
  const maxDepth = filterOptions.maxDepth || 0;
  const interactableOnly = filterOptions.interactableOnly || false;
  const lines = [];
  const nodesToRender = ariaSnapshot.root.role === "fragment" ? ariaSnapshot.root.children : [ariaSnapshot.root];

  if (interactableOnly) {
    const collectInteractable = (node) => {
      if (typeof node === "string") return;
      const isInteractable = node.ref && (INTERACTABLE_ROLES.has(node.role) || hasPointerCursor(node));
      if (isInteractable) {
        const key = createAriaKey(node, true, DEFAULT_RENDER_OPTIONS.renderActive);
        const singleText = getSingleInlinedTextChild(node);
        if (singleText !== undefined) {
          lines.push("- " + yamlEscapeKeyIfNeeded(key) + ": " + yamlEscapeValueIfNeeded(singleText));
        } else {
          lines.push("- " + yamlEscapeKeyIfNeeded(key));
        }
      }
      for (const child of node.children || []) {
        collectInteractable(child);
      }
    };
    for (const node of nodesToRender) collectInteractable(node);
    return lines.join("\\n");
  }

  const visitText = (text, indent) => {
    const escaped = yamlEscapeValueIfNeeded(text);
    if (escaped) lines.push(indent + "- text: " + escaped);
  };

  const visit = (ariaNode, indent, renderCursorPointer, depth) => {
    if (maxDepth > 0 && depth >= maxDepth) return;
    const escapedKey = indent + "- " + yamlEscapeKeyIfNeeded(createAriaKey(ariaNode, renderCursorPointer, DEFAULT_RENDER_OPTIONS.renderActive));
    const singleInlinedTextChild = getSingleInlinedTextChild(ariaNode);
    if (!ariaNode.children.length && !Object.keys(ariaNode.props).length) {
      lines.push(escapedKey);
    } else if (singleInlinedTextChild !== undefined) {
      lines.push(escapedKey + ": " + yamlEscapeValueIfNeeded(singleInlinedTextChild));
    } else {
      lines.push(escapedKey + ":");
      for (const [name, value] of Object.entries(ariaNode.props)) lines.push(indent + "  - /" + name + ": " + yamlEscapeValueIfNeeded(value));
    }
    const childIndent = indent + "  ";
    const inCursorPointer = !!ariaNode.ref && renderCursorPointer && hasPointerCursor(ariaNode);
    for (const child of ariaNode.children) {
      if (typeof child === "string") {
        visitText(child, childIndent);
      } else {
        visit(child, childIndent, renderCursorPointer && !inCursorPointer, depth + 1);
      }
    }
  };

  for (const nodeToRender of nodesToRender) {
    if (typeof nodeToRender === "string") {
      visitText(nodeToRender, "");
    } else {
      visit(nodeToRender, "", !!DEFAULT_RENDER_OPTIONS.renderCursorPointer, 0);
    }
  }
  return lines.join("\\n");
}

function getRef(ref) {
  const refs = window.__REACT_GRAB_REFS__;
  if (!refs) throw new Error("No refs found. Call snapshot() first.");
  const element = refs[ref];
  if (!element) throw new Error('Ref "' + ref + '" not found. Available refs: ' + Object.keys(refs).join(", "));
  const snapshotTime = window.__REACT_GRAB_SNAPSHOT_TIME__;
  if (snapshotTime) {
    const ageMs = Date.now() - snapshotTime;
    if (ageMs > SNAPSHOT_AGE_WARNING_MS) console.warn("[react-grab] Snapshot is " + Math.round(ageMs / 1000) + "s old. Consider re-snapshotting.");
  }
  return element;
}

function queryElement(selector, options) {
  options = options || {};
  const element = document.querySelector(selector);
  if (!element) return { exists: false };
  beginAriaCaches();
  try {
    const box = computeBox(element);
    const role = getAriaRole(element);
    const name = normalizeWhiteSpace(getElementAccessibleName(element, false) || "");
    return {
      exists: true,
      visible: box.visible,
      role: role,
      name: name,
      cursor: box.cursor,
      tagName: element.tagName.toLowerCase(),
      className: element.className || undefined
    };
  } finally {
    endAriaCaches();
  }
}

window.__REACT_GRAB_QUERY__ = queryElement;
`;

export const clearSnapshotScriptCache = (): void => {
  cachedScript = null;
};
