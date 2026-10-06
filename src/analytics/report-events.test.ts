import { describe, expect, it } from "vitest";
import {
  buildExecutionItemCompletedProps,
  buildReportCheckoutProps,
  buildReportDownloadedProps,
  buildReportPreviewProps,
  buildReportPurchasedProps,
  buildReportPurchaseFailedProps,
  toPaymentMethodType,
  toPurchaseFailReason,
} from "./trackers";

const hasNoNumbers = (props: Record<string, unknown>) =>
  Object.values(props).every((v) => typeof v !== "number");

describe("리포트 이벤트 속성", () => {
  it("미리보기는 리포트 종류와 기기 모드만 보낸다 (AC-13)", () => {
    expect(buildReportPreviewProps("pc")).toEqual({
      report_type: "withdrawal_plan",
      device_mode: "pc",
    });
    expect(buildReportPreviewProps("mobile").device_mode).toBe("mobile");
  });

  it("다운로드는 형식과 방법만 보내고 숫자 값이 없다 (AC-13)", () => {
    for (const method of ["share", "download", "print"] as const) {
      const props = buildReportDownloadedProps(method);
      expect(props).toEqual({ report_format: "pdf", method });
      expect(Object.values(props).every((v) => typeof v !== "number")).toBe(true);
    }
  });

  it("엑셀 다운로드는 report_format이 xlsx", () => {
    expect(buildReportDownloadedProps("download", "xlsx")).toEqual({
      report_format: "xlsx",
      method: "download",
    });
  });
});

describe("결제 이벤트 속성 — 금액·주문번호를 보내지 않는다", () => {
  it("결제 시작은 시나리오 유형만", () => {
    expect(buildReportCheckoutProps("D")).toEqual({ scenario_type: "D" });
  });

  it("구매 완료는 시나리오와 결제수단 유형만", () => {
    const props = buildReportPurchasedProps("B", "간편결제");
    expect(props).toEqual({ scenario_type: "B", payment_method_type: "easy_pay" });
    expect(hasNoNumbers(props)).toBe(true);
    expect(Object.keys(props).some((k) => /amount|price|order/i.test(k))).toBe(false);
  });

  it("결제수단 이름을 고정 값으로 바꾼다", () => {
    expect(toPaymentMethodType("카드")).toBe("card");
    expect(toPaymentMethodType("간편결제")).toBe("easy_pay");
    expect(toPaymentMethodType("계좌이체")).toBe("other");
    expect(toPaymentMethodType(null)).toBe("other");
  });

  it("실패는 오류 코드만 — 자유 텍스트는 UNKNOWN", () => {
    expect(buildReportPurchaseFailedProps("PAY_PROCESS_CANCELED")).toEqual({
      reason_code: "PAY_PROCESS_CANCELED",
    });
    expect(toPurchaseFailReason("카드 한도 초과입니다")).toBe("UNKNOWN");
    expect(toPurchaseFailReason(undefined)).toBe("UNKNOWN");
    expect(toPurchaseFailReason("payment_rejected")).toBe("PAYMENT_REJECTED");
  });
});

describe("100일 실행 이벤트 속성", () => {
  it("완료 항목은 마감 주차만 보낸다", () => {
    expect(buildExecutionItemCompletedProps(7)).toEqual({ due_week: 1 });
    expect(buildExecutionItemCompletedProps(8)).toEqual({ due_week: 2 });
    expect(buildExecutionItemCompletedProps(100)).toEqual({ due_week: 15 });
    expect(buildExecutionItemCompletedProps(0)).toEqual({ due_week: 1 });
  });
});
