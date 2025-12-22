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

export const createUndoableProxy = (element: HTMLElement) => {
  const undoActions: UndoAction[] = [];
  const record = (action: UndoAction) => undoActions.push(action);
  const proxyToElement = new WeakMap<object, Node>();
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

  const wrapNodeInsertion = <T extends (...args: (Node | string)[]) => void>(
    method: T,
  ): T =>
    ((...nodes: (Node | string)[]) => {
      const unwrappedNodes = unwrapNodes(nodes);
      method(...unwrappedNodes);
      record(() => removeNodes(unwrappedNodes));
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

  const createClassListProxy = (classListTarget: DOMTokenList) =>
    new Proxy(classListTarget, {
      get(target, prop) {
        if (prop === "add")
          return (...classes: string[]) => {
            const toUndo = classes.filter(
              (classToAdd) => !target.contains(classToAdd),
            );
            record(() => target.remove(...toUndo));
            return target.add(...classes);
          };
        if (prop === "remove")
          return (...classes: string[]) => {
            const toRestore = classes.filter((classToRemove) =>
              target.contains(classToRemove),
            );
            record(() => target.add(...toRestore));
            return target.remove(...classes);
          };
        if (prop === "toggle")
          return (className: string, force?: boolean) => {
            const hadClass = target.contains(className);
            const result = target.toggle(className, force);
            record(() =>
              hadClass ? target.add(className) : target.remove(className),
            );
            return result;
          };
        if (prop === "replace")
          return (oldClassName: string, newClassName: string) => {
            const hadOldClass = target.contains(oldClassName);
            const result = target.replace(oldClassName, newClassName);
            if (hadOldClass)
              record(() => {
                target.remove(newClassName);
                target.add(oldClassName);
              });
            return result;
          };
        const value = Reflect.get(target, prop);
        return typeof value === "function" ? value.bind(target) : value;
      },
    });

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
    collection: HTMLCollection | NodeListOf<ChildNode>,
  ) =>
    new Proxy(collection, {
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
          const result = htmlTarget.toggleAttribute(name, force);
          record(() => {
            if (hadAttribute) {
              htmlTarget.setAttribute(name, "");
            } else {
              htmlTarget.removeAttribute(name);
            }
          });
          return result;
        };
      case "setAttributeNS":
        return (namespace: string | null, name: string, value: string) => {
          const htmlTarget = target as HTMLElement;
          const hadAttribute = htmlTarget.hasAttributeNS(namespace, name);
          const original = htmlTarget.getAttributeNS(namespace, name);
          record(() =>
            hadAttribute
              ? htmlTarget.setAttributeNS(namespace, name, original!)
              : htmlTarget.removeAttributeNS(namespace, name),
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
          const result = (target as HTMLElement).appendChild(actualChild);
          record(() => actualChild.parentNode?.removeChild(actualChild));
          return result;
        };
      case "removeChild":
        return (child: Node) => {
          const actualChild = unwrapProxy(child);
          const nextSibling = actualChild.nextSibling;
          const result = (target as HTMLElement).removeChild(actualChild);
          record(() =>
            (target as HTMLElement).insertBefore(actualChild, nextSibling),
          );
          return result;
        };
      case "insertBefore":
        return (node: Node, referenceNode: Node | null) => {
          const actualNode = unwrapProxy(node);
          const actualRef = referenceNode ? unwrapProxy(referenceNode) : null;
          const result = (target as HTMLElement).insertBefore(
            actualNode,
            actualRef,
          );
          record(() => actualNode.parentNode?.removeChild(actualNode));
          return result;
        };
      case "replaceChild":
        return (newChild: Node, oldChild: Node) => {
          const actualNewChild = unwrapProxy(newChild);
          const actualOldChild = unwrapProxy(oldChild);
          const nextSibling = actualOldChild.nextSibling;
          const result = (target as HTMLElement).replaceChild(
            actualNewChild,
            actualOldChild,
          );
          record(() => {
            (target as HTMLElement).replaceChild(actualOldChild, actualNewChild);
            if (nextSibling && actualOldChild.nextSibling !== nextSibling) {
              (target as HTMLElement).insertBefore(actualOldChild, nextSibling);
            }
          });
          return result;
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
          (target as HTMLElement).replaceWith(...unwrappedNodes);
          record(() => {
            const firstNode = unwrappedNodes.find(
              (node) => typeof node !== "string",
            ) as Node | undefined;
            if (parentNode) {
              parentNode.insertBefore(target, firstNode ?? nextSibling);
              removeNodes(unwrappedNodes);
            }
          });
        };
      case "replaceChildren":
        return (...nodes: (Node | string)[]) => {
          const htmlTarget = target as HTMLElement;
          const unwrappedNodes = unwrapNodes(nodes);
          const originalChildren = Array.from(htmlTarget.childNodes);
          htmlTarget.replaceChildren(...unwrappedNodes);
          record(() => {
            htmlTarget.replaceChildren(...originalChildren);
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
          const result = htmlTarget.insertAdjacentElement(
            position,
            actualElement,
          );
          if (result) record(() => result.parentNode?.removeChild(result));
          return result;
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
          const textNodeData: { parent: Node; data: string; nextSibling: Node | null }[] = [];
          const walker = document.createTreeWalker(
            htmlTarget,
            NodeFilter.SHOW_TEXT,
          );
          let currentTextNode = walker.nextNode();
          while (currentTextNode) {
            textNodeData.push({
              parent: currentTextNode.parentNode!,
              data: (currentTextNode as Text).data,
              nextSibling: currentTextNode.nextSibling,
            });
            currentTextNode = walker.nextNode();
          }
          htmlTarget.normalize();
          record(() => {
            for (const { parent, data, nextSibling } of textNodeData) {
              const newTextNode = document.createTextNode(data);
              parent.insertBefore(newTextNode, nextSibling);
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
      case "close":
        return (returnValue?: string) => {
          const dialogTarget = target as HTMLDialogElement;
          if ("close" in dialogTarget) {
            const wasOpen = dialogTarget.open;
            const wasModal = dialogTarget.hasAttribute("open");
            dialogTarget.close(returnValue);
            if (wasOpen) {
              record(() => {
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

  const createElementProxy = (node: Node | null): Node | null => {
    if (!node) return null;

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
        if (typeof nodeProp === "string") {
          if (SCROLL_PROPS.has(nodeProp)) {
            const original = (nodeTarget as HTMLElement)[
              nodeProp as "scrollTop" | "scrollLeft"
            ];
            record(() => {
              (nodeTarget as HTMLElement)[nodeProp as "scrollTop" | "scrollLeft"] =
                original;
            });
          } else if (
            FORM_PROPS.has(nodeProp) &&
            isFormElement(nodeTarget as Node)
          ) {
            const original = (
              nodeTarget as unknown as Record<string, unknown>
            )[nodeProp];
            record(() => {
              (nodeTarget as unknown as Record<string, unknown>)[nodeProp] =
                original;
            });
          } else if (
            nodeProp === "nodeValue" ||
            nodeProp === "textContent" ||
            nodeProp === "data"
          ) {
            const original = (
              nodeTarget as unknown as Record<string, unknown>
            )[nodeProp];
            record(() => {
              (nodeTarget as unknown as Record<string, unknown>)[nodeProp] =
                original;
            });
          } else if (nodeProp === "innerHTML" || nodeProp === "outerHTML") {
            const htmlTarget = nodeTarget as HTMLElement;
            if (nodeProp === "innerHTML") {
              const originalHTML = htmlTarget.innerHTML;
              record(() => {
                htmlTarget.innerHTML = originalHTML;
              });
            } else {
              const parentNode = htmlTarget.parentNode;
              const nextSibling = htmlTarget.nextSibling;
              const originalOuterHTML = htmlTarget.outerHTML;
              record(() => {
                const tempContainer = document.createElement("div");
                tempContainer.innerHTML = originalOuterHTML;
                const restoredElement = tempContainer.firstChild;
                if (restoredElement && parentNode) {
                  parentNode.insertBefore(restoredElement, nextSibling);
                }
              });
            }
          } else {
            const original = (
              nodeTarget as unknown as Record<string, unknown>
            )[nodeProp];
            record(() => {
              (nodeTarget as unknown as Record<string, unknown>)[nodeProp] =
                original;
            });
          }
        }
        return Reflect.set(nodeTarget, nodeProp, value);
      },
    });

    proxyToElement.set(nodeProxy, node);
    return nodeProxy;
  };

  const isFormElement = (node: Node): boolean =>
    node instanceof HTMLInputElement ||
    node instanceof HTMLTextAreaElement ||
    node instanceof HTMLSelectElement ||
    node instanceof HTMLOptionElement;

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
