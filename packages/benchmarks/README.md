# React Grab Benchmarks

This directory contains the benchmark suite used to measure React Grab's impact on coding agent performance. The benchmark compares control (without React Grab) vs treatment (with React Grab) groups across 20 test cases.

## Overview

The benchmark uses the [shadcn/ui dashboard](https://github.com/shadcn-ui/ui) as the test codebase - a Next.js application with auth, data tables, charts, and form components. Each test case represents a real-world task that developers commonly perform when working with coding agents.

Each test runs twice:
- **Control**: Without React Grab output (agent must search the codebase)
- **Treatment**: With React Grab output (agent receives exact component stack)

The benchmark measures:
- Time to completion (`durationMs`)
- Number of tool calls (`toolCalls`)
- Token usage (`inputTokens`, `outputTokens`, `totalTokens`)
- Cost (`costUsd`)
- Success rate (whether the agent found the correct file)

## Prerequisites

- Node.js >= 18
- pnpm >= 8
- An Anthropic API key with access to Claude Code

## Setup

1. Install dependencies from the repository root:

```bash
pnpm install
```

2. Set up your Anthropic API key:

The benchmark uses the `ANTHROPIC_API_KEY` environment variable. Set it before running:

```bash
export ANTHROPIC_API_KEY="your-api-key-here"
```

Or create a `.env` file in this directory:

```
ANTHROPIC_API_KEY=your-api-key-here
```

## Running the Benchmark

From the repository root, navigate to the benchmarks directory:

```bash
cd packages/benchmarks
```

Run the benchmark using bun (bun can run TypeScript files directly):

```bash
bun index.ts
```

The benchmark will:
1. Generate `test-cases.json` from the test cases
2. Run all 40 tests (20 control + 20 treatment) in batches of 5
3. Save results incrementally to `results.json`
4. Display progress in the terminal

## Output

Results are written to `results.json` in the benchmarks directory. Each result includes:

```json
{
  "testName": "Forgot Password Link",
  "type": "control",
  "inputTokens": 12345,
  "outputTokens": 234,
  "totalTokens": 12579,
  "costUsd": 0.012,
  "durationMs": 13600,
  "toolCalls": 5,
  "success": true
}
```

## Test Cases

The benchmark includes 20 test cases covering various UI element retrieval scenarios:

- Form elements (inputs, buttons, links)
- Navigation components
- Data table elements
- Chart components
- Layout components
- Authentication flows

See [`test-cases.json`](./test-cases.json) for the full list of test cases and their prompts.

## Cost Considerations

Running the full benchmark suite (40 tests) will incur API costs. Each test uses:
- Claude Code Sonnet for the main task
- Claude Haiku 4.5 for result grading

Estimated cost per full run: ~$0.50-1.00 USD (varies based on codebase size and API pricing).

## Customization

You can modify the benchmark by:

1. **Adding test cases**: Edit `test-cases.ts` to add new test scenarios
2. **Changing batch size**: Modify `BATCH_SIZE` in `index.ts` (default: 5)
3. **Using a different codebase**: Update `TARGET_ENVIRONMENT_DIR` in `index.ts`
4. **Changing the model**: Modify the model in `claude-code.ts` (currently uses `claudeCode("sonnet")`)

## Troubleshooting

**Error: Provider metadata not found**
- Ensure you have a valid Anthropic API key set
- Check that you have access to Claude Code API

**Tests failing**
- Verify the `shadcn-dashboard` directory exists and is properly set up
- Check that the expected files in test cases match the actual codebase structure

**Out of memory errors**
- Reduce `BATCH_SIZE` in `index.ts` to run fewer tests concurrently

## Caveats & Future Improvements

There are several improvements that can be made to this benchmark:

- **Different codebases**: This benchmark uses the shadcn dashboard. It would be valuable to test with different frameworks, codebase sizes, and architectural patterns to see how React Grab performs across various scenarios.

- **Different agents/model providers**: Currently the benchmark only tests Claude Code. Testing with other coding agents (e.g., GitHub Copilot, Cursor, etc.) would provide a more comprehensive view of React Grab's impact.

- **Multiple trials and sampling**: Since agents are non-deterministic, running multiple trials per test case and averaging results would decrease variance and provide more reliable metrics.

- **Additional metrics**: Consider tracking more granular metrics like time to first tool call, search accuracy, or user satisfaction scores.

Pull requests are welcome! If you'd like to contribute improvements to the benchmark suite, please open an issue or submit a PR on [GitHub](https://github.com/aidenybai/react-grab).

## Results

The latest benchmark results are published on the [React Grab website](https://react-grab.com/blog/intro). The benchmark shows that React Grab makes coding agents approximately **66% faster** on average.
