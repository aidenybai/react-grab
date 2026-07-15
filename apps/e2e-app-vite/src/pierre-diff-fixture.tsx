import { MultiFileDiff } from "@pierre/diffs/react";

const OLD_FILE = {
  name: "small-input.tsx",
  contents: `import React, { ChangeEventHandler, useCallback, useEffect, useState } from 'react'

const SmallInput = () => <input aria-label="Small input" />

export default SmallInput
`,
};

const NEW_FILE = {
  name: "small-input.tsx",
  contents: `import React, { ChangeEventHandler, KeyboardEventHandler, useState } from 'react'

const SmallInput = () => <input aria-label="Small input" />

export default SmallInput
`,
};

export const PierreDiff = () => (
  <MultiFileDiff
    oldFile={OLD_FILE}
    newFile={NEW_FILE}
    options={{ theme: "pierre-dark", diffStyle: "split" }}
    disableWorkerPool
  />
);

export const PierreDiffFixture = () => (
  <section className="border rounded-lg p-4" data-testid="pierre-diff-section">
    <h2 className="text-lg font-bold mb-4">Pierre Shadow DOM Diff</h2>
    <PierreDiff />
  </section>
);

export const PierreDiffPreview = () => (
  <main className="min-h-screen bg-slate-950 p-4 text-white">
    <header className="mb-3 flex items-center justify-between">
      <div>
        <p className="text-sm font-semibold">SmallInput.tsx</p>
        <p className="text-xs text-slate-500">Import cleanup</p>
      </div>
      <span className="rounded-full border border-violet-400/30 bg-violet-400/10 px-2 py-1 text-xs text-violet-300">
        Pierre
      </span>
    </header>
    <PierreDiff />
  </main>
);
