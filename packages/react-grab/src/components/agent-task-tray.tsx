import type { Component } from "solid-js";
import type { AgentPresenceState, AgentTask, DropdownAnchor } from "../types.js";
import { AGENT_TRAY_MAX_TASKS, AGENT_TRAY_WIDTH_PX } from "../constants.js";
import { AnchoredDropdownSurface } from "./ui/anchored-dropdown-surface.js";
import { Surface } from "./ui/surface.js";
import { AgentPresenceLabel, AgentTaskList } from "./agent-task-list.js";

interface AgentTaskTrayProps {
  position: DropdownAnchor | null;
  tasks: AgentTask[];
  presence: AgentPresenceState;
}

export const AgentTaskTray: Component<AgentTaskTrayProps> = (props) => {
  const recentTasks = () => props.tasks.slice(-AGENT_TRAY_MAX_TASKS);
  const hasOpenTasks = () =>
    props.tasks.some((task) => task.status === "todo" || task.status === "in_progress");

  return (
    <AnchoredDropdownSurface
      position={props.position}
      dataAttribute="data-react-grab-agent-tray"
      interactive={false}
    >
      <Surface class="flex flex-col gap-2 p-2.5" style={{ width: `${AGENT_TRAY_WIDTH_PX}px` }}>
        <AgentPresenceLabel presence={props.presence} hasOpenTasks={hasOpenTasks()} />
        <AgentTaskList tasks={recentTasks()} />
      </Surface>
    </AnchoredDropdownSurface>
  );
};
