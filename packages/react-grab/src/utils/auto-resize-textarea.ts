const pendingResizeFrameHandles = new WeakMap<HTMLTextAreaElement, number>();

export const autoResizeTextarea = (textarea: HTMLTextAreaElement, maxHeight: number) => {
  const pendingResizeFrameHandle = pendingResizeFrameHandles.get(textarea);
  if (pendingResizeFrameHandle !== undefined) {
    cancelAnimationFrame(pendingResizeFrameHandle);
  }

  const currentHeight = textarea.offsetHeight;
  textarea.style.height = "auto";
  const targetHeight = Math.min(textarea.scrollHeight, maxHeight);
  textarea.style.height = `${currentHeight}px`;

  if (targetHeight === currentHeight) {
    pendingResizeFrameHandles.delete(textarea);
    return;
  }

  const resizeFrameHandle = requestAnimationFrame(() => {
    textarea.style.height = `${targetHeight}px`;
    pendingResizeFrameHandles.delete(textarea);
  });
  pendingResizeFrameHandles.set(textarea, resizeFrameHandle);
};
