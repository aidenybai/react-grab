export function find(node, predicate) {
  let current = node;
  while (current) {
    if (predicate(current)) {
      return current;
    }
    current = current.parent;
  }
  return null;
}
export function findParent(node, predicate) {
  return node?.parent ? find(node.parent, predicate) : null;
}
