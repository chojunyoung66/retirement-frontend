import { describe, expect, it } from "vitest";
import { buildExpertReviewProps, buildTaxHealthCheckProps } from "./trackers";

describe("세금·건보 체크·전문가 검토 이벤트 속성", () => {
  it("체크 실행은 입력 여부(boolean)만 보내고 금액이 없다 (AC-13)", () => {
    const props = buildTaxHealthCheckProps({
      hasPropertyInput: true,
      hasFinancialIncomeInput: false,
      hasActualPremiumInput: true,
    });
    expect(props).toEqual({
      has_property_input: true,
      has_financial_income_input: false,
      has_actual_premium_input: true,
    });
    expect(Object.values(props).every((v) => typeof v === "boolean")).toBe(true);
  });

  it("전문가 검토 요청은 시나리오 유형과 배치만 보낸다", () => {
    const props = buildExpertReviewProps("D", "report");
    expect(props).toEqual({ scenario_type: "D", cta_placement: "report" });
    expect(Object.values(props).every((v) => typeof v !== "number")).toBe(true);
  });
});
