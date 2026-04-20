import { expect, waitFor } from "storybook/test";

export const assertMounted = (canvasElement: HTMLElement, selector: string): Promise<void> =>
  waitFor(() => {
    expect(canvasElement.querySelector(selector)).not.toBeNull();
  });

export const assertNotMounted = (canvasElement: HTMLElement, selector: string): Promise<void> =>
  waitFor(() => {
    expect(canvasElement.querySelector(selector)).toBeNull();
  });
