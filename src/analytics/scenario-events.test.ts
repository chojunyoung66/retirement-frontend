import { describe, expect, it } from "vitest";
import { buildScenarioCompareProps } from "./trackers";

describe("buildScenarioCompareProps", () => {
  it("자산 금액 원문 없이 구간만 보낸다 (AC-13)", () => {
    const totalBalanceWon = 612_345_678;
    const props = buildScenarioCompareProps({
      diagnosisType: "couple",
      hasSpouse: true,
      totalBalanceWon,
    });

    expect(props).toEqual({
      diagnosis_type: "couple",
      has_spouse: true,
      asset_bucket: "5-10억",
    });
    const serialized = JSON.stringify(props);
    expect(serialized).not.toContain(String(totalBalanceWon));
    expect(serialized).not.toContain(String(Math.round(totalBalanceWon / 10000)));
    expect(Object.values(props).every((v) => typeof v !== "number")).toBe(true);
  });
});
