const NODE_SIZE = 16;

const upperBound = (value: number, levelBounds: number[]): number => {
  let low = 0;
  let high = levelBounds.length - 1;
  while (low < high) {
    const mid = (low + high) >> 1;
    if (levelBounds[mid] > value) {
      high = mid;
    } else {
      low = mid + 1;
    }
  }
  return levelBounds[low];
};

const swapItems = (
  values: Uint32Array,
  boxes: Float64Array,
  indices: Uint16Array | Uint32Array,
  indexA: number,
  indexB: number,
): void => {
  const tempValue = values[indexA];
  values[indexA] = values[indexB];
  values[indexB] = tempValue;

  const boxOffsetA = 4 * indexA;
  const boxOffsetB = 4 * indexB;

  const minXA = boxes[boxOffsetA];
  const minYA = boxes[boxOffsetA + 1];
  const maxXA = boxes[boxOffsetA + 2];
  const maxYA = boxes[boxOffsetA + 3];
  boxes[boxOffsetA] = boxes[boxOffsetB];
  boxes[boxOffsetA + 1] = boxes[boxOffsetB + 1];
  boxes[boxOffsetA + 2] = boxes[boxOffsetB + 2];
  boxes[boxOffsetA + 3] = boxes[boxOffsetB + 3];
  boxes[boxOffsetB] = minXA;
  boxes[boxOffsetB + 1] = minYA;
  boxes[boxOffsetB + 2] = maxXA;
  boxes[boxOffsetB + 3] = maxYA;

  const tempIndex = indices[indexA];
  indices[indexA] = indices[indexB];
  indices[indexB] = tempIndex;
};

const sortByHilbert = (
  values: Uint32Array,
  boxes: Float64Array,
  indices: Uint16Array | Uint32Array,
  left: number,
  right: number,
): void => {
  const stack = [left, right];

  while (stack.length) {
    const stackRight = stack.pop()!;
    const stackLeft = stack.pop()!;

    if (stackRight - stackLeft <= NODE_SIZE && Math.floor(stackLeft / NODE_SIZE) >= Math.floor(stackRight / NODE_SIZE)) continue;

    const valueLeft = values[stackLeft];
    const valueMid = values[(stackLeft + stackRight) >> 1];
    const valueRight = values[stackRight];
    const pivot = ((valueLeft > valueMid) !== (valueLeft > valueRight)) ? valueLeft :
      ((valueMid < valueLeft) !== (valueMid < valueRight)) ? valueMid : valueRight;

    let scanLeft = stackLeft - 1;
    let scanRight = stackRight + 1;

    while (true) {
      do scanLeft++; while (values[scanLeft] < pivot);
      do scanRight--; while (values[scanRight] > pivot);
      if (scanLeft >= scanRight) break;
      swapItems(values, boxes, indices, scanLeft, scanRight);
    }

    stack.push(stackLeft, scanRight, scanRight + 1, stackRight);
  }
};

// Fast Hilbert curve algorithm by http://threadlocalmutex.com/
// Ported from C++ https://github.com/rawrunprotected/hilbert_curves (public domain)
const hilbert = (coordX: number, coordY: number): number => {
  let xorXY = coordX ^ coordY;
  let invertedXor = 0xFFFF ^ xorXY;
  let invertedOr = 0xFFFF ^ (coordX | coordY);
  let maskedAnd = coordX & (coordY ^ 0xFFFF);

  let levelA = xorXY | (invertedXor >> 1);
  let levelB = (xorXY >> 1) ^ xorXY;
  let levelC = ((invertedOr >> 1) ^ (invertedXor & (maskedAnd >> 1))) ^ invertedOr;
  let levelD = ((xorXY & (invertedOr >> 1)) ^ (maskedAnd >> 1)) ^ maskedAnd;

  xorXY = levelA; invertedXor = levelB; invertedOr = levelC; maskedAnd = levelD;
  levelA = ((xorXY & (xorXY >> 2)) ^ (invertedXor & (invertedXor >> 2)));
  levelB = ((xorXY & (invertedXor >> 2)) ^ (invertedXor & ((xorXY ^ invertedXor) >> 2)));
  levelC ^= ((xorXY & (invertedOr >> 2)) ^ (invertedXor & (maskedAnd >> 2)));
  levelD ^= ((invertedXor & (invertedOr >> 2)) ^ ((xorXY ^ invertedXor) & (maskedAnd >> 2)));

  xorXY = levelA; invertedXor = levelB; invertedOr = levelC; maskedAnd = levelD;
  levelA = ((xorXY & (xorXY >> 4)) ^ (invertedXor & (invertedXor >> 4)));
  levelB = ((xorXY & (invertedXor >> 4)) ^ (invertedXor & ((xorXY ^ invertedXor) >> 4)));
  levelC ^= ((xorXY & (invertedOr >> 4)) ^ (invertedXor & (maskedAnd >> 4)));
  levelD ^= ((invertedXor & (invertedOr >> 4)) ^ ((xorXY ^ invertedXor) & (maskedAnd >> 4)));

  xorXY = levelA; invertedXor = levelB;
  levelC ^= ((xorXY & (levelC >> 8)) ^ (invertedXor & (levelD >> 8)));
  levelD ^= ((invertedXor & (levelC >> 8)) ^ ((xorXY ^ invertedXor) & (levelD >> 8)));

  xorXY = levelC ^ (levelC >> 1);
  invertedXor = levelD ^ (levelD >> 1);

  let interleaved0 = coordX ^ coordY;
  let interleaved1 = invertedXor | (0xFFFF ^ (interleaved0 | xorXY));

  interleaved0 = (interleaved0 | (interleaved0 << 8)) & 0x00FF00FF;
  interleaved0 = (interleaved0 | (interleaved0 << 4)) & 0x0F0F0F0F;
  interleaved0 = (interleaved0 | (interleaved0 << 2)) & 0x33333333;
  interleaved0 = (interleaved0 | (interleaved0 << 1)) & 0x55555555;

  interleaved1 = (interleaved1 | (interleaved1 << 8)) & 0x00FF00FF;
  interleaved1 = (interleaved1 | (interleaved1 << 4)) & 0x0F0F0F0F;
  interleaved1 = (interleaved1 | (interleaved1 << 2)) & 0x33333333;
  interleaved1 = (interleaved1 | (interleaved1 << 1)) & 0x55555555;

  return ((interleaved1 << 1) | interleaved0) >>> 0;
};

export class HilbertRTree {
  private readonly numItems: number;
  private readonly boxes: Float64Array;
  private readonly indices: Uint16Array | Uint32Array;
  private readonly levelBounds: number[];
  private position: number;

  minX = Infinity;
  minY = Infinity;
  maxX = -Infinity;
  maxY = -Infinity;

  constructor(numItems: number) {
    if (numItems <= 0) throw new Error(`Unexpected numItems value: ${numItems}.`);

    this.numItems = numItems;

    let nodeCount = numItems;
    this.levelBounds = [nodeCount * 4];
    let remaining = numItems;
    do {
      remaining = Math.ceil(remaining / NODE_SIZE);
      nodeCount += remaining;
      this.levelBounds.push(nodeCount * 4);
    } while (remaining !== 1);

    const IndexArrayType = nodeCount < 16384 ? Uint16Array : Uint32Array;
    this.boxes = new Float64Array(nodeCount * 4);
    this.indices = new IndexArrayType(nodeCount);
    this.position = 0;
  }

  add(minX: number, minY: number, maxX: number = minX, maxY: number = minY): number {
    const itemIndex = this.position >> 2;
    this.indices[itemIndex] = itemIndex;
    this.boxes[this.position++] = minX;
    this.boxes[this.position++] = minY;
    this.boxes[this.position++] = maxX;
    this.boxes[this.position++] = maxY;

    if (minX < this.minX) this.minX = minX;
    if (minY < this.minY) this.minY = minY;
    if (maxX > this.maxX) this.maxX = maxX;
    if (maxY > this.maxY) this.maxY = maxY;

    return itemIndex;
  }

  finish(): void {
    if (this.position >> 2 !== this.numItems) {
      throw new Error(`Added ${this.position >> 2} items when expected ${this.numItems}.`);
    }

    const boxes = this.boxes;

    if (this.numItems <= NODE_SIZE) {
      boxes[this.position++] = this.minX;
      boxes[this.position++] = this.minY;
      boxes[this.position++] = this.maxX;
      boxes[this.position++] = this.maxY;
      return;
    }

    const width = (this.maxX - this.minX) || 1;
    const height = (this.maxY - this.minY) || 1;
    const hilbertValues = new Uint32Array(this.numItems);
    const hilbertMax = (1 << 16) - 1;

    for (let itemIndex = 0, boxPosition = 0; itemIndex < this.numItems; itemIndex++) {
      const rectMinX = boxes[boxPosition++];
      const rectMinY = boxes[boxPosition++];
      const rectMaxX = boxes[boxPosition++];
      const rectMaxY = boxes[boxPosition++];
      const normalizedX = Math.floor(hilbertMax * ((rectMinX + rectMaxX) / 2 - this.minX) / width);
      const normalizedY = Math.floor(hilbertMax * ((rectMinY + rectMaxY) / 2 - this.minY) / height);
      hilbertValues[itemIndex] = hilbert(normalizedX, normalizedY);
    }

    sortByHilbert(hilbertValues, boxes, this.indices, 0, this.numItems - 1);

    for (let levelIndex = 0, boxPosition = 0; levelIndex < this.levelBounds.length - 1; levelIndex++) {
      const levelEnd = this.levelBounds[levelIndex];

      while (boxPosition < levelEnd) {
        const nodeStartIndex = boxPosition;

        let nodeMinX = boxes[boxPosition++];
        let nodeMinY = boxes[boxPosition++];
        let nodeMaxX = boxes[boxPosition++];
        let nodeMaxY = boxes[boxPosition++];
        for (let childIndex = 1; childIndex < NODE_SIZE && boxPosition < levelEnd; childIndex++) {
          nodeMinX = Math.min(nodeMinX, boxes[boxPosition++]);
          nodeMinY = Math.min(nodeMinY, boxes[boxPosition++]);
          nodeMaxX = Math.max(nodeMaxX, boxes[boxPosition++]);
          nodeMaxY = Math.max(nodeMaxY, boxes[boxPosition++]);
        }

        this.indices[this.position >> 2] = nodeStartIndex;
        boxes[this.position++] = nodeMinX;
        boxes[this.position++] = nodeMinY;
        boxes[this.position++] = nodeMaxX;
        boxes[this.position++] = nodeMaxY;
      }
    }
  }

  search(minX: number, minY: number, maxX: number, maxY: number): number[] {
    if (this.position !== this.boxes.length) {
      throw new Error("Data not yet indexed - call finish().");
    }

    let nodeIndex: number | undefined = this.boxes.length - 4;
    const searchQueue: number[] = [];
    const results: number[] = [];

    while (nodeIndex !== undefined) {
      const nodeEnd = Math.min(nodeIndex + NODE_SIZE * 4, upperBound(nodeIndex, this.levelBounds));

      for (let boxPosition = nodeIndex; boxPosition < nodeEnd; boxPosition += 4) {
        const candidateMinX = this.boxes[boxPosition];
        if (maxX < candidateMinX) continue;
        const candidateMinY = this.boxes[boxPosition + 1];
        if (maxY < candidateMinY) continue;
        const candidateMaxX = this.boxes[boxPosition + 2];
        if (minX > candidateMaxX) continue;
        const candidateMaxY = this.boxes[boxPosition + 3];
        if (minY > candidateMaxY) continue;

        const candidateIndex = this.indices[boxPosition >> 2] | 0;

        if (nodeIndex >= this.numItems * 4) {
          searchQueue.push(candidateIndex);
        } else {
          results.push(candidateIndex);
        }
      }

      nodeIndex = searchQueue.pop();
    }

    return results;
  }
}
