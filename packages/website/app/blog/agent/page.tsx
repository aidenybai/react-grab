"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { highlightCode } from "@/lib/shiki";
import { IconClaude } from "@/components/icons/icon-claude";
import { IconCursor } from "@/components/icons/icon-cursor";
import { IconCopilot } from "@/components/icons/icon-copilot";
import { IconOpenCode } from "@/components/icons/icon-opencode";
import { IconDroid } from "@/components/icons/icon-droid";
import { GithubButton } from "@/components/github-button";
import { ViewDocsButton } from "@/components/view-docs-button";
import { BlogArticleLayout } from "@/components/blog-article-layout";
import { COPY_FEEDBACK_DURATION_MS } from "@/constants";

interface HighlightedCodeBlockProps {
  code: string;
  lang: string;
}

const HighlightedCodeBlock = ({ code, lang }: HighlightedCodeBlockProps) => {
  const [highlightedHtml, setHighlightedHtml] = useState<string>("");
  const [didCopy, setDidCopy] = useState(false);

  useEffect(() => {
    const highlight = async () => {
      const html = await highlightCode({ code, lang, showLineNumbers: false });
      setHighlightedHtml(html);
    };
    highlight();
  }, [code, lang]);

  const handleCopy = () => {
    if (typeof navigator === "undefined" || !navigator.clipboard) return;
    navigator.clipboard
      .writeText(code)
      .then(() => {
        setDidCopy(true);
        setTimeout(() => setDidCopy(false), COPY_FEEDBACK_DURATION_MS);
      })
      .catch(() => {});
  };

  return (
    <div className="group relative">
      <button
        type="button"
        onClick={handleCopy}
        className="absolute right-0 top-0 text-[11px] text-white/50 opacity-0 transition-opacity hover:text-white group-hover:opacity-100 z-10"
      >
        {didCopy ? "Copied" : "Copy"}
      </button>
      {highlightedHtml ? (
        <div
          className="overflow-x-auto font-mono text-[13px] leading-relaxed"
          dangerouslySetInnerHTML={{ __html: highlightedHtml }}
        />
      ) : (
        <pre className="text-neutral-300 whitespace-pre font-mono text-xs leading-relaxed">
          {code}
        </pre>
      )}
    </div>
  );
};

const headings = [
  { id: "tldr", text: "TL;DR", level: 3 },
  { id: "what-stays-the-same", text: "What stays the same", level: 3 },
  { id: "what-is-new", text: "What is new", level: 3 },
  { id: "how-react-grab-started", text: "How React Grab started", level: 3 },
  { id: "we-can-do-better", text: "We can do better", level: 3 },
  { id: "react-grab-for-agents", text: "React Grab for Agents", level: 3 },
  { id: "setup", text: "Setup", level: 3 },
  { id: "how-it-works", text: "How it works", level: 3 },
  { id: "whats-next", text: "What's next", level: 3 },
  { id: "try-it-out", text: "Try it out", level: 3 },
  { id: "footnotes", text: "Footnotes", level: 4 },
];

const authors = [
  { name: "Aiden Bai", url: "https://x.com/aidenybai" },
  { name: "Ben Maclaurin", url: "https://x.com/ben__maclaurin" },
];

const AgentPage = () => {
  return (
    <BlogArticleLayout
      title="React Grab for Agents"
      authors={authors}
      date="December 4, 2025"
      headings={headings}
      subtitle={
        <p className="text-sm text-neutral-500 italic">
          <a
            href="https://www.youtube.com/watch?v=3CRs8kusyhE"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-neutral-300 underline underline-offset-4"
          >
            Prefer a video breakdown?
          </a>
        </p>
      }
    >
      <div className="flex flex-col gap-4 text-neutral-400">
        <div className="flex flex-col gap-3">
          <h3
            id="tldr"
            className="text-lg font-medium text-neutral-200 scroll-mt-24"
          >
            TL;DR
          </h3>
          <p>
            React Grab used to stop at copying context for your coding agent.
            Now it can directly talk to the agent to edit the code -- all from
            the browser.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <h3
            id="what-stays-the-same"
            className="text-lg font-medium text-neutral-200 mt-4 scroll-mt-24"
          >
            What stays the same
          </h3>
          <ul className="list-disc space-y-2 pl-6">
            <li>React Grab is still free and open source</li>
            <li>
              It still works with any AI coding tool (
              <IconClaude
                width={12}
                height={12}
                className="inline -translate-y-px mx-0.5"
              />
              Claude Code,{" "}
              <IconCursor
                width={12}
                height={12}
                className="inline -translate-y-px mx-0.5 text-white"
              />
              Cursor,{" "}
              <IconOpenCode
                width={12}
                height={12}
                className="inline -translate-y-px mx-0.5"
              />
              OpenCode, Codex, Gemini, Amp,{" "}
              <IconDroid
                width={12}
                height={12}
                className="inline -translate-y-px mx-0.5 text-white"
              />
              Factory Droid,{" "}
              <IconCopilot
                width={12}
                height={12}
                className="inline -translate-y-px mx-0.5 text-white"
              />
              Copilot, etc.)
            </li>
            <li>
              The core idea is still &quot;click an element, get real React
              context and file paths&quot;
            </li>
          </ul>
        </div>

        <div className="flex flex-col gap-3">
          <h3
            id="what-is-new"
            className="text-lg font-medium text-neutral-200 mt-4 scroll-mt-24"
          >
            What is new
          </h3>
          <ul className="list-disc space-y-2 pl-6">
            <li>
              You can now spin up agents like Claude Code or Cursor directly
              from the page
            </li>
            <li>
              You can run multiple UI tasks at once, each attached to the
              element you clicked
            </li>
            <li>
              You can make changes to your code without leaving the browser
            </li>
          </ul>
          <div className="py-4">
            <video
              src="/demo.webm"
              autoPlay
              loop
              muted
              playsInline
              controls
              className="w-full rounded-lg"
            />
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <h3
            id="how-react-grab-started"
            className="text-lg font-medium text-neutral-200 mt-8 scroll-mt-24"
          >
            How React Grab started
          </h3>
          <p>React Grab came from a simple (but very relevant!) annoyance.</p>
          <p>
            Coding agents are good at generating code, but bad at guessing what
            I actually want. The loop looked like this:
          </p>
          <ol className="list-decimal space-y-2 pl-6">
            <li>
              I would look at some UI, form a mental picture, and then try to
              describe it in English.
            </li>
            <li>
              The agent would guess which files to open, grep around, and maybe
              land on the right component. As the codebase grew, this
              &quot;guess where this is&quot; step became the bottleneck.
            </li>
          </ol>
          <p>
            I built the first version of React Grab
            <sup className="text-neutral-500 text-[10px] ml-0.5">2</sup> to
            solve this: press{" "}
            <code className="text-neutral-300 bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-1 py-0.5 text-xs">
              ⌘C
            </code>
            , click an element, and React Grab gives you the component stack
            with exact file paths and line numbers.
          </p>
          <div className="py-4">
            <video
              src="/demo.webm"
              autoPlay
              loop
              muted
              playsInline
              className="w-full rounded-lg"
            />
          </div>
          <p>
            Now, instead of guessing where an element might live, the agent
            jumps straight to the exact file, line, and column.
          </p>
          <p>
            In the benchmarks I ran on a shadcn dashboard, that alone made
            Claude Code roughly{" "}
            <Link href="/blog/intro" className="shimmer-text-pink">
              3× faster
            </Link>{" "}
            on average for a set of UI tasks.
            <sup className="text-neutral-500 text-[10px] ml-0.5">1</sup> The
            agent did fewer tool calls, read fewer files, and got to the edit
            sooner, because it no longer had to search.
          </p>
          <p>
            React Grab worked. People wired it into their apps. It made coding
            agents feel less random for UI work.
          </p>
          <p>It also had an obvious flaw.</p>
        </div>

        <div className="flex flex-col gap-3">
          <h3
            id="we-can-do-better"
            className="text-lg font-medium text-neutral-200 mt-8 scroll-mt-24"
          >
            We can do better
          </h3>
          <p>
            React Grab solved the context problem and ignored everything else
            (this is actually intentional!). You still had to copy, switch to
            your agent, paste, wait, switch back, and refresh. For one-off tasks
            this was fine. After using it daily, I realized we can do a LOT
            better.
          </p>
          <p>
            The browser had the best view of your intent. The agent had the
            power to edit the code. Why not put the agent{" "}
            <span className="text-neutral-300 font-medium">in the browser</span>
            ?
          </p>
          <p className="text-sm text-neutral-500 mt-2">
            (Theo{" "}
            <a
              href="https://x.com/theo/status/1952229335416623592"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-neutral-400"
            >
              predicted this
            </a>{" "}
            months ago.)
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <h3
            id="react-grab-for-agents"
            className="text-lg font-medium text-neutral-200 mt-8 scroll-mt-24"
          >
            React Grab for Agents
          </h3>
          <p>
            React Grab for Agents is what happens when you let the browser do
            more of the loop.
          </p>
          <p>The idea is simple.</p>
          <p>
            You hold{" "}
            <code className="text-neutral-300 bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-1 py-0.5 text-xs">
              ⌘C
            </code>
            , click an element, and a small label appears showing the component
            name and tag. Press{" "}
            <code className="text-neutral-300 bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-1 py-0.5 text-xs">
              Enter
            </code>{" "}
            to expand the prompt input. Type what you want to change, press{" "}
            <code className="text-neutral-300 bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-1 py-0.5 text-xs">
              Enter
            </code>{" "}
            again, and the agent starts working.
          </p>
          <p>
            React Grab sends the context (file paths, line numbers, component
            stack, nearby HTML) along with your prompt to the agent. The agent
            edits your files directly while the label streams back status
            updates. When it finishes, the label shows &quot;Completed&quot; and
            your app reloads with the changes.
          </p>
          <p>You never leave the browser. You never touch the clipboard.</p>
          <p>
            You can run multiple tasks at once. Click one element, start an
            edit, then click another and start a different task. Each selection
            tracks its own progress independently. It starts to feel less like
            &quot;I am chatting with an assistant&quot; and more like a small
            job queue attached to my UI
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <h3
            id="setup"
            className="text-lg font-medium text-neutral-200 mt-8 scroll-mt-24"
          >
            Setup
          </h3>
          <p>
            Run this command at your project root to automatically install React
            Grab:
          </p>
          <div className="bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg overflow-hidden">
            <div className="px-3 py-2">
              <HighlightedCodeBlock
                lang="bash"
                code={`npx -y grab@latest init`}
              />
            </div>
          </div>
          <p className="text-sm text-neutral-500">
            The CLI will detect your framework and agent, then add the necessary
            scripts automatically.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <h3
            id="how-it-works"
            className="text-lg font-medium text-neutral-200 mt-8 scroll-mt-24"
          >
            How it works
          </h3>
          <p>
            Under the hood, React Grab for Agents is built on the same mechanics
            as the original library.
          </p>
          <p>When you select an element, React Grab:</p>
          <ul className="list-disc space-y-2 pl-6">
            <li>Walks the React fiber tree upward from that element.</li>
            <li>
              Collects component display names and, in development, source
              locations with file path and line and column numbers.
            </li>
            <li>
              Captures a small slice of DOM and attributes around the node.
            </li>
          </ul>
          <p>
            This is the context that made the original benchmarks so much
            better. The agent gets a direct pointer instead of a fuzzy
            description.
          </p>
          <p>The new part is the agent provider.</p>
          <p>
            An agent provider is a small adapter that connects React Grab to a
            coding agent. When you submit a prompt, React Grab sends the context
            and your message to a local server. The server passes this to the
            actual CLI (
            <code className="text-neutral-300 bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-1 py-0.5 text-xs">
              claude
            </code>{" "}
            or{" "}
            <code className="text-neutral-300 bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-1 py-0.5 text-xs">
              cursor-agent
            </code>
            ) which edits your codebase directly. Status updates stream back to
            the browser so you can watch the agent work.
          </p>
          <p>
            The providers are open source. You can read through the
            implementation or use them as a starting point for your own:{" "}
            <a
              href="https://github.com/aidenybai/react-grab/tree/main/packages/provider-claude-code"
              target="_blank"
              rel="noopener noreferrer"
              className="text-neutral-300 hover:text-white underline underline-offset-4"
            >
              @react-grab/claude-code
            </a>
            ,{" "}
            <a
              href="https://github.com/aidenybai/react-grab/tree/main/packages/provider-cursor"
              target="_blank"
              rel="noopener noreferrer"
              className="text-neutral-300 hover:text-white underline underline-offset-4"
            >
              @react-grab/cursor
            </a>
            ,{" "}
            <a
              href="https://github.com/aidenybai/react-grab/tree/main/packages/provider-opencode"
              target="_blank"
              rel="noopener noreferrer"
              className="text-neutral-300 hover:text-white underline underline-offset-4"
            >
              @react-grab/opencode
            </a>
            ,{" "}
            <a
              href="https://github.com/aidenybai/react-grab/tree/main/packages/provider-codex"
              target="_blank"
              rel="noopener noreferrer"
              className="text-neutral-300 hover:text-white underline underline-offset-4"
            >
              @react-grab/codex
            </a>
            ,{" "}
            <a
              href="https://github.com/aidenybai/react-grab/tree/main/packages/provider-gemini"
              target="_blank"
              rel="noopener noreferrer"
              className="text-neutral-300 hover:text-white underline underline-offset-4"
            >
              @react-grab/gemini
            </a>
            ,{" "}
            <a
              href="https://github.com/aidenybai/react-grab/tree/main/packages/provider-amp"
              target="_blank"
              rel="noopener noreferrer"
              className="text-neutral-300 hover:text-white underline underline-offset-4"
            >
              @react-grab/amp
            </a>
            ,{" "}
            <a
              href="https://github.com/aidenybai/react-grab/tree/main/packages/provider-droid"
              target="_blank"
              rel="noopener noreferrer"
              className="text-neutral-300 hover:text-white underline underline-offset-4"
            >
              @react-grab/droid
            </a>
            .
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <h3
            id="whats-next"
            className="text-lg font-medium text-neutral-200 mt-8 scroll-mt-24"
          >
            What{"'"}s next
          </h3>
          <p>
            React Grab for Agents is tool-agnostic on purpose. It integrates
            with the agents that exist. If your tool has a CLI or an API, you
            can add a provider.
          </p>
          <p>If your tool has a CLI or an API, you can add a provider.</p>
        </div>

        <div className="flex flex-col gap-4 mt-8">
          <h3
            id="try-it-out"
            className="text-lg font-medium text-neutral-200 scroll-mt-24"
          >
            Try it out
          </h3>
          <p>
            React Grab is free and open source.{" "}
            <Link
              href="/"
              className="text-neutral-300 hover:text-white underline underline-offset-4 transition-colors"
            >
              Go try it out!
            </Link>
          </p>
          <div className="flex gap-2">
            <GithubButton />
            <ViewDocsButton />
          </div>
        </div>

        <div className="flex flex-col gap-4 mt-12 pt-8 border-t border-neutral-800">
          <h4
            id="footnotes"
            className="text-sm font-medium text-neutral-400 scroll-mt-24"
          >
            Footnotes
          </h4>
          <div className="flex flex-col gap-4 text-sm text-neutral-500">
            <p>
              <sup className="text-neutral-600 mr-1">1</sup>
              See the{" "}
              <Link
                href="/blog/intro"
                className="text-neutral-400 hover:text-white underline underline-offset-4"
              >
                full benchmark writeup
              </Link>
              . Single trial per test case, so treat the exact number with
              appropriate skepticism. The direction is consistent across tasks.
            </p>
            <p>
              <sup className="text-neutral-600 mr-1">2</sup>
              This only works in development mode. React strips source locations
              in production builds for performance and bundle size. React Grab
              detects this and falls back to showing component names without
              file paths. You can enable source maps in production if you need
              the full paths.
            </p>
          </div>
        </div>
      </div>
    </BlogArticleLayout>
  );
};

AgentPage.displayName = "AgentPage";

export default AgentPage;
