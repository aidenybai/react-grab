import prettyMs from "pretty-ms";
import { BenchmarkResult, GroupedResult } from "./types";
import { calculateChange } from "./utils";
import { useState, useMemo } from "react";
import { ChevronDown, ChevronUp, Search, ArrowUpDown } from "lucide-react";
import Image from "next/image";
import { BENCHMARK_TREATMENT_COLOR } from "@/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface BenchmarkDetailedTableProps {
  results: BenchmarkResult[];
  testCaseMap: Record<string, string>;
  lastRunDate?: string;
}

type SortField =
  | "testName"
  | "inputTokens"
  | "outputTokens"
  | "cost"
  | "duration"
  | "toolCalls";
type SortDirection = "asc" | "desc";

interface SortIconProps {
  field: SortField;
  sortField: SortField;
  sortDirection: SortDirection;
}

const SortIcon = ({ field, sortField, sortDirection }: SortIconProps) => {
  if (sortField !== field)
    return <ArrowUpDown size={12} className="ml-1 opacity-30" />;
  return sortDirection === "asc" ? (
    <ChevronUp size={12} className="ml-1" />
  ) : (
    <ChevronDown size={12} className="ml-1" />
  );
};

SortIcon.displayName = "SortIcon";

export const BenchmarkDetailedTable = ({
  results,
  testCaseMap,
  lastRunDate,
}: BenchmarkDetailedTableProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>("testName");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const groupedByTest = useMemo(() => {
    const grouped = results.reduce<Record<string, GroupedResult>>(
      (acc, result) => {
        if (!acc[result.testName]) {
          acc[result.testName] = {};
        }
        acc[result.testName][result.type] = result;
        return acc;
      },
      {},
    );
    return grouped;
  }, [results]);

  const filteredAndSortedResults = useMemo(() => {
    let entries = Object.entries(groupedByTest);

    // Filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      entries = entries.filter(([testName]) =>
        testName.toLowerCase().includes(query),
      );
    }

    // Sort
    entries.sort(([nameA, resultsA], [nameB, resultsB]) => {
      const treatmentA = resultsA.treatment || ({} as BenchmarkResult);
      const treatmentB = resultsB.treatment || ({} as BenchmarkResult);

      let valA: number | string = 0;
      let valB: number | string = 0;

      switch (sortField) {
        case "testName":
          valA = nameA;
          valB = nameB;
          break;
        case "inputTokens":
          valA = treatmentA.inputTokens || 0;
          valB = treatmentB.inputTokens || 0;
          break;
        case "outputTokens":
          valA = treatmentA.outputTokens || 0;
          valB = treatmentB.outputTokens || 0;
          break;
        case "cost":
          valA = treatmentA.costUsd || 0;
          valB = treatmentB.costUsd || 0;
          break;
        case "duration":
          valA = treatmentA.durationMs || 0;
          valB = treatmentB.durationMs || 0;
          break;
        case "toolCalls":
          valA = treatmentA.toolCalls || 0;
          valB = treatmentB.toolCalls || 0;
          break;
      }

      if (valA < valB) return sortDirection === "asc" ? -1 : 1;
      if (valA > valB) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

    return entries;
  }, [groupedByTest, searchQuery, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  return (
    <div className="bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.3)]">
      <div className="p-4 border-b border-[#2a2a2a] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-medium text-neutral-200">Results</h3>
          <p className="text-xs text-neutral-500 mt-1">
            Performance metrics per test: tokens, cost (USD), duration, and tool
            calls. React Grab shows % change vs. Control.
            {lastRunDate && (
              <span className="ml-2">Last run: {lastRunDate}</span>
            )}
          </p>
        </div>
        <div className="relative">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500"
          />
          <Input
            type="text"
            placeholder="Filter tests..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 w-full border-[#2a2a2a] bg-[#1a1a1a] py-1.5 pl-9 pr-3 text-xs text-neutral-200 placeholder:text-neutral-600 focus-visible:border-[#404040] sm:w-[200px]"
          />
        </div>
      </div>
      <div className="overflow-x-auto">
        <Table className="text-sm">
          <TableHeader>
            <TableRow className="border-b border-[#2a2a2a]">
              <TableHead
                rowSpan={2}
                className="py-2 px-3 text-xs font-medium text-neutral-400 uppercase tracking-wider"
              >
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort("testName")}
                  className="h-auto px-0 py-0 text-xs font-medium uppercase tracking-wider text-neutral-400 hover:bg-transparent hover:text-neutral-200"
                >
                  Test Name
                  <SortIcon
                    field="testName"
                    sortField={sortField}
                    sortDirection={sortDirection}
                  />
                </Button>
              </TableHead>
              <TableHead
                colSpan={2}
                className="py-2 px-3 text-xs font-medium text-neutral-400 uppercase tracking-wider"
              >
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort("inputTokens")}
                  className="h-auto px-0 py-0 text-xs font-medium uppercase tracking-wider text-neutral-400 hover:bg-transparent hover:text-neutral-200"
                >
                  Input Tokens
                  <SortIcon
                    field="inputTokens"
                    sortField={sortField}
                    sortDirection={sortDirection}
                  />
                </Button>
              </TableHead>
              <TableHead
                colSpan={2}
                className="py-2 px-3 text-xs font-medium text-neutral-400 uppercase tracking-wider"
              >
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort("outputTokens")}
                  className="h-auto px-0 py-0 text-xs font-medium uppercase tracking-wider text-neutral-400 hover:bg-transparent hover:text-neutral-200"
                >
                  Output Tokens
                  <SortIcon
                    field="outputTokens"
                    sortField={sortField}
                    sortDirection={sortDirection}
                  />
                </Button>
              </TableHead>
              <TableHead
                colSpan={2}
                className="py-2 px-3 text-xs font-medium text-neutral-400 uppercase tracking-wider"
              >
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort("cost")}
                  className="h-auto px-0 py-0 text-xs font-medium uppercase tracking-wider text-neutral-400 hover:bg-transparent hover:text-neutral-200"
                >
                  Cost
                  <SortIcon
                    field="cost"
                    sortField={sortField}
                    sortDirection={sortDirection}
                  />
                </Button>
              </TableHead>
              <TableHead
                colSpan={2}
                className="py-2 px-3 text-xs font-medium text-neutral-400 uppercase tracking-wider"
              >
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort("duration")}
                  className="h-auto px-0 py-0 text-xs font-medium uppercase tracking-wider text-neutral-400 hover:bg-transparent hover:text-neutral-200"
                >
                  Duration
                  <SortIcon
                    field="duration"
                    sortField={sortField}
                    sortDirection={sortDirection}
                  />
                </Button>
              </TableHead>
              <TableHead
                colSpan={2}
                className="py-2 px-3 text-xs font-medium text-neutral-400 uppercase tracking-wider"
              >
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort("toolCalls")}
                  className="h-auto px-0 py-0 text-xs font-medium uppercase tracking-wider text-neutral-400 hover:bg-transparent hover:text-neutral-200"
                >
                  Tool Calls
                  <SortIcon
                    field="toolCalls"
                    sortField={sortField}
                    sortDirection={sortDirection}
                  />
                </Button>
              </TableHead>
            </TableRow>
            <TableRow className="border-b border-[#2a2a2a] bg-[#0d0d0d]">
              <TableHead className="text-left py-1.5 px-3 text-[10px] font-normal text-neutral-600 uppercase tracking-wide">
                Control
              </TableHead>
              <TableHead className="text-left py-1.5 px-3 text-[10px] font-normal text-neutral-600 uppercase tracking-wide bg-[#111111]">
                <div className="flex items-center gap-1.5">
                  <Image
                    src="/logo.svg"
                    alt="React Grab"
                    width={10}
                    height={10}
                    className="w-2.5 h-2.5"
                  />
                  <span style={{ color: BENCHMARK_TREATMENT_COLOR }}>
                    React Grab
                  </span>
                </div>
              </TableHead>
              <TableHead className="text-left py-1.5 px-3 text-[10px] font-normal text-neutral-600 uppercase tracking-wide">
                Control
              </TableHead>
              <TableHead className="text-left py-1.5 px-3 text-[10px] font-normal text-neutral-600 uppercase tracking-wide bg-[#111111]">
                <div className="flex items-center gap-1.5">
                  <Image
                    src="/logo.svg"
                    alt="React Grab"
                    width={10}
                    height={10}
                    className="w-2.5 h-2.5"
                  />
                  <span style={{ color: BENCHMARK_TREATMENT_COLOR }}>
                    React Grab
                  </span>
                </div>
              </TableHead>
              <TableHead className="text-left py-1.5 px-3 text-[10px] font-normal text-neutral-600 uppercase tracking-wide">
                Control
              </TableHead>
              <TableHead className="text-left py-1.5 px-3 text-[10px] font-normal text-neutral-600 uppercase tracking-wide bg-[#111111]">
                <div className="flex items-center gap-1.5">
                  <Image
                    src="/logo.svg"
                    alt="React Grab"
                    width={10}
                    height={10}
                    className="w-2.5 h-2.5"
                  />
                  <span style={{ color: BENCHMARK_TREATMENT_COLOR }}>
                    React Grab
                  </span>
                </div>
              </TableHead>
              <TableHead className="text-left py-1.5 px-3 text-[10px] font-normal text-neutral-600 uppercase tracking-wide">
                Control
              </TableHead>
              <TableHead className="text-left py-1.5 px-3 text-[10px] font-normal text-neutral-600 uppercase tracking-wide bg-[#111111]">
                <div className="flex items-center gap-1.5">
                  <Image
                    src="/logo.svg"
                    alt="React Grab"
                    width={10}
                    height={10}
                    className="w-2.5 h-2.5"
                  />
                  <span style={{ color: BENCHMARK_TREATMENT_COLOR }}>
                    React Grab
                  </span>
                </div>
              </TableHead>
              <TableHead className="text-left py-1.5 px-3 text-[10px] font-normal text-neutral-600 uppercase tracking-wide">
                Control
              </TableHead>
              <TableHead className="text-left py-1.5 px-3 text-[10px] font-normal text-neutral-600 uppercase tracking-wide bg-[#111111]">
                <div className="flex items-center gap-1.5">
                  <Image
                    src="/logo.svg"
                    alt="React Grab"
                    width={10}
                    height={10}
                    className="w-2.5 h-2.5"
                  />
                  <span style={{ color: BENCHMARK_TREATMENT_COLOR }}>
                    React Grab
                  </span>
                </div>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-[#2a2a2a]">
            {filteredAndSortedResults.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} className="py-8 text-center text-neutral-500">
                  No results found matching &quot;{searchQuery}&quot;
                </TableCell>
              </TableRow>
            ) : (
              filteredAndSortedResults.map(([testName, results]) => {
                const control = results.control || ({} as BenchmarkResult);
                const treatment = results.treatment || ({} as BenchmarkResult);

                const inputChange = calculateChange(
                  control.inputTokens,
                  treatment.inputTokens,
                );
                const outputChange = calculateChange(
                  control.outputTokens,
                  treatment.outputTokens,
                );
                const costChange = calculateChange(
                  control.costUsd,
                  treatment.costUsd,
                );
                const durationChange = calculateChange(
                  control.durationMs,
                  treatment.durationMs,
                );
                const toolCallsChange = calculateChange(
                  control.toolCalls,
                  treatment.toolCalls,
                );

                const prompt = testCaseMap[testName] || "";

                return (
                  <TableRow
                    key={testName}
                    className="hover:bg-[#1a1a1a] transition-colors"
                  >
                    <TableCell
                      className="py-2 px-3 font-medium text-neutral-300 cursor-help max-w-[200px] truncate"
                      title={prompt}
                    >
                      {testName}
                    </TableCell>
                    <TableCell className="py-2 px-3 text-neutral-400 tabular-nums text-xs">
                      {control.inputTokens
                        ? control.inputTokens.toLocaleString()
                        : "-"}
                    </TableCell>
                    <TableCell
                      className="py-2 px-3 text-neutral-300 tabular-nums text-xs"
                      style={{
                        backgroundColor:
                          inputChange.bgColor !== "transparent"
                            ? inputChange.bgColor
                            : "transparent",
                      }}
                    >
                      {treatment.inputTokens
                        ? treatment.inputTokens.toLocaleString()
                        : "-"}
                      {inputChange.change && (
                        <span className="ml-1.5 text-[10px] opacity-70">
                          {inputChange.change}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="py-2 px-3 text-neutral-400 tabular-nums text-xs">
                      {control.outputTokens
                        ? control.outputTokens.toLocaleString()
                        : "-"}
                    </TableCell>
                    <TableCell
                      className="py-2 px-3 text-neutral-300 tabular-nums text-xs"
                      style={{
                        backgroundColor:
                          outputChange.bgColor !== "transparent"
                            ? outputChange.bgColor
                            : "transparent",
                      }}
                    >
                      {treatment.outputTokens
                        ? treatment.outputTokens.toLocaleString()
                        : "-"}
                      {outputChange.change && (
                        <span className="ml-1.5 text-[10px] opacity-70">
                          {outputChange.change}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="py-2 px-3 text-neutral-400 tabular-nums text-xs">
                      {control.costUsd !== undefined
                        ? "$" + control.costUsd.toFixed(2)
                        : "-"}
                    </TableCell>
                    <TableCell
                      className="py-2 px-3 text-neutral-300 tabular-nums text-xs"
                      style={{
                        backgroundColor:
                          costChange.bgColor !== "transparent"
                            ? costChange.bgColor
                            : "transparent",
                      }}
                    >
                      {treatment.costUsd !== undefined
                        ? "$" + treatment.costUsd.toFixed(2)
                        : "-"}
                      {costChange.change && (
                        <span className="ml-1.5 text-[10px] opacity-70">
                          {costChange.change}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="py-2 px-3 text-neutral-400 tabular-nums text-xs">
                      {control.durationMs ? prettyMs(control.durationMs) : "-"}
                    </TableCell>
                    <TableCell
                      className="py-2 px-3 text-neutral-300 tabular-nums text-xs"
                      style={{
                        backgroundColor:
                          durationChange.bgColor !== "transparent"
                            ? durationChange.bgColor
                            : "transparent",
                      }}
                    >
                      {treatment.durationMs
                        ? prettyMs(treatment.durationMs)
                        : "-"}
                      {durationChange.change && (
                        <span className="ml-1.5 text-[10px] opacity-70">
                          {durationChange.change}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="py-2 px-3 text-neutral-400 tabular-nums text-xs">
                      {control.toolCalls !== undefined
                        ? control.toolCalls
                        : "-"}
                    </TableCell>
                    <TableCell
                      className="py-2 px-3 text-neutral-300 tabular-nums text-xs"
                      style={{
                        backgroundColor:
                          toolCallsChange.bgColor !== "transparent"
                            ? toolCallsChange.bgColor
                            : "transparent",
                      }}
                    >
                      {treatment.toolCalls !== undefined
                        ? treatment.toolCalls
                        : "-"}
                      {toolCallsChange.change && (
                        <span className="ml-1.5 text-[10px] opacity-70">
                          {toolCallsChange.change}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

BenchmarkDetailedTable.displayName = "BenchmarkDetailedTable";
