import { describe, expect, it } from "vitest";
import {
  AUTH_GATE_COPY,
  AUTH_GATE_REASONS,
  reasonFromPath,
  resolveAuthGateReason,
} from "./auth-gate";

describe("resolveAuthGateReason", () => {
  it("허용된 reason만 돌려준다", () => {
    expect(resolveAuthGateReason({ reason: "scenarios" })).toBe("scenarios");
    expect(resolveAuthGateReason({ from: "/result", intent: "save", reason: "save_result" })).toBe("save_result");
  });

  it("없거나 잘못된 값이면 null", () => {
    expect(resolveAuthGateReason(null)).toBeNull();
    expect(resolveAuthGateReason(undefined)).toBeNull();
    expect(resolveAuthGateReason({ from: "/result" })).toBeNull();
    expect(resolveAuthGateReason({ reason: "admin" })).toBeNull();
    expect(resolveAuthGateReason("scenarios")).toBeNull();
  });
});

describe("reasonFromPath", () => {
  it("시나리오 관련 보호 화면은 scenarios", () => {
    expect(reasonFromPath("/account-assets")).toBe("scenarios");
    expect(reasonFromPath("/withdrawal-scenarios")).toBe("scenarios");
    expect(reasonFromPath("/withdrawal-plan/3/D")).toBe("scenarios");
    expect(reasonFromPath("/report/7")).toBe("scenarios");
  });

  it("그 밖의 화면은 null", () => {
    expect(reasonFromPath("/summary")).toBeNull();
    expect(reasonFromPath("/portfolio")).toBeNull();
    expect(reasonFromPath("/account")).toBeNull();
    expect(reasonFromPath("/account-assets-old")).toBeNull();
  });
});

describe("AUTH_GATE_COPY", () => {
  it("모든 reason에 제목과 설명이 있다", () => {
    for (const reason of AUTH_GATE_REASONS) {
      expect(AUTH_GATE_COPY[reason].title.length).toBeGreaterThan(0);
      expect(AUTH_GATE_COPY[reason].body.length).toBeGreaterThan(0);
    }
  });
});
