export const waapiKeyframePropToCssProp = (keyframeProp: string): string => {
  if (keyframeProp === "cssFloat") return "float";
  if (keyframeProp === "cssOffset") return "offset";
  return keyframeProp.replace(/[A-Z]/g, (upperChar) => `-${upperChar.toLowerCase()}`);
};
