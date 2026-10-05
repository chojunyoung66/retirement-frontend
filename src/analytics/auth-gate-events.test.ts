import { describe, expect, it } from "vitest";
import { buildAuthGateProps } from "./trackers";

describe("auth_gate_shown 속성", () => {
  it("게이트 이유와 Google 사용 가능 여부만 보낸다 (AC-13)", () => {
    expect(buildAuthGateProps("scenarios", true)).toEqual({
      gate_reason: "scenarios",
      google_available: true,
    });
    const props = buildAuthGateProps("save_result", false);
    expect(props).toEqual({ gate_reason: "save_result", google_available: false });
    expect(Object.values(props).every((v) => typeof v !== "number")).toBe(true);
  });
});
