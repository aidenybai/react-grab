import type { Meta, StoryObj } from "openstory/solid";
import { expect, waitFor } from "openstory/test";
import { HierarchyMenu } from "react-grab/src/components/toolbar/hierarchy-menu.js";
import type { ArrowNavigationState, DropdownAnchor } from "react-grab/src/types.js";
import { Canvas, TargetBox } from "./target-box.js";
import { noop } from "./noop.js";

interface HierarchyMenuSceneProps {
  state: ArrowNavigationState;
}

const ANCHOR: DropdownAnchor = { x: 220, y: 120, edge: "top" };

const meta: Meta<HierarchyMenuSceneProps> = {
  title: "Components/HierarchyMenu",
  render: (args) => (
    <Canvas>
      <TargetBox />
      <HierarchyMenu position={ANCHOR} state={args.state} onSelect={noop} />
    </Canvas>
  ),
  play: async ({ canvasElement }) => {
    await waitFor(() => {
      expect(canvasElement.querySelector("[data-react-grab-hierarchy-menu]")).not.toBeNull();
    });
  },
  args: {
    state: {
      isVisible: true,
      activeIndex: 2,
      items: [
        { tagName: "main", componentName: "App", depth: 0, isLast: true },
        { tagName: "div", componentName: "Card", depth: 1, isLast: true },
        { tagName: "button", componentName: "Button", depth: 2, isLast: false },
        { tagName: "span", depth: 3, isLast: true },
        { tagName: "a", componentName: "Link", depth: 2, isLast: true },
      ],
    },
  },
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Basic: Story = {};

export const DeepNesting: Story = {
  args: {
    state: {
      isVisible: true,
      activeIndex: 4,
      items: [
        { tagName: "body", depth: 0, isLast: true },
        { tagName: "main", componentName: "Layout", depth: 1, isLast: true },
        { tagName: "section", componentName: "Sidebar", depth: 2, isLast: true },
        { tagName: "ul", componentName: "NavList", depth: 3, isLast: true },
        { tagName: "li", componentName: "NavItem", depth: 4, isLast: false },
        { tagName: "a", componentName: "Link", depth: 5, isLast: true },
        { tagName: "li", componentName: "NavItem", depth: 4, isLast: true },
      ],
    },
  },
};
