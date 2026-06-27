import { MenuProvider } from "./menu-provider.js";
import { MenuList } from "./menu-list.js";
import { MenuItem } from "./menu-item.js";
import { MenuItemLabel } from "./menu-item-label.js";
import { MenuShortcut } from "./menu-shortcut.js";

export { createMenuStore } from "./menu-store.js";
export { useMenuStore } from "./menu-context.js";
export type { MenuStore, MenuItemRegistration } from "./menu-context.js";
export { MenuProvider, MenuList, MenuItem, MenuItemLabel, MenuShortcut };

export const Menu = {
  Provider: MenuProvider,
  List: MenuList,
  Item: MenuItem,
  Label: MenuItemLabel,
  Shortcut: MenuShortcut,
};
