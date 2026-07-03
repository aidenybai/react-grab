export const splitTopLevelCommaList = (value: string): string[] => {
  const parts: string[] = [];
  let parenDepth = 0;
  let partStart = 0;
  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    if (character === "(") parenDepth += 1;
    else if (character === ")") parenDepth -= 1;
    else if (character === "," && parenDepth === 0) {
      parts.push(value.slice(partStart, index));
      partStart = index + 1;
    }
  }
  parts.push(value.slice(partStart));
  return parts;
};
