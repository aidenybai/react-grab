export { domToPaper, type DomToPaperOptions } from "./dom-to-paper";

export const copyDomToPaper = async (
  nodeOrNodes: Node | Node[],
  options: import("./dom-to-paper").DomToPaperOptions = {},
): Promise<string> => {
  const { domToPaper } = await import("./dom-to-paper");
  const html = domToPaper(nodeOrNodes, options);
  await navigator.clipboard.writeText(html);
  return html;
};
