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
  "splitText",
  "appendData",
  "deleteData",
  "insertData",
  "replaceData",
  "focus",
  "blur",
  "reset",
  "submit",
  "requestSubmit",
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
  "play",
  "pause",
  "load",
  "fastSeek",
  "setPointerCapture",
  "webkitMatchesSelector",
  "contains",
  "compareDocumentPosition",
  "getRootNode",
  "isEqualNode",
  "isSameNode",
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

const ELEMENT_PROPS = new Set([
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
  "seamless",
  "width",
  "height",
  "data",
  "form",
  "summary",
  "nodeValue",
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
  const styleToProxy = new WeakMap<CSSStyleDeclaration, CSSStyleDeclaration>();
  const tokenListToProxy = new WeakMap<DOMTokenList, DOMTokenList>();
  const datasetToProxy = new WeakMap<DOMStringMap, DOMStringMap>();
  const namedNodeMapToProxy = new WeakMap<NamedNodeMap, NamedNodeMap>();
  const styleMapToProxy = new WeakMap<StylePropertyMap, StylePropertyMap>();
  const optionsCollectionToProxy = new WeakMap<HTMLOptionsCollection, HTMLOptionsCollection>();
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
    getRelevantNodes: () => Node[],
  ): T =>
    ((...nodes: (Node | string)[]) => {
      const unwrappedNodes = unwrapNodes(nodes);
      const originalPositions = new Map<Node, { parent: Node | null; nextSibling: Node | null }>();

      for (const node of unwrappedNodes) {
        if (typeof node !== "string") {
          if (!(node instanceof DocumentFragment) && node.parentNode) {
            originalPositions.set(node, captureNodePosition(node));
          }
        }
      }

      const nodesBefore = getRelevantNodes();
      method(...unwrappedNodes);
      const nodesAfter = getRelevantNodes();

      const insertedNodes = nodesAfter.filter((node) => !nodesBefore.includes(node));

      record(() => {
        for (const node of insertedNodes) {
          node.parentNode?.removeChild(node);
        }
        for (const [node, position] of originalPositions) {
          restoreNodePosition(node, position);
        }
      });
    }) as T;

  const createStyleProxy = (styleTarget: CSSStyleDeclaration): CSSStyleDeclaration => {
    const existingProxy = styleToProxy.get(styleTarget);
    if (existingProxy) return existingProxy;

    const proxy = new Proxy(styleTarget, {
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

    styleToProxy.set(styleTarget, proxy);
    return proxy;
  };

  const createDOMTokenListProxy = (tokenListTarget: DOMTokenList): DOMTokenList => {
    const existingProxy = tokenListToProxy.get(tokenListTarget);
    if (existingProxy) return existingProxy;

    const proxy = new Proxy(tokenListTarget, {
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
            const hadNewToken = target.contains(newToken);
            const result = target.replace(oldToken, newToken);
            if (hadOldToken)
              record(() => {
                if (!hadNewToken) target.remove(newToken);
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

    tokenListToProxy.set(tokenListTarget, proxy);
    return proxy;
  };

  const createDatasetProxy = (datasetTarget: DOMStringMap): DOMStringMap => {
    const existingProxy = datasetToProxy.get(datasetTarget);
    if (existingProxy) return existingProxy;

    const proxy = new Proxy(datasetTarget, {
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

    datasetToProxy.set(datasetTarget, proxy);
    return proxy;
  };

  const createNamedNodeMapProxy = (attributes: NamedNodeMap): NamedNodeMap => {
    const existingProxy = namedNodeMapToProxy.get(attributes);
    if (existingProxy) return existingProxy;

    const proxy = new Proxy(attributes, {
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

    namedNodeMapToProxy.set(attributes, proxy);
    return proxy;
  };

  const attrToProxy = new WeakMap<Attr, Attr>();
  const createAttrProxy = (attr: Attr): Attr => {
    const existingProxy = attrToProxy.get(attr);
    if (existingProxy) return existingProxy;

    const proxy = new Proxy(attr, {
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

    attrToProxy.set(attr, proxy);
    return proxy;
  };

  const createStyleMapProxy = (styleMap: StylePropertyMap): StylePropertyMap => {
    const existingProxy = styleMapToProxy.get(styleMap);
    if (existingProxy) return existingProxy;

    const proxy = new Proxy(styleMap, {
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

    styleMapToProxy.set(styleMap, proxy);
    return proxy;
  };

  const createNodeListProxy = (nodeList: NodeList) =>
    new Proxy(nodeList, {
      get(target, property) {
        if (typeof property === "string" && !isNaN(Number(property))) {
          return createElementProxy(target[Number(property)] ?? null);
        }
        if (property === "item") {
          return (index: number) => createElementProxy(target.item(index));
        }
        if (property === Symbol.iterator) {
          return function* () {
            for (let index = 0; index < target.length; index++) {
              yield createElementProxy(target[index]);
            }
          };
        }
        if (property === "forEach") {
          return (
            callback: (node: Node, index: number, list: NodeList) => void,
            thisArg?: unknown,
          ) => {
            target.forEach((currentNode, index, list) => {
              callback.call(thisArg, createElementProxy(currentNode) as Node, index, list);
            });
          };
        }
        if (property === "entries") {
          return function* () {
            for (let index = 0; index < target.length; index++) {
              yield [index, createElementProxy(target[index])];
            }
          };
        }
        if (property === "keys") {
          return target.keys.bind(target);
        }
        if (property === "values") {
          return function* () {
            for (let index = 0; index < target.length; index++) {
              yield createElementProxy(target[index]);
            }
          };
        }
        const propertyValue = Reflect.get(target, property);
        return typeof propertyValue === "function" ? propertyValue.bind(target) : propertyValue;
      },
    });

  const createCollectionProxy = (
    collection: HTMLCollection | NodeListOf<ChildNode> | null | undefined,
  ): (HTMLCollection | NodeListOf<ChildNode>) | null => {
    if (!collection) return null;

    return new Proxy(collection, {
      get(target, property) {
        if (typeof property === "string" && !isNaN(Number(property))) {
          return createElementProxy(target[Number(property)] ?? null);
        }
        if (property === "item") {
          return (index: number) => createElementProxy(target.item(index));
        }
        if (property === "namedItem" && "namedItem" in target) {
          return (name: string) => createElementProxy((target as HTMLCollection).namedItem(name));
        }
        if (property === Symbol.iterator) {
          return function* () {
            for (let index = 0; index < target.length; index++) {
              yield createElementProxy(target[index]);
            }
          };
        }
        const propertyValue = Reflect.get(target, property);
        return typeof propertyValue === "function" ? propertyValue.bind(target) : propertyValue;
      },
    });
  };

  const createOptionsCollectionProxy = (
    options: HTMLOptionsCollection,
    selectElement: HTMLSelectElement,
  ): HTMLOptionsCollection => {
    const existingProxy = optionsCollectionToProxy.get(options);
    if (existingProxy) return existingProxy;

    const proxy = new Proxy(options, {
      get(target, property) {
        if (typeof property === "string" && !isNaN(Number(property))) {
          return createElementProxy(target[Number(property)] ?? null);
        }
        if (property === "item") {
          return (index: number) => createElementProxy(target.item(index));
        }
        if (property === "namedItem") {
          return (name: string) => createElementProxy(target.namedItem(name));
        }
        if (property === "add") {
          return (
            optionElement: HTMLOptionElement | HTMLOptGroupElement,
            before?: HTMLElement | number | null,
          ) => {
            const unwrappedOption = unwrapProxy(optionElement) as HTMLOptionElement | HTMLOptGroupElement;
            const unwrappedBefore = typeof before === "number" || before == null ? before : (unwrapProxy(before) as HTMLElement);
            target.add(unwrappedOption, unwrappedBefore);
            record(() => unwrappedOption.parentNode?.removeChild(unwrappedOption));
          };
        }
        if (property === "remove") {
          return (index: number) => {
            const optionToRemove = target[index];
            if (optionToRemove) {
              const originalHTML = optionToRemove.outerHTML;
              const removalIndex = index;
              target.remove(index);
              record(() => {
                const tempContainer = document.createElement("div");
                tempContainer.innerHTML = originalHTML;
                const restoredOption = tempContainer.firstChild as HTMLOptionElement;
                if (restoredOption) {
                  if (removalIndex >= target.length) {
                    selectElement.appendChild(restoredOption);
                  } else {
                    selectElement.insertBefore(restoredOption, target[removalIndex]);
                  }
                }
              });
            }
          };
        }
        if (property === "selectedIndex") {
          return target.selectedIndex;
        }
        if (property === "length") {
          return target.length;
        }
        if (property === Symbol.iterator) {
          return function* () {
            for (let index = 0; index < target.length; index++) {
              yield createElementProxy(target[index]);
            }
          };
        }
        const propertyValue = Reflect.get(target, property);
        return typeof propertyValue === "function" ? propertyValue.bind(target) : propertyValue;
      },
      set(target, property, value) {
        if (property === "selectedIndex") {
          const originalSelectedIndex = target.selectedIndex;
          record(() => {
            target.selectedIndex = originalSelectedIndex;
          });
        }
        if (property === "length") {
          const originalOptionsHTML: string[] = [];
          for (let index = 0; index < target.length; index++) {
            originalOptionsHTML.push(target[index].outerHTML);
          }
          record(() => {
            while (target.length > 0) {
              target.remove(0);
            }
            for (const optionHTML of originalOptionsHTML) {
              const tempContainer = document.createElement("div");
              tempContainer.innerHTML = optionHTML;
              const restoredOption = tempContainer.firstChild as HTMLOptionElement;
              if (restoredOption) {
                selectElement.appendChild(restoredOption);
              }
            }
          });
        }
        return Reflect.set(target, property, value);
      },
    });

    optionsCollectionToProxy.set(options, proxy);
    return proxy;
  };

  const getMethodHandler = (
    target: HTMLElement | CharacterData | ShadowRoot,
    methodName: string,
  ) => {
    const element = target as HTMLElement;

    switch (methodName) {
      case "setAttribute":
        return (name: string, value: string) => {
          const hadAttribute = element.hasAttribute(name);
          const originalValue = element.getAttribute(name);
          record(() =>
            hadAttribute
              ? element.setAttribute(name, originalValue!)
              : element.removeAttribute(name),
          );
          return element.setAttribute(name, value);
        };
      case "removeAttribute":
        return (name: string) => {
          if (element.hasAttribute(name)) {
            const originalValue = element.getAttribute(name)!;
            record(() => element.setAttribute(name, originalValue));
          }
          return element.removeAttribute(name);
        };
      case "toggleAttribute":
        return (name: string, force?: boolean) => {
          const hadAttribute = element.hasAttribute(name);
          const originalValue = hadAttribute ? element.getAttribute(name)! : null;
          const result = element.toggleAttribute(name, force);
          record(() => {
            if (hadAttribute) {
              element.setAttribute(name, originalValue!);
            } else {
              element.removeAttribute(name);
            }
          });
          return result;
        };
      case "setAttributeNS":
        return (namespace: string | null, name: string, value: string) => {
          const localName = name.includes(":") ? name.split(":")[1] : name;
          const hadAttribute = element.hasAttributeNS(namespace, localName);
          const originalValue = element.getAttributeNS(namespace, localName);
          record(() =>
            hadAttribute
              ? element.setAttributeNS(namespace, name, originalValue!)
              : element.removeAttributeNS(namespace, localName),
          );
          return element.setAttributeNS(namespace, name, value);
        };
      case "removeAttributeNS":
        return (namespace: string | null, localName: string) => {
          if (element.hasAttributeNS(namespace, localName)) {
            const originalValue = element.getAttributeNS(namespace, localName)!;
            const qualifiedName = element.getAttributeNodeNS(namespace, localName)?.name ?? localName;
            record(() => element.setAttributeNS(namespace, qualifiedName, originalValue));
          }
          return element.removeAttributeNS(namespace, localName);
        };
      case "setAttributeNode":
        return (attr: Attr) => {
          const existingAttr = element.getAttributeNode(attr.name);
          const originalValue = existingAttr?.value;
          const result = element.setAttributeNode(attr);
          record(() => {
            if (existingAttr && originalValue !== undefined) {
              existingAttr.value = originalValue;
              element.setAttributeNode(existingAttr);
            } else {
              element.removeAttribute(attr.name);
            }
          });
          return result;
        };
      case "removeAttributeNode":
        return (attr: Attr) => {
          const originalValue = attr.value;
          const originalName = attr.name;
          const result = element.removeAttributeNode(attr);
          record(() => {
            const restoredAttr = document.createAttribute(originalName);
            restoredAttr.value = originalValue;
            element.setAttributeNode(restoredAttr);
          });
          return result;
        };
      case "appendChild":
        return (child: Node) => {
          const unwrappedChild = unwrapProxy(child);
          const originalPosition = unwrappedChild.parentNode ? captureNodePosition(unwrappedChild) : null;
          const fragmentChildren = getFragmentChildren(unwrappedChild);
          const result = element.appendChild(unwrappedChild);
          record(() => {
            if (fragmentChildren.length > 0) {
              for (const fragmentChild of fragmentChildren) {
                fragmentChild.parentNode?.removeChild(fragmentChild);
              }
            } else {
              unwrappedChild.parentNode?.removeChild(unwrappedChild);
            }
            if (originalPosition) {
              restoreNodePosition(unwrappedChild, originalPosition);
            }
          });
          return createElementProxy(result);
        };
      case "removeChild":
        return (child: Node) => {
          const unwrappedChild = unwrapProxy(child);
          const nextSibling = unwrappedChild.nextSibling;
          const result = element.removeChild(unwrappedChild);
          record(() => element.insertBefore(unwrappedChild, nextSibling));
          return createElementProxy(result);
        };
      case "insertBefore":
        return (nodeToInsert: Node, referenceNode: Node | null) => {
          const unwrappedNode = unwrapProxy(nodeToInsert);
          const unwrappedRef = referenceNode ? unwrapProxy(referenceNode) : null;
          const originalPosition = unwrappedNode.parentNode ? captureNodePosition(unwrappedNode) : null;
          const fragmentChildren = getFragmentChildren(unwrappedNode);
          const result = element.insertBefore(unwrappedNode, unwrappedRef);
          record(() => {
            if (fragmentChildren.length > 0) {
              for (const fragmentChild of fragmentChildren) {
                fragmentChild.parentNode?.removeChild(fragmentChild);
              }
            } else {
              unwrappedNode.parentNode?.removeChild(unwrappedNode);
            }
            if (originalPosition) {
              restoreNodePosition(unwrappedNode, originalPosition);
            }
          });
          return createElementProxy(result);
        };
      case "replaceChild":
        return (newChild: Node, oldChild: Node) => {
          const unwrappedNewChild = unwrapProxy(newChild);
          const unwrappedOldChild = unwrapProxy(oldChild);
          const nextSibling = unwrappedOldChild.nextSibling;
          const newChildOriginalPosition = unwrappedNewChild.parentNode ? captureNodePosition(unwrappedNewChild) : null;
          const fragmentChildren = getFragmentChildren(unwrappedNewChild);
          const result = element.replaceChild(unwrappedNewChild, unwrappedOldChild);
          record(() => {
            if (fragmentChildren.length > 0) {
              const firstFragmentChild = fragmentChildren[0];
              if (firstFragmentChild?.parentNode) {
                firstFragmentChild.parentNode.replaceChild(unwrappedOldChild, firstFragmentChild);
              }
              for (let index = 1; index < fragmentChildren.length; index++) {
                fragmentChildren[index].parentNode?.removeChild(fragmentChildren[index]);
              }
            } else {
              element.replaceChild(unwrappedOldChild, unwrappedNewChild);
            }
            if (nextSibling && unwrappedOldChild.nextSibling !== nextSibling) {
              element.insertBefore(unwrappedOldChild, nextSibling);
            }
            if (newChildOriginalPosition) {
              restoreNodePosition(unwrappedNewChild, newChildOriginalPosition);
            }
          });
          return createElementProxy(result);
        };
      case "remove":
        return () => {
          const parent = target.parentNode;
          const nextSibling = target.nextSibling;
          element.remove();
          record(() => parent?.insertBefore(target, nextSibling));
        };
      case "append":
        return wrapNodeInsertion(
          element.append.bind(element),
          () => Array.from(element.childNodes),
        );
      case "prepend":
        return wrapNodeInsertion(
          element.prepend.bind(element),
          () => Array.from(element.childNodes),
        );
      case "after":
        return wrapNodeInsertion(
          element.after.bind(element),
          () => (element.parentNode ? Array.from(element.parentNode.childNodes) : []),
        );
      case "before":
        return wrapNodeInsertion(
          element.before.bind(element),
          () => (element.parentNode ? Array.from(element.parentNode.childNodes) : []),
        );
      case "replaceWith":
        return (...nodes: (Node | string)[]) => {
          const unwrappedNodes = unwrapNodes(nodes);
          const parent = target.parentNode;
          const nextSibling = target.nextSibling;
          const originalPositions = new Map<Node, { parent: Node | null; nextSibling: Node | null }>();

          for (const currentNode of unwrappedNodes) {
            if (typeof currentNode !== "string") {
              if (!(currentNode instanceof DocumentFragment) && currentNode.parentNode) {
                originalPositions.set(currentNode, captureNodePosition(currentNode));
              }
            }
          }

          const siblingsBefore = parent ? Array.from(parent.childNodes) : [];
          element.replaceWith(...unwrappedNodes);
          const siblingsAfter = parent ? Array.from(parent.childNodes) : [];

          const insertedNodes = siblingsAfter.filter((node) => !siblingsBefore.includes(node));

          record(() => {
            const firstNode = insertedNodes[0];
            if (parent) {
              parent.insertBefore(target, firstNode ?? nextSibling);
              for (const nodeToRemove of insertedNodes) {
                if (nodeToRemove !== target) {
                  nodeToRemove.parentNode?.removeChild(nodeToRemove);
                }
              }
            }
            for (const [originalNode, position] of originalPositions) {
              restoreNodePosition(originalNode, position);
            }
          });
        };
      case "replaceChildren":
        return (...nodes: (Node | string)[]) => {
          const unwrappedNodes = unwrapNodes(nodes);
          const originalChildren = Array.from(element.childNodes);
          const originalPositions = new Map<Node, { parent: Node | null; nextSibling: Node | null }>();

          for (const currentNode of unwrappedNodes) {
            if (typeof currentNode !== "string" && currentNode.parentNode && currentNode.parentNode !== element) {
              originalPositions.set(currentNode, captureNodePosition(currentNode));
            }
          }

          element.replaceChildren(...unwrappedNodes);

          record(() => {
            element.replaceChildren(...originalChildren);
            for (const [originalNode, position] of originalPositions) {
              restoreNodePosition(originalNode, position);
            }
          });
        };
      case "insertAdjacentHTML":
        return (position: InsertPosition, html: string) => {
          const childrenBefore = Array.from(element.childNodes);
          const siblingsBefore = element.parentNode ? Array.from(element.parentNode.childNodes) : [];
          element.insertAdjacentHTML(position, html);
          const insertedChildren = Array.from(element.childNodes).filter(
            (child) => !childrenBefore.includes(child),
          );
          const insertedSiblings = element.parentNode
            ? Array.from(element.parentNode.childNodes).filter((sibling) => !siblingsBefore.includes(sibling))
            : [];
          record(() =>
            [...insertedChildren, ...insertedSiblings].forEach((insertedNode) =>
              insertedNode.parentNode?.removeChild(insertedNode),
            ),
          );
        };
      case "insertAdjacentElement":
        return (position: InsertPosition, elementToInsert: Element) => {
          const unwrappedElement = unwrapProxy(elementToInsert) as Element;
          const originalPosition = unwrappedElement.parentNode ? captureNodePosition(unwrappedElement) : null;
          const result = element.insertAdjacentElement(position, unwrappedElement);
          if (result) {
            record(() => {
              result.parentNode?.removeChild(result);
              if (originalPosition) {
                restoreNodePosition(unwrappedElement, originalPosition);
              }
            });
          }
          return result ? createElementProxy(result) : null;
        };
      case "insertAdjacentText":
        return (position: InsertPosition, text: string) => {
          const childrenBefore = Array.from(element.childNodes);
          const siblingsBefore = element.parentNode ? Array.from(element.parentNode.childNodes) : [];
          element.insertAdjacentText(position, text);
          const insertedChildren = Array.from(element.childNodes).filter(
            (child) => !childrenBefore.includes(child),
          );
          const insertedSiblings = element.parentNode
            ? Array.from(element.parentNode.childNodes).filter((sibling) => !siblingsBefore.includes(sibling))
            : [];
          record(() =>
            [...insertedChildren, ...insertedSiblings].forEach((insertedNode) =>
              insertedNode.parentNode?.removeChild(insertedNode),
            ),
          );
        };
      case "setHTML":
        return (html: string, options?: unknown) => {
          if ("setHTML" in element) {
            const originalInnerHTML = element.innerHTML;
            (element as HTMLElement & { setHTML: (html: string, options?: unknown) => void }).setHTML(html, options);
            record(() => {
              element.innerHTML = originalInnerHTML;
            });
          }
        };
      case "normalize":
        return () => {
          const textNodeData: { parent: Node; data: string; nextNonTextSibling: Node | null }[] = [];
          const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
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
          element.normalize();
          const mergedTextNodes: Text[] = [];
          const mergedWalker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
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
              const restoredTextNode = document.createTextNode(data);
              if (parent === lastParent && nextNonTextSibling === lastNextNonTextSibling && lastInserted) {
                parent.insertBefore(restoredTextNode, lastInserted.nextSibling);
              } else {
                parent.insertBefore(restoredTextNode, nextNonTextSibling);
              }
              lastInserted = restoredTextNode;
              lastParent = parent;
              lastNextNonTextSibling = nextNonTextSibling;
            }
          });
        };
      case "cloneNode":
        return (deep?: boolean) => {
          const clonedNode = element.cloneNode(deep);
          return createElementProxy(clonedNode);
        };
      case "addEventListener":
        return (
          eventType: string,
          listener: EventListenerOrEventListenerObject,
          options?: boolean | AddEventListenerOptions,
        ) => {
          element.addEventListener(eventType, listener, options);
          addedEventListeners.push({ target, type: eventType, listener, options });
          record(() => element.removeEventListener(eventType, listener, options));
        };
      case "removeEventListener":
        return (
          eventType: string,
          listener: EventListenerOrEventListenerObject,
          options?: boolean | EventListenerOptions,
        ) => {
          element.removeEventListener(eventType, listener, options);
          record(() => element.addEventListener(eventType, listener, options));
        };
      case "attachShadow":
        return (init: ShadowRootInit) => {
          const shadowRoot = element.attachShadow(init);
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
          const animation = element.animate(keyframes, options);
          record(() => animation.cancel());
          return animation;
        };
      case "showModal":
        return () => {
          const dialog = target as HTMLDialogElement;
          if ("showModal" in dialog) {
            const wasOpen = dialog.open;
            dialog.showModal();
            if (!wasOpen) {
              record(() => dialog.close());
            }
          }
        };
      case "show":
        return () => {
          const dialog = target as HTMLDialogElement;
          if ("show" in dialog) {
            const wasOpen = dialog.open;
            dialog.show();
            if (!wasOpen) {
              record(() => dialog.close());
            }
          }
        };
      case "close":
        return (returnValue?: string) => {
          const dialog = target as HTMLDialogElement;
          if ("close" in dialog) {
            const wasOpen = dialog.open;
            const wasModal = dialog.matches(":modal");
            const originalReturnValue = dialog.returnValue;
            dialog.close(returnValue);
            if (wasOpen) {
              record(() => {
                dialog.returnValue = originalReturnValue;
                if (wasModal) {
                  dialog.showModal();
                } else {
                  dialog.show();
                }
              });
            }
          }
        };
      case "showPopover":
        return () => {
          if ("showPopover" in element && "hidePopover" in element) {
            const popoverElement = element as HTMLElement & { showPopover: () => void; hidePopover: () => void };
            const wasShowing = element.matches(":popover-open");
            popoverElement.showPopover();
            if (!wasShowing) {
              record(() => popoverElement.hidePopover());
            }
          }
        };
      case "hidePopover":
        return () => {
          if ("hidePopover" in element && "showPopover" in element) {
            const popoverElement = element as HTMLElement & { showPopover: () => void; hidePopover: () => void };
            const wasShowing = element.matches(":popover-open");
            popoverElement.hidePopover();
            if (wasShowing) {
              record(() => popoverElement.showPopover());
            }
          }
        };
      case "togglePopover":
        return (force?: boolean) => {
          if ("togglePopover" in element) {
            const popoverElement = element as HTMLElement & { togglePopover: (force?: boolean) => boolean };
            const wasShowing = element.matches(":popover-open");
            const result = popoverElement.togglePopover(force);
            record(() => popoverElement.togglePopover(wasShowing));
            return result;
          }
          return false;
        };
      case "scrollTo":
        return (xOrOptions?: number | ScrollToOptions, yCoordinate?: number) => {
          const originalScrollLeft = element.scrollLeft;
          const originalScrollTop = element.scrollTop;
          if (typeof xOrOptions === "number") {
            element.scrollTo(xOrOptions, yCoordinate ?? element.scrollTop);
          } else {
            element.scrollTo(xOrOptions);
          }
          record(() => element.scrollTo(originalScrollLeft, originalScrollTop));
        };
      case "scrollBy":
        return (xOrOptions?: number | ScrollToOptions, yCoordinate?: number) => {
          const originalScrollLeft = element.scrollLeft;
          const originalScrollTop = element.scrollTop;
          if (typeof xOrOptions === "number") {
            element.scrollBy(xOrOptions, yCoordinate ?? 0);
          } else {
            element.scrollBy(xOrOptions);
          }
          record(() => element.scrollTo(originalScrollLeft, originalScrollTop));
        };
      case "scrollIntoView":
        return (scrollOptions?: boolean | ScrollIntoViewOptions) => {
          const scrollableParent = findScrollableParent(element);
          const originalScrollLeft = scrollableParent?.scrollLeft ?? 0;
          const originalScrollTop = scrollableParent?.scrollTop ?? 0;
          element.scrollIntoView(scrollOptions);
          if (scrollableParent) {
            record(() => scrollableParent.scrollTo(originalScrollLeft, originalScrollTop));
          }
        };
      case "setSelectionRange":
        return (
          selectionStart: number | null,
          selectionEnd: number | null,
          selectionDirection?: "forward" | "backward" | "none",
        ) => {
          const inputElement = target as HTMLInputElement | HTMLTextAreaElement;
          if ("setSelectionRange" in inputElement) {
            const originalStart = inputElement.selectionStart;
            const originalEnd = inputElement.selectionEnd;
            const originalDirection = inputElement.selectionDirection;
            inputElement.setSelectionRange(selectionStart, selectionEnd, selectionDirection);
            record(() =>
              inputElement.setSelectionRange(originalStart, originalEnd, originalDirection ?? undefined),
            );
          }
        };
      case "setRangeText":
        return (
          replacementText: string,
          rangeStart?: number,
          rangeEnd?: number,
          selectMode?: SelectionMode,
        ) => {
          const inputElement = target as HTMLInputElement | HTMLTextAreaElement;
          if ("setRangeText" in inputElement) {
            const originalValue = inputElement.value;
            const originalStart = inputElement.selectionStart;
            const originalEnd = inputElement.selectionEnd;
            if (rangeStart !== undefined && rangeEnd !== undefined) {
              inputElement.setRangeText(replacementText, rangeStart, rangeEnd, selectMode);
            } else {
              inputElement.setRangeText(replacementText);
            }
            record(() => {
              inputElement.value = originalValue;
              inputElement.setSelectionRange(originalStart, originalEnd);
            });
          }
        };
      case "splitText":
        return (offset: number) => {
          const textNode = target as Text;
          if ("splitText" in textNode) {
            const originalData = textNode.data;
            const newTextNode = textNode.splitText(offset);
            record(() => {
              textNode.data = originalData;
              newTextNode.parentNode?.removeChild(newTextNode);
            });
            return createElementProxy(newTextNode);
          }
          return null;
        };
      case "appendData":
        return (dataToAppend: string) => {
          const characterData = target as CharacterData;
          if ("appendData" in characterData) {
            const originalLength = characterData.length;
            characterData.appendData(dataToAppend);
            record(() => characterData.deleteData(originalLength, dataToAppend.length));
          }
        };
      case "deleteData":
        return (offset: number, count: number) => {
          const characterData = target as CharacterData;
          if ("deleteData" in characterData) {
            const deletedData = characterData.substringData(offset, count);
            characterData.deleteData(offset, count);
            record(() => characterData.insertData(offset, deletedData));
          }
        };
      case "insertData":
        return (offset: number, dataToInsert: string) => {
          const characterData = target as CharacterData;
          if ("insertData" in characterData) {
            characterData.insertData(offset, dataToInsert);
            record(() => characterData.deleteData(offset, dataToInsert.length));
          }
        };
      case "replaceData":
        return (offset: number, count: number, replacementData: string) => {
          const characterData = target as CharacterData;
          if ("replaceData" in characterData) {
            const originalData = characterData.substringData(offset, count);
            characterData.replaceData(offset, count, replacementData);
            record(() => characterData.replaceData(offset, replacementData.length, originalData));
          }
        };
      case "focus":
        return (focusOptions?: FocusOptions) => {
          const previouslyFocusedElement = document.activeElement;
          element.focus(focusOptions);
          record(() => {
            if (previouslyFocusedElement && previouslyFocusedElement !== document.body && "focus" in previouslyFocusedElement) {
              (previouslyFocusedElement as HTMLElement).focus();
            } else {
              element.blur();
            }
          });
        };
      case "blur":
        return () => {
          const wasFocused = document.activeElement === element;
          element.blur();
          if (wasFocused) {
            record(() => element.focus());
          }
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
                  if (formElement.multiple) {
                    const optionSelectedStates: boolean[] = [];
                    for (let optionIndex = 0; optionIndex < formElement.options.length; optionIndex++) {
                      optionSelectedStates.push(formElement.options[optionIndex].selected);
                    }
                    formValues.set(formElement, optionSelectedStates);
                  } else {
                    formValues.set(formElement, formElement.selectedIndex);
                  }
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
                  if (formElement.multiple) {
                    const optionSelectedStates = savedValue as boolean[];
                    for (let optionIndex = 0; optionIndex < formElement.options.length; optionIndex++) {
                      formElement.options[optionIndex].selected = optionSelectedStates[optionIndex] ?? false;
                    }
                  } else {
                    formElement.selectedIndex = savedValue as number;
                  }
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
            const unwrappedSubmitter = submitter ? (unwrapProxy(submitter) as HTMLElement) : submitter;
            formTarget.requestSubmit(unwrappedSubmitter);
          }
        };
      case "setCustomValidity":
        return (message: string) => {
          const inputTarget = target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
          if ("setCustomValidity" in inputTarget) {
            const hadCustomError = inputTarget.validity.customError;
            const originalMessage = hadCustomError ? inputTarget.validationMessage : "";
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
            const actualIndex = index < 0 ? tableTarget.rows.length + index : index;
            const rowToDelete = tableTarget.rows[actualIndex];
            if (rowToDelete) {
              const rowHtml = rowToDelete.outerHTML;
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
            const actualIndex = index < 0 ? rowTarget.cells.length + index : index;
            const cellToDelete = rowTarget.cells[actualIndex];
            if (cellToDelete) {
              const cellHtml = cellToDelete.outerHTML;
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
            const unwrappedBefore = typeof before === "number" || before == null ? before : (unwrapProxy(before) as HTMLElement);
            selectTarget.add(actualElement, unwrappedBefore);
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
          return target.contains(other ? unwrapProxy(other) : null);
        };
      case "compareDocumentPosition":
        return (other: Node) => {
          return target.compareDocumentPosition(unwrapProxy(other));
        };
      case "getRootNode":
        return (options?: GetRootNodeOptions) => {
          return createElementProxy(target.getRootNode(options));
        };
      case "isEqualNode":
        return (otherNode: Node | null) => {
          return target.isEqualNode(otherNode ? unwrapProxy(otherNode) : null);
        };
      case "isSameNode":
        return (otherNode: Node | null) => {
          return target.isSameNode(otherNode ? unwrapProxy(otherNode) : null);
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
      get(target, property) {
        if (property === Symbol.toStringTag) {
          return (target as object)[Symbol.toStringTag as keyof object];
        }
        if (property === Symbol.toPrimitive) {
          const toPrimitive = (target as { [Symbol.toPrimitive]?: (hint: string) => unknown })[Symbol.toPrimitive];
          return toPrimitive?.bind(target);
        }
        if (property === Symbol.iterator && Symbol.iterator in target) {
          return (target as Iterable<unknown>)[Symbol.iterator].bind(target);
        }
        if (property === "constructor") {
          return target.constructor;
        }

        const element = target as HTMLElement;

        if (property === "style" && "style" in target) {
          return createStyleProxy(element.style);
        }
        if (property === "classList" && "classList" in target) {
          return createDOMTokenListProxy(element.classList);
        }
        if (property === "dataset" && "dataset" in target) {
          return createDatasetProxy(element.dataset);
        }
        if (property === "attributes" && "attributes" in target) {
          return createNamedNodeMapProxy(element.attributes);
        }
        if (property === "attributeStyleMap" && "attributeStyleMap" in target) {
          return createStyleMapProxy(
            (element as HTMLElement & { attributeStyleMap: StylePropertyMap }).attributeStyleMap,
          );
        }
        if (property === "shadowRoot" && "shadowRoot" in target) {
          return element.shadowRoot
            ? createElementProxy(element.shadowRoot as unknown as Node)
            : null;
        }
        if (property === "content" && target instanceof HTMLTemplateElement) {
          return createElementProxy(target.content);
        }
        if (typeof property === "string" && DOMTOKENLIST_PROPS.has(property) && property in target) {
          const tokenList = (target as unknown as Record<string, DOMTokenList>)[property];
          if (tokenList instanceof DOMTokenList) {
            return createDOMTokenListProxy(tokenList);
          }
        }
        if (property === "options" && target instanceof HTMLSelectElement) {
          return createOptionsCollectionProxy(target.options, target);
        }
        if (typeof property === "string" && NAVIGATION_PROPS.has(property)) {
          return createElementProxy(
            (target as Element)[property as keyof Element] as Node | null,
          );
        }
        if (property === "children" || property === "childNodes") {
          return createCollectionProxy(
            (target as Element)[property],
          );
        }
        if (typeof property === "string" && QUERY_METHODS_SINGLE.has(property)) {
          const elementTarget = target as Element;
          return (selector: string) => {
            const matchedElement = elementTarget[property as "querySelector" | "closest"]?.(selector);
            return matchedElement ? createElementProxy(matchedElement) : null;
          };
        }
        if (typeof property === "string" && QUERY_METHODS_COLLECTION.has(property)) {
          const elementTarget = target as Element;
          if (property === "querySelectorAll") {
            return (selector: string) => createNodeListProxy(elementTarget.querySelectorAll(selector));
          }
          if (property === "getElementsByClassName") {
            return (classNames: string) => createCollectionProxy(elementTarget.getElementsByClassName(classNames));
          }
          if (property === "getElementsByTagName") {
            return (tagName: string) => createCollectionProxy(elementTarget.getElementsByTagName(tagName));
          }
          if (property === "getElementsByTagNameNS") {
            return (namespace: string | null, localName: string) =>
              createCollectionProxy(elementTarget.getElementsByTagNameNS(namespace, localName));
          }
        }
        if (typeof property === "string" && HANDLED_METHODS.has(property)) {
          const methodHandler = getMethodHandler(target as HTMLElement | CharacterData, property);
          if (methodHandler) return methodHandler;
        }
        const propertyValue = Reflect.get(target, property);
        return typeof propertyValue === "function"
          ? propertyValue.bind(target)
          : propertyValue;
      },
      set(target, property, value) {
        if (isReadOnlyProperty(target, property)) {
          return Reflect.set(target, property, value);
        }

        const propertyName = typeof property === "string" ? property : String(property);
        const targetRecord = target as unknown as Record<string, unknown>;

        const recordPropertyUndo = () => {
          const originalValue = targetRecord[propertyName];
          record(() => {
            targetRecord[propertyName] = originalValue;
          });
        };

        if (SCROLL_PROPS.has(propertyName)) {
          recordPropertyUndo();
        } else if (FORM_PROPS.has(propertyName) && isFormElement(target)) {
          recordPropertyUndo();
        } else if (propertyName === "innerText" || propertyName === "textContent" || propertyName === "innerHTML") {
          const element = target as HTMLElement;
          const originalInnerHTML = element.innerHTML;
          record(() => {
            element.innerHTML = originalInnerHTML;
          });
        } else if (DOMTOKENLIST_PROPS.has(propertyName) && propertyName in target) {
          const tokenList = targetRecord[propertyName];
          if (tokenList instanceof DOMTokenList) {
            const originalValue = tokenList.value;
            record(() => {
              targetRecord[propertyName] = originalValue;
            });
          } else {
            recordPropertyUndo();
          }
        } else if (ELEMENT_PROPS.has(propertyName)) {
          recordPropertyUndo();
        } else if (MEDIA_PROPS.has(propertyName) && isMediaElement(target)) {
          recordPropertyUndo();
        } else if (propertyName === "outerHTML") {
          const element = target as HTMLElement;
          const parent = element.parentNode;
          const nextSibling = element.nextSibling;
          const originalOuterHTML = element.outerHTML;
          const childrenBeforeSet = parent ? Array.from(parent.childNodes) : [];

          const result = Reflect.set(target, property, value);

          const childrenAfterSet = parent ? Array.from(parent.childNodes) : [];
          const insertedNodes = childrenAfterSet.filter((child) => !childrenBeforeSet.includes(child));

          record(() => {
            for (const insertedNode of insertedNodes) {
              insertedNode.parentNode?.removeChild(insertedNode);
            }

            const tagName = element.tagName.toLowerCase();
            let restoredElement: Node | null = null;

            if (tagName === "tr") {
              const tempTable = document.createElement("table");
              tempTable.innerHTML = originalOuterHTML;
              restoredElement = tempTable.querySelector("tr");
            } else if (tagName === "td" || tagName === "th") {
              const tempTable = document.createElement("table");
              tempTable.innerHTML = `<tbody><tr>${originalOuterHTML}</tr></tbody>`;
              restoredElement = tempTable.querySelector(tagName);
            } else if (
              tagName === "thead" ||
              tagName === "tbody" ||
              tagName === "tfoot" ||
              tagName === "caption" ||
              tagName === "colgroup"
            ) {
              const tempTable = document.createElement("table");
              tempTable.innerHTML = originalOuterHTML;
              restoredElement = tempTable.querySelector(tagName);
            } else if (tagName === "col") {
              const tempTable = document.createElement("table");
              tempTable.innerHTML = `<colgroup>${originalOuterHTML}</colgroup>`;
              restoredElement = tempTable.querySelector("col");
            } else {
              const tempContainer = document.createElement("div");
              tempContainer.innerHTML = originalOuterHTML;
              restoredElement = tempContainer.firstChild;
            }

            if (restoredElement && parent) {
              parent.insertBefore(restoredElement, nextSibling);
            }
          });

          return result;
        } else {
          recordPropertyUndo();
        }

        return Reflect.set(target, property, value);
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
    node instanceof HTMLMediaElement;

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
