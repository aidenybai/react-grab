import { LoaderCircle } from "lucide-react";

const SkeletonCard = () => (
  <div className="flex w-full flex-col gap-2.5 rounded-lg border border-line p-4">
    <div className="flex items-center gap-3">
      <span className="size-9 shrink-0 animate-pulse rounded-full bg-code" />
      <div className="flex w-full flex-col gap-1.5">
        <span className="h-3 w-1/2 animate-pulse rounded bg-code" />
        <span className="h-3 w-1/3 animate-pulse rounded bg-code" />
      </div>
    </div>
    <span className="h-3 w-full animate-pulse rounded bg-code" />
    <span className="h-3 w-4/5 animate-pulse rounded bg-code" />
  </div>
);

SkeletonCard.displayName = "SkeletonCard";

const IndeterminateBar = () => (
  <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-code">
    <span className="absolute h-full w-2/5 animate-progress-sweep rounded-full bg-brand" />
  </div>
);

IndeterminateBar.displayName = "IndeterminateBar";

export const LoadingStates = () => (
  <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
    <SkeletonCard />
    <div className="flex w-full flex-col gap-4 rounded-lg border border-line p-4">
      <div className="flex items-center gap-2 text-sm text-prose">
        <LoaderCircle className="size-4 animate-spin text-brand" />
        Syncing workspace…
      </div>
      <IndeterminateBar />
      <p className="text-xs text-faint">
        Indeterminate sweep — grab the bar mid-flight and it still resolves to the same source.
      </p>
    </div>
  </div>
);

LoadingStates.displayName = "LoadingStates";
