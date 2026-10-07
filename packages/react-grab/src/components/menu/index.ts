import { MenuProvider } from "./menu-provider.js";
import { MenuPanel } from "./menu-panel.js";
import { MenuList } from "./menu-list.js";
import { MenuItem } from "./menu-item.js";
import { MenuItemLabel } from "./menu-item-label.js";
import { MenuShortcut } from "./menu-shortcut.js";

export { createMenuStore } from "./menu-store.js";

export const Menu = {
  Provider: MenuProvider,
  Panel: MenuPanel,
  List: MenuList,
  Item: MenuItem,
  Label: MenuItemLabel,
  Shortcut: MenuShortcut,
};
