import { createContext } from "react";

const ProductionContext = createContext("vite");

export const ProductionProvider = (props: Readonly<{ children: React.ReactNode }>) => (
  <ProductionContext.Provider value="vite">{props.children}</ProductionContext.Provider>
);
