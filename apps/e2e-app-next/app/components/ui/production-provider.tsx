"use client";

import { createContext } from "react";

const ProductionContext = createContext("production");

export const ProductionProvider = ({ children }: ProductionProviderProps) => (
  <ProductionContext.Provider value="production">{children}</ProductionContext.Provider>
);

ProductionProvider.displayName = "ProductionProvider";
