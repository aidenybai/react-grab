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

const HANDLED_METHODS = new Set([
  "setAttribute",
  "removeAttribute",
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
  "insertAdjacentHTML",
  "insertAdjacentElement",
]);

export const createUndoableProxy = (element: HTMLElement) => {
  const undoActions: UndoAction[] = [];
  const record = (action: UndoAction) => undoActions.push(action);
  const proxyToElement = new WeakMap<object, Node>();

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

  const getMethodHandler = (target: HTMLElement, prop: string) => {
    switch (prop) {
      case "setAttribute":
        return (name: string, value: string) => {
          const hadAttribute = target.hasAttribute(name);
          const original = target.getAttribute(name);
          record(() =>
            hadAttribute
              ? target.setAttribute(name, original!)
              : target.removeAttribute(name),
          );
          return target.setAttribute(name, value);
        };
      case "removeAttribute":
        return (name: string) => {
          if (target.hasAttribute(name)) {
            const original = target.getAttribute(name)!;
            record(() => target.setAttribute(name, original));
          }
          return target.removeAttribute(name);
        };
      case "appendChild":
        return (child: Node) => {
          const actualChild = unwrapProxy(child);
          const result = target.appendChild(actualChild);
          record(() => actualChild.parentNode?.removeChild(actualChild));
          return result;
        };
      case "removeChild":
        return (child: Node) => {
          const actualChild = unwrapProxy(child);
          const nextSibling = actualChild.nextSibling;
          const result = target.removeChild(actualChild);
          record(() => target.insertBefore(actualChild, nextSibling));
          return result;
        };
      case "insertBefore":
        return (node: Node, referenceNode: Node | null) => {
          const actualNode = unwrapProxy(node);
          const actualRef = referenceNode ? unwrapProxy(referenceNode) : null;
          const result = target.insertBefore(actualNode, actualRef);
          record(() => actualNode.parentNode?.removeChild(actualNode));
          return result;
        };
      case "replaceChild":
        return (newChild: Node, oldChild: Node) => {
          const actualNewChild = unwrapProxy(newChild);
          const actualOldChild = unwrapProxy(oldChild);
          const nextSibling = actualOldChild.nextSibling;
          const result = target.replaceChild(actualNewChild, actualOldChild);
          record(() => {
            target.replaceChild(actualOldChild, actualNewChild);
            if (nextSibling && actualOldChild.nextSibling !== nextSibling) {
              target.insertBefore(actualOldChild, nextSibling);
            }
          });
          return result;
        };
      case "remove":
        return () => {
          const parentNode = target.parentNode;
          const nextSibling = target.nextSibling;
          target.remove();
          record(() => parentNode?.insertBefore(target, nextSibling));
        };
      case "append":
        return wrapNodeInsertion(target.append.bind(target));
      case "prepend":
        return wrapNodeInsertion(target.prepend.bind(target));
      case "after":
        return wrapNodeInsertion(target.after.bind(target));
      case "before":
        return wrapNodeInsertion(target.before.bind(target));
      case "replaceWith":
        return (...nodes: (Node | string)[]) => {
          const unwrappedNodes = unwrapNodes(nodes);
          const parentNode = target.parentNode;
          const nextSibling = target.nextSibling;
          target.replaceWith(...unwrappedNodes);
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
      case "insertAdjacentHTML":
        return (position: InsertPosition, html: string) => {
          const childrenBefore = Array.from(target.childNodes);
          const siblingsBefore = target.parentNode
            ? Array.from(target.parentNode.childNodes)
            : [];
          target.insertAdjacentHTML(position, html);
          const addedChildren = Array.from(target.childNodes).filter(
            (node) => !childrenBefore.includes(node),
          );
          const addedSiblings = target.parentNode
            ? Array.from(target.parentNode.childNodes).filter(
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
          const actualElement = unwrapProxy(insertedElement) as Element;
          const result = target.insertAdjacentElement(position, actualElement);
          if (result) record(() => result.parentNode?.removeChild(result));
          return result;
        };
      default:
        return null;
    }
  };

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
        const collectionValue = Reflect.get(collectionTarget, collectionProp);
        return typeof collectionValue === "function"
          ? collectionValue.bind(collectionTarget)
          : collectionValue;
      },
    });

  const createElementProxy = (node: Node | null): Node | null => {
    if (!node) return null;

    const nodeProxy = new Proxy(node, {
      get(nodeTarget, nodeProp) {
        if (nodeProp === "style" && "style" in nodeTarget) {
          return createStyleProxy((nodeTarget as HTMLElement).style);
        }
        if (nodeProp === "classList" && "classList" in nodeTarget) {
          return createClassListProxy((nodeTarget as HTMLElement).classList);
        }
        if (nodeProp === "dataset" && "dataset" in nodeTarget) {
          return createDatasetProxy((nodeTarget as HTMLElement).dataset);
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
        if (
          typeof nodeProp === "string" &&
          HANDLED_METHODS.has(nodeProp) &&
          "style" in nodeTarget
        ) {
          return getMethodHandler(nodeTarget as HTMLElement, nodeProp);
        }
        const nodeValue = Reflect.get(nodeTarget, nodeProp);
        return typeof nodeValue === "function"
          ? nodeValue.bind(nodeTarget)
          : nodeValue;
      },
      set(nodeTarget, nodeProp, value) {
        if (typeof nodeProp === "string") {
          const original = (nodeTarget as unknown as Record<string, unknown>)[
            nodeProp
          ];
          record(() => {
            (nodeTarget as unknown as Record<string, unknown>)[nodeProp] =
              original;
          });
        }
        return Reflect.set(nodeTarget, nodeProp, value);
      },
    });

    proxyToElement.set(nodeProxy, node);
    return nodeProxy;
  };

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
