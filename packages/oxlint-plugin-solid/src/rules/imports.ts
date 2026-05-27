const primitiveMap = new Map();
for (const p of [
  "createSignal",
  "createEffect",
  "createMemo",
  "createResource",
  "onMount",
  "onCleanup",
  "onError",
  "untrack",
  "batch",
  "on",
  "createRoot",
  "getOwner",
  "runWithOwner",
  "mergeProps",
  "splitProps",
  "useTransition",
  "observable",
  "from",
  "mapArray",
  "indexArray",
  "createContext",
  "useContext",
  "children",
  "lazy",
  "createUniqueId",
  "createDeferred",
  "createRenderEffect",
  "createComputed",
  "createReaction",
  "createSelector",
  "DEV",
  "For",
  "Show",
  "Switch",
  "Match",
  "Index",
  "ErrorBoundary",
  "Suspense",
  "SuspenseList",
])
  primitiveMap.set(p, "solid-js");
for (const p of [
  "Portal",
  "render",
  "hydrate",
  "renderToString",
  "renderToStream",
  "isServer",
  "renderToStringAsync",
  "generateHydrationScript",
  "HydrationScript",
  "Dynamic",
])
  primitiveMap.set(p, "solid-js/web");
for (const p of ["createStore", "produce", "reconcile", "unwrap", "createMutable", "modifyMutable"])
  primitiveMap.set(p, "solid-js/store");
const typeMap = new Map();
for (const t of [
  "Signal",
  "Accessor",
  "Setter",
  "Resource",
  "ResourceActions",
  "ResourceOptions",
  "ResourceReturn",
  "ResourceFetcher",
  "InitializedResourceReturn",
  "Component",
  "VoidProps",
  "VoidComponent",
  "ParentProps",
  "ParentComponent",
  "FlowProps",
  "FlowComponent",
  "ValidComponent",
  "ComponentProps",
  "Ref",
  "MergeProps",
  "SplitPrips",
  "Context",
  "JSX",
  "ResolvedChildren",
  "MatchProps",
])
  typeMap.set(t, "solid-js");
for (const t of ["MountableElement"]) typeMap.set(t, "solid-js/web");
for (const t of ["StoreNode", "Store", "SetStoreFunction"]) typeMap.set(t, "solid-js/store");
const sourceRegex = /^solid-js(?:\/web|\/store)?$/;
const isSource = (source) => sourceRegex.test(source);
const ruleDefinition = {
  meta: {
    type: "suggestion",
    docs: {
      description:
        'Enforce consistent imports from "solid-js", "solid-js/web", and "solid-js/store".',
      recommended: "error",
    },
    fixable: "code",
    schema: [],
    messages: {
      "prefer-source": 'Prefer importing {{name}} from "{{source}}".',
    },
  },
  defaultOptions: [],
  createOnce(context) {
    return {
      ImportDeclaration(node) {
        const source = node.source?.value;
        if (!isSource(source)) return;
        for (const specifier of node.specifiers ?? []) {
          if (specifier.type === "ImportSpecifier") {
            const isType = specifier.importKind === "type" || node.importKind === "type";
            const map = isType ? typeMap : primitiveMap;
            const correctSource = map.get(specifier.imported?.name);
            if (correctSource != null && correctSource !== source) {
              context.report({
                node: specifier,
                messageId: "prefer-source",
                data: { name: specifier.imported.name, source: correctSource },
                fix(fixer) {
                  const sourceCode = context.sourceCode;
                  const program = sourceCode.ast;
                  const correctDeclaration = program.body.find(
                    (n) => n.type === "ImportDeclaration" && n.source?.value === correctSource,
                  );
                  const specText = sourceCode.getText(specifier);
                  if (correctDeclaration) {
                    const lastSpecifier =
                      correctDeclaration.specifiers[correctDeclaration.specifiers.length - 1];
                    const removeResult2 = removeSpecifierFromNode(
                      fixer,
                      sourceCode,
                      specifier,
                      node,
                    );
                    if (!removeResult2) return null;
                    return [removeResult2, fixer.insertTextAfter(lastSpecifier, `, ${specText}`)];
                  }
                  const firstSolidDecl = program.body.find(
                    (n) => n.type === "ImportDeclaration" && isSource(n.source?.value),
                  );
                  const removeResult = removeSpecifierFromNode(fixer, sourceCode, specifier, node);
                  if (!removeResult) return null;
                  const importKind = isType ? "type " : "";
                  const newImport = `import ${importKind}{ ${specText} } from "${correctSource}";
`;
                  return [
                    removeResult,
                    firstSolidDecl
                      ? fixer.insertTextBefore(firstSolidDecl, newImport)
                      : fixer.insertTextBeforeRange([0, 0], newImport),
                  ];
                },
              });
            }
          }
        }
      },
    };
  },
};
function removeSpecifierFromNode(fixer, sourceCode, specifier, declaration) {
  const specifiers = declaration.specifiers ?? [];
  if (specifiers.length === 1) {
    return fixer.remove(declaration);
  }
  const index = specifiers.indexOf(specifier);
  if (index === specifiers.length - 1) {
    const tokenBefore = sourceCode.getTokenBefore(specifier);
    return fixer.removeRange([tokenBefore.range[0], specifier.range[1]]);
  }
  const tokenAfter = sourceCode.getTokenAfter(specifier);
  return fixer.removeRange([specifier.range[0], tokenAfter.range[1]]);
}

export default ruleDefinition;
