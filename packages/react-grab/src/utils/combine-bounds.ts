interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const combineBounds = <T extends Bounds>(boundsList: T[]): Bounds => {
  if (boundsList.length === 0) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }
  if (boundsList.length === 1) {
    return boundsList[0];
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const bounds of boundsList) {
    minX = Math.min(minX, bounds.x);
    minY = Math.min(minY, bounds.y);
    maxX = Math.max(maxX, bounds.x + bounds.width);
    maxY = Math.max(maxY, bounds.y + bounds.height);
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
};
