export const suppressMenuEvent = (event: Event): void => {
  if (event.type === "contextmenu") {
    event.preventDefault();
  }
  event.stopImmediatePropagation();
};
