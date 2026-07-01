import { GrabDemo } from "@/components/grab-demo";
import { InstallCommand } from "@/components/install-command";
import { PageShell } from "@/components/page-shell";
import { AccentLink } from "@/components/prose";
import { SiteFooter } from "@/components/site-footer";

export default function HomePage() {
  return (
    <PageShell>
      <div className="flex flex-col gap-3 pt-20">
        <h1 className="font-sans text-h2 font-semibold text-title">React Grab</h1>
        <p>Copy any UI element for your coding agent.</p>
      </div>

      <div className="flex flex-col gap-2">
        <p>
          React Grab points your agent at the exact source behind what you see, getting it to the
          right code{" "}
          <AccentLink href="/benchmarks" external={false}>
            2× faster
          </AccentLink>
          . It
          works in Claude Code, Codex, and Cursor.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <p>Run this command in your project:</p>
        <InstallCommand />
      </div>

      <GrabDemo />

      <SiteFooter />
    </PageShell>
  );
}
