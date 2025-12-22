const ANCESTOR_LEVELS = 5;

type UndoAction = () => void;

export const createUndoableProxy = (element: HTMLElement) => {
  const undoActions: UndoAction[] = [];
  const record = (action: UndoAction) => undoActions.push(action);

  const removeNodes = (nodes: (Node | string)[]) => {
    for (const node of nodes) {
      if (typeof node !== "string") node.parentNode?.removeChild(node);
    }
  };

  const wrapNodeInsertion = <T extends (...args: (Node | string)[]) => void>(
    method: T,
  ): T =>
    ((...nodes: (Node | string)[]) => {
      method(...nodes);
      record(() => removeNodes(nodes));
    }) as T;

  const styleProxy = new Proxy(element.style, {
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

  const classListProxy = new Proxy(element.classList, {
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

  const datasetProxy = new Proxy(element.dataset, {
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
          const result = target.appendChild(child);
          record(() => child.parentNode?.removeChild(child));
          return result;
        };
      case "removeChild":
        return (child: Node) => {
          const nextSibling = child.nextSibling;
          const result = target.removeChild(child);
          record(() => target.insertBefore(child, nextSibling));
          return result;
        };
      case "insertBefore":
        return (node: Node, referenceNode: Node | null) => {
          const result = target.insertBefore(node, referenceNode);
          record(() => node.parentNode?.removeChild(node));
          return result;
        };
      case "replaceChild":
        return (newChild: Node, oldChild: Node) => {
          const nextSibling = oldChild.nextSibling;
          const result = target.replaceChild(newChild, oldChild);
          record(() => {
            target.replaceChild(oldChild, newChild);
            if (nextSibling && oldChild.nextSibling !== nextSibling) {
              target.insertBefore(oldChild, nextSibling);
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
          const parentNode = target.parentNode;
          const nextSibling = target.nextSibling;
          target.replaceWith(...nodes);
          record(() => {
            const firstNode = nodes.find((node) => typeof node !== "string") as
              | Node
              | undefined;
            if (parentNode) {
              parentNode.insertBefore(target, firstNode ?? nextSibling);
              removeNodes(nodes);
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
          const result = target.insertAdjacentElement(
            position,
            insertedElement,
          );
          if (result) record(() => result.parentNode?.removeChild(result));
          return result;
        };
      default:
        return null;
    }
  };

  const handledMethods = new Set([
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

  const proxy = new Proxy(element, {
    get(target, prop) {
      if (prop === "style") return styleProxy;
      if (prop === "classList") return classListProxy;
      if (prop === "dataset") return datasetProxy;
      if (typeof prop === "string" && handledMethods.has(prop)) {
        return getMethodHandler(target, prop);
      }
      const value = Reflect.get(target, prop);
      return typeof value === "function" ? value.bind(target) : value;
    },
    set(target, prop, value) {
      if (typeof prop === "string") {
        const original = (target as unknown as Record<string, unknown>)[prop];
        record(() => {
          (target as unknown as Record<string, unknown>)[prop] = original;
        });
      }
      return Reflect.set(target, prop, value);
    },
  }) as HTMLElement;

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
