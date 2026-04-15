const COUNTER_FUNCTION_PATTERN = /\bcounters?\s*\(/;

export const hasCounterReferences = (contentValue: string): boolean =>
  COUNTER_FUNCTION_PATTERN.test(contentValue || "");

const formatCounterValue = (value: number, style: string): string => {
  const normalizedStyle = (style || "decimal").toLowerCase();

  switch (normalizedStyle) {
    case "decimal":
      return String(value);
    case "decimal-leading-zero": {
      const absoluteValue = Math.abs(value);
      return (value < 0 ? "-" : "") + (absoluteValue < 10 ? "0" : "") + String(absoluteValue);
    }
    case "lower-alpha":
    case "lower-latin":
      return formatAlphabeticIndex(value, false);
    case "upper-alpha":
    case "upper-latin":
      return formatAlphabeticIndex(value, true);
    case "lower-roman":
      return formatRomanNumeral(value, false);
    case "upper-roman":
      return formatRomanNumeral(value, true);
    default:
      return String(value);
  }
};

const formatAlphabeticIndex = (number: number, uppercase: boolean): string => {
  let result = "";
  let remaining = Math.max(1, number);
  while (remaining > 0) {
    remaining--;
    result = String.fromCharCode(97 + (remaining % 26)) + result;
    remaining = Math.floor(remaining / 26);
  }
  return uppercase ? result.toUpperCase() : result;
};

const formatRomanNumeral = (number: number, uppercase: boolean): string => {
  const romanMap: Array<[number, string]> = [
    [1000, "M"], [900, "CM"], [500, "D"], [400, "CD"],
    [100, "C"], [90, "XC"], [50, "L"], [40, "XL"],
    [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"],
  ];
  let remaining = Math.max(1, Math.min(3999, number));
  let result = "";
  for (const [threshold, symbol] of romanMap) {
    while (remaining >= threshold) {
      result += symbol;
      remaining -= threshold;
    }
  }
  return uppercase ? result : result.toLowerCase();
};

interface CounterDirective {
  counterName: string;
  value: number;
}

const parseCounterDirective = (rawValue: string, defaultIncrement: number): CounterDirective[] => {
  if (!rawValue || rawValue === "none") return [];

  const directives: CounterDirective[] = [];
  const commaSeparated = rawValue.split(",");

  for (const segment of commaSeparated) {
    const tokens = segment.trim().split(/\s+/);
    let index = 0;
    while (index < tokens.length) {
      const counterName = tokens[index];
      if (!counterName || /^\d/.test(counterName)) {
        index++;
        continue;
      }
      const nextToken = tokens[index + 1];
      const hasNumericValue = nextToken !== undefined && /^[+-]?\d+$/.test(nextToken);
      const value = hasNumericValue ? parseInt(nextToken, 10) : defaultIncrement;
      directives.push({ counterName, value });
      index += hasNumericValue ? 2 : 1;
    }
  }

  return directives;
};

interface CounterState {
  counters: Map<string, number[]>;
}

export const buildCounterContext = (
  rootElement: Element,
): {
  getCounterValue: (element: Element, counterName: string) => number;
  getCounterStack: (element: Element, counterName: string) => number[];
} => {
  const nodeCounterMap = new WeakMap<Element, CounterState>();

  const cloneCounterState = (parentState: CounterState): CounterState => ({
    counters: new Map(
      Array.from(parentState.counters.entries()).map(([name, stack]) => [name, [...stack]]),
    ),
  });

  const processElementCounters = (element: Element, parentState: CounterState) => {
    const computed = getComputedStyle(element);
    const currentState = cloneCounterState(parentState);

    const resetDirectives = parseCounterDirective(
      computed.getPropertyValue("counter-reset").trim(),
      0,
    );
    for (const { counterName, value: resetValue } of resetDirectives) {
      const existingStack = currentState.counters.get(counterName);
      if (existingStack && existingStack.length > 0) {
        existingStack.push(resetValue);
      } else {
        currentState.counters.set(counterName, [resetValue]);
      }
    }

    const setDirectives = parseCounterDirective(
      computed.getPropertyValue("counter-set").trim(),
      0,
    );
    for (const { counterName, value: setValue } of setDirectives) {
      const stack = currentState.counters.get(counterName);
      if (stack && stack.length > 0) {
        stack[stack.length - 1] = setValue;
      } else {
        currentState.counters.set(counterName, [setValue]);
      }
    }

    const incrementDirectives = parseCounterDirective(
      computed.getPropertyValue("counter-increment").trim(),
      1,
    );
    for (const { counterName, value: incrementAmount } of incrementDirectives) {
      const stack = currentState.counters.get(counterName) || [0];
      stack[stack.length - 1] += incrementAmount;
      currentState.counters.set(counterName, stack);
    }

    if (element.tagName === "LI") {
      const parentList = element.parentElement;
      if (parentList && (parentList.tagName === "OL" || parentList.tagName === "UL")) {
        const startValue = parseInt(parentList.getAttribute("start") || "1", 10) || 1;
        const explicitValue = element.getAttribute("value");
        let listItemIndex = 0;
        for (const sibling of Array.from(parentList.children)) {
          if (sibling === element) break;
          if (sibling.tagName === "LI") listItemIndex++;
        }
        const itemValue = explicitValue ? parseInt(explicitValue, 10) : startValue + listItemIndex;
        const stack = currentState.counters.get("list-item") || [0];
        stack[stack.length - 1] = itemValue;
        currentState.counters.set("list-item", stack);
      }
    }

    nodeCounterMap.set(element, currentState);

    for (const child of Array.from(element.children)) {
      processElementCounters(child, currentState);
    }
  };

  processElementCounters(rootElement, { counters: new Map() });

  return {
    getCounterValue: (element: Element, counterName: string): number => {
      const state = nodeCounterMap.get(element);
      if (!state) return 0;
      const stack = state.counters.get(counterName);
      return stack && stack.length > 0 ? stack[stack.length - 1] : 0;
    },
    getCounterStack: (element: Element, counterName: string): number[] => {
      const state = nodeCounterMap.get(element);
      if (!state) return [];
      return state.counters.get(counterName) || [];
    },
  };
};

export const resolveCounterContent = (
  contentValue: string,
  element: Element,
  counterContext: {
    getCounterValue: (element: Element, counterName: string) => number;
    getCounterStack: (element: Element, counterName: string) => number[];
  },
): string => {
  let resolved = contentValue;

  resolved = resolved.replace(
    /counters\(\s*([^,]+)\s*,\s*"([^"]*)"\s*(?:,\s*([^)]+))?\s*\)/g,
    (_match, counterName: string, separator: string, style: string) => {
      const stack = counterContext.getCounterStack(element, counterName.trim());
      if (stack.length === 0) return "0";
      return stack
        .map((stackValue) => formatCounterValue(stackValue, style?.trim() || "decimal"))
        .join(separator);
    },
  );

  resolved = resolved.replace(
    /counter\(\s*([^,)]+)\s*(?:,\s*([^)]+))?\s*\)/g,
    (_match, counterName: string, style: string) => {
      const value = counterContext.getCounterValue(element, counterName.trim());
      return formatCounterValue(value, style?.trim() || "decimal");
    },
  );

  return resolved;
};
