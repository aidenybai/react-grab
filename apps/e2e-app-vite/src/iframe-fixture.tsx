const IFRAME_SOURCE = `<!doctype html>
<html>
  <head>
    <style>
      :root { color: #172033; font-family: Inter, ui-sans-serif, system-ui, sans-serif; }
      * { box-sizing: border-box; }
      body { margin: 0; background: #f4f6fb; }
      nav { display: flex; align-items: center; justify-content: space-between; padding: 18px 28px; background: white; border-bottom: 1px solid #e4e8f0; }
      nav strong { letter-spacing: -0.03em; }
      nav span { color: #68738a; font-size: 13px; }
      main { padding: 48px 28px; }
      .eyebrow { color: #5b5bd6; font-size: 12px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; }
      h1 { max-width: 620px; margin: 12px 0; font-size: 38px; line-height: 1.05; letter-spacing: -0.04em; }
      .lede { max-width: 560px; color: #5c667b; font-size: 16px; line-height: 1.6; }
      .actions { display: flex; gap: 10px; margin: 24px 0 36px; }
      button { padding: 11px 16px; border: 0; border-radius: 8px; background: #25263b; color: white; font: inherit; font-weight: 650; }
      .secondary { border: 1px solid #d7dce6; background: white; color: #30384a; }
      .features { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
      .feature { padding: 18px; border: 1px solid #e1e5ed; border-radius: 12px; background: white; }
      .feature b { display: block; margin-bottom: 6px; font-size: 14px; }
      .feature p { margin: 0; color: #727c90; font-size: 13px; line-height: 1.5; }
    </style>
  </head>
  <body>
    <nav>
      <strong>Northstar</strong>
      <span>Product preview</span>
    </nav>
    <main data-testid="iframe-main">
      <div class="eyebrow">Workspace intelligence</div>
      <h1>Make every project easier to understand.</h1>
      <p class="lede">A fictional product page rendered inside the preview canvas. Select any element here without leaving the editor shell.</p>
      <div class="actions">
        <button data-testid="iframe-target" style="border-radius: 8px 12px / 16px 20px">Start a workspace</button>
        <button class="secondary">View a demo</button>
      </div>
      <div class="features">
        <article class="feature"><b>Shared context</b><p>Keep decisions and references next to the work.</p></article>
        <article class="feature"><b>Fast handoffs</b><p>Give collaborators a clear place to begin.</p></article>
        <article class="feature"><b>Useful history</b><p>See how a project changed without digging.</p></article>
      </div>
      <iframe-shadow-fixture></iframe-shadow-fixture>
    </main>
    <script>
      customElements.define("iframe-shadow-fixture", class extends HTMLElement {
        connectedCallback() {
          if (this.shadowRoot) return
          this.attachShadow({ mode: "open" }).innerHTML =
            '<button data-testid="iframe-shadow-target">Iframe shadow target</button>'
        }
      })
    </script>
  </body>
</html>`;

const SANDBOXED_IFRAME_SOURCE = `<!doctype html>
<html>
  <body style="margin: 0; padding: 20px">
    <button data-testid="sandboxed-iframe-target" style="padding: 12px">
      Sandboxed opaque-origin target
    </button>
  </body>
</html>`;

export const IframeFixture = () => (
  <section
    className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
    data-testid="iframe-section"
  >
    <header className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
      <div>
        <p className="text-sm font-semibold text-slate-900">Canvas</p>
        <p className="text-xs text-slate-500">Fictional page builder fixture</p>
      </div>
      <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">
        Preview ready
      </span>
    </header>

    <div className="grid md:grid-cols-4">
      <aside className="border-b border-slate-800 bg-slate-950 p-4 text-slate-300 md:border-b-0 md:border-r">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Pages</p>
        <button
          type="button"
          className="mb-5 w-full rounded-md bg-slate-800 px-3 py-2 text-left text-sm font-medium text-white"
        >
          Landing page
        </button>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
          Sections
        </p>
        <div className="space-y-1 text-sm">
          <div className="rounded px-3 py-2 text-slate-200">Navigation</div>
          <div className="rounded px-3 py-2 text-slate-200">Hero</div>
          <div className="rounded px-3 py-2 text-slate-200">Feature grid</div>
          <div className="rounded bg-violet-500/10 px-3 py-2 text-violet-300">Code diff</div>
        </div>
      </aside>

      <div className="bg-slate-100 p-4 md:col-span-3">
        <div className="mb-3 flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          preview.local/landing
        </div>
        <iframe
          title="HTML page preview"
          data-testid="same-origin-iframe"
          srcDoc={IFRAME_SOURCE}
          className="h-[32rem] w-full rounded-lg border border-slate-300 bg-white shadow-sm"
        />
        <div className="mt-4 overflow-hidden rounded-lg border border-slate-300 bg-slate-950 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-700 px-3 py-2 text-xs">
            <span className="font-medium text-slate-200">Pull request diff</span>
            <span className="text-slate-500">Same-origin iframe + Shadow DOM</span>
          </div>
          <iframe
            title="Pierre diff iframe preview"
            data-testid="iframe-pierre-diff"
            src="/?iframe-diff-preview"
            className="h-[28rem] w-full bg-slate-950"
          />
        </div>
      </div>
    </div>

    <div className="grid gap-4 border-t border-slate-200 p-4 md:grid-cols-2">
      <div>
        <p className="mb-2 text-xs font-medium text-slate-500">Scaled preview</p>
        <iframe
          title="Scaled same-origin React Grab fixture"
          data-testid="scaled-same-origin-iframe"
          srcDoc={IFRAME_SOURCE}
          className="h-48 w-full origin-top-left scale-90 rounded border bg-white"
        />
      </div>
      <div>
        <p className="mb-2 text-xs font-medium text-slate-500">Isolated preview</p>
        <iframe
          title="Sandboxed opaque-origin React Grab fixture"
          data-testid="sandboxed-iframe"
          srcDoc={SANDBOXED_IFRAME_SOURCE}
          sandbox=""
          className="h-32 w-full rounded border bg-white"
        />
      </div>
    </div>
  </section>
);
