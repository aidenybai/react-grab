import type { Meta, StoryObj } from "openstory/solid";
import { expect, waitFor } from "openstory/test";
import { createSignal } from "solid-js";
import { Toolbar } from "react-grab/src/components/toolbar/index.js";
import { copyContent } from "react-grab/src/utils/copy-content.js";
import { COMMENT_ACTION_ID } from "react-grab/src/constants.js";
import { Canvas, TargetBox } from "./target-box.js";
import { noop } from "./noop.js";

interface ToolbarPromptSceneProps {
  componentName: string;
  tagName: string;
  startInPromptMode: boolean;
}

const TOOLBAR_STATE_KEY = "react-grab-toolbar-state";

const seedToolbarState = (): void => {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(
    TOOLBAR_STATE_KEY,
    JSON.stringify({ edge: "bottom", ratio: 0.5, collapsed: false, enabled: true }),
  );
};

const Scene = (args: ToolbarPromptSceneProps) => {
  const [isPromptMode, setIsPromptMode] = createSignal(args.startInPromptMode);
  const [promptValue, setPromptValue] = createSignal("");

  const submitPrompt = () => {
    const label = args.componentName || args.tagName || "element";
    copyContent(`${label}\n\n${promptValue().trim()}`, {
      componentName: args.componentName,
      tagName: args.tagName,
      commentText: promptValue().trim(),
    });
    setPromptValue("");
    setIsPromptMode(false);
  };

  return (
    <Canvas>
      <TargetBox />
      <Toolbar
        isActive={isPromptMode()}
        enabled={true}
        onToggle={noop}
        onStateChange={noop}
        onSelectHoverChange={noop}
        onToggleToolbarMenu={noop}
        // Simulate "activate after selecting": the Comment action enters prompt mode.
        onActivateAction={(actionId) => {
          if (actionId === COMMENT_ACTION_ID) setIsPromptMode(true);
        }}
        isPromptMode={isPromptMode()}
        promptInputValue={promptValue()}
        onPromptInput={setPromptValue}
        onPromptSubmit={submitPrompt}
        onPromptCancel={() => setIsPromptMode(false)}
      />
    </Canvas>
  );
};

const meta: Meta<ToolbarPromptSceneProps> = {
  title: "Components/Toolbar Prompt",
  render: (args) => <Scene {...args} />,
  beforeEach: async () => {
    seedToolbarState();
  },
  play: async ({ canvasElement }) => {
    await waitFor(() => {
      expect(canvasElement.querySelector("[data-react-grab-toolbar]")).not.toBeNull();
    });
  },
  args: {
    componentName: "Button",
    tagName: "button",
    startInPromptMode: true,
  },
  argTypes: {
    componentName: { control: "text" },
    tagName: { control: "text" },
    startInPromptMode: { control: "boolean" },
  },
};

export default meta;

type Story = StoryObj<typeof meta>;

export const PromptMode: Story = {
  args: { startInPromptMode: true },
};

export const ToggleFromToolbar: Story = {
  args: { startInPromptMode: false },
};

export const NoComponentName: Story = {
  args: { componentName: "", tagName: "div", startInPromptMode: true },
};
