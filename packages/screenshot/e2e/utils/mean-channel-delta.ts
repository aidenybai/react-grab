export const computeMeanChannelDelta = (
  expectedData: Uint8Array,
  actualData: Uint8Array,
): number => {
  let deltaSum = 0;
  let channelCount = 0;
  for (let byteIndex = 0; byteIndex + 3 < expectedData.length; byteIndex += 4) {
    for (let channelOffset = 0; channelOffset < 3; channelOffset++) {
      deltaSum += Math.abs(
        (expectedData[byteIndex + channelOffset] ?? 0) -
          (actualData[byteIndex + channelOffset] ?? 0),
      );
      channelCount++;
    }
  }
  return channelCount === 0 ? 0 : deltaSum / channelCount;
};
