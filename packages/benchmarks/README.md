# React Grab Benchmarks

This package contains the benchmark suite for measuring React Grab's impact on coding agent performance.

## Benchmark (`next-app/`)

The current benchmark system is a Next.js application in [`next-app/`](./next-app/) that serves as both:

- A **deeply nested test codebase** designed to stress-test react-grab's element retrieval across complex component hierarchies, multiple styling approaches, and real-world patterns (route groups, server/client components, feature modules).
- A **results dashboard** displayed at [react-grab.com/benchmarks](https://react-grab.com/benchmarks).

### Running

From the repository root:

```bash
pnpm install
pnpm --filter next-app dev
```

## Submit a Benchmark

Want to run the benchmark on a different codebase, model, or agent? [Fork the repo](https://github.com/aidenybai/react-grab/fork), add your test cases or modify the existing ones, and open a PR with your results.

## Archived (`_archived/`)

The [`_archived/`](./_archived/) directory contains the previous Claude Code CLI benchmark that compared control (without React Grab) vs. treatment (with React Grab) across 20 test cases using the shadcn/ui dashboard. Results from this benchmark are referenced in the [introductory blog post](https://react-grab.com/blog/intro).
