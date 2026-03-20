"use client";

import { useState } from "react";

const SampleCard = ({
  title,
  description,
  color,
}: {
  title: string;
  description: string;
  color: string;
}) => (
  <div
    className="rounded-xl border border-white/10 p-6"
    style={{ backgroundColor: color }}
  >
    <h3 className="text-lg font-semibold text-white">{title}</h3>
    <p className="mt-2 text-sm text-white/70">{description}</p>
  </div>
);

SampleCard.displayName = "SampleCard";

const SampleTable = () => (
  <table className="w-full text-left text-sm">
    <thead>
      <tr className="border-b border-white/10">
        <th className="py-3 pr-4 font-medium text-white/50">MIME Type</th>
        <th className="py-3 pr-4 font-medium text-white/50">Content</th>
        <th className="py-3 font-medium text-white/50">Used By</th>
      </tr>
    </thead>
    <tbody className="text-white/80">
      <tr className="border-b border-white/5">
        <td className="py-3 pr-4 font-mono text-xs text-emerald-400">
          text/plain
        </td>
        <td className="py-3 pr-4">Code only</td>
        <td className="py-3 text-white/50">Code editors</td>
      </tr>
      <tr className="border-b border-white/5">
        <td className="py-3 pr-4 font-mono text-xs text-sky-400">text/html</td>
        <td className="py-3 pr-4">Screenshot + code</td>
        <td className="py-3 text-white/50">Rich text (Cursor chat, Slack)</td>
      </tr>
      <tr>
        <td className="py-3 pr-4 font-mono text-xs text-amber-400">
          image/png
        </td>
        <td className="py-3 pr-4">Screenshot only</td>
        <td className="py-3 text-white/50">Image viewers</td>
      </tr>
    </tbody>
  </table>
);

SampleTable.displayName = "SampleTable";

const PasteTarget = () => {
  const [pastedItems, setPastedItems] = useState<
    { type: string; preview: string }[]
  >([]);

  const handlePaste = (event: React.ClipboardEvent) => {
    event.preventDefault();
    const items: { type: string; preview: string }[] = [];

    for (const type of event.clipboardData.types) {
      if (type === "Files") continue;

      const data = event.clipboardData.getData(type);
      items.push({
        type,
        preview: data.length > 300 ? `${data.slice(0, 300)}…` : data,
      });
    }

    const files = event.clipboardData.files;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      items.push({
        type: file.type || "unknown file",
        preview: `${file.name} (${(file.size / 1024).toFixed(1)} KB)`,
      });
    }

    setPastedItems(items);
  };

  return (
    <div className="rounded-xl border border-dashed border-white/20 bg-white/5 p-6">
      <div
        contentEditable
        suppressContentEditableWarning
        onPaste={handlePaste}
        className="min-h-[120px] rounded-lg border border-white/10 bg-black/30 p-4 text-sm text-white/70 outline-none focus:border-white/30"
        data-placeholder="Paste here to inspect clipboard contents…"
      />
      {pastedItems.length > 0 && (
        <div className="mt-4 space-y-2">
          <p className="text-xs font-medium uppercase tracking-wider text-white/40">
            Clipboard Contents
          </p>
          {pastedItems.map((item, index) => (
            <div
              key={index}
              className="rounded-lg border border-white/10 bg-black/20 p-3"
            >
              <span className="font-mono text-xs text-emerald-400">
                {item.type}
              </span>
              <pre className="mt-1 max-h-[200px] overflow-auto whitespace-pre-wrap text-xs text-white/60">
                {item.preview}
              </pre>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

PasteTarget.displayName = "PasteTarget";

const TestScreenshotPage = () => {
  return (
    <div className="min-h-screen bg-black px-4 py-12 text-white sm:px-8">
      <div className="mx-auto max-w-3xl space-y-12">
        <div>
          <h1 className="text-2xl font-bold">Copy with Screenshot Test</h1>
          <p className="mt-2 text-white/50">
            Activate React&nbsp;Grab, right-click any element below, &amp;
            choose{" "}
            <kbd className="rounded border border-white/20 bg-white/10 px-1.5 py-0.5 font-mono text-xs">
              S
            </kbd>{" "}
            Copy with screenshot. Then paste into the box at the bottom.
          </p>
        </div>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-white/80">Sample Cards</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <SampleCard
              title="Sidebar Navigation"
              description="A collapsible sidebar with nested links, icons, and active state indicators."
              color="#1a1a2e"
            />
            <SampleCard
              title="Data Table"
              description="Sortable, filterable table with pagination, row selection, and inline editing."
              color="#16213e"
            />
            <SampleCard
              title="Auth Flow"
              description="Login, signup, password reset with OAuth providers and magic link support."
              color="#0f3460"
            />
            <SampleCard
              title="Dashboard Chart"
              description="Interactive area chart with tooltips, zoom, and responsive breakpoints."
              color="#1a1a3e"
            />
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-white/80">
            MIME Type Reference
          </h2>
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <SampleTable />
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-white/80">
            Code Snippet
          </h2>
          <pre className="overflow-auto rounded-xl border border-white/10 bg-white/5 p-6 font-mono text-sm leading-relaxed text-emerald-300">
            {`const copyContentWithImage = async (options) => {
  const clipboardItem = new ClipboardItem({
    "text/plain": new Blob([content], { type: "text/plain" }),
    "text/html":  new Blob([html],    { type: "text/html" }),
    "image/png":  imageBlob,
  });
  await navigator.clipboard.write([clipboardItem]);
};`}
          </pre>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-white/80">
            Paste Inspector
          </h2>
          <p className="text-sm text-white/40">
            After copying with screenshot, paste here to see all MIME types that
            landed on the clipboard.
          </p>
          <PasteTarget />
        </section>
      </div>
    </div>
  );
};

TestScreenshotPage.displayName = "TestScreenshotPage";

export default TestScreenshotPage;
