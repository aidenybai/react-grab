import type { OverlayBounds } from "../types.js";
import { createElementBounds } from "../utils/create-element-bounds.js";

export interface ElementComment {
  id: string;
  comment: string;
  selector: string;
  tagName: string;
  componentName?: string;
  createdAt: number;
}

interface CommentWithElement extends ElementComment {
  element: Element | null;
  bounds: OverlayBounds | null;
}

const STORAGE_KEY = "react-grab-comments";

const generateCommentId = (): string =>
  `comment-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const generateElementSelector = (element: Element): string => {
  const path: string[] = [];
  let current: Element | null = element;

  while (current && current !== document.body && current !== document.documentElement) {
    let selector = current.tagName.toLowerCase();

    if (current.id) {
      selector += `#${current.id}`;
      path.unshift(selector);
      break;
    }

    const parent = current.parentElement;
    if (parent) {
      const siblings = Array.from(parent.children).filter(
        (child) => child.tagName === current!.tagName
      );
      if (siblings.length > 1) {
        const index = siblings.indexOf(current) + 1;
        selector += `:nth-of-type(${index})`;
      }
    }

    path.unshift(selector);
    current = parent;
  }

  return path.join(" > ");
};

const findElementBySelector = (selector: string): Element | null => {
  try {
    return document.querySelector(selector);
  } catch {
    return null;
  }
};

export const loadComments = (): ElementComment[] => {
  try {
    const data = sessionStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    return JSON.parse(data) as ElementComment[];
  } catch {
    return [];
  }
};

export const saveComments = (comments: ElementComment[]): void => {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(comments));
  } catch {}
};

export const addComment = (
  element: Element,
  comment: string,
  tagName: string,
  componentName?: string
): ElementComment => {
  const comments = loadComments();
  const selector = generateElementSelector(element);

  const existingIndex = comments.findIndex((c) => c.selector === selector);

  const newComment: ElementComment = {
    id: existingIndex >= 0 ? comments[existingIndex].id : generateCommentId(),
    comment,
    selector,
    tagName,
    componentName,
    createdAt: Date.now(),
  };

  if (existingIndex >= 0) {
    comments[existingIndex] = newComment;
  } else {
    comments.push(newComment);
  }

  saveComments(comments);
  return newComment;
};

export const removeComment = (commentId: string): void => {
  const comments = loadComments();
  const filteredComments = comments.filter((c) => c.id !== commentId);
  saveComments(filteredComments);
};

export const clearAllComments = (): void => {
  saveComments([]);
};

export const getCommentsWithElements = (): CommentWithElement[] => {
  const comments = loadComments();
  return comments.map((comment) => {
    const element = findElementBySelector(comment.selector);
    const bounds = element ? createElementBounds(element) : null;
    return {
      ...comment,
      element,
      bounds,
    };
  });
};

export const getCommentCount = (): number => {
  return loadComments().length;
};

export const generateCommentedContent = (): string => {
  const commentsWithElements = getCommentsWithElements();
  const validComments = commentsWithElements.filter((c) => c.element !== null);

  if (validComments.length === 0) return "";

  const contentParts = validComments.map((commentData) => {
    const elementName = commentData.componentName
      ? `<${commentData.componentName}>`
      : `<${commentData.tagName}>`;
    return `[${elementName}] ${commentData.comment}`;
  });

  return contentParts.join("\n\n");
};
