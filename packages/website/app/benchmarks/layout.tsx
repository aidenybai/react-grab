import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Benchmarks | React Grab",
  description:
    "Source resolution benchmarks comparing React Grab, Agentation, and Claude Code across 68 test cases.",
};

export default function BenchmarksLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
