import { describe, expect, it } from "vitest";
import { computeAccuracy, computePoints, computeWpm, validateRun } from "../scoring";

const iso = (ms: number) => new Date(ms).toISOString();

describe("scoring", () => {
  it("WPM is (chars/5)/minutes", () => {
    expect(computeWpm(250, 60000)).toBe(50);
  });
  it("accuracy counts typos against correct chars", () => {
    expect(computeAccuracy(90, 10)).toBe(90);
  });
  it("first place gets a 50 point bonus", () => {
    expect(computePoints(60, 100, 1)).toBe(110);
  });
  it("rejects runs faster than 250 WPM", () => {
    // 300 chars in 10s = 360 WPM
    expect(validateRun({ startsAt: 0, receivedAt: 10000, passageLength: 300, checkpoints: [] })).toBe("Impossible speed");
  });
  it("rejects checkpoints whose client clock disagrees with the server", () => {
    const cps = [
      { char_index: 50, client_ts: iso(20000), server_ts: iso(10000) },
      { char_index: 100, client_ts: iso(30000), server_ts: iso(30000) },
    ];
    expect(validateRun({ startsAt: 0, receivedAt: 30500, passageLength: 100, checkpoints: cps })).toBe("Clock inconsistent with server");
  });
  it("accepts a plausible run", () => {
    const cps = [
      { char_index: 50, client_ts: iso(10000), server_ts: iso(10100) },
      { char_index: 100, client_ts: iso(20000), server_ts: iso(20100) },
    ];
    expect(validateRun({ startsAt: 0, receivedAt: 20200, passageLength: 100, checkpoints: cps })).toBeNull();
  });
});
