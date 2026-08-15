import type { Component } from "solid-js";
import type { JSX } from "@solidjs/web";
import { MenuContext, type MenuStore } from "./menu-context.js";

interface MenuProviderProps {
  store: MenuStore;
  children: JSX.Element;
}

export const MenuProvider: Component<MenuProviderProps> = (props) => (
  <MenuContext value={props.store}>{props.children}</MenuContext>
);
