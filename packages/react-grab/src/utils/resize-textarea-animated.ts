export const resizeTextareaAnimated = (textarea: HTMLTextAreaElement, maxHeight: number) => {
  const previousHeight = textarea.style.height || `${textarea.clientHeight}px`;
  textarea.style.height = "auto";
  const targetHeight = Math.min(textarea.scrollHeight, maxHeight);
  textarea.style.height = previousHeight;
  void textarea.offsetHeight;
  textarea.style.height = `${targetHeight}px`;
};
