const ANCESTOR_LEVELS = 5;

type UndoAction = () => void;

const NAVIGATION_PROPS = new Set([
  "parentElement",
  "parentNode",
  "firstChild",
  "lastChild",
  "nextSibling",
  "previousSibling",
  "firstElementChild",
  "lastElementChild",
  "nextElementSibling",
  "previousElementSibling",
]);

const QUERY_METHODS_SINGLE = new Set(["querySelector", "closest"]);

const QUERY_METHODS_COLLECTION = new Set([
  "querySelectorAll",
  "getElementsByClassName",
  "getElementsByTagName",
  "getElementsByTagNameNS",
]);

const HANDLED_METHODS = new Set([
  "setAttribute",
  "removeAttribute",
  "toggleAttribute",
  "setAttributeNS",
  "removeAttributeNS",
  "setAttributeNode",
  "removeAttributeNode",
  "appendChild",
  "removeChild",
  "insertBefore",
  "replaceChild",
  "remove",
  "append",
  "prepend",
  "after",
  "before",
  "replaceWith",
  "replaceChildren",
  "insertAdjacentHTML",
  "insertAdjacentElement",
  "insertAdjacentText",
  "setHTML",
  "normalize",
  "cloneNode",
  "addEventListener",
  "removeEventListener",
  "attachShadow",
  "animate",
  "getAnimations",
  "showModal",
  "show",
  "close",
  "showPopover",
  "hidePopover",
  "togglePopover",
  "scrollTo",
  "scrollBy",
  "scrollIntoView",
  "setSelectionRange",
  "setRangeText",
  "select",
  "splitText",
  "appendData",
  "deleteData",
  "insertData",
  "replaceData",
  "substringData",
  "focus",
  "blur",
  "click",
  "reset",
  "submit",
  "requestSubmit",
  "checkValidity",
  "reportValidity",
  "setCustomValidity",
  "insertRow",
  "deleteRow",
  "insertCell",
  "deleteCell",
  "createTHead",
  "deleteTHead",
  "createTFoot",
  "deleteTFoot",
  "createTBody",
  "createCaption",
  "deleteCaption",
  "add",
  "stepUp",
  "stepDown",
  "showPicker",
  "play",
  "pause",
  "load",
  "fastSeek",
  "setPointerCapture",
  "releasePointerCapture",
  "hasPointerCapture",
  "attachInternals",
  "getClientRects",
  "getBoundingClientRect",
  "hasAttribute",
  "hasAttributes",
  "hasAttributeNS",
  "getAttribute",
  "getAttributeNS",
  "getAttributeNode",
  "getAttributeNodeNS",
  "getAttributeNames",
  "matches",
  "webkitMatchesSelector",
  "contains",
  "compareDocumentPosition",
  "getRootNode",
  "isEqualNode",
  "isSameNode",
  "lookupPrefix",
  "lookupNamespaceURI",
  "isDefaultNamespace",
]);

const SCROLL_PROPS = new Set(["scrollTop", "scrollLeft"]);

const FORM_PROPS = new Set([
  "value",
  "checked",
  "selected",
  "selectedIndex",
  "disabled",
  "readOnly",
  "required",
  "defaultValue",
  "defaultChecked",
]);

const COMMON_PROPS = new Set([
  "innerText",
  "hidden",
  "tabIndex",
  "title",
  "lang",
  "dir",
  "contentEditable",
  "draggable",
  "spellcheck",
  "inert",
  "slot",
  "id",
  "className",
  "accessKey",
  "autocapitalize",
  "enterKeyHint",
  "inputMode",
  "nonce",
  "popover",
]);

const ELEMENT_SPECIFIC_PROPS = new Set([
  "open",
  "returnValue",
  "indeterminate",
  "type",
  "name",
  "placeholder",
  "pattern",
  "min",
  "max",
  "step",
  "multiple",
  "accept",
  "src",
  "href",
  "alt",
  "loading",
  "crossOrigin",
  "referrerPolicy",
  "download",
  "cols",
  "rows",
  "wrap",
  "srcdoc",
  "allowFullscreen",
  "allow",
  "rel",
  "target",
  "hreflang",
  "media",
  "sizes",
  "srcset",
  "decoding",
  "fetchPriority",
  "isMap",
  "useMap",
  "formAction",
  "formEnctype",
  "formMethod",
  "formNoValidate",
  "formTarget",
  "maxLength",
  "minLength",
  "size",
  "autocomplete",
  "autofocus",
  "dirName",
  "list",
  "noValidate",
  "action",
  "enctype",
  "method",
  "acceptCharset",
  "cite",
  "dateTime",
  "label",
  "span",
  "headers",
  "scope",
  "abbr",
  "colSpan",
  "rowSpan",
  "start",
  "reversed",
  "high",
  "low",
  "optimum",
  "default",
  "kind",
  "srclang",
  "integrity",
  "as",
  "blocking",
  "disabled",
  "async",
  "defer",
  "noModule",
  "htmlFor",
  "httpEquiv",
  "content",
  "charset",
  "coords",
  "shape",
  "ping",
  "sandbox",
  "seamless",
  "width",
  "height",
  "data",
  "form",
  "summary",
]);

const MEDIA_PROPS = new Set([
  "currentTime",
  "volume",
  "muted",
  "playbackRate",
  "defaultPlaybackRate",
  "autoplay",
  "loop",
  "controls",
  "preload",
  "poster",
  "playsInline",
  "disableRemotePlayback",
  "preservesPitch",
  "defaultMuted",
]);

const READONLY_PROPS = new Set([
  "nodeName",
  "nodeType",
  "tagName",
  "localName",
  "namespaceURI",
  "prefix",
  "baseURI",
  "isConnected",
  "ownerDocument",
  "offsetWidth",
  "offsetHeight",
  "offsetTop",
  "offsetLeft",
  "offsetParent",
  "clientWidth",
  "clientHeight",
  "clientTop",
  "clientLeft",
  "scrollWidth",
  "scrollHeight",
  "computedStyleMap",
  "assignedSlot",
  "sheet",
  "naturalWidth",
  "naturalHeight",
  "complete",
  "currentSrc",
  "videoWidth",
  "videoHeight",
  "duration",
  "paused",
  "ended",
  "seeking",
  "readyState",
  "networkState",
  "buffered",
  "played",
  "seekable",
  "error",
  "textTracks",
  "audioTracks",
  "videoTracks",
  "mediaKeys",
  "validity",
  "validationMessage",
  "willValidate",
  "files",
  "labels",
  "form",
  "selectionStart",
  "selectionEnd",
  "selectionDirection",
  "textLength",
  "options",
  "selectedOptions",
  "length",
  "tHead",
  "tFoot",
  "tBodies",
  "caption",
  "rowIndex",
  "sectionRowIndex",
  "cellIndex",
  "cells",
  "control",
  "internals",
  "part",
]);

const DOMTOKENLIST_PROPS = new Set([
  "relList",
  "sandbox",
  "controlsList",
  "part",
]);

export const createUndoableProxy = (element: HTMLElement) => {
  const undoActions: UndoAction[] = [];
  const record = (action: UndoAction) => undoActions.push(action);
  const proxyToElement = new WeakMap<object, Node>();
  const elementToProxy = new WeakMap<Node, Node>();
  const addedEventListeners: {
    target: EventTarget;
    type: string;
    listener: EventListenerOrEventListenerObject;
    options?: boolean | AddEventListenerOptions;
  }[] = [];

  const unwrapProxy = (maybeProxy: Node): Node =>
    proxyToElement.get(maybeProxy) ?? maybeProxy;

  const removeNodes = (nodes: (Node | string)[]) => {
    for (const node of nodes) {
      if (typeof node !== "string") node.parentNode?.removeChild(node);
    }
  };

  const unwrapNodes = (nodes: (Node | string)[]): (Node | string)[] =>
    nodes.map((node) => (typeof node === "string" ? node : unwrapProxy(node)));

  const captureNodePosition = (node: Node): { parent: Node | null; nextSibling: Node | null } => ({
    parent: node.parentNode,
    nextSibling: node.nextSibling,
  });

  const restoreNodePosition = (node: Node, position: { parent: Node | null; nextSibling: Node | null }) => {
    if (position.parent) {
      position.parent.insertBefore(node, position.nextSibling);
    }
  };

  const getFragmentChildren = (node: Node): Node[] => {
    if (node instanceof DocumentFragment) {
      return Array.from(node.childNodes);
    }
    return [];
  };

  const wrapNodeInsertion = <T extends (...args: (Node | string)[]) => void>(
    method: T,
    getInsertedNodes?: (args: (Node | string)[]) => (Node | string)[],
  ): T =>
    ((...nodes: (Node | string)[]) => {
      const unwrappedNodes = unwrapNodes(nodes);
      const originalPositions = new Map<Node, { parent: Node | null; nextSibling: Node | null }>();
      const fragmentChildren: Node[] = [];

      for (const node of unwrappedNodes) {
        if (typeof node !== "string") {
          if (node instanceof DocumentFragment) {
            fragmentChildren.push(...Array.from(node.childNodes));
          } else if (node.parentNode) {
            originalPositions.set(node, captureNodePosition(node));
          }
        }
      }

      method(...unwrappedNodes);

      const nodesToRemove = getInsertedNodes
        ? getInsertedNodes(unwrappedNodes)
        : [...unwrappedNodes, ...fragmentChildren];

      record(() => {
        for (const node of nodesToRemove) {
          if (typeof node !== "string") {
            node.parentNode?.removeChild(node);
          }
        }
        for (const [node, position] of originalPositions) {
          restoreNodePosition(node, position);
        }
      });
    }) as T;

  const createStyleProxy = (styleTarget: CSSStyleDeclaration) =>
    new Proxy(styleTarget, {
      get(target, prop) {
        if (prop === "setProperty") {
          return (
            propertyName: string,
            value: string,
            priority?: string,
          ) => {
            const originalValue = target.getPropertyValue(propertyName);
            const originalPriority = target.getPropertyPriority(propertyName);
            target.setProperty(propertyName, value, priority);
            record(() =>
              target.setProperty(propertyName, originalValue, originalPriority),
            );
          };
        }
        if (prop === "removeProperty") {
          return (propertyName: string) => {
            const originalValue = target.getPropertyValue(propertyName);
            const originalPriority = target.getPropertyPriority(propertyName);
            const result = target.removeProperty(propertyName);
            if (originalValue) {
              record(() =>
                target.setProperty(
                  propertyName,
                  originalValue,
                  originalPriority,
                ),
              );
            }
            return result;
          };
        }
        const value = Reflect.get(target, prop);
        return typeof value === "function" ? value.bind(target) : value;
      },
      set(target, prop, value) {
        if (typeof prop === "string") {
          const original =
            target.getPropertyValue(prop) ||
            (target as unknown as Record<string, string>)[prop] ||
            "";
          record(() => {
            (target as unknown as Record<string, string>)[prop] = original;
          });
        }
        return Reflect.set(target, prop, value);
      },
    });

  const createDOMTokenListProxy = (tokenListTarget: DOMTokenList) =>
    new Proxy(tokenListTarget, {
      get(target, prop) {
        if (prop === "add")
          return (...tokens: string[]) => {
            const toUndo = tokens.filter(
              (tokenToAdd) => !target.contains(tokenToAdd),
            );
            record(() => target.remove(...toUndo));
            return target.add(...tokens);
          };
        if (prop === "remove")
          return (...tokens: string[]) => {
            const toRestore = tokens.filter((tokenToRemove) =>
              target.contains(tokenToRemove),
            );
            record(() => target.add(...toRestore));
            return target.remove(...tokens);
          };
        if (prop === "toggle")
          return (token: string, force?: boolean) => {
            const hadToken = target.contains(token);
            const result = target.toggle(token, force);
            record(() =>
              hadToken ? target.add(token) : target.remove(token),
            );
            return result;
          };
        if (prop === "replace")
          return (oldToken: string, newToken: string) => {
            const hadOldToken = target.contains(oldToken);
            const result = target.replace(oldToken, newToken);
            if (hadOldToken)
              record(() => {
                target.remove(newToken);
                target.add(oldToken);
              });
            return result;
          };
        if (prop === "value") {
          return target.value;
        }
        const value = Reflect.get(target, prop);
        return typeof value === "function" ? value.bind(target) : value;
      },
      set(target, prop, value) {
        if (prop === "value") {
          const original = target.value;
          record(() => {
            (target as DOMTokenList & { value: string }).value = original;
          });
        }
        return Reflect.set(target, prop, value);
      },
    });

  const createClassListProxy = createDOMTokenListProxy;

  const createDatasetProxy = (datasetTarget: DOMStringMap) =>
    new Proxy(datasetTarget, {
      set(target, prop, value) {
        if (typeof prop === "string") {
          const original = target[prop];
          const hadProperty = prop in target;
          record(() =>
            hadProperty ? (target[prop] = original!) : delete target[prop],
          );
        }
        return Reflect.set(target, prop, value);
      },
      deleteProperty(target, prop) {
        if (typeof prop === "string" && prop in target) {
          const original = target[prop];
          record(() => {
            target[prop] = original!;
          });
        }
        return Reflect.deleteProperty(target, prop);
      },
    });

  const createNamedNodeMapProxy = (attributes: NamedNodeMap) =>
    new Proxy(attributes, {
      get(target, prop) {
        if (typeof prop === "string" && !isNaN(Number(prop))) {
          const attr = target[Number(prop)];
          return attr ? createAttrProxy(attr) : undefined;
        }
        if (prop === "item") {
          return (index: number) => {
            const attr = target.item(index);
            return attr ? createAttrProxy(attr) : null;
          };
        }
        if (prop === "getNamedItem") {
          return (name: string) => {
            const attr = target.getNamedItem(name);
            return attr ? createAttrProxy(attr) : null;
          };
        }
        if (prop === "getNamedItemNS") {
          return (namespace: string | null, localName: string) => {
            const attr = target.getNamedItemNS(namespace, localName);
            return attr ? createAttrProxy(attr) : null;
          };
        }
        if (prop === "setNamedItem") {
          return (attr: Attr) => {
            const existingAttr = target.getNamedItem(attr.name);
            const originalValue = existingAttr?.value;
            const result = target.setNamedItem(attr);
            record(() => {
              if (existingAttr && originalValue !== undefined) {
                existingAttr.value = originalValue;
                target.setNamedItem(existingAttr);
              } else {
                target.removeNamedItem(attr.name);
              }
            });
            return result;
          };
        }
        if (prop === "setNamedItemNS") {
          return (attr: Attr) => {
            const existingAttr = target.getNamedItemNS(
              attr.namespaceURI,
              attr.localName,
            );
            const originalValue = existingAttr?.value;
            const result = target.setNamedItemNS(attr);
            record(() => {
              if (existingAttr && originalValue !== undefined) {
                existingAttr.value = originalValue;
                target.setNamedItemNS(existingAttr);
              } else if (attr.namespaceURI) {
                target.removeNamedItemNS(attr.namespaceURI, attr.localName);
              } else {
                target.removeNamedItem(attr.name);
              }
            });
            return result;
          };
        }
        if (prop === "removeNamedItem") {
          return (name: string) => {
            const existingAttr = target.getNamedItem(name);
            if (existingAttr) {
              const originalValue = existingAttr.value;
              const result = target.removeNamedItem(name);
              record(() => {
                const newAttr = document.createAttribute(name);
                newAttr.value = originalValue;
                target.setNamedItem(newAttr);
              });
              return result;
            }
            return target.removeNamedItem(name);
          };
        }
        if (prop === "removeNamedItemNS") {
          return (namespace: string | null, localName: string) => {
            const existingAttr = target.getNamedItemNS(namespace, localName);
            if (existingAttr) {
              const originalValue = existingAttr.value;
              const originalName = existingAttr.name;
              const result = target.removeNamedItemNS(namespace, localName);
              record(() => {
                const newAttr = namespace
                  ? document.createAttributeNS(namespace, originalName)
                  : document.createAttribute(localName);
                newAttr.value = originalValue;
                if (namespace) {
                  target.setNamedItemNS(newAttr);
                } else {
                  target.setNamedItem(newAttr);
                }
              });
              return result;
            }
            return target.removeNamedItemNS(namespace, localName);
          };
        }
        if (prop === Symbol.iterator) {
          return function* () {
            for (let attrIndex = 0; attrIndex < target.length; attrIndex++) {
              yield createAttrProxy(target[attrIndex]);
            }
          };
        }
        const value = Reflect.get(target, prop);
        return typeof value === "function" ? value.bind(target) : value;
      },
    });

  const createAttrProxy = (attr: Attr) =>
    new Proxy(attr, {
      get(target, prop) {
        const value = Reflect.get(target, prop);
        return typeof value === "function" ? value.bind(target) : value;
      },
      set(target, prop, value) {
        if (prop === "value") {
          const original = target.value;
          record(() => {
            target.value = original;
          });
        }
        return Reflect.set(target, prop, value);
      },
    });

  const createStyleMapProxy = (styleMap: StylePropertyMap) =>
    new Proxy(styleMap, {
      get(target, prop) {
        if (prop === "set") {
          return (property: string, ...values: (CSSStyleValue | string)[]) => {
            const original = target.get(property);
            target.set(property, ...values);
            record(() => {
              if (original) {
                target.set(property, original);
              } else {
                target.delete(property);
              }
            });
          };
        }
        if (prop === "delete") {
          return (property: string) => {
            const original = target.get(property);
            target.delete(property);
            if (original) {
              record(() => target.set(property, original));
            }
          };
        }
        if (prop === "append") {
          return (property: string, ...values: (CSSStyleValue | string)[]) => {
            const originalAll = target.getAll(property);
            target.append(property, ...values);
            record(() => {
              target.delete(property);
              for (const originalValue of originalAll) {
                target.append(property, originalValue);
              }
            });
          };
        }
        if (prop === "clear") {
          return () => {
            const entries: [string, CSSStyleValue[]][] = [];
            target.forEach((value, property) => {
              entries.push([property, target.getAll(property)]);
            });
            target.clear();
            record(() => {
              for (const [property, values] of entries) {
                for (const value of values) {
                  target.append(property, value);
                }
              }
            });
          };
        }
        if (prop === Symbol.iterator) {
          return target[Symbol.iterator].bind(target);
        }
        const value = Reflect.get(target, prop);
        return typeof value === "function" ? value.bind(target) : value;
      },
    });

  const createNodeListProxy = (nodeList: NodeList) =>
    new Proxy(nodeList, {
      get(target, prop) {
        if (typeof prop === "string" && !isNaN(Number(prop))) {
          return createElementProxy(target[Number(prop)] ?? null);
        }
        if (prop === "item") {
          return (index: number) => createElementProxy(target.item(index));
        }
        if (prop === Symbol.iterator) {
          return function* () {
            for (let nodeIndex = 0; nodeIndex < target.length; nodeIndex++) {
              yield createElementProxy(target[nodeIndex]);
            }
          };
        }
        if (prop === "forEach") {
          return (
            callback: (node: Node, index: number, list: NodeList) => void,
            thisArg?: unknown,
          ) => {
            target.forEach((node, index, list) => {
              callback.call(
                thisArg,
                createElementProxy(node) as Node,
                index,
                list,
              );
            });
          };
        }
        if (prop === "entries") {
          return function* () {
            for (let nodeIndex = 0; nodeIndex < target.length; nodeIndex++) {
              yield [nodeIndex, createElementProxy(target[nodeIndex])];
            }
          };
        }
        if (prop === "keys") {
          return target.keys.bind(target);
        }
        if (prop === "values") {
          return function* () {
            for (let nodeIndex = 0; nodeIndex < target.length; nodeIndex++) {
              yield createElementProxy(target[nodeIndex]);
            }
          };
        }
        const value = Reflect.get(target, prop);
        return typeof value === "function" ? value.bind(target) : value;
      },
    });

  const createCollectionProxy = (
    collection: HTMLCollection | NodeListOf<ChildNode> | null | undefined,
  ): (HTMLCollection | NodeListOf<ChildNode>) | null => {
    if (!collection) return null;

    return new Proxy(collection, {
      get(collectionTarget, collectionProp) {
        if (
          typeof collectionProp === "string" &&
          !isNaN(Number(collectionProp))
        ) {
          return createElementProxy(
            collectionTarget[Number(collectionProp)] ?? null,
          );
        }
        if (collectionProp === "item") {
          return (index: number) =>
            createElementProxy(collectionTarget.item(index));
        }
        if (
          collectionProp === "namedItem" &&
          "namedItem" in collectionTarget
        ) {
          return (name: string) =>
            createElementProxy(
              (collectionTarget as HTMLCollection).namedItem(name),
            );
        }
        if (collectionProp === Symbol.iterator) {
          return function* () {
            for (
              let itemIndex = 0;
              itemIndex < collectionTarget.length;
              itemIndex++
            ) {
              yield createElementProxy(collectionTarget[itemIndex]);
            }
          };
        }
        const collectionValue = Reflect.get(collectionTarget, collectionProp);
        return typeof collectionValue === "function"
          ? collectionValue.bind(collectionTarget)
          : collectionValue;
      },
    });
  };

  const createOptionsCollectionProxy = (
    options: HTMLOptionsCollection,
    selectElement: HTMLSelectElement,
  ) =>
    new Proxy(options, {
      get(target, prop) {
        if (typeof prop === "string" && !isNaN(Number(prop))) {
          return createElementProxy(target[Number(prop)] ?? null);
        }
        if (prop === "item") {
          return (index: number) => createElementProxy(target.item(index));
        }
        if (prop === "namedItem") {
          return (name: string) => createElementProxy(target.namedItem(name));
        }
        if (prop === "add") {
          return (
            option: HTMLOptionElement | HTMLOptGroupElement,
            before?: HTMLElement | number | null,
          ) => {
            const actualOption = unwrapProxy(option) as HTMLOptionElement | HTMLOptGroupElement;
            target.add(actualOption, before as HTMLElement | number);
            record(() => actualOption.parentNode?.removeChild(actualOption));
          };
        }
        if (prop === "remove") {
          return (index: number) => {
            const option = target[index];
            if (option) {
              const optionHtml = option.outerHTML;
              const optionIndex = index;
              target.remove(index);
              record(() => {
                const tempDiv = document.createElement("div");
                tempDiv.innerHTML = optionHtml;
                const restoredOption = tempDiv.firstChild as HTMLOptionElement;
                if (restoredOption) {
                  if (optionIndex >= target.length) {
                    selectElement.appendChild(restoredOption);
                  } else {
                    selectElement.insertBefore(restoredOption, target[optionIndex]);
                  }
                }
              });
            }
          };
        }
        if (prop === "selectedIndex") {
          return target.selectedIndex;
        }
        if (prop === "length") {
          return target.length;
        }
        if (prop === Symbol.iterator) {
          return function* () {
            for (let optionIndex = 0; optionIndex < target.length; optionIndex++) {
              yield createElementProxy(target[optionIndex]);
            }
          };
        }
        const value = Reflect.get(target, prop);
        return typeof value === "function" ? value.bind(target) : value;
      },
      set(target, prop, value) {
        if (prop === "selectedIndex") {
          const original = target.selectedIndex;
          record(() => {
            target.selectedIndex = original;
          });
        }
        if (prop === "length") {
          const originalLength = target.length;
          const originalOptions: string[] = [];
          for (let optionIndex = 0; optionIndex < target.length; optionIndex++) {
            originalOptions.push(target[optionIndex].outerHTML);
          }
          record(() => {
            while (target.length > 0) {
              target.remove(0);
            }
            for (const optionHtml of originalOptions) {
              const tempDiv = document.createElement("div");
              tempDiv.innerHTML = optionHtml;
              const option = tempDiv.firstChild as HTMLOptionElement;
              if (option) {
                selectElement.appendChild(option);
              }
            }
          });
        }
        return Reflect.set(target, prop, value);
      },
    });

  const getMethodHandler = (
    target: HTMLElement | CharacterData | ShadowRoot,
    prop: string,
  ) => {
    switch (prop) {
      case "setAttribute":
        return (name: string, value: string) => {
          const htmlTarget = target as HTMLElement;
          const hadAttribute = htmlTarget.hasAttribute(name);
          const original = htmlTarget.getAttribute(name);
          record(() =>
            hadAttribute
              ? htmlTarget.setAttribute(name, original!)
              : htmlTarget.removeAttribute(name),
          );
          return htmlTarget.setAttribute(name, value);
        };
      case "removeAttribute":
        return (name: string) => {
          const htmlTarget = target as HTMLElement;
          if (htmlTarget.hasAttribute(name)) {
            const original = htmlTarget.getAttribute(name)!;
            record(() => htmlTarget.setAttribute(name, original));
          }
          return htmlTarget.removeAttribute(name);
        };
      case "toggleAttribute":
        return (name: string, force?: boolean) => {
          const htmlTarget = target as HTMLElement;
          const hadAttribute = htmlTarget.hasAttribute(name);
          const originalValue = hadAttribute
            ? htmlTarget.getAttribute(name)!
            : null;
          const result = htmlTarget.toggleAttribute(name, force);
          record(() => {
            if (hadAttribute) {
              htmlTarget.setAttribute(name, originalValue!);
            } else {
              htmlTarget.removeAttribute(name);
            }
          });
          return result;
        };
      case "setAttributeNS":
        return (namespace: string | null, name: string, value: string) => {
          const htmlTarget = target as HTMLElement;
          const localName = name.includes(":") ? name.split(":")[1] : name;
          const hadAttribute = htmlTarget.hasAttributeNS(namespace, localName);
          const original = htmlTarget.getAttributeNS(namespace, localName);
          record(() =>
            hadAttribute
              ? htmlTarget.setAttributeNS(namespace, name, original!)
              : htmlTarget.removeAttributeNS(namespace, localName),
          );
          return htmlTarget.setAttributeNS(namespace, name, value);
        };
      case "removeAttributeNS":
        return (namespace: string | null, localName: string) => {
          const htmlTarget = target as HTMLElement;
          if (htmlTarget.hasAttributeNS(namespace, localName)) {
            const original = htmlTarget.getAttributeNS(namespace, localName)!;
            const qualifiedName =
              htmlTarget.getAttributeNodeNS(namespace, localName)?.name ??
              localName;
            record(() =>
              htmlTarget.setAttributeNS(namespace, qualifiedName, original),
            );
          }
          return htmlTarget.removeAttributeNS(namespace, localName);
        };
      case "setAttributeNode":
        return (attr: Attr) => {
          const htmlTarget = target as HTMLElement;
          const existingAttr = htmlTarget.getAttributeNode(attr.name);
          const originalValue = existingAttr?.value;
          const result = htmlTarget.setAttributeNode(attr);
          record(() => {
            if (existingAttr && originalValue !== undefined) {
              htmlTarget.setAttributeNode(existingAttr);
            } else {
              htmlTarget.removeAttribute(attr.name);
            }
          });
          return result;
        };
      case "removeAttributeNode":
        return (attr: Attr) => {
          const htmlTarget = target as HTMLElement;
          const originalValue = attr.value;
          const originalName = attr.name;
          const result = htmlTarget.removeAttributeNode(attr);
          record(() => {
            const newAttr = document.createAttribute(originalName);
            newAttr.value = originalValue;
            htmlTarget.setAttributeNode(newAttr);
          });
          return result;
        };
      case "appendChild":
        return (child: Node) => {
          const actualChild = unwrapProxy(child);
          const originalPosition = actualChild.parentNode ? captureNodePosition(actualChild) : null;
          const fragmentChildren = getFragmentChildren(actualChild);
          const result = (target as HTMLElement).appendChild(actualChild);
          record(() => {
            if (fragmentChildren.length > 0) {
              for (const fragmentChild of fragmentChildren) {
                fragmentChild.parentNode?.removeChild(fragmentChild);
              }
            } else {
              actualChild.parentNode?.removeChild(actualChild);
            }
            if (originalPosition) {
              restoreNodePosition(actualChild, originalPosition);
            }
          });
          return createElementProxy(result);
        };
      case "removeChild":
        return (child: Node) => {
          const actualChild = unwrapProxy(child);
          const nextSibling = actualChild.nextSibling;
          const result = (target as HTMLElement).removeChild(actualChild);
          record(() =>
            (target as HTMLElement).insertBefore(actualChild, nextSibling),
          );
          return createElementProxy(result);
        };
      case "insertBefore":
        return (node: Node, referenceNode: Node | null) => {
          const actualNode = unwrapProxy(node);
          const actualRef = referenceNode ? unwrapProxy(referenceNode) : null;
          const originalPosition = actualNode.parentNode ? captureNodePosition(actualNode) : null;
          const fragmentChildren = getFragmentChildren(actualNode);
          const result = (target as HTMLElement).insertBefore(
            actualNode,
            actualRef,
          );
          record(() => {
            if (fragmentChildren.length > 0) {
              for (const fragmentChild of fragmentChildren) {
                fragmentChild.parentNode?.removeChild(fragmentChild);
              }
            } else {
              actualNode.parentNode?.removeChild(actualNode);
            }
            if (originalPosition) {
              restoreNodePosition(actualNode, originalPosition);
            }
          });
          return createElementProxy(result);
        };
      case "replaceChild":
        return (newChild: Node, oldChild: Node) => {
          const actualNewChild = unwrapProxy(newChild);
          const actualOldChild = unwrapProxy(oldChild);
          const nextSibling = actualOldChild.nextSibling;
          const newChildOriginalPosition = actualNewChild.parentNode ? captureNodePosition(actualNewChild) : null;
          const fragmentChildren = getFragmentChildren(actualNewChild);
          const result = (target as HTMLElement).replaceChild(
            actualNewChild,
            actualOldChild,
          );
          record(() => {
            if (fragmentChildren.length > 0) {
              const firstFragChild = fragmentChildren[0];
              if (firstFragChild?.parentNode) {
                firstFragChild.parentNode.replaceChild(actualOldChild, firstFragChild);
              }
              for (let childIndex = 1; childIndex < fragmentChildren.length; childIndex++) {
                fragmentChildren[childIndex].parentNode?.removeChild(fragmentChildren[childIndex]);
              }
            } else {
              (target as HTMLElement).replaceChild(actualOldChild, actualNewChild);
            }
            if (nextSibling && actualOldChild.nextSibling !== nextSibling) {
              (target as HTMLElement).insertBefore(actualOldChild, nextSibling);
            }
            if (newChildOriginalPosition) {
              restoreNodePosition(actualNewChild, newChildOriginalPosition);
            }
          });
          return createElementProxy(result);
        };
      case "remove":
        return () => {
          const parentNode = target.parentNode;
          const nextSibling = target.nextSibling;
          (target as HTMLElement).remove();
          record(() => parentNode?.insertBefore(target, nextSibling));
        };
      case "append":
        return wrapNodeInsertion(
          (target as HTMLElement).append.bind(target as HTMLElement),
        );
      case "prepend":
        return wrapNodeInsertion(
          (target as HTMLElement).prepend.bind(target as HTMLElement),
        );
      case "after":
        return wrapNodeInsertion(
          (target as HTMLElement).after.bind(target as HTMLElement),
        );
      case "before":
        return wrapNodeInsertion(
          (target as HTMLElement).before.bind(target as HTMLElement),
        );
      case "replaceWith":
        return (...nodes: (Node | string)[]) => {
          const unwrappedNodes = unwrapNodes(nodes);
          const parentNode = target.parentNode;
          const nextSibling = target.nextSibling;
          const originalPositions = new Map<Node, { parent: Node | null; nextSibling: Node | null }>();
          const allFragmentChildren: Node[] = [];

          for (const node of unwrappedNodes) {
            if (typeof node !== "string") {
              if (node instanceof DocumentFragment) {
                allFragmentChildren.push(...Array.from(node.childNodes));
              } else if (node.parentNode) {
                originalPositions.set(node, captureNodePosition(node));
              }
            }
          }

          (target as HTMLElement).replaceWith(...unwrappedNodes);

          record(() => {
            const nodesToRemove = [...unwrappedNodes.filter((n) => typeof n !== "string"), ...allFragmentChildren];
            const firstNode = nodesToRemove[0] as Node | undefined;
            if (parentNode) {
              parentNode.insertBefore(target, firstNode ?? nextSibling);
              for (const node of nodesToRemove) {
                if (node !== target) {
                  (node as Node).parentNode?.removeChild(node as Node);
                }
              }
            }
            for (const [node, position] of originalPositions) {
              restoreNodePosition(node, position);
            }
          });
        };
      case "replaceChildren":
        return (...nodes: (Node | string)[]) => {
          const htmlTarget = target as HTMLElement;
          const unwrappedNodes = unwrapNodes(nodes);
          const originalChildren = Array.from(htmlTarget.childNodes);
          const originalPositions = new Map<Node, { parent: Node | null; nextSibling: Node | null }>();

          for (const node of unwrappedNodes) {
            if (typeof node !== "string" && node.parentNode && node.parentNode !== htmlTarget) {
              originalPositions.set(node, captureNodePosition(node));
            }
          }

          htmlTarget.replaceChildren(...unwrappedNodes);

          record(() => {
            htmlTarget.replaceChildren(...originalChildren);
            for (const [node, position] of originalPositions) {
              restoreNodePosition(node, position);
            }
          });
        };
      case "insertAdjacentHTML":
        return (position: InsertPosition, html: string) => {
          const htmlTarget = target as HTMLElement;
          const childrenBefore = Array.from(htmlTarget.childNodes);
          const siblingsBefore = htmlTarget.parentNode
            ? Array.from(htmlTarget.parentNode.childNodes)
            : [];
          htmlTarget.insertAdjacentHTML(position, html);
          const addedChildren = Array.from(htmlTarget.childNodes).filter(
            (node) => !childrenBefore.includes(node),
          );
          const addedSiblings = htmlTarget.parentNode
            ? Array.from(htmlTarget.parentNode.childNodes).filter(
                (node) => !siblingsBefore.includes(node),
              )
            : [];
          record(() =>
            [...addedChildren, ...addedSiblings].forEach((node) =>
              node.parentNode?.removeChild(node),
            ),
          );
        };
      case "insertAdjacentElement":
        return (position: InsertPosition, insertedElement: Element) => {
          const htmlTarget = target as HTMLElement;
          const actualElement = unwrapProxy(insertedElement) as Element;
          const originalPosition = actualElement.parentNode ? captureNodePosition(actualElement) : null;
          const result = htmlTarget.insertAdjacentElement(
            position,
            actualElement,
          );
          if (result) {
            record(() => {
              result.parentNode?.removeChild(result);
              if (originalPosition) {
                restoreNodePosition(actualElement, originalPosition);
              }
            });
          }
          return result ? createElementProxy(result) : null;
        };
      case "insertAdjacentText":
        return (position: InsertPosition, text: string) => {
          const htmlTarget = target as HTMLElement;
          const childrenBefore = Array.from(htmlTarget.childNodes);
          const siblingsBefore = htmlTarget.parentNode
            ? Array.from(htmlTarget.parentNode.childNodes)
            : [];
          htmlTarget.insertAdjacentText(position, text);
          const addedChildren = Array.from(htmlTarget.childNodes).filter(
            (node) => !childrenBefore.includes(node),
          );
          const addedSiblings = htmlTarget.parentNode
            ? Array.from(htmlTarget.parentNode.childNodes).filter(
                (node) => !siblingsBefore.includes(node),
              )
            : [];
          record(() =>
            [...addedChildren, ...addedSiblings].forEach((node) =>
              node.parentNode?.removeChild(node),
            ),
          );
        };
      case "setHTML":
        return (html: string, options?: unknown) => {
          const htmlTarget = target as HTMLElement;
          if ("setHTML" in htmlTarget) {
            const originalInnerHTML = htmlTarget.innerHTML;
            (htmlTarget as HTMLElement & { setHTML: (html: string, options?: unknown) => void }).setHTML(html, options);
            record(() => {
              htmlTarget.innerHTML = originalInnerHTML;
            });
          }
        };
      case "normalize":
        return () => {
          const htmlTarget = target as HTMLElement;
          const textNodeData: { parent: Node; data: string; nextNonTextSibling: Node | null }[] = [];
          const walker = document.createTreeWalker(
            htmlTarget,
            NodeFilter.SHOW_TEXT,
          );
          let currentTextNode = walker.nextNode();
          while (currentTextNode) {
            let nextNonTextSibling = currentTextNode.nextSibling;
            while (nextNonTextSibling && nextNonTextSibling.nodeType === Node.TEXT_NODE) {
              nextNonTextSibling = nextNonTextSibling.nextSibling;
            }
            textNodeData.push({
              parent: currentTextNode.parentNode!,
              data: (currentTextNode as Text).data,
              nextNonTextSibling,
            });
            currentTextNode = walker.nextNode();
          }
          htmlTarget.normalize();
          const mergedTextNodes: Text[] = [];
          const mergedWalker = document.createTreeWalker(
            htmlTarget,
            NodeFilter.SHOW_TEXT,
          );
          let mergedNode = mergedWalker.nextNode();
          while (mergedNode) {
            mergedTextNodes.push(mergedNode as Text);
            mergedNode = mergedWalker.nextNode();
          }
          record(() => {
            for (const mergedTextNode of mergedTextNodes) {
              mergedTextNode.parentNode?.removeChild(mergedTextNode);
            }
            let lastInserted: Node | null = null;
            let lastParent: Node | null = null;
            let lastNextNonTextSibling: Node | null | undefined = undefined;
            for (const { parent, data, nextNonTextSibling } of textNodeData) {
              const newTextNode = document.createTextNode(data);
              if (parent === lastParent && nextNonTextSibling === lastNextNonTextSibling && lastInserted) {
                parent.insertBefore(newTextNode, lastInserted.nextSibling);
              } else {
                parent.insertBefore(newTextNode, nextNonTextSibling);
              }
              lastInserted = newTextNode;
              lastParent = parent;
              lastNextNonTextSibling = nextNonTextSibling;
            }
          });
        };
      case "cloneNode":
        return (deep?: boolean) => {
          const clone = (target as HTMLElement).cloneNode(deep);
          return createElementProxy(clone);
        };
      case "addEventListener":
        return (
          type: string,
          listener: EventListenerOrEventListenerObject,
          options?: boolean | AddEventListenerOptions,
        ) => {
          (target as HTMLElement).addEventListener(type, listener, options);
          addedEventListeners.push({ target, type, listener, options });
          record(() =>
            (target as HTMLElement).removeEventListener(type, listener, options),
          );
        };
      case "removeEventListener":
        return (
          type: string,
          listener: EventListenerOrEventListenerObject,
          options?: boolean | EventListenerOptions,
        ) => {
          (target as HTMLElement).removeEventListener(type, listener, options);
        };
      case "attachShadow":
        return (init: ShadowRootInit) => {
          const htmlTarget = target as HTMLElement;
          const shadowRoot = htmlTarget.attachShadow(init);
          record(() => {
            shadowRoot.innerHTML = "";
          });
          return createElementProxy(shadowRoot as unknown as Node);
        };
      case "animate":
        return (
          keyframes: Keyframe[] | PropertyIndexedKeyframes | null,
          options?: number | KeyframeAnimationOptions,
        ) => {
          const htmlTarget = target as HTMLElement;
          const animation = htmlTarget.animate(keyframes, options);
          record(() => animation.cancel());
          return animation;
        };
      case "getAnimations":
        return (options?: GetAnimationsOptions) => {
          const htmlTarget = target as HTMLElement;
          return htmlTarget.getAnimations(options);
        };
      case "showModal":
        return () => {
          const dialogTarget = target as HTMLDialogElement;
          if ("showModal" in dialogTarget) {
            const wasOpen = dialogTarget.open;
            dialogTarget.showModal();
            if (!wasOpen) {
              record(() => dialogTarget.close());
            }
          }
        };
      case "show":
        return () => {
          const dialogTarget = target as HTMLDialogElement;
          if ("show" in dialogTarget) {
            const wasOpen = dialogTarget.open;
            dialogTarget.show();
            if (!wasOpen) {
              record(() => dialogTarget.close());
            }
          }
        };
      case "close":
        return (returnValue?: string) => {
          const dialogTarget = target as HTMLDialogElement;
          if ("close" in dialogTarget) {
            const wasOpen = dialogTarget.open;
            const wasModal = dialogTarget.matches(":modal");
            const originalReturnValue = dialogTarget.returnValue;
            dialogTarget.close(returnValue);
            if (wasOpen) {
              record(() => {
                dialogTarget.returnValue = originalReturnValue;
                if (wasModal) {
                  dialogTarget.showModal();
                } else {
                  dialogTarget.show();
                }
              });
            }
          }
        };
      case "showPopover":
        return () => {
          const htmlTarget = target as HTMLElement;
          if ("showPopover" in htmlTarget && "hidePopover" in htmlTarget) {
            const popoverTarget = htmlTarget as HTMLElement & { showPopover: () => void; hidePopover: () => void };
            const wasShowing = htmlTarget.matches(":popover-open");
            popoverTarget.showPopover();
            if (!wasShowing) {
              record(() => popoverTarget.hidePopover());
            }
          }
        };
      case "hidePopover":
        return () => {
          const htmlTarget = target as HTMLElement;
          if ("hidePopover" in htmlTarget && "showPopover" in htmlTarget) {
            const popoverTarget = htmlTarget as HTMLElement & { showPopover: () => void; hidePopover: () => void };
            const wasShowing = htmlTarget.matches(":popover-open");
            popoverTarget.hidePopover();
            if (wasShowing) {
              record(() => popoverTarget.showPopover());
            }
          }
        };
      case "togglePopover":
        return (force?: boolean) => {
          const htmlTarget = target as HTMLElement;
          if ("togglePopover" in htmlTarget) {
            const popoverTarget = htmlTarget as HTMLElement & { togglePopover: (force?: boolean) => boolean };
            const wasShowing = htmlTarget.matches(":popover-open");
            const result = popoverTarget.togglePopover(force);
            record(() => {
              popoverTarget.togglePopover(wasShowing);
            });
            return result;
          }
          return false;
        };
      case "scrollTo":
        return (
          xOrOptions?: number | ScrollToOptions,
          maybeY?: number,
        ) => {
          const htmlTarget = target as HTMLElement;
          const originalScrollLeft = htmlTarget.scrollLeft;
          const originalScrollTop = htmlTarget.scrollTop;
          if (typeof xOrOptions === "number") {
            htmlTarget.scrollTo(xOrOptions, maybeY!);
          } else {
            htmlTarget.scrollTo(xOrOptions);
          }
          record(() => htmlTarget.scrollTo(originalScrollLeft, originalScrollTop));
        };
      case "scrollBy":
        return (
          xOrOptions?: number | ScrollToOptions,
          maybeY?: number,
        ) => {
          const htmlTarget = target as HTMLElement;
          const originalScrollLeft = htmlTarget.scrollLeft;
          const originalScrollTop = htmlTarget.scrollTop;
          if (typeof xOrOptions === "number") {
            htmlTarget.scrollBy(xOrOptions, maybeY!);
          } else {
            htmlTarget.scrollBy(xOrOptions);
          }
          record(() => htmlTarget.scrollTo(originalScrollLeft, originalScrollTop));
        };
      case "scrollIntoView":
        return (arg?: boolean | ScrollIntoViewOptions) => {
          const htmlTarget = target as HTMLElement;
          const scrollableParent = findScrollableParent(htmlTarget);
          const originalScrollLeft = scrollableParent?.scrollLeft ?? 0;
          const originalScrollTop = scrollableParent?.scrollTop ?? 0;
          htmlTarget.scrollIntoView(arg);
          if (scrollableParent) {
            record(() =>
              scrollableParent.scrollTo(originalScrollLeft, originalScrollTop),
            );
          }
        };
      case "setSelectionRange":
        return (
          start: number | null,
          end: number | null,
          direction?: "forward" | "backward" | "none",
        ) => {
          const inputTarget = target as HTMLInputElement | HTMLTextAreaElement;
          if ("setSelectionRange" in inputTarget) {
            const originalStart = inputTarget.selectionStart;
            const originalEnd = inputTarget.selectionEnd;
            const originalDirection = inputTarget.selectionDirection;
            inputTarget.setSelectionRange(start, end, direction);
            record(() =>
              inputTarget.setSelectionRange(
                originalStart,
                originalEnd,
                originalDirection ?? undefined,
              ),
            );
          }
        };
      case "setRangeText":
        return (
          replacement: string,
          start?: number,
          end?: number,
          selectMode?: SelectionMode,
        ) => {
          const inputTarget = target as HTMLInputElement | HTMLTextAreaElement;
          if ("setRangeText" in inputTarget) {
            const originalValue = inputTarget.value;
            const originalStart = inputTarget.selectionStart;
            const originalEnd = inputTarget.selectionEnd;
            if (start !== undefined && end !== undefined) {
              inputTarget.setRangeText(replacement, start, end, selectMode);
            } else {
              inputTarget.setRangeText(replacement);
            }
            record(() => {
              inputTarget.value = originalValue;
              inputTarget.setSelectionRange(originalStart, originalEnd);
            });
          }
        };
      case "select":
        return () => {
          const inputTarget = target as HTMLInputElement | HTMLTextAreaElement;
          if ("select" in inputTarget) {
            inputTarget.select();
          }
        };
      case "splitText":
        return (offset: number) => {
          const textTarget = target as Text;
          if ("splitText" in textTarget) {
            const originalData = textTarget.data;
            const newTextNode = textTarget.splitText(offset);
            record(() => {
              textTarget.data = originalData;
              newTextNode.parentNode?.removeChild(newTextNode);
            });
            return createElementProxy(newTextNode);
          }
          return null;
        };
      case "appendData":
        return (data: string) => {
          const charTarget = target as CharacterData;
          if ("appendData" in charTarget) {
            const originalLength = charTarget.length;
            charTarget.appendData(data);
            record(() => charTarget.deleteData(originalLength, data.length));
          }
        };
      case "deleteData":
        return (offset: number, count: number) => {
          const charTarget = target as CharacterData;
          if ("deleteData" in charTarget) {
            const deletedData = charTarget.substringData(offset, count);
            charTarget.deleteData(offset, count);
            record(() => charTarget.insertData(offset, deletedData));
          }
        };
      case "insertData":
        return (offset: number, data: string) => {
          const charTarget = target as CharacterData;
          if ("insertData" in charTarget) {
            charTarget.insertData(offset, data);
            record(() => charTarget.deleteData(offset, data.length));
          }
        };
      case "replaceData":
        return (offset: number, count: number, data: string) => {
          const charTarget = target as CharacterData;
          if ("replaceData" in charTarget) {
            const originalData = charTarget.substringData(offset, count);
            charTarget.replaceData(offset, count, data);
            record(() => charTarget.replaceData(offset, data.length, originalData));
          }
        };
      case "substringData":
        return (offset: number, count: number) => {
          const charTarget = target as CharacterData;
          if ("substringData" in charTarget) {
            return charTarget.substringData(offset, count);
          }
          return "";
        };
      case "focus":
        return (options?: FocusOptions) => {
          const htmlTarget = target as HTMLElement;
          const previouslyFocused = document.activeElement;
          htmlTarget.focus(options);
          record(() => {
            if (previouslyFocused && previouslyFocused !== document.body && "focus" in previouslyFocused) {
              (previouslyFocused as HTMLElement).focus();
            } else {
              htmlTarget.blur();
            }
          });
        };
      case "blur":
        return () => {
          const htmlTarget = target as HTMLElement;
          const wasFocused = document.activeElement === htmlTarget;
          htmlTarget.blur();
          if (wasFocused) {
            record(() => htmlTarget.focus());
          }
        };
      case "click":
        return () => {
          const htmlTarget = target as HTMLElement;
          htmlTarget.click();
        };
      case "reset":
        return () => {
          const formTarget = target as HTMLFormElement;
          if ("reset" in formTarget && "elements" in formTarget) {
            const formValues: Map<HTMLElement, unknown> = new Map();
            for (let elementIndex = 0; elementIndex < formTarget.elements.length; elementIndex++) {
              const formElement = formTarget.elements[elementIndex] as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
              if ("value" in formElement) {
                if (formElement instanceof HTMLInputElement && (formElement.type === "checkbox" || formElement.type === "radio")) {
                  formValues.set(formElement, formElement.checked);
                } else if (formElement instanceof HTMLSelectElement) {
                  formValues.set(formElement, formElement.selectedIndex);
                } else {
                  formValues.set(formElement, formElement.value);
                }
              }
            }
            formTarget.reset();
            record(() => {
              for (const [formElement, savedValue] of formValues) {
                if (formElement instanceof HTMLInputElement && (formElement.type === "checkbox" || formElement.type === "radio")) {
                  formElement.checked = savedValue as boolean;
                } else if (formElement instanceof HTMLSelectElement) {
                  formElement.selectedIndex = savedValue as number;
                } else if ("value" in formElement) {
                  (formElement as HTMLInputElement | HTMLTextAreaElement).value = savedValue as string;
                }
              }
            });
          }
        };
      case "submit":
        return () => {
          const formTarget = target as HTMLFormElement;
          if ("submit" in formTarget) {
            formTarget.submit();
          }
        };
      case "requestSubmit":
        return (submitter?: HTMLElement | null) => {
          const formTarget = target as HTMLFormElement;
          if ("requestSubmit" in formTarget) {
            formTarget.requestSubmit(submitter);
          }
        };
      case "checkValidity":
        return () => {
          const formTarget = target as HTMLFormElement | HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
          if ("checkValidity" in formTarget) {
            return formTarget.checkValidity();
          }
          return true;
        };
      case "reportValidity":
        return () => {
          const formTarget = target as HTMLFormElement | HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
          if ("reportValidity" in formTarget) {
            return formTarget.reportValidity();
          }
          return true;
        };
      case "setCustomValidity":
        return (message: string) => {
          const inputTarget = target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
          if ("setCustomValidity" in inputTarget) {
            const originalMessage = inputTarget.validationMessage;
            inputTarget.setCustomValidity(message);
            record(() => inputTarget.setCustomValidity(originalMessage));
          }
        };
      case "insertRow":
        return (index?: number) => {
          const tableTarget = target as HTMLTableElement | HTMLTableSectionElement;
          if ("insertRow" in tableTarget) {
            const newRow = tableTarget.insertRow(index);
            record(() => newRow.parentNode?.removeChild(newRow));
            return createElementProxy(newRow);
          }
          return null;
        };
      case "deleteRow":
        return (index: number) => {
          const tableTarget = target as HTMLTableElement | HTMLTableSectionElement;
          if ("deleteRow" in tableTarget && "rows" in tableTarget) {
            const rowToDelete = tableTarget.rows[index];
            if (rowToDelete) {
              const rowHtml = rowToDelete.outerHTML;
              const actualIndex = index < 0 ? tableTarget.rows.length + index : index;
              tableTarget.deleteRow(index);
              record(() => {
                const tempTable = document.createElement("table");
                tempTable.innerHTML = rowHtml;
                const restoredRow = tempTable.rows[0];
                if (restoredRow) {
                  if (actualIndex >= tableTarget.rows.length) {
                    (tableTarget as HTMLTableSectionElement).appendChild(restoredRow);
                  } else {
                    (tableTarget as HTMLTableSectionElement).insertBefore(restoredRow, tableTarget.rows[actualIndex]);
                  }
                }
              });
            }
          }
        };
      case "insertCell":
        return (index?: number) => {
          const rowTarget = target as HTMLTableRowElement;
          if ("insertCell" in rowTarget) {
            const newCell = rowTarget.insertCell(index);
            record(() => newCell.parentNode?.removeChild(newCell));
            return createElementProxy(newCell);
          }
          return null;
        };
      case "deleteCell":
        return (index: number) => {
          const rowTarget = target as HTMLTableRowElement;
          if ("deleteCell" in rowTarget && "cells" in rowTarget) {
            const cellToDelete = rowTarget.cells[index];
            if (cellToDelete) {
              const cellHtml = cellToDelete.outerHTML;
              const actualIndex = index < 0 ? rowTarget.cells.length + index : index;
              rowTarget.deleteCell(index);
              record(() => {
                const tempRow = document.createElement("tr");
                tempRow.innerHTML = cellHtml;
                const restoredCell = tempRow.cells[0];
                if (restoredCell) {
                  if (actualIndex >= rowTarget.cells.length) {
                    rowTarget.appendChild(restoredCell);
                  } else {
                    rowTarget.insertBefore(restoredCell, rowTarget.cells[actualIndex]);
                  }
                }
              });
            }
          }
        };
      case "createTHead":
        return () => {
          const tableTarget = target as HTMLTableElement;
          if ("createTHead" in tableTarget) {
            const existingTHead = tableTarget.tHead;
            const tHead = tableTarget.createTHead();
            if (!existingTHead) {
              record(() => tableTarget.deleteTHead());
            }
            return createElementProxy(tHead);
          }
          return null;
        };
      case "deleteTHead":
        return () => {
          const tableTarget = target as HTMLTableElement;
          if ("deleteTHead" in tableTarget && tableTarget.tHead) {
            const tHeadHtml = tableTarget.tHead.outerHTML;
            tableTarget.deleteTHead();
            record(() => {
              const tempTable = document.createElement("table");
              tempTable.innerHTML = tHeadHtml;
              const restoredTHead = tempTable.tHead;
              if (restoredTHead) {
                if (tableTarget.firstChild) {
                  tableTarget.insertBefore(restoredTHead, tableTarget.firstChild);
                } else {
                  tableTarget.appendChild(restoredTHead);
                }
              }
            });
          }
        };
      case "createTFoot":
        return () => {
          const tableTarget = target as HTMLTableElement;
          if ("createTFoot" in tableTarget) {
            const existingTFoot = tableTarget.tFoot;
            const tFoot = tableTarget.createTFoot();
            if (!existingTFoot) {
              record(() => tableTarget.deleteTFoot());
            }
            return createElementProxy(tFoot);
          }
          return null;
        };
      case "deleteTFoot":
        return () => {
          const tableTarget = target as HTMLTableElement;
          if ("deleteTFoot" in tableTarget && tableTarget.tFoot) {
            const tFootHtml = tableTarget.tFoot.outerHTML;
            tableTarget.deleteTFoot();
            record(() => {
              const tempTable = document.createElement("table");
              tempTable.innerHTML = tFootHtml;
              const restoredTFoot = tempTable.tFoot;
              if (restoredTFoot) {
                tableTarget.appendChild(restoredTFoot);
              }
            });
          }
        };
      case "createTBody":
        return () => {
          const tableTarget = target as HTMLTableElement;
          if ("createTBody" in tableTarget) {
            const tBody = tableTarget.createTBody();
            record(() => tBody.parentNode?.removeChild(tBody));
            return createElementProxy(tBody);
          }
          return null;
        };
      case "createCaption":
        return () => {
          const tableTarget = target as HTMLTableElement;
          if ("createCaption" in tableTarget) {
            const existingCaption = tableTarget.caption;
            const caption = tableTarget.createCaption();
            if (!existingCaption) {
              record(() => tableTarget.deleteCaption());
            }
            return createElementProxy(caption);
          }
          return null;
        };
      case "deleteCaption":
        return () => {
          const tableTarget = target as HTMLTableElement;
          if ("deleteCaption" in tableTarget && tableTarget.caption) {
            const captionHtml = tableTarget.caption.outerHTML;
            tableTarget.deleteCaption();
            record(() => {
              const tempTable = document.createElement("table");
              tempTable.innerHTML = captionHtml;
              const restoredCaption = tempTable.caption;
              if (restoredCaption) {
                if (tableTarget.firstChild) {
                  tableTarget.insertBefore(restoredCaption, tableTarget.firstChild);
                } else {
                  tableTarget.appendChild(restoredCaption);
                }
              }
            });
          }
        };
      case "add":
        return (
          element: HTMLOptionElement | HTMLOptGroupElement,
          before?: HTMLElement | number | null,
        ) => {
          const selectTarget = target as HTMLSelectElement;
          if ("add" in selectTarget && "options" in selectTarget) {
            const actualElement = unwrapProxy(element) as HTMLOptionElement | HTMLOptGroupElement;
            selectTarget.add(actualElement, before as HTMLElement | number);
            record(() => actualElement.parentNode?.removeChild(actualElement));
          }
        };
      case "stepUp":
        return (stepIncrement?: number) => {
          const inputTarget = target as HTMLInputElement;
          if ("stepUp" in inputTarget) {
            const originalValue = inputTarget.value;
            inputTarget.stepUp(stepIncrement);
            record(() => {
              inputTarget.value = originalValue;
            });
          }
        };
      case "stepDown":
        return (stepDecrement?: number) => {
          const inputTarget = target as HTMLInputElement;
          if ("stepDown" in inputTarget) {
            const originalValue = inputTarget.value;
            inputTarget.stepDown(stepDecrement);
            record(() => {
              inputTarget.value = originalValue;
            });
          }
        };
      case "showPicker":
        return () => {
          const inputTarget = target as HTMLInputElement;
          if ("showPicker" in inputTarget) {
            inputTarget.showPicker();
          }
        };
      case "play":
        return () => {
          const mediaTarget = target as HTMLMediaElement;
          if ("play" in mediaTarget) {
            const wasPaused = mediaTarget.paused;
            const originalTime = mediaTarget.currentTime;
            const playPromise = mediaTarget.play();
            if (wasPaused) {
              record(() => {
                mediaTarget.pause();
                mediaTarget.currentTime = originalTime;
              });
            }
            return playPromise;
          }
          return Promise.resolve();
        };
      case "pause":
        return () => {
          const mediaTarget = target as HTMLMediaElement;
          if ("pause" in mediaTarget) {
            const wasPaused = mediaTarget.paused;
            const originalTime = mediaTarget.currentTime;
            mediaTarget.pause();
            if (!wasPaused) {
              record(() => {
                mediaTarget.currentTime = originalTime;
                mediaTarget.play();
              });
            }
          }
        };
      case "load":
        return () => {
          const mediaTarget = target as HTMLMediaElement;
          if ("load" in mediaTarget) {
            const originalTime = mediaTarget.currentTime;
            const originalSrc = mediaTarget.src;
            mediaTarget.load();
            record(() => {
              if (mediaTarget.src === originalSrc) {
                mediaTarget.currentTime = originalTime;
              }
            });
          }
        };
      case "fastSeek":
        return (time: number) => {
          const mediaTarget = target as HTMLMediaElement;
          if ("fastSeek" in mediaTarget) {
            const originalTime = mediaTarget.currentTime;
            mediaTarget.fastSeek(time);
            record(() => {
              mediaTarget.currentTime = originalTime;
            });
          }
        };
      case "setPointerCapture":
        return (pointerId: number) => {
          const htmlTarget = target as HTMLElement;
          if ("setPointerCapture" in htmlTarget) {
            htmlTarget.setPointerCapture(pointerId);
            record(() => {
              try {
                htmlTarget.releasePointerCapture(pointerId);
              } catch {
                // Pointer may have been released already
              }
            });
          }
        };
      case "releasePointerCapture":
        return (pointerId: number) => {
          const htmlTarget = target as HTMLElement;
          if ("releasePointerCapture" in htmlTarget) {
            htmlTarget.releasePointerCapture(pointerId);
          }
        };
      case "hasPointerCapture":
        return (pointerId: number) => {
          const htmlTarget = target as HTMLElement;
          if ("hasPointerCapture" in htmlTarget) {
            return htmlTarget.hasPointerCapture(pointerId);
          }
          return false;
        };
      case "attachInternals":
        return () => {
          const htmlTarget = target as HTMLElement;
          if ("attachInternals" in htmlTarget) {
            return (htmlTarget as HTMLElement & { attachInternals: () => ElementInternals }).attachInternals();
          }
          return null;
        };
      case "getClientRects":
        return () => {
          const htmlTarget = target as HTMLElement;
          return htmlTarget.getClientRects();
        };
      case "getBoundingClientRect":
        return () => {
          const htmlTarget = target as HTMLElement;
          return htmlTarget.getBoundingClientRect();
        };
      case "hasAttribute":
        return (name: string) => {
          const htmlTarget = target as HTMLElement;
          return htmlTarget.hasAttribute(name);
        };
      case "hasAttributes":
        return () => {
          const htmlTarget = target as HTMLElement;
          return htmlTarget.hasAttributes();
        };
      case "hasAttributeNS":
        return (namespace: string | null, localName: string) => {
          const htmlTarget = target as HTMLElement;
          return htmlTarget.hasAttributeNS(namespace, localName);
        };
      case "getAttribute":
        return (name: string) => {
          const htmlTarget = target as HTMLElement;
          return htmlTarget.getAttribute(name);
        };
      case "getAttributeNS":
        return (namespace: string | null, localName: string) => {
          const htmlTarget = target as HTMLElement;
          return htmlTarget.getAttributeNS(namespace, localName);
        };
      case "getAttributeNode":
        return (name: string) => {
          const htmlTarget = target as HTMLElement;
          return htmlTarget.getAttributeNode(name);
        };
      case "getAttributeNodeNS":
        return (namespace: string | null, localName: string) => {
          const htmlTarget = target as HTMLElement;
          return htmlTarget.getAttributeNodeNS(namespace, localName);
        };
      case "getAttributeNames":
        return () => {
          const htmlTarget = target as HTMLElement;
          return htmlTarget.getAttributeNames();
        };
      case "matches":
        return (selectors: string) => {
          const htmlTarget = target as HTMLElement;
          return htmlTarget.matches(selectors);
        };
      case "webkitMatchesSelector":
        return (selectors: string) => {
          const htmlTarget = target as HTMLElement;
          const webkitTarget = htmlTarget as HTMLElement & { webkitMatchesSelector?: (selectors: string) => boolean };
          if (webkitTarget.webkitMatchesSelector) {
            return webkitTarget.webkitMatchesSelector(selectors);
          }
          return htmlTarget.matches(selectors);
        };
      case "contains":
        return (other: Node | null) => {
          return target.contains(other);
        };
      case "compareDocumentPosition":
        return (other: Node) => {
          return target.compareDocumentPosition(other);
        };
      case "getRootNode":
        return (options?: GetRootNodeOptions) => {
          return createElementProxy(target.getRootNode(options));
        };
      case "isEqualNode":
        return (otherNode: Node | null) => {
          return target.isEqualNode(otherNode);
        };
      case "isSameNode":
        return (otherNode: Node | null) => {
          return target.isSameNode(otherNode);
        };
      case "lookupPrefix":
        return (namespace: string | null) => {
          return target.lookupPrefix(namespace);
        };
      case "lookupNamespaceURI":
        return (prefix: string | null) => {
          return target.lookupNamespaceURI(prefix);
        };
      case "isDefaultNamespace":
        return (namespace: string | null) => {
          return target.isDefaultNamespace(namespace);
        };
      default:
        return null;
    }
  };

  const findScrollableParent = (el: HTMLElement): HTMLElement | null => {
    let currentElement: HTMLElement | null = el.parentElement;
    while (currentElement) {
      const { overflow, overflowY, overflowX } = getComputedStyle(currentElement);
      if (
        overflow === "auto" ||
        overflow === "scroll" ||
        overflowY === "auto" ||
        overflowY === "scroll" ||
        overflowX === "auto" ||
        overflowX === "scroll"
      ) {
        return currentElement;
      }
      currentElement = currentElement.parentElement;
    }
    return document.documentElement;
  };

  const isReadOnlyProperty = (node: Node, prop: string | symbol): boolean => {
    if (typeof prop === "symbol") return false;
    if (READONLY_PROPS.has(prop)) return true;
    const descriptor = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(node), prop);
    if (descriptor && descriptor.get && !descriptor.set) {
      return true;
    }
    return false;
  };

  const createElementProxy = (node: Node | null): Node | null => {
    if (!node) return null;

    const existingProxy = elementToProxy.get(node);
    if (existingProxy) return existingProxy;

    const nodeProxy = new Proxy(node, {
      get(nodeTarget, nodeProp) {
        if (nodeProp === Symbol.toStringTag) {
          return (nodeTarget as object)[Symbol.toStringTag as keyof object];
        }
        if (nodeProp === Symbol.toPrimitive) {
          const toPrimitive = (nodeTarget as { [Symbol.toPrimitive]?: (hint: string) => unknown })[Symbol.toPrimitive];
          return toPrimitive?.bind(nodeTarget);
        }
        if (nodeProp === Symbol.iterator && Symbol.iterator in nodeTarget) {
          return (nodeTarget as Iterable<unknown>)[Symbol.iterator].bind(nodeTarget);
        }
        if (nodeProp === "constructor") {
          return nodeTarget.constructor;
        }

        if (nodeProp === "style" && "style" in nodeTarget) {
          return createStyleProxy((nodeTarget as HTMLElement).style);
        }
        if (nodeProp === "classList" && "classList" in nodeTarget) {
          return createClassListProxy((nodeTarget as HTMLElement).classList);
        }
        if (nodeProp === "dataset" && "dataset" in nodeTarget) {
          return createDatasetProxy((nodeTarget as HTMLElement).dataset);
        }
        if (nodeProp === "attributes" && "attributes" in nodeTarget) {
          return createNamedNodeMapProxy((nodeTarget as HTMLElement).attributes);
        }
        if (
          nodeProp === "attributeStyleMap" &&
          "attributeStyleMap" in nodeTarget
        ) {
          return createStyleMapProxy(
            (nodeTarget as HTMLElement & { attributeStyleMap: StylePropertyMap }).attributeStyleMap,
          );
        }
        if (nodeProp === "shadowRoot" && "shadowRoot" in nodeTarget) {
          const shadowRoot = (nodeTarget as HTMLElement).shadowRoot;
          return shadowRoot
            ? createElementProxy(shadowRoot as unknown as Node)
            : null;
        }
        if (nodeProp === "content" && nodeTarget instanceof HTMLTemplateElement) {
          return createElementProxy(nodeTarget.content);
        }
        if (typeof nodeProp === "string" && DOMTOKENLIST_PROPS.has(nodeProp) && nodeProp in nodeTarget) {
          const tokenList = (nodeTarget as unknown as Record<string, DOMTokenList>)[nodeProp];
          if (tokenList instanceof DOMTokenList) {
            return createDOMTokenListProxy(tokenList);
          }
        }
        if (nodeProp === "options" && nodeTarget instanceof HTMLSelectElement) {
          return createOptionsCollectionProxy(nodeTarget.options, nodeTarget);
        }
        if (NAVIGATION_PROPS.has(nodeProp as string)) {
          return createElementProxy(
            (nodeTarget as Element)[nodeProp as keyof Element] as Node | null,
          );
        }
        if (nodeProp === "children" || nodeProp === "childNodes") {
          return createCollectionProxy(
            (nodeTarget as Element)[nodeProp as "children" | "childNodes"],
          );
        }
        if (QUERY_METHODS_SINGLE.has(nodeProp as string)) {
          return (selector: string) => {
            const result = (
              nodeTarget as Element
            )[nodeProp as "querySelector" | "closest"]?.(selector);
            return result ? createElementProxy(result) : null;
          };
        }
        if (QUERY_METHODS_COLLECTION.has(nodeProp as string)) {
          if (nodeProp === "querySelectorAll") {
            return (selector: string) => {
              const result = (nodeTarget as Element).querySelectorAll(selector);
              return createNodeListProxy(result);
            };
          }
          if (nodeProp === "getElementsByClassName") {
            return (classNames: string) => {
              const result = (nodeTarget as Element).getElementsByClassName(
                classNames,
              );
              return createCollectionProxy(
                result as unknown as HTMLCollection,
              );
            };
          }
          if (nodeProp === "getElementsByTagName") {
            return (tagName: string) => {
              const result = (nodeTarget as Element).getElementsByTagName(tagName);
              return createCollectionProxy(
                result as unknown as HTMLCollection,
              );
            };
          }
          if (nodeProp === "getElementsByTagNameNS") {
            return (namespace: string | null, localName: string) => {
              const result = (nodeTarget as Element).getElementsByTagNameNS(
                namespace,
                localName,
              );
              return createCollectionProxy(
                result as unknown as HTMLCollection,
              );
            };
          }
        }
        if (
          typeof nodeProp === "string" &&
          HANDLED_METHODS.has(nodeProp)
        ) {
          const handler = getMethodHandler(
            nodeTarget as HTMLElement | CharacterData,
            nodeProp,
          );
          if (handler) return handler;
        }
        const nodeValue = Reflect.get(nodeTarget, nodeProp);
        return typeof nodeValue === "function"
          ? nodeValue.bind(nodeTarget)
          : nodeValue;
      },
      set(nodeTarget, nodeProp, value) {
        if (isReadOnlyProperty(nodeTarget, nodeProp)) {
          return Reflect.set(nodeTarget, nodeProp, value);
        }

        const propString = typeof nodeProp === "string" ? nodeProp : String(nodeProp);

        if (SCROLL_PROPS.has(propString)) {
          const original = (nodeTarget as HTMLElement)[
            propString as "scrollTop" | "scrollLeft"
          ];
          record(() => {
            (nodeTarget as HTMLElement)[propString as "scrollTop" | "scrollLeft"] =
              original;
          });
        } else if (
          FORM_PROPS.has(propString) &&
          isFormElement(nodeTarget as Node)
        ) {
          const original = (
            nodeTarget as unknown as Record<string, unknown>
          )[propString];
          record(() => {
            (nodeTarget as unknown as Record<string, unknown>)[propString] =
              original;
          });
        } else if (
          COMMON_PROPS.has(propString)
        ) {
          const original = (
            nodeTarget as unknown as Record<string, unknown>
          )[propString];
          record(() => {
            (nodeTarget as unknown as Record<string, unknown>)[propString] =
              original;
          });
        } else if (
          ELEMENT_SPECIFIC_PROPS.has(propString)
        ) {
          const original = (
            nodeTarget as unknown as Record<string, unknown>
          )[propString];
          record(() => {
            (nodeTarget as unknown as Record<string, unknown>)[propString] =
              original;
          });
        } else if (
          MEDIA_PROPS.has(propString) &&
          isMediaElement(nodeTarget as Node)
        ) {
          const original = (
            nodeTarget as unknown as Record<string, unknown>
          )[propString];
          record(() => {
            (nodeTarget as unknown as Record<string, unknown>)[propString] =
              original;
          });
        } else if (
          propString === "nodeValue" ||
          propString === "textContent" ||
          propString === "data"
        ) {
          const original = (
            nodeTarget as unknown as Record<string, unknown>
          )[propString];
          record(() => {
            (nodeTarget as unknown as Record<string, unknown>)[propString] =
              original;
          });
        } else if (propString === "innerHTML") {
          const htmlTarget = nodeTarget as HTMLElement;
          const originalHTML = htmlTarget.innerHTML;
          record(() => {
            htmlTarget.innerHTML = originalHTML;
          });
        } else if (propString === "outerHTML") {
          const htmlTarget = nodeTarget as HTMLElement;
          const parentNode = htmlTarget.parentNode;
          const nextSibling = htmlTarget.nextSibling;
          const originalOuterHTML = htmlTarget.outerHTML;
          const siblingsBefore = parentNode ? Array.from(parentNode.childNodes) : [];

          const result = Reflect.set(nodeTarget, nodeProp, value);

          const siblingsAfter = parentNode ? Array.from(parentNode.childNodes) : [];
          const addedNodes = siblingsAfter.filter((n) => !siblingsBefore.includes(n));

          record(() => {
            for (const addedNode of addedNodes) {
              addedNode.parentNode?.removeChild(addedNode);
            }
            const tempContainer = document.createElement("div");
            tempContainer.innerHTML = originalOuterHTML;
            const restoredElement = tempContainer.firstChild;
            if (restoredElement && parentNode) {
              parentNode.insertBefore(restoredElement, nextSibling);
            }
          });

          return result;
        } else if (typeof nodeProp === "string" || typeof nodeProp === "symbol") {
          const original = (
            nodeTarget as unknown as Record<string | symbol, unknown>
          )[nodeProp];
          record(() => {
            (nodeTarget as unknown as Record<string | symbol, unknown>)[nodeProp] =
              original;
          });
        }

        return Reflect.set(nodeTarget, nodeProp, value);
      },
    });

    proxyToElement.set(nodeProxy, node);
    elementToProxy.set(node, nodeProxy);
    return nodeProxy;
  };

  const isFormElement = (node: Node): boolean =>
    node instanceof HTMLInputElement ||
    node instanceof HTMLTextAreaElement ||
    node instanceof HTMLSelectElement ||
    node instanceof HTMLOptionElement;

  const isMediaElement = (node: Node): boolean =>
    node instanceof HTMLMediaElement ||
    node instanceof HTMLVideoElement ||
    node instanceof HTMLAudioElement;

  const proxy = createElementProxy(element) as HTMLElement;

  const undo = () => {
    for (
      let actionIndex = undoActions.length - 1;
      actionIndex >= 0;
      actionIndex--
    ) {
      undoActions[actionIndex]();
    }
  };

  return { proxy, undo };
};

const getOpeningTag = (element: Element): string => {
  const shallowClone = element.cloneNode(false) as Element;
  const temporaryWrapper = document.createElement("div");
  temporaryWrapper.appendChild(shallowClone);
  const serializedHtml = temporaryWrapper.innerHTML;
  const closingTagMatch = serializedHtml.match(/<\/[^>]+>$/);
  if (closingTagMatch) {
    return serializedHtml.slice(0, -closingTagMatch[0].length);
  }
  return serializedHtml;
};

const getClosingTag = (element: Element): string =>
  `</${element.tagName.toLowerCase()}>`;

const stripSvgContent = (html: string): string => {
  const container = document.createElement("div");
  container.innerHTML = html;

  const svgElements = container.querySelectorAll("svg");
  for (const svg of svgElements) {
    const strippedSvg = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "svg",
    );

    if (svg.hasAttribute("class")) {
      strippedSvg.setAttribute("class", svg.getAttribute("class")!);
    }
    if (svg.hasAttribute("id")) {
      strippedSvg.setAttribute("id", svg.getAttribute("id")!);
    }

    strippedSvg.textContent = "...";
    svg.replaceWith(strippedSvg);
  }

  return container.innerHTML;
};

export const buildAncestorContext = (element: Element): string => {
  const ancestors: Element[] = [];
  let currentAncestor = element.parentElement;

  for (let level = 0; level < ANCESTOR_LEVELS && currentAncestor; level++) {
    if (
      currentAncestor === document.body ||
      currentAncestor === document.documentElement
    ) {
      break;
    }
    ancestors.push(currentAncestor);
    currentAncestor = currentAncestor.parentElement;
  }

  if (ancestors.length === 0) {
    return stripSvgContent(element.outerHTML);
  }

  ancestors.reverse();

  let result = "";
  let indentation = "";

  for (const ancestor of ancestors) {
    result += `${indentation}${getOpeningTag(ancestor)}\n`;
    indentation += "  ";
  }

  result += `${indentation}<!-- START $el -->\n`;
  const strippedOuterHtml = stripSvgContent(element.outerHTML);
  const targetElementLines = strippedOuterHtml.split("\n");
  for (const line of targetElementLines) {
    result += `${indentation}${line}\n`;
  }
  result += `${indentation}<!-- END $el -->\n`;

  for (
    let ancestorIndex = ancestors.length - 1;
    ancestorIndex >= 0;
    ancestorIndex--
  ) {
    indentation = "  ".repeat(ancestorIndex);
    result += `${indentation}${getClosingTag(ancestors[ancestorIndex])}\n`;
  }

  return result.trim();
};
