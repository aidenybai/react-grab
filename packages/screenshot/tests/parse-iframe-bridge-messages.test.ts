import { describe, expect, it } from "vite-plus/test";
import {
  IFRAME_BRIDGE_REQUEST_MESSAGE_TYPE,
  IFRAME_BRIDGE_RESPONSE_MESSAGE_TYPE,
} from "../src/constants";
import {
  parseIframeBridgeRequestMessage,
  parseIframeBridgeResponseMessage,
} from "../src/utils/parse-iframe-bridge-messages";

const validRequest = {
  type: IFRAME_BRIDGE_REQUEST_MESSAGE_TYPE,
  requestId: "abc",
  pixelRatio: 2,
};

const validResponse = {
  type: IFRAME_BRIDGE_RESPONSE_MESSAGE_TYPE,
  requestId: "abc",
  pngDataUrl: "data:image/png;base64,AAAA",
  widthPx: 300,
  heightPx: 160,
  backgroundColor: "rgb(255, 255, 255)",
};

describe("parseIframeBridgeRequestMessage", () => {
  it("accepts a well-formed request", () => {
    expect(parseIframeBridgeRequestMessage(validRequest)).toEqual(validRequest);
  });

  it("rejects non-objects, wrong types, and bad fields", () => {
    expect(parseIframeBridgeRequestMessage(null)).toBeNull();
    expect(parseIframeBridgeRequestMessage("string")).toBeNull();
    expect(parseIframeBridgeRequestMessage({ ...validRequest, type: "other" })).toBeNull();
    expect(parseIframeBridgeRequestMessage({ ...validRequest, requestId: "" })).toBeNull();
    expect(parseIframeBridgeRequestMessage({ ...validRequest, pixelRatio: 0 })).toBeNull();
    expect(parseIframeBridgeRequestMessage({ ...validRequest, pixelRatio: Number.NaN })).toBeNull();
  });
});

describe("parseIframeBridgeResponseMessage", () => {
  it("accepts a well-formed response", () => {
    expect(parseIframeBridgeResponseMessage(validResponse)).toEqual(validResponse);
    expect(parseIframeBridgeResponseMessage({ ...validResponse, backgroundColor: null })).toEqual({
      ...validResponse,
      backgroundColor: null,
    });
  });

  it("rejects malformed responses", () => {
    expect(parseIframeBridgeResponseMessage(null)).toBeNull();
    expect(parseIframeBridgeResponseMessage({ ...validResponse, type: "other" })).toBeNull();
    expect(parseIframeBridgeResponseMessage({ ...validResponse, requestId: 5 })).toBeNull();
    expect(
      parseIframeBridgeResponseMessage({ ...validResponse, pngDataUrl: "http://evil" }),
    ).toBeNull();
    expect(parseIframeBridgeResponseMessage({ ...validResponse, widthPx: 0 })).toBeNull();
    expect(
      parseIframeBridgeResponseMessage({ ...validResponse, heightPx: Number.POSITIVE_INFINITY }),
    ).toBeNull();
    expect(parseIframeBridgeResponseMessage({ ...validResponse, backgroundColor: 3 })).toBeNull();
  });
});
