import { createContext, useContext, type Accessor } from "solid-js";

export interface MenuItemRegistration {
  value: string;
  domId: string;
  element: HTMLButtonElement;
  isEnabled: () => boolean;
  onSelect: () => void;
}

export interface MenuStore {
  keyboardNavigation: boolean;
  clearActiveOnPointerLeave: boolean;
  activeValue: Accessor<string | null>;
  activeDescendantId: Accessor<string | undefined>;
  setActiveItem: (value: string | null) => void;
  createItemId: () => string;
  canActivateOnHover: () => boolean;
  notePointerMove: () => void;
  resetPointerMove: () => void;
  registerItem: (registration: MenuItemRegistration) => void;
  unregisterItem: (value: string) => void;
  getActiveItem: () => MenuItemRegistration | undefined;
  selectFirst: () => void;
  selectLast: () => void;
  selectNext: () => void;
  selectPrevious: () => void;
  setHighlightContainer: (element: HTMLElement) => void;
  setHighlightRail: (element: HTMLElement) => void;
}

const MenuContext = createContext<MenuStore>();

export const useMenuStore = (): MenuStore => {
  const store = useContext(MenuContext);
  if (!store) {
    throw new Error("Menu subcomponents must be rendered inside <Menu.Provider>");
  }
  return store;
};

export { MenuContext };
