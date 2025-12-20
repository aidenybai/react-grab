"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import ReactGrabLogo from "@/public/logo.svg";
import { highlightCode } from "@/lib/shiki";
import { GithubButton } from "@/components/github-button";
import { CursorInstallButton } from "@/components/cursor-install-button";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

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

const treatmentDurations = [
  4.755, 9.423, 4.082, 4.445, 7.015, 4.085, 12.276, 5.65, 7.932, 9.202, 3.54,
  8.796, 3.826, 3.61, 4.398, 3.825, 5.5, 4.092, 4.816, 4.091,
];

const controlDurations = [
  10.164, 13.411, 19.256, 10.539, 13.507, 12.787, 13.729, 22.528, 9.125, 77.383,
  11.419, 11.111, 15.488, 7.59, 13.575, 12.215, 12.325, 14.847, 15.216, 20.178,
];

const generateKernelDensity = (
  values: number[],
  bandwidth: number,
  min: number,
  max: number,
  steps: number,
) => {
  const result = [];
  const stepSize = (max - min) / steps;

  for (let i = 0; i <= steps; i++) {
    const currentX = min + i * stepSize;
    let density = 0;

    for (const value of values) {
      const normalizedDistance = (currentX - value) / bandwidth;
      density += Math.exp(-0.5 * normalizedDistance * normalizedDistance);
    }

    density = density / (values.length * bandwidth * Math.sqrt(2 * Math.PI));
    result.push({ x: currentX, density });
  }

  return result;
};

const generateDistributionData = () => {
  const minTime = 0;
  const maxTime = 30;
  const steps = 60;

  const treatmentDensity = generateKernelDensity(
    treatmentDurations,
    1.5,
    minTime,
    maxTime,
    steps,
  );
  const controlDensity = generateKernelDensity(
    controlDurations,
    3,
    minTime,
    maxTime,
    steps,
  );

  return treatmentDensity.map((point, index) => ({
    time: point.x.toFixed(1),
    visualEdit: point.density,
    traditional: controlDensity[index].density,
  }));
};

const treatmentAverage =
  treatmentDurations.reduce((sum, duration) => sum + duration, 0) /
  treatmentDurations.length;
const controlAverage =
  controlDurations.reduce((sum, duration) => sum + duration, 0) /
  controlDurations.length;
const speedupMultiplier = (controlAverage / treatmentAverage).toFixed(0);

const TimeComparisonChart = () => {
  const data = generateDistributionData();

  return (
    <div className="rounded-lg">
      <div className="flex flex-wrap items-center justify-end gap-4 mb-4 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-3 h-0.5 bg-[#525252]" />
          <span className="text-neutral-400">
            Without React Grab ~ {controlAverage.toFixed(1)}s
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-0.5 bg-[#ff4fff]" />
          <span className="text-[#ff4fff]">
            With React Grab ~ {treatmentAverage.toFixed(1)}s
          </span>
        </div>
      </div>
      <div className="h-[280px] sm:h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 20, right: 20, bottom: 30, left: 40 }}
          >
            <XAxis
              dataKey="time"
              axisLine={{ stroke: "#333" }}
              tickLine={{ stroke: "#333" }}
              tick={{ fill: "#666", fontSize: 10 }}
              label={{
                value: "Time per Edit (seconds)",
                position: "bottom",
                offset: 10,
                fill: "#666",
                fontSize: 11,
              }}
              ticks={["0.0", "5.0", "10.0", "15.0", "20.0", "25.0", "30.0"]}
            />
            <YAxis
              axisLine={{ stroke: "#333" }}
              tickLine={{ stroke: "#333" }}
              tick={{ fill: "#666", fontSize: 10 }}
              label={{
                value: "Density",
                angle: -90,
                position: "insideLeft",
                fill: "#666",
                fontSize: 11,
              }}
            />
            <ReferenceLine
              x={treatmentAverage.toFixed(1)}
              stroke="#ff4fff"
              strokeDasharray="5 5"
              strokeWidth={1.5}
            />
            <ReferenceLine
              x={controlAverage.toFixed(1)}
              stroke="#525252"
              strokeDasharray="5 5"
              strokeWidth={1.5}
            />
            <Area
              type="monotone"
              dataKey="traditional"
              stroke="#525252"
              fill="#525252"
              fillOpacity={0.4}
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="visualEdit"
              stroke="#ff4fff"
              fill="#ff4fff"
              fillOpacity={0.4}
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 text-center">
        <span className="text-[#ff4fff] font-medium text-sm sm:text-base">
          {speedupMultiplier}× faster on average
        </span>
      </div>
    </div>
  );
};

TimeComparisonChart.displayName = "TimeComparisonChart";

const VisualEditPage = () => {
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
              <h1 className="text-xl font-medium text-white">Visual Edit</h1>
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
              <span>December 12, 2025</span>
            </div>
          </div>

          <div className="flex flex-col gap-4 text-neutral-400">
            <div className="flex flex-col gap-3">
              <p>
                Visual Edit is now available in React Grab. Click any part of
                your app, ask for a change, and see it happen in under 20
                seconds. It uses{" "}
                <a
                  href="https://grok.com/code-fast-1"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-neutral-300 hover:text-white underline underline-offset-4"
                >
                  Grok Code Fast 1
                </a>{" "}
                through{" "}
                <a
                  href="https://opencode.ai/docs/zen/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-neutral-300 hover:text-white underline underline-offset-4"
                >
                  OpenCode Zen
                </a>
                <sup className="text-neutral-500 text-[10px] ml-0.5">1</sup> .
                It generates a list of changes and returns the result live.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <h3 className="text-lg font-medium text-neutral-200 mt-4">
                See it in action
              </h3>
              <div className="py-4">
                <video
                  src="/visual-edit.webm"
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
              <h3 className="text-lg font-medium text-neutral-200 mt-4">
                Fast and free
              </h3>
              <p>
                React Grab is free and open source. Visual Edit is incredibly
                fast. We ran 20 UI editing tasks on the shadcn/ui dashboard,
                comparing Visual Edit against traditional AI coding tools.
              </p>
              <p>
                Each task was timed from prompt to completion. Visual Edit
                averages under 6 seconds per edit. Traditional tools average
                around 17 seconds.
              </p>
              <div className="py-4">
                <TimeComparisonChart />
              </div>
              <p className="text-sm text-neutral-500">
                Distribution of edit times across 20 UI tasks. Visual Edit
                eliminates the search phase by providing exact file paths and
                line numbers, letting the agent jump straight to the code. See
                the{" "}
                <Link
                  href="/blog/intro"
                  className="text-neutral-400 hover:text-white underline underline-offset-4"
                >
                  full benchmark
                </Link>{" "}
                for methodology and detailed results.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <h3 className="text-lg font-medium text-neutral-200 mt-8">
                The right way to visual edit
              </h3>
              <p>
                We think this is the correct approach to visual editing.
                Developers don{"'"}t want a worse AI coding tool, and designers
                don{"'"}t want a worse Figma.
              </p>
              <p>
                Design and engineering are different modes of work with
                different needs.
                <sup className="text-neutral-500 text-[10px] ml-0.5">
                  2
                </sup>{" "}
                Workflows bespoke to each will be used by both. We{"'"}re
                designing things that are legitimately useful for daily use,
                that we dogfood internally and see our users use hundreds of
                times a day.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <h3 className="text-lg font-medium text-neutral-200 mt-8">
                Getting started
              </h3>
              <p>
                Run this command at your project root and select the Visual Edit
                option:
              </p>
              <div className="bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg overflow-hidden">
                <div className="px-3 py-2">
                  <HighlightedCodeBlock
                    lang="bash"
                    code={`npx grab@latest init`}
                  />
                </div>
              </div>
              <p className="text-sm text-neutral-500">
                CLI will inject a script tag and configure Visual Edit
                automatically. Just start the dev server and you{"'"}re good to
                go.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <h3 className="text-lg font-medium text-neutral-200 mt-8">
                What{"'"}s next
              </h3>
              <p>
                Visual Edit works with any agent that has a CLI or API. But we
                {"'"}re also building{" "}
                <a
                  href="https://ami.dev"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-neutral-300 font-medium underline underline-offset-4 hover:text-white"
                >
                  Ami
                </a>
                , a coding agent designed specifically for UI work.
              </p>
              <p>
                Visual Edit handles the UI side: what you clicked, the component
                stack, the prompt. Ami handles the agent side: planning,
                editing, understanding your design system. Today, Visual Edit
                makes your existing tools faster. Once Ami is ready, it gives it
                a natural place to live.
              </p>
            </div>

            <div className="flex flex-col gap-4 mt-8">
              <h3 className="text-lg font-medium text-neutral-200">
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
                <CursorInstallButton />
              </div>
            </div>

            <div className="flex flex-col gap-4 mt-12 pt-8 border-t border-neutral-800">
              <h4 className="text-sm font-medium text-neutral-400">
                Footnotes
              </h4>
              <div className="flex flex-col gap-4 text-sm text-neutral-500">
                <p>
                  <sup className="text-neutral-600 mr-1">1</sup>
                  Thank you to the{" "}
                  <a
                    href="https://opencode.ai/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-neutral-400 hover:text-white underline underline-offset-4"
                  >
                    OpenCode
                  </a>{" "}
                  team for creating{" "}
                  <a
                    href="https://opencode.ai/docs/zen/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-neutral-400 hover:text-white underline underline-offset-4"
                  >
                    Zen
                  </a>
                  . It{"'"}s an amazing service and we
                  {"'"}re using Grok through them. Go check out Zen and really
                  consider using these tools if you want fast, affordable AI.
                </p>
                <p>
                  <sup className="text-neutral-600 mr-1">2</sup>
                  Go check out Stephen Haney{"'"}s excellent{" "}
                  <a
                    href="https://x.com/sdothaney/status/1999191235236626480"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-neutral-400 hover:text-white underline underline-offset-4"
                  >
                    post on this
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

VisualEditPage.displayName = "VisualEditPage";

export default VisualEditPage;



