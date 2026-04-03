export const autoResizeTextarea = (textarea: HTMLTextAreaElement, maxHeight: number) => {
  textarea.style.height = "auto";
  textarea.style.height = `${Math.min(textarea.scrollHeight, maxHeight)}px`;
};
