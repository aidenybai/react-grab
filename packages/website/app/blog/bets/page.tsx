"use client";

import Link from "next/link";
import { GithubButton } from "@/components/github-button";
import { ViewDocsButton } from "@/components/view-docs-button";
import { BlogArticleLayout } from "@/components/blog-article-layout";

const headings = [
  { id: "bet-1", text: "1. AI coding for UI", level: 3 },
  { id: "bet-2", text: "2. Web technology", level: 3 },
  { id: "bet-3", text: "3. Fast, then good", level: 3 },
  { id: "bet-4", text: "4. Media technology past", level: 3 },
  { id: "bet-5", text: "5. Two form factors", level: 3 },
  { id: "bet-6", text: "6. The gap", level: 3 },
  { id: "try-it-out", text: "Try it out", level: 3 },
  { id: "footnotes", text: "Footnotes", level: 4 },
];

const authors = [
  { name: "Aiden Bai", url: "https://x.com/aidenybai" },
  { name: "Nisarg Patel", url: "https://x.com/nisargptel" },
];

const BetsPage = () => {
  return (
    <BlogArticleLayout
      title="Some bets"
      authors={authors}
      date="November 29, 2025"
      headings={headings}
    >
      <div className="flex flex-col gap-4 text-neutral-400">
        <div className="flex flex-col gap-3">
          <h3
            id="bet-1"
            className="text-lg font-medium text-neutral-200 mt-4 scroll-mt-24"
          >
            1. AI coding for UI will be one of the most economically important
            ways people build things
          </h3>
          <p>
            Humans and agents will always be using UIs. In fact, UIs will become
            more important to use: better computer use, interfaces for humans
            post-code, legacy business software that needs maintaining.
          </p>
          <p>There will be code written to build and maintain UIs.</p>
          <p>
            As expectations and capabilities rise with AI progress, so will the
            need for new UIs and better versions of the old.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <h3
            id="bet-2"
            className="text-lg font-medium text-neutral-200 mt-4 scroll-mt-24"
          >
            2. Most of the new UIs of the world will be made using web
            technology
          </h3>
          <p>
            Sub-bet: React is probably{" "}
            <a
              href="https://www.youtube.com/watch?v=P1FLEnKZTAE"
              target="_blank"
              rel="noopener noreferrer"
              className="text-neutral-300 hover:text-white underline underline-offset-4"
            >
              the last framework
            </a>
            .<sup className="text-neutral-500 text-[10px] ml-0.5">1</sup>
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <h3
            id="bet-3"
            className="text-lg font-medium text-neutral-200 mt-4 scroll-mt-24"
          >
            3. Models will become (1) incredibly fast, then (2) incredibly good
            at UI tasks
          </h3>
          <p>
            Fast because code has verifiable rewards (tests pass, code runs),
            making it ideal for{" "}
            <a
              href="https://cursor.com/blog/tab-rl"
              target="_blank"
              rel="noopener noreferrer"
              className="text-neutral-300 hover:text-white underline underline-offset-4"
            >
              RL
            </a>
            . Labs are scaling post-training on code, and coding tools are
            building on top. Good requires taste. Great people will get there
            eventually but slower.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <h3
            id="bet-4"
            className="text-lg font-medium text-neutral-200 mt-4 scroll-mt-24"
          >
            4. Our tools will go the way of &quot;media technology&quot; past
          </h3>
          <p>
            From daguerreotype to polaroid to camcorder to studio-level digital
            cameras back to iPhones. From low use to an explosion of
            capabilities and then a product for the average person.
          </p>
          <p>
            Coding, unlike cameras, will progress OOM faster (
            <a
              href="https://x.com/polynoamial/status/1994439121243169176"
              target="_blank"
              rel="noopener noreferrer"
              className="text-neutral-300 hover:text-white underline underline-offset-4"
            >
              5-20 years
            </a>
            ).
          </p>
          <p>
            Once AI coding becomes commodified, the winners will be those with
            better taste and ease of use, not those with bleeding edge
            capability (1% better than the next best).
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <h3
            id="bet-5"
            className="text-lg font-medium text-neutral-200 mt-4 scroll-mt-24"
          >
            5. There will only be two form factors for coding with UIs
          </h3>
          <p>
            Low latency low entropy (sub 100ms
            <sup className="text-neutral-500 text-[10px] ml-0.5">2</sup>), and
            long background tasks (big refactors, maintenance, scaffolding a{" "}
            <a
              href="https://cognition.ai/blog/swe-grep"
              target="_blank"
              rel="noopener noreferrer"
              className="text-neutral-300 hover:text-white underline underline-offset-4"
            >
              well-spec{"'"}d feature
            </a>
            ).
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <h3
            id="bet-6"
            className="text-lg font-medium text-neutral-200 mt-4 scroll-mt-24"
          >
            6. The gap
          </h3>
          <p>
            There is no tool that is good at UI <em>(yet)</em>.
          </p>
          <p>
            No company is going all-in on AI coding for UI.
            <sup className="text-neutral-500 text-[10px] ml-0.5">3</sup>
          </p>
          <p>
            If you agree,{" "}
            <a
              href="https://x.com/aidenybai"
              target="_blank"
              rel="noopener noreferrer"
              className="text-neutral-300 hover:text-white underline underline-offset-4"
            >
              we should chat
            </a>
            .
          </p>
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
              Not literally the last framework ever, but the last major paradigm
              shift (JSX, hooks, etc)
            </p>
            <p>
              <sup className="text-neutral-600 mr-1">2</sup>
              This is the latency threshold where interactions feel instant, as
              anything slower breaks flow.
            </p>
            <p>
              <sup className="text-neutral-600 mr-1">3</sup>
              Vercel/v0 is close but focused on generation, not iteration.
              Cursor/Windsurf are general-purpose. There{"'"}s no company whose
              entire thesis is &quot;AI coding, but specifically for UI&quot;
              with all the specialized tooling that implies.
            </p>
          </div>
        </div>
      </div>
    </BlogArticleLayout>
  );
};

BetsPage.displayName = "BetsPage";

export default BetsPage;
