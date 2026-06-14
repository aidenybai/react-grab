import { GrabDemo } from "@/components/grab-demo";
import { InstallCommand } from "@/components/install-command";
import { ThemeToggle } from "@/components/theme-toggle";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center bg-background px-4 py-16">
      <div className="flex w-full max-w-md flex-col gap-8">
        <header className="flex flex-col gap-4">
          <h1 className="font-semibold text-foreground">React Grab</h1>
          <p className="font-medium text-muted-foreground">Copy any UI element for your agent.</p>
          <p className="font-medium text-muted-foreground">
            Get your coding agent to the right code{" "}
            <a
              href="https://benchmark.react-grab.com"
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-link underline decoration-link/30 decoration-2 underline-offset-4 transition-colors hover:decoration-link/60"
            >
              2× faster
            </a>
          </p>
          <p className="font-medium text-muted-foreground">Works in Claude Code, Codex, Cursor.</p>
        </header>

        <section className="flex flex-col gap-3">
          <p className="font-medium text-foreground">Run this command to get started:</p>
          <InstallCommand />
        </section>

        <GrabDemo />

        <footer className="flex items-center justify-between border-t border-border pt-6">
          <div className="flex items-center gap-4">
            <a
              href="https://github.com/aidenybai/react-grab"
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-link underline decoration-link/30 decoration-2 underline-offset-4 transition-colors hover:decoration-link/60"
            >
              GitHub
            </a>
            <a
              href="https://github.com/aidenybai/react-grab#readme"
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-link underline decoration-link/30 decoration-2 underline-offset-4 transition-colors hover:decoration-link/60"
            >
              Docs
            </a>
          </div>
          <ThemeToggle />
        </footer>
      </div>
    </main>
  );
}
