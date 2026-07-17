import { GithubLink } from "@/components/github-link";
import { GrabDemo } from "@/components/grab-demo";
import { InstallCommand } from "@/components/install-command";
import { PageShell } from "@/components/page-shell";
import { AccentLink } from "@/components/prose";
import { SiteFooter } from "@/components/site-footer";

export default function HomePage() {
  return (
    <PageShell>
      <div className="flex flex-col gap-3 pt-20">
        <div className="flex items-center justify-between">
          <h1 className="font-page-title text-h2 font-medium tracking-tighter text-title">
            React Grab
          </h1>
          <GithubLink />
        </div>
        <p>Copy any UI element for your coding agent.</p>
      </div>

      <p>
        React Grab points your agent at the exact source behind what you see, getting it to the
        right code{" "}
        <AccentLink href="/benchmarks" external={false}>
          2× faster
        </AccentLink>
        . It works in Claude Code, Codex, and Cursor.
      </p>

      <div className="flex flex-col gap-3">
        <p>Run this command in your project:</p>
        <InstallCommand />
      </div>

      <GrabDemo />

      <SiteFooter />
    </PageShell>
  );
}
