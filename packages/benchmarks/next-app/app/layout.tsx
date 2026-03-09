import type { Metadata } from "next";
import "./globals.css";
import { StyledComponentsRegistry } from "@/components/providers/styled-registry";
import { ProviderStack } from "@/components/providers/provider-stack";
import { BenchHarness } from "@/components/bench-harness";

export const metadata: Metadata = {
  title: "React Grab Benchmark - Deeply Nested App",
  description: "Maximally challenging Next.js app for react-grab benchmarking",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <StyledComponentsRegistry>
          <ProviderStack>{children}</ProviderStack>
        </StyledComponentsRegistry>
        <BenchHarness />
        <div id="portal-root" />
      </body>
    </html>
  );
}
