export function trace(node, context) {
  let current = node;
  const visited = new Set();
  while (current?.type === "Identifier" && !visited.has(current)) {
    visited.add(current);
    const sourceCode = context.sourceCode ?? context.getSourceCode?.();
    const scope = sourceCode?.getScope?.(current) ?? context.getScope?.();
    const variable = scope?.set?.get?.(current.name);
    const definition = variable?.defs?.[0];
    const declNode = definition?.node;
    if (
      declNode?.type === "VariableDeclarator" &&
      declNode.id?.type === "Identifier" &&
      declNode.init
    ) {
      const declarationKind = declNode.parent?.kind;
      const isStableConst = declarationKind === "const";
      const isReadonlyRef = variable?.references?.every?.((ref) => ref.init || ref.isReadOnly?.());
      if (isStableConst || isReadonlyRef) {
        current = declNode.init;
        continue;
      }
    }
    break;
  }
  return current;
}
