import { readFileSync } from 'fs';
import { join } from 'path';

interface BenchmarkResult {
  testName: string;
  type: 'control' | 'treatment';
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  durationMs: number;
  toolCalls: number;
  success: boolean;
}

const resultsFile = process.argv[2] || 'results.json';
const resultsPath = resultsFile.includes('/')
  ? resultsFile
  : join(__dirname, resultsFile);

const results: BenchmarkResult[] = JSON.parse(
  readFileSync(resultsPath, 'utf-8')
);

const controlResults = results.filter((r) => r.type === 'control');
const treatmentResults = results.filter((r) => r.type === 'treatment');

const calculateAverage = (values: number[]) =>
  values.reduce((sum, value) => sum + value, 0) / values.length;

const controlDuration = calculateAverage(controlResults.map((r) => r.durationMs));
const treatmentDuration = calculateAverage(treatmentResults.map((r) => r.durationMs));
const controlCost = calculateAverage(controlResults.map((r) => r.costUsd));
const treatmentCost = calculateAverage(treatmentResults.map((r) => r.costUsd));
const controlToolCalls = calculateAverage(controlResults.map((r) => r.toolCalls));
const treatmentToolCalls = calculateAverage(treatmentResults.map((r) => r.toolCalls));

const durationImprovement = ((controlDuration - treatmentDuration) / controlDuration) * 100;
const costImprovement = ((controlCost - treatmentCost) / controlCost) * 100;
const toolCallsImprovement = ((controlToolCalls - treatmentToolCalls) / controlToolCalls) * 100;

console.log('\n═══════════════════════════════════════════════════════════════');
console.log('                    BENCHMARK SUMMARY');
console.log('═══════════════════════════════════════════════════════════════\n');

console.log('┌─────────────────────────────────────────────────────────────┐');
console.log('│                    CONTROL GROUP                            │');
console.log('├─────────────────────────────────────────────────────────────┤');
console.log(`│  Average Duration:     ${(controlDuration / 1000).toFixed(1)}s (${controlDuration.toFixed(0)}ms)`.padEnd(62) + '│');
console.log(`│  Average Cost:         $${controlCost.toFixed(4)}`.padEnd(62) + '│');
console.log(`│  Average Tool Calls:   ${controlToolCalls.toFixed(1)}`.padEnd(62) + '│');
console.log('└─────────────────────────────────────────────────────────────┘\n');

console.log('┌─────────────────────────────────────────────────────────────┐');
console.log('│                   TREATMENT GROUP                           │');
console.log('├─────────────────────────────────────────────────────────────┤');
console.log(`│  Average Duration:     ${(treatmentDuration / 1000).toFixed(1)}s (${treatmentDuration.toFixed(0)}ms)`.padEnd(62) + '│');
console.log(`│  Average Cost:         $${treatmentCost.toFixed(4)}`.padEnd(62) + '│');
console.log(`│  Average Tool Calls:   ${treatmentToolCalls.toFixed(1)}`.padEnd(62) + '│');
console.log('└─────────────────────────────────────────────────────────────┘\n');

console.log('┌─────────────────────────────────────────────────────────────┐');
console.log('│                  PERFORMANCE IMPROVEMENTS                   │');
console.log('├─────────────────────────────────────────────────────────────┤');
console.log(`│  Duration:     ${durationImprovement.toFixed(1)}% faster (${((controlDuration - treatmentDuration) / 1000).toFixed(1)}s saved)`.padEnd(62) + '│');
console.log(`│  Cost:         ${costImprovement.toFixed(1)}% cheaper ($${(controlCost - treatmentCost).toFixed(4)} saved)`.padEnd(62) + '│');
console.log(`│  Tool Calls:   ${toolCallsImprovement.toFixed(1)}% fewer (${(controlToolCalls - treatmentToolCalls).toFixed(1)} fewer)`.padEnd(62) + '│');
console.log('└─────────────────────────────────────────────────────────────┘\n');

console.log('═══════════════════════════════════════════════════════════════');
console.log('                 INDIVIDUAL TEST RESULTS');
console.log('═══════════════════════════════════════════════════════════════\n');

const testNames = [...new Set(results.map((r) => r.testName))];

console.log('┌────────────────────────────┬──────────┬──────────┬────────────┐');
console.log('│ Test Name                  │ Control  │Treatment │ Improvement│');
console.log('├────────────────────────────┼──────────┼──────────┼────────────┤');

testNames.forEach((testName) => {
  const controlResult = controlResults.find((r) => r.testName === testName);
  const treatmentResult = treatmentResults.find((r) => r.testName === testName);

  if (controlResult && treatmentResult) {
    const improvement =
      ((controlResult.durationMs - treatmentResult.durationMs) / controlResult.durationMs) * 100;
    const sign = improvement > 0 ? '+' : '';
    const emoji = improvement > 0 ? '✓' : '⚠';

    const paddedName = testName.substring(0, 26).padEnd(26);
    const controlTime = `${(controlResult.durationMs / 1000).toFixed(1)}s`.padStart(8);
    const treatmentTime = `${(treatmentResult.durationMs / 1000).toFixed(1)}s`.padStart(8);
    const improvementStr = `${sign}${improvement.toFixed(0)}% ${emoji}`.padStart(10);

    console.log(`│ ${paddedName} │ ${controlTime} │${treatmentTime} │ ${improvementStr} │`);
  }
});

console.log('└────────────────────────────┴──────────┴──────────┴────────────┘\n');

console.log('═══════════════════════════════════════════════════════════════\n');
