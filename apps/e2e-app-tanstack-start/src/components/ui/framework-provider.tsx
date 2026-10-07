import { createContext } from "react";
import type { ReactNode } from "react";

const FrameworkContext = createContext("tanstack-start");

export const FrameworkProvider = (props: Readonly<{ children: ReactNode }>) => (
  <FrameworkContext.Provider value="tanstack-start">{props.children}</FrameworkContext.Provider>
);
