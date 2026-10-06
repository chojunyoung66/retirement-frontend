import {
  track,
  setUserProperties,
  flushAnalytics,
  trackGa4Only,
  trackViaHttp,
} from "./client";
import {
  markDiagnosisCompleted,
  markResultSaved,
  markStepCompleted,
  resetDiagnosisId,
  wasDiagnosisCompleted,
  wasResultSaved,
  wasStepCompleted,
} from "./session";
import { toAssetBucket } from "./buckets";
import type {
  CtaName,
  EventProps,
  ExpertReviewPlacement,
  PaymentMethodType,
  ReportDownloadMethod,
  ReportFormat,
  StepName,
} from "./types";
import type { AuthGateReason } from "../utils/auth-gate";

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), ms);
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch(() => {
        clearTimeout(timer);
        resolve(null);
      });
  });
}

export function trackPageView(path: string): void {
  track("page_view", { path });
}

export function trackDiagnosisStarted(entry: "new" | "resume_saved"): void {
  // 새 진단 세션 ID 발급
  resetDiagnosisId();
  track("diagnosis_started", { entry });
}

export function trackStepViewed(stepName: StepName): void {
  track("step_viewed", { step_name: stepName });
}

export function trackStepCompleted(stepName: StepName): void {
  // diagnosis_id당 step당 1회만 전송
  if (wasStepCompleted(stepName)) return;
  markStepCompleted(stepName);
  track("step_completed", { step_name: stepName });
}

export function trackDiagnosisCompleted(diagnosisType: string): void {
  if (wasDiagnosisCompleted()) return;
  markDiagnosisCompleted();
  setUserProperties({ diagnosis_type: diagnosisType });
  track("diagnosis_completed", { diagnosis_type: diagnosisType });
}

export function trackDesignCtaClicked(
  ctaName: CtaName,
  ctaPlacement: "primary" | "secondary",
): void {
  track("design_cta_clicked", {
    cta_name: ctaName,
    cta_placement: ctaPlacement,
  });
}

/** 시나리오 비교 화면 속성 — 자산은 구간으로만 보낸다 (AC-13) */
export function buildScenarioCompareProps(input: {
  diagnosisType: string;
  hasSpouse: boolean;
  totalBalanceWon: number;
}): EventProps {
  return {
    diagnosis_type: input.diagnosisType,
    has_spouse: input.hasSpouse,
    asset_bucket: toAssetBucket(input.totalBalanceWon),
  };
}

export function trackScenarioCompareView(input: {
  diagnosisType: string;
  hasSpouse: boolean;
  totalBalanceWon: number;
}): void {
  track("scenario_compare_view", buildScenarioCompareProps(input));
}

export function trackScenarioSelected(scenarioType: string): void {
  track("scenario_selected", { scenario_type: scenarioType });
}

export function trackWithdrawalPlanView(scenarioType: string): void {
  track("withdrawal_plan_view", { scenario_type: scenarioType });
}

export function trackReportCreated(scenarioType: string): void {
  track("report_created", { scenario_type: scenarioType });
}

export function buildReportPreviewProps(deviceMode: "pc" | "mobile"): EventProps {
  return { report_type: "withdrawal_plan", device_mode: deviceMode };
}

export function trackReportPreviewView(deviceMode: "pc" | "mobile"): void {
  track("report_preview_view", buildReportPreviewProps(deviceMode));
}

/** print는 인쇄 창을 연 횟수 — 브라우저는 실제 PDF 저장 여부를 알려주지 않는다 */
export function buildReportDownloadedProps(
  method: ReportDownloadMethod,
  format: ReportFormat = "pdf",
): EventProps {
  return { report_format: format, method };
}

export function trackReportDownloaded(
  method: ReportDownloadMethod,
  format: ReportFormat = "pdf",
): void {
  track("report_downloaded", buildReportDownloadedProps(method, format));
}

/** 결제 이벤트에는 금액·주문번호를 넣지 않는다 — 가격은 서버 설정으로 따로 본다 */
export function buildReportCheckoutProps(scenarioType: string): EventProps {
  return { scenario_type: scenarioType };
}

export function trackReportCheckoutStarted(scenarioType: string): void {
  track("report_checkout_started", buildReportCheckoutProps(scenarioType));
}

/** 결제사 결제수단 이름(카드·간편결제 등)을 고정 값으로 바꾼다 */
export function toPaymentMethodType(method: string | null | undefined): PaymentMethodType {
  if (method === "카드") return "card";
  if (method === "간편결제") return "easy_pay";
  return "other";
}

export function buildReportPurchasedProps(
  scenarioType: string,
  method: string | null | undefined,
): EventProps {
  return { scenario_type: scenarioType, payment_method_type: toPaymentMethodType(method) };
}

export function trackReportPurchased(scenarioType: string, method: string | null | undefined): void {
  track("report_purchased", buildReportPurchasedProps(scenarioType, method));
}

/** 오류 코드만 보낸다 — 결제사 안내 문구는 자유 텍스트라 제외 */
export function toPurchaseFailReason(code: string | null | undefined): string {
  if (!code || !/^[A-Za-z0-9_]{1,60}$/.test(code)) return "UNKNOWN";
  return code.toUpperCase();
}

export function buildReportPurchaseFailedProps(code: string | null | undefined): EventProps {
  return { reason_code: toPurchaseFailReason(code) };
}

export function trackReportPurchaseFailed(code: string | null | undefined): void {
  track("report_purchase_failed", buildReportPurchaseFailedProps(code));
}

export function trackExecutionPlanStarted(scenarioType: string): void {
  track("execution_plan_started", { scenario_type: scenarioType });
}

/** 마감일은 주차로만 보낸다 (1주차 = D1~D7) */
export function buildExecutionItemCompletedProps(dueDay: number): EventProps {
  return { due_week: Math.max(1, Math.ceil(dueDay / 7)) };
}

export function trackExecutionItemCompleted(dueDay: number): void {
  track("execution_item_completed", buildExecutionItemCompletedProps(dueDay));
}

/** 입력 여부만 보낸다 — 소득·재산 금액은 보내지 않는다 (AC-13) */
export function buildTaxHealthCheckProps(input: {
  hasPropertyInput: boolean;
  hasFinancialIncomeInput: boolean;
  hasActualPremiumInput: boolean;
}): EventProps {
  return {
    has_property_input: input.hasPropertyInput,
    has_financial_income_input: input.hasFinancialIncomeInput,
    has_actual_premium_input: input.hasActualPremiumInput,
  };
}

export function trackTaxHealthCheckRun(input: {
  hasPropertyInput: boolean;
  hasFinancialIncomeInput: boolean;
  hasActualPremiumInput: boolean;
}): void {
  track("tax_health_check_run", buildTaxHealthCheckProps(input));
}

export function buildExpertReviewProps(
  scenarioType: string,
  placement: ExpertReviewPlacement,
): EventProps {
  return { scenario_type: scenarioType, cta_placement: placement };
}

export function trackExpertReviewRequested(
  scenarioType: string,
  placement: ExpertReviewPlacement,
): void {
  track("expert_review_requested", buildExpertReviewProps(scenarioType, placement));
}

export function buildAuthGateProps(reason: AuthGateReason, googleAvailable: boolean): EventProps {
  return { gate_reason: reason, google_available: googleAvailable };
}

/** 기능 버튼·보호 화면에서 로그인 화면으로 넘어온 경우만 (일반 로그인 진입 제외) */
export function trackAuthGateShown(reason: AuthGateReason, googleAvailable: boolean): void {
  track("auth_gate_shown", buildAuthGateProps(reason, googleAvailable));
}

/** 저장 성공 — diagnosis_id당 1회만 전송 */
export async function trackResultSaved(
  householdType: string,
): Promise<boolean> {
  // Strict Mode·Summary 백업 중복 방지
  if (wasResultSaved()) return true;
  markResultSaved();

  const props = { household_type: householdType };
  const httpOk = await withTimeout(trackViaHttp("result_saved", props), 2500);
  if (httpOk === true) {
    // Amplitude는 HTTP로 이미 전송 — SDK로 또 보내면 중복 집계
    trackGa4Only("result_saved", props);
    return true;
  }
  track("result_saved", props);
  await withTimeout(flushAnalytics(), 2000);
  return false;
}
