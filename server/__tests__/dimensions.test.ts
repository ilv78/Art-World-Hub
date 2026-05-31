import { describe, it, expect } from "vitest";
import { parseDimensions } from "@shared/dimensions";

describe("parseDimensions", () => {
  it("parses plain 'W x H' with spaces", () => {
    expect(parseDimensions("30 x 21")).toEqual({ widthCm: 30, heightCm: 21, unit: "cm" });
  });

  it("parses compact 'WxH' without spaces", () => {
    expect(parseDimensions("30x40")).toEqual({ widthCm: 30, heightCm: 40, unit: "cm" });
  });

  it("tolerates trailing whitespace (real production data)", () => {
    expect(parseDimensions("30 x 21 ")).toEqual({ widthCm: 30, heightCm: 21, unit: "cm" });
    expect(parseDimensions("100 x 100 ")).toEqual({ widthCm: 100, heightCm: 100, unit: "cm" });
  });

  it("parses large dimensions", () => {
    expect(parseDimensions("200 x 100")).toEqual({ widthCm: 200, heightCm: 100, unit: "cm" });
  });

  it("handles the × unicode multiplication sign and 'by'", () => {
    expect(parseDimensions("40 × 60")).toEqual({ widthCm: 40, heightCm: 60, unit: "cm" });
    expect(parseDimensions("40 by 60")).toEqual({ widthCm: 40, heightCm: 60, unit: "cm" });
  });

  it("converts inches to cm", () => {
    expect(parseDimensions('10 x 20 in')).toEqual({ widthCm: 25.4, heightCm: 50.8, unit: "in" });
    expect(parseDimensions('10x20"')).toEqual({ widthCm: 25.4, heightCm: 50.8, unit: "in" });
  });

  it("converts mm to cm", () => {
    expect(parseDimensions("600 x 800 mm")).toEqual({ widthCm: 60, heightCm: 80, unit: "mm" });
  });

  it("handles decimal and comma-decimal values", () => {
    expect(parseDimensions("30.5 x 21")).toEqual({ widthCm: 30.5, heightCm: 21, unit: "cm" });
    expect(parseDimensions("30,5 x 21")).toEqual({ widthCm: 30.5, heightCm: 21, unit: "cm" });
  });

  it("returns null for unparseable / empty input", () => {
    expect(parseDimensions(null)).toBeNull();
    expect(parseDimensions(undefined)).toBeNull();
    expect(parseDimensions("")).toBeNull();
    expect(parseDimensions("medium size")).toBeNull();
    expect(parseDimensions("30")).toBeNull();
    expect(parseDimensions("0 x 40")).toBeNull();
  });
});
