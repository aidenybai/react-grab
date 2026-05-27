export function trackImports(fromModule = /^solid-js(?:\/?|\b)/) {
  const importMap = new Map();
  return {
    handleImportDeclaration(node) {
      if (node?.type !== "ImportDeclaration" || typeof node.source?.value !== "string") {
        return;
      }
      if (!fromModule.test(node.source.value)) {
        return;
      }
      for (const specifier of node.specifiers ?? []) {
        if (
          specifier?.type === "ImportSpecifier" &&
          specifier.imported?.type === "Identifier" &&
          specifier.local?.type === "Identifier"
        ) {
          importMap.set(specifier.imported.name, specifier.local.name);
        }
      }
    },
    matchImport(imports, localName) {
      const candidates = Array.isArray(imports) ? imports : [imports];
      return candidates.find((importName) => importMap.get(importName) === localName);
    },
    clear() {
      importMap.clear();
    },
  };
}
