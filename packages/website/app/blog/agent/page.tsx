"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import ReactGrabLogo from "@/public/logo.svg";
import { highlightCode } from "@/lib/shiki";
import { IconClaude } from "@/components/icon-claude";
import { IconCursor } from "@/components/icon-cursor";
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
          <Link
            href="/"
            className="text-sm text-neutral-400 hover:text-white transition-colors flex items-center gap-2"
          >
            <ArrowLeft size={16} />
            Back to home
          </Link>

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
                directly from the browser.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <h3 className="text-lg font-medium text-neutral-200 mt-4">
                What stays the same
              </h3>
              <ul className="list-disc space-y-2 pl-6">
                <li>React Grab is still free and open source</li>
                <li>
                  It still works with any editor or agent that understands text
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
                  You can spin up agents like Claude Code or Cursor directly
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
                  The agent would read the prompt, guess which files to open,
                  grep around, and maybe eventually land on the right component.
                </li>
                <li>
                  That search step was noisy. Sometimes it was instant. Sometimes
                  it went on a small adventure through unrelated files. As the
                  codebase grew, the &quot;guess where this is&quot; step became
                  the bottleneck.
                </li>
              </ol>
              <p>
                Turns out, React already knows where everything is. In
                development, it stores exactly which component rendered which
                DOM node, and which file and line number that component came
                from.
                <sup className="text-neutral-500 text-[10px] ml-0.5">2</sup> I
                wanted to hand that to the agent.
              </p>
              <p>So I built the first version of React Grab.</p>
              <p>
                You pressed{" "}
                <code className="text-neutral-300 bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-1 py-0.5 text-xs">
                  ⌘C
                </code>{" "}
                (or{" "}
                <code className="text-neutral-300 bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-1 py-0.5 text-xs">
                  Ctrl+C
                </code>{" "}
                on Windows), clicked an element, and React Grab walked the React
                tree to collect a human readable context that looked like:
              </p>
              <div className="bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg overflow-hidden">
                <div className="px-3 py-2">
                  <pre className="text-neutral-300 whitespace-pre font-mono text-xs leading-relaxed">
{`<a class="ml-auto inline-block text-..." href="#">
  Forgot your password?
</a>
in LoginForm at components/login-form.tsx:46:19
in AuthLayout at app/(auth)/layout.tsx:12:5`}
                  </pre>
                </div>
              </div>
              <div className="py-8">
                <Image src={demoGif} alt="React Grab demo" />
              </div>
              <p>
                You pasted that into your agent and wrote a prompt. Instead of
                guessing where &quot;the forgot password link&quot; might live,
                the agent jumped straight to{" "}
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
                else. You still had to copy, switch to your agent, paste, wait,
                switch back, and refresh. For one-off tasks this was fine. After
                using it daily, the seams started to show.
              </p>
              <p>
                The browser had the best view of your intent. The agent had the
                power to edit the code. Why not put the agent <span className="text-neutral-300 font-medium">in the browser</span>?
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
                You still hold a key and click an element. React Grab still
                gathers the React component stack, file paths, line numbers, and
                nearby HTML. But instead of putting that text on your clipboard,
                it opens a small panel next to the page.
              </p>
              <p>
                The panel shows the stack. Below that is a prompt box and a
                selector for which agent you want to use: Claude Code, Cursor,
                or anything you have wired in. You describe what you want in
                plain language. React Grab sends all of this to the agent,
                streams back what it does, and shows you the patch it wants to
                apply.
              </p>
              <p>
                When the run finishes, you can review the diff in the panel and
                decide whether to apply it. If you accept, the change is written
                back to your codebase and your app reloads.
              </p>
              <p>You never leave the browser. You never touch the clipboard.</p>
              <p>
                The panel also keeps track of multiple runs at once. You can
                kick off a layout refactor on one component, then immediately
                select a different element and start a smaller tweak on that.
                Each run has its own logs and diff. It starts to feel less like
                &quot;I am chatting with an assistant&quot; and more like
                &quot;I have a small job queue attached to my UI.&quot;
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
                Right now, React Grab for Agents is general on purpose. It
                integrates with the agents that exist. If your tool has a CLI or
                an API, you can add a bridge.
              </p>
              <p>
                I do not think the long term story is just &quot;wire up
                whatever you already have.&quot; There is a missing piece: a
                coding agent designed specifically for UI work, built around the
                way React Grab represents context.
              </p>
              <p>
                Soon, we{"'"}ll be releasing{" "}
                <span className="text-neutral-300 font-medium">Ami</span>.
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
