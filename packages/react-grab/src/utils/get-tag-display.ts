interface TagDisplayInput {
  tagName?: string;
  componentName?: string;
  elementsCount?: number;
}

interface TagDisplayOutput {
  tagName: string;
  componentName?: string;
}

export const getTagDisplay = (input: TagDisplayInput): TagDisplayOutput => {
  if (input.elementsCount && input.elementsCount > 1) {
    return {
      tagName: `${input.elementsCount} elements`,
      componentName: undefined,
    };
  }

  return {
    tagName: input.tagName || input.componentName || "element",
    componentName: input.tagName ? input.componentName : undefined,
  };
};
