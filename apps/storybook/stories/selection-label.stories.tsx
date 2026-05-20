import type { Meta, StoryObj } from "storybook-solidjs-vite";
import { expect, waitFor } from "storybook/test";
import { SelectionLabel } from "react-grab/src/components/selection-label/index.js";
import type { SelectionLabelProps } from "react-grab/src/types.js";
import { DEMO_BOUNDS, DEMO_MOUSE_X } from "./demo-bounds.js";
import { Canvas, TargetBox } from "./target-box.js";
import { noop } from "./noop.js";

const baseProps: SelectionLabelProps = {
  visible: true,
  selectionBounds: DEMO_BOUNDS,
  mouseX: DEMO_MOUSE_X,
  tagName: "button",
  componentName: "Button",
  status: "idle",
  onInputChange: noop,
  onSubmit: noop,
  onDismiss: noop,
  onConfirmDismiss: noop,
  onCancelDismiss: noop,
  onAcknowledgeError: noop,
  onRetry: noop,
  onShowContextMenu: noop,
  onHoverChange: noop,
};

const meta: Meta<SelectionLabelProps> = {
  title: "Components/SelectionLabel",
  render: (args) => (
    <Canvas>
      <TargetBox />
      <SelectionLabel {...args} />
    </Canvas>
  ),
  play: async ({ canvasElement }) => {
    await waitFor(() => {
      expect(canvasElement.querySelector("[data-react-grab-selection-label]")).not.toBeNull();
    });
  },
  args: baseProps,
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Idle: Story = {
  args: { tagName: "button", componentName: "Button" },
};

export const IdleTagOnly: Story = {
  args: { tagName: "section", componentName: undefined },
};

export const IdleMultiElement: Story = {
  args: { tagName: "div", componentName: undefined, elementsCount: 3 },
};

export const IdleLongComponentName: Story = {
  args: {
    tagName: "div",
    componentName: "SuperLongComponentNameThatShouldDefinitelyTruncate",
  },
};

export const IdleWithFilePath: Story = {
  args: {
    tagName: "div",
    componentName: "Header",
    filePath: "src/components/Header.tsx",
    onOpen: noop,
  },
};

export const IdleArrowNavigation: Story = {
  args: {
    tagName: "button",
    componentName: "Button",
    arrowNavigationState: {
      isVisible: true,
      activeIndex: 1,
      items: [
        { tagName: "div", componentName: "Card" },
        { tagName: "button", componentName: "Button" },
        { tagName: "span" },
      ],
    },
    onArrowNavigationSelect: noop,
  },
};

export const PromptEmpty: Story = {
  args: {
    tagName: "div",
    componentName: "Card",
    isPromptMode: true,
    inputValue: "",
  },
};

export const PromptWithText: Story = {
  args: {
    tagName: "form",
    componentName: "Form",
    isPromptMode: true,
    inputValue: "make the button larger",
  },
};

export const PromptMultiline: Story = {
  args: {
    tagName: "div",
    componentName: "Container",
    isPromptMode: true,
    inputValue:
      "make the button bigger and change the background color to a nice gradient from blue to purple",
  },
};

export const PendingDismiss: Story = {
  args: {
    tagName: "header",
    componentName: "Header",
    isPromptMode: true,
    isPendingDismiss: true,
    inputValue: "tweak the spacing",
  },
};

export const Copying: Story = {
  args: {
    tagName: "input",
    componentName: "TextField",
    status: "copying",
  },
};

export const Copied: Story = {
  args: {
    tagName: "nav",
    componentName: "Navigation",
    status: "copied",
  },
};

export const Error: Story = {
  args: {
    tagName: "dialog",
    componentName: "Modal",
    status: "error",
    error: "Failed to copy element",
  },
};

export const ErrorLongMessage: Story = {
  args: {
    tagName: "section",
    componentName: "Dashboard",
    status: "error",
    error:
      "The server returned an unexpected error response. Please check your network connection and try again later.",
  },
};
