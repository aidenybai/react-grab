import { AnimationStormSection } from "./animation-storm";
import { CanvasSceneSection } from "./canvas-scene";
import { ChartsSection } from "./charts";
import { HeatmapSection } from "./heatmap";
import { KanbanBoardSection } from "./kanban-board";
import { LiveDashboardSection } from "./live-dashboard";
import { RichEditorSection } from "./rich-editor";
import { ScrollFxSection } from "./scroll-fx";
import { TanstackTableSection } from "./tanstack-table";
import { ToastStormSection } from "./toast-storm";
import { VirtualListSection } from "./virtual-list";

export type HeavyView =
  | "table"
  | "virtual"
  | "charts"
  | "heatmap"
  | "dashboard"
  | "canvas"
  | "animation-storm"
  | "kanban"
  | "editor"
  | "scroll-fx"
  | "toasts"
  | "all"
  | "gauntlet";

const HEAVY_VIEWS: HeavyView[] = [
  "table",
  "virtual",
  "charts",
  "heatmap",
  "dashboard",
  "canvas",
  "animation-storm",
  "kanban",
  "editor",
  "scroll-fx",
  "toasts",
  "all",
  "gauntlet",
];

export const parseHeavyView = (rawView: string | null): HeavyView =>
  HEAVY_VIEWS.includes(rawView as HeavyView) ? (rawView as HeavyView) : "all";

// "all" is the realistic product page (data-heavy components); "gauntlet" is
// the adversarial interference page (pointer capture, rAF mutators, wheel
// hijack, portal churn, capture-layer listeners) mounted together.
export const HeavyPage = ({ view }: { view: HeavyView }) => (
  <div data-testid="heavy-page" data-heavy-view={view} className="min-h-screen pb-24">
    <header className="p-4">
      <h1 className="text-xl font-bold" data-testid="heavy-title">
        Heavy UI Perf Fixture — {view}
      </h1>
      <p className="text-sm text-gray-500">
        Real-world heavy components and interference patterns for react-grab perf benchmarks.
      </p>
    </header>
    {(view === "table" || view === "all") && <TanstackTableSection />}
    {(view === "virtual" || view === "all") && <VirtualListSection />}
    {(view === "charts" || view === "all") && <ChartsSection />}
    {(view === "heatmap" || view === "all") && <HeatmapSection />}
    {(view === "dashboard" || view === "all") && <LiveDashboardSection />}
    {(view === "canvas" || view === "gauntlet") && <CanvasSceneSection />}
    {(view === "animation-storm" || view === "gauntlet") && <AnimationStormSection />}
    {(view === "kanban" || view === "gauntlet") && <KanbanBoardSection />}
    {(view === "editor" || view === "gauntlet") && <RichEditorSection />}
    {(view === "toasts" || view === "gauntlet") && <ToastStormSection />}
    {(view === "scroll-fx" || view === "gauntlet") && <ScrollFxSection />}
  </div>
);
