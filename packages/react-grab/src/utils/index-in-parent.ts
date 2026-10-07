// Position of an element among its parent's element children, used to record
// and replay a DOM path. Counts previous siblings rather than borrowing
// Array.prototype.indexOf against the live HTMLCollection.
export const indexInParent = (element: Element): number => {
  let index = 0;
  let sibling = element.previousElementSibling;
  while (sibling) {
    index += 1;
    sibling = sibling.previousElementSibling;
  }
  return index;
};
