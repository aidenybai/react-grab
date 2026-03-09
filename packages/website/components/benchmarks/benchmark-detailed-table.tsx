import prettyMs from "pretty-ms";
import { BenchmarkResult, ChangeInfo, GroupedResult } from "./types";
import { calculateChange } from "./utils";
import React, { useState, useMemo } from "react";
import { ChevronDown, ChevronUp, Search, ArrowUpDown } from "lucide-react";
import Image from "next/image";
import { BENCHMARK_TREATMENT_COLOR } from "@/constants";
import { DataTableCard } from "@/components/ui/data-table-card";

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

interface MetricColumn {
  label: string;
  sortField: SortField;
  controlValue: (result?: BenchmarkResult) => string;
  treatmentValue: (result?: BenchmarkResult) => string;
  change: (
    control?: BenchmarkResult,
    treatment?: BenchmarkResult,
  ) => ChangeInfo;
  sortValue: (result?: BenchmarkResult) => number;
}

const METRIC_COLUMNS: MetricColumn[] = [
  {
    label: "Input Tokens",
    sortField: "inputTokens",
    controlValue: (result) =>
      result?.inputTokens ? result.inputTokens.toLocaleString() : "-",
    treatmentValue: (result) =>
      result?.inputTokens ? result.inputTokens.toLocaleString() : "-",
    change: (control, treatment) =>
      calculateChange(control?.inputTokens, treatment?.inputTokens),
    sortValue: (result) => result?.inputTokens ?? 0,
  },
  {
    label: "Output Tokens",
    sortField: "outputTokens",
    controlValue: (result) =>
      result?.outputTokens ? result.outputTokens.toLocaleString() : "-",
    treatmentValue: (result) =>
      result?.outputTokens ? result.outputTokens.toLocaleString() : "-",
    change: (control, treatment) =>
      calculateChange(control?.outputTokens, treatment?.outputTokens),
    sortValue: (result) => result?.outputTokens ?? 0,
  },
  {
    label: "Cost",
    sortField: "cost",
    controlValue: (result) =>
      result?.costUsd !== undefined ? "$" + result.costUsd.toFixed(2) : "-",
    treatmentValue: (result) =>
      result?.costUsd !== undefined ? "$" + result.costUsd.toFixed(2) : "-",
    change: (control, treatment) =>
      calculateChange(control?.costUsd, treatment?.costUsd),
    sortValue: (result) => result?.costUsd ?? 0,
  },
  {
    label: "Duration",
    sortField: "duration",
    controlValue: (result) =>
      result?.durationMs ? prettyMs(result.durationMs) : "-",
    treatmentValue: (result) =>
      result?.durationMs ? prettyMs(result.durationMs) : "-",
    change: (control, treatment) =>
      calculateChange(control?.durationMs, treatment?.durationMs),
    sortValue: (result) => result?.durationMs ?? 0,
  },
  {
    label: "Tool Calls",
    sortField: "toolCalls",
    controlValue: (result) =>
      result?.toolCalls !== undefined ? String(result.toolCalls) : "-",
    treatmentValue: (result) =>
      result?.toolCalls !== undefined ? String(result.toolCalls) : "-",
    change: (control, treatment) =>
      calculateChange(control?.toolCalls, treatment?.toolCalls),
    sortValue: (result) => result?.toolCalls ?? 0,
  },
];

const HEADER_CLASS =
  "text-left py-2 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground transition-colors group";
const CONTROL_SUBHEADER_CLASS =
  "text-left py-1.5 px-3 text-[10px] font-normal text-muted-foreground/60 uppercase tracking-wide";
const TREATMENT_SUBHEADER_CLASS =
  "text-left py-1.5 px-3 text-[10px] font-normal text-muted-foreground/60 uppercase tracking-wide bg-popover/30";

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

const TreatmentLabel = () => (
  <div className="flex items-center gap-1.5">
    <Image
      src="/logo.svg"
      alt="React Grab"
      width={10}
      height={10}
      className="w-2.5 h-2.5"
    />
    <span style={{ color: BENCHMARK_TREATMENT_COLOR }}>React Grab</span>
  </div>
);

TreatmentLabel.displayName = "TreatmentLabel";

export const BenchmarkDetailedTable = ({
  results,
  testCaseMap,
  lastRunDate,
}: BenchmarkDetailedTableProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>("testName");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const groupedByTest = useMemo(() => {
    return results.reduce<Record<string, GroupedResult>>((grouped, result) => {
      if (!grouped[result.testName]) {
        grouped[result.testName] = {};
      }
      grouped[result.testName][result.type] = result;
      return grouped;
    }, {});
  }, [results]);

  const filteredAndSortedResults = useMemo(() => {
    let entries = Object.entries(groupedByTest);

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      entries = entries.filter(([testName]) =>
        testName.toLowerCase().includes(query),
      );
    }

    entries.sort(([nameA, resultsA], [nameB, resultsB]) => {
      let valueA: number | string = 0;
      let valueB: number | string = 0;

      if (sortField === "testName") {
        valueA = nameA;
        valueB = nameB;
      } else {
        const column = METRIC_COLUMNS.find(
          (col) => col.sortField === sortField,
        );
        if (column) {
          valueA = column.sortValue(resultsA.treatment);
          valueB = column.sortValue(resultsB.treatment);
        }
      }

      if (valueA < valueB) return sortDirection === "asc" ? -1 : 1;
      if (valueA > valueB) return sortDirection === "asc" ? 1 : -1;
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
    <DataTableCard
      title="Results"
      description={
        <>
          Performance metrics per test: tokens, cost (USD), duration, and tool
          calls. React Grab shows % change vs. Control.
          {lastRunDate && <span className="ml-2">Last run: {lastRunDate}</span>}
        </>
      }
      actions={
        <div className="relative">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="text"
            placeholder="Filter tests..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-popover border border-border rounded-md py-1.5 pl-9 pr-3 text-xs text-foreground/80 placeholder:text-muted-foreground/60 focus:outline-none focus:border-ring w-full sm:w-[200px]"
          />
        </div>
      }
    >
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th
              rowSpan={2}
              className={HEADER_CLASS}
              onClick={() => handleSort("testName")}
            >
              <div className="flex items-center">
                Test Name
                <SortIcon
                  field="testName"
                  sortField={sortField}
                  sortDirection={sortDirection}
                />
              </div>
            </th>
            {METRIC_COLUMNS.map((column) => (
              <th
                key={column.sortField}
                colSpan={2}
                className={HEADER_CLASS}
                onClick={() => handleSort(column.sortField)}
              >
                <div className="flex items-center">
                  {column.label}
                  <SortIcon
                    field={column.sortField}
                    sortField={sortField}
                    sortDirection={sortDirection}
                  />
                </div>
              </th>
            ))}
          </tr>
          <tr className="border-b border-border bg-card">
            {METRIC_COLUMNS.map((column) => (
              <React.Fragment key={column.sortField}>
                <th className={CONTROL_SUBHEADER_CLASS}>Control</th>
                <th className={TREATMENT_SUBHEADER_CLASS}>
                  <TreatmentLabel />
                </th>
              </React.Fragment>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {filteredAndSortedResults.length === 0 ? (
            <tr>
              <td
                colSpan={1 + METRIC_COLUMNS.length * 2}
                className="py-8 text-center text-muted-foreground"
              >
                No results found matching &quot;{searchQuery}&quot;
              </td>
            </tr>
          ) : (
            filteredAndSortedResults.map(([testName, groupedResults]) => {
              const { control, treatment } = groupedResults;
              const prompt = testCaseMap[testName] || "";

              return (
                <tr
                  key={testName}
                  className="hover:bg-popover transition-colors"
                >
                  <td
                    className="py-2 px-3 font-medium text-foreground/80 cursor-help max-w-[200px] truncate"
                    title={prompt}
                  >
                    {testName}
                  </td>
                  {METRIC_COLUMNS.map((column) => {
                    const changeInfo = column.change(control, treatment);
                    return (
                      <React.Fragment key={column.sortField}>
                        <td className="py-2 px-3 text-muted-foreground tabular-nums text-xs">
                          {column.controlValue(control)}
                        </td>
                        <td
                          className="py-2 px-3 text-foreground/80 tabular-nums text-xs"
                          style={{ backgroundColor: changeInfo.bgColor }}
                        >
                          {column.treatmentValue(treatment)}
                          {changeInfo.change && (
                            <span className="ml-1.5 text-[10px] opacity-70">
                              {changeInfo.change}
                            </span>
                          )}
                        </td>
                      </React.Fragment>
                    );
                  })}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </DataTableCard>
  );
};

BenchmarkDetailedTable.displayName = "BenchmarkDetailedTable";
