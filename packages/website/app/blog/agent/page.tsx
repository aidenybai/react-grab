"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import ReactGrabLogo from "@/public/logo.svg";
import { highlightCode } from "@/lib/shiki";
import { IconClaude } from "@/components/icon-claude";
import { IconCursor } from "@/components/icon-cursor";
import { IconCopilot } from "@/components/icon-copilot";
import demoGif from "@/public/demo.gif";

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
        setTimeout(() => setDidCopy(false), 1200);
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

const AgentPage = () => {
  return (
    <div className="min-h-screen bg-black font-sans text-white">
      <div className="px-4 sm:px-8 pt-12 sm:pt-16 pb-56">
        <div className="mx-auto max-w-2xl flex flex-col gap-6">
          <div className="flex items-center gap-2 text-sm text-neutral-400 opacity-50 hover:opacity-100 transition-opacity">
            <Link
              href="/"
              className="hover:text-white transition-colors flex items-center gap-2 underline underline-offset-4"
            >
              <ArrowLeft size={16} />
              Back to home
            </Link>
            <span>·</span>
            <Link
              href="/blog"
              className="hover:text-white transition-colors underline underline-offset-4"
            >
              Read more posts
            </Link>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex flex-col gap-2">
              <Link href="/" className="hover:opacity-80 transition-opacity">
                <Image
                  src={ReactGrabLogo}
                  alt="React Grab"
                  className="w-10 h-10"
                />
              </Link>
              <h1 className="text-xl font-medium text-white">
                React Grab for Agents
              </h1>
            </div>

            <div className="text-sm text-neutral-500">
              By{" "}
              <a
                href="https://x.com/aidenybai"
                target="_blank"
                rel="noopener noreferrer"
                className="text-neutral-300 hover:text-white underline underline-offset-4"
              >
                Aiden Bai
              </a>
              {", "}
              <a
                href="https://x.com/ben__maclaurin"
                target="_blank"
                rel="noopener noreferrer"
                className="text-neutral-300 hover:text-white underline underline-offset-4"
              >
                Ben Maclaurin
              </a>
              {" · "}
              <span>December 4, 2025</span>
            </div>
          </div>

          <div className="flex flex-col gap-4 text-neutral-400">
            <div className="flex flex-col gap-3">
              <h3 className="text-lg font-medium text-neutral-200">TL;DR</h3>
              <p>
                React Grab used to stop at copying context for your coding
                agent. Now it can directly talk to the agent to edit the code
                -- all from the browser.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <h3 className="text-lg font-medium text-neutral-200 mt-4">
                What stays the same
              </h3>
              <ul className="list-disc space-y-2 pl-6">
                <li>React Grab is still free and open source</li>
                <li>
                  It still works with any AI coding tool
                  (<IconClaude width={12} height={12} className="inline -translate-y-px mx-0.5" />Claude Code,{" "}
                  <IconCursor width={12} height={12} className="inline -translate-y-px mx-0.5 text-white" />Cursor,{" "}
                  <IconCopilot width={12} height={12} className="inline -translate-y-px mx-0.5 text-white" />Copilot, etc.)
                </li>
                <li>
                  The core idea is still &quot;click an element, get real React
                  context and file paths&quot;
                </li>
              </ul>
            </div>

            <div className="flex flex-col gap-3">
              <h3 className="text-lg font-medium text-neutral-200 mt-4">
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
            </div>

            <div className="flex flex-col gap-3">
              <h3 className="text-lg font-medium text-neutral-200 mt-8">
                How React Grab started
              </h3>
              <p>React Grab came from a simple (but very relevant!) annoyance.</p>
              <p>
                Coding agents are good at generating code, but bad at guessing
                what I actually want. The loop looked like this:
              </p>
              <ol className="list-decimal space-y-2 pl-6">
                <li>
                  I would look at some UI, form a mental picture, and then try
                  to describe it in English.
                </li>
                <li>
                  The agent would guess which files to open, grep around, and
                  maybe land on the right component. As the codebase grew, this
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
                <Image src={demoGif} alt="React Grab demo" />
              </div>
              <p>
                Now, instead of guessing where &quot;the forgot password
                link&quot; might live, the agent jumps straight to{" "}
                <code className="text-neutral-300 bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-1 py-0.5 text-xs">
                  components/login-form.tsx:46:19
                </code>
                .
              </p>
              <p>
                In the benchmarks I ran on a shadcn dashboard, that alone made
                Claude Code roughly{" "}
                <Link href="/blog/intro" className="shimmer-text-pink">
                  66% faster
                </Link>{" "}
                on average
                for a set of UI tasks.
                <sup className="text-neutral-500 text-[10px] ml-0.5">1</sup> The
                agent did fewer tool calls, read fewer files, and got to the
                edit sooner, because it no longer had to search.
              </p>
              <p>
                React Grab worked. People wired it into their apps. It made
                coding agents feel less random for UI work.
              </p>
              <p>It also had an obvious flaw.</p>
            </div>

            <div className="flex flex-col gap-3">
              <h3 className="text-lg font-medium text-neutral-200 mt-8">
                We can do better
              </h3>
              <p>
                React Grab solved the context problem and ignored everything
                else (this is actually intentional!). You still had to copy,
                switch to your agent, paste, wait, switch back, and refresh. For
                one-off tasks this was fine. After using it daily, I realized we
                can do a LOT better.
              </p>
              <p>
                The browser had the best view of your intent. The agent had the
                power to edit the code. Why not put the agent <span className="text-neutral-300 font-medium">in the browser</span>?
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
              <h3 className="text-lg font-medium text-neutral-200 mt-8">
                React Grab for Agents
              </h3>
              <p>
                React Grab for Agents is what happens when you let the browser
                do more of the loop.
              </p>
              <p>The idea is simple.</p>
              <p>
                You hold{" "}
                <code className="text-neutral-300 bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-1 py-0.5 text-xs">
                  ⌘C
                </code>
                , click an element, and a small label appears showing the
                component name and tag. Press{" "}
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
                stack, nearby HTML) along with your prompt to the agent. The
                agent edits your files directly while the label streams back
                status updates. When it finishes, the label shows
                &quot;Completed&quot; and your app reloads with the changes.
              </p>
              <p>You never leave the browser. You never touch the clipboard.</p>
              <p>
                You can run multiple tasks at once. Click one element, start an
                edit, then click another and start a different task. Each
                selection tracks its own progress independently. It starts to
                feel less like &quot;I am chatting with an assistant&quot; and
                more like a small job queue attached to my UI
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <h3 className="text-lg font-medium text-neutral-200 mt-8">
                Setup
              </h3>
              <p>
                Setup is designed to feel like adding one more feature to your
                existing React Grab integration, not like adopting a new
                framework.
              </p>

              <h4 className="text-base font-medium text-neutral-300 mt-4 flex items-center gap-1.5">
                <IconClaude width={14} height={14} />
                Claude Code
              </h4>

              <p className="text-sm font-medium text-neutral-400">
                Server Setup
              </p>
              <p>
                The server runs on port{" "}
                <code className="text-neutral-300 bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-1 py-0.5 text-xs">
                  4567
                </code>{" "}
                and interfaces with the Claude Agent SDK. Add to your{" "}
                <code className="text-neutral-300 bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-1 py-0.5 text-xs">
                  package.json
                </code>
                :
              </p>
              <div className="bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg overflow-hidden">
                <div className="px-3 py-2">
                  <HighlightedCodeBlock
                    lang="json"
                    code={`{
  "scripts": {
    "dev": "npx @react-grab/claude-code && next dev"
  }
}`}
                  />
                </div>
              </div>

              <p className="text-sm font-medium text-neutral-400 mt-4">
                Client Setup
              </p>
              <p>
                If you already have React Grab running via a script tag in a
                Next.js app, add the Claude Code client script in your{" "}
                <code className="text-neutral-300 bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-1 py-0.5 text-xs">
                  &lt;head&gt;
                </code>
                :
              </p>
              <div className="bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg overflow-hidden">
                <div className="px-3 py-2">
                  <HighlightedCodeBlock
                    lang="html"
                    code={`<script src="//unpkg.com/react-grab/dist/index.global.js"></script>
<script src="//unpkg.com/@react-grab/claude-code/dist/client.global.js"></script>`}
                  />
                </div>
              </div>

              <h4 className="text-base font-medium text-neutral-300 mt-8 flex items-center gap-1.5">
                <IconCursor width={14} height={14} />
                Cursor CLI
              </h4>

              <p className="text-sm font-medium text-neutral-400">
                Server Setup
              </p>
              <p>
                The server runs on port{" "}
                <code className="text-neutral-300 bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-1 py-0.5 text-xs">
                  5567
                </code>{" "}
                and interfaces with the{" "}
                <code className="text-neutral-300 bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-1 py-0.5 text-xs">
                  cursor-agent
                </code>{" "}
                CLI. Add to your{" "}
                <code className="text-neutral-300 bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-1 py-0.5 text-xs">
                  package.json
                </code>
                :
              </p>
              <div className="bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg overflow-hidden">
                <div className="px-3 py-2">
                  <HighlightedCodeBlock
                    lang="json"
                    code={`{
  "scripts": {
    "dev": "npx @react-grab/cursor && next dev"
  }
}`}
                  />
                </div>
              </div>

              <p className="text-sm font-medium text-neutral-400 mt-4">
                Client Setup
              </p>
              <p>
                Add the Cursor client script in your{" "}
                <code className="text-neutral-300 bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-1 py-0.5 text-xs">
                  &lt;head&gt;
                </code>
                :
              </p>
              <div className="bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg overflow-hidden">
                <div className="px-3 py-2">
                  <HighlightedCodeBlock
                    lang="html"
                    code={`<script src="//unpkg.com/react-grab/dist/index.global.js"></script>
<script src="//unpkg.com/@react-grab/cursor/dist/client.global.js"></script>`}
                  />
                </div>
              </div>

              <p className="mt-4">
                Hold{" "}
                <code className="text-neutral-300 bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-1 py-0.5 text-xs">
                  ⌘C
                </code>
                , click an element, then press{" "}
                <code className="text-neutral-300 bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-1 py-0.5 text-xs">
                  Enter
                </code>{" "}
                to open the prompt. Type your query, pick an agent from the
                dropdown, and hit{" "}
                <code className="text-neutral-300 bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-1 py-0.5 text-xs">
                  Enter
                </code>{" "}
                again to run it.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <h3 className="text-lg font-medium text-neutral-200 mt-8">
                How it works
              </h3>
              <p>
                Under the hood, React Grab for Agents is built on the same
                mechanics as the original library.
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
                An agent provider is a small adapter that connects React Grab to
                a coding agent. When you submit a prompt, React Grab sends the
                context and your message to a local server. The server passes
                this to the actual CLI (
                <code className="text-neutral-300 bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-1 py-0.5 text-xs">
                  claude
                </code>{" "}
                or{" "}
                <code className="text-neutral-300 bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-1 py-0.5 text-xs">
                  cursor-agent
                </code>
                ) which edits your codebase directly. Status updates stream back
                to the browser so you can watch the agent work.
              </p>
              <p>
                The providers are open source. You can read through the
                implementation or use them as a starting point for your own:{" "}
                <a
                  href="https://github.com/aidenybai/react-grab/tree/main/packages/react-grab-claude-code"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-neutral-300 hover:text-white underline underline-offset-4"
                >
                  @react-grab/claude-code
                </a>
                ,{" "}
                <a
                  href="https://github.com/aidenybai/react-grab/tree/main/packages/react-grab-cursor"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-neutral-300 hover:text-white underline underline-offset-4"
                >
                  @react-grab/cursor
                </a>
                .
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <h3 className="text-lg font-medium text-neutral-200 mt-8">
                What{"'"}s next
              </h3>
              <p>
                Right now, React Grab for Agents is tool-agnostic on purpose. It
                integrates with the agents that exist. If your tool has a CLI or
                an API, you can add a provider.
              </p>
              <p>
                However, I do not think the long term story is just &quot;wire up
                whatever you already have.&quot; There is a missing piece: a
                coding agent designed specifically for UI work, built around the
                way React Grab represents context.
              </p>
              <p>
                Soon, we{"'"}ll be releasing{" "}
                <a href="https://ami.dev" target="_blank" rel="noopener noreferrer" className="text-neutral-300 font-medium underline underline-offset-4 hover:text-white">Ami</a>.
                <sup className="text-neutral-500 text-[10px] ml-0.5">3</sup>
              </p>
              <p>
                The idea is that React Grab handles the UI side: selections,
                stacks, file paths, and prompts. Ami handles the agent side:
                planning, editing, and understanding component hierarchies and
                design systems. The contract is narrow. React Grab says
                &quot;here is exactly what the user clicked and what they asked
                for.&quot; Ami replies with &quot;here is the minimal patch that
                makes that true, in a style you will recognize.&quot;
              </p>
              <p>
                React Grab for Agents is the infrastructure that makes that
                relationship possible. Before Ami exists, it makes your existing
                tools faster and less random for frontend work. Once Ami is
                ready, it gives it a natural place to live.
              </p>
            </div>

            <div className="flex flex-col gap-4 mt-12 pt-8 border-t border-neutral-800">
              <h4 className="text-sm font-medium text-neutral-400">Footnotes</h4>
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
                  appropriate skepticism. The direction is consistent across
                  tasks.
                </p>
                <p>
                  <sup className="text-neutral-600 mr-1">2</sup>
                  This only works in development mode. React strips source
                  locations in production builds for performance and bundle
                  size. React Grab detects this and falls back to showing
                  component names without file paths. You can enable source maps
                  in production if you need the full paths.
                </p>
                <p>
                  <sup className="text-neutral-600 mr-1">3</sup>
                  Ami is under active development. If you want early access or
                  want to help shape it, reach out on{" "}
                  <a
                    href="https://x.com/aidenybai"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-neutral-400 hover:text-white underline underline-offset-4"
                  >
                    Twitter
                  </a>
                  .
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

AgentPage.displayName = "AgentPage";

export default AgentPage;
