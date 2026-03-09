"use client";

import * as React from "react";

interface TabsProps {
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  className?: string;
  children: React.ReactNode;
}

const TabsContext = React.createContext<{
  value: string;
  setValue: (value: string) => void;
}>({ value: "", setValue: () => {} });

export function Tabs({
  defaultValue = "",
  value: controlledValue,
  onValueChange,
  className,
  children,
}: TabsProps) {
  const [internalValue, setInternalValue] = React.useState(defaultValue);
  const value = controlledValue ?? internalValue;

  const setValue = React.useCallback(
    (newValue: string) => {
      setInternalValue(newValue);
      onValueChange?.(newValue);
    },
    [onValueChange],
  );

  return (
    <TabsContext.Provider value={{ value, setValue }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
}

export function TabsList({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`inline-flex h-10 items-center justify-center rounded-md bg-gray-100 p-1 ${className ?? ""}`}
    >
      {children}
    </div>
  );
}

export function TabsTrigger({
  value,
  className,
  children,
}: {
  value: string;
  className?: string;
  children: React.ReactNode;
}) {
  const { value: selectedValue, setValue } = React.useContext(TabsContext);
  const isSelected = selectedValue === value;

  return (
    <button
      className={`inline-flex items-center justify-center rounded-sm px-3 py-1.5 text-sm font-medium transition-all ${
        isSelected
          ? "bg-white text-gray-900 shadow-sm"
          : "text-gray-500 hover:text-gray-900"
      } ${className ?? ""}`}
      onClick={() => setValue(value)}
    >
      {children}
    </button>
  );
}

export function TabsContent({
  value,
  className,
  children,
}: {
  value: string;
  className?: string;
  children: React.ReactNode;
}) {
  const { value: selectedValue } = React.useContext(TabsContext);
  if (selectedValue !== value) return null;

  return (
    <div
      className={`mt-2 ring-offset-white focus-visible:outline-none ${className ?? ""}`}
    >
      {children}
    </div>
  );
}
