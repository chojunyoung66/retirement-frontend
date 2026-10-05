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
import type { CtaName, EventProps, ReportDownloadMethod, StepName } from "./types";

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
export function buildReportDownloadedProps(method: ReportDownloadMethod): EventProps {
  return { report_format: "pdf", method };
}

export function trackReportDownloaded(method: ReportDownloadMethod): void {
  track("report_downloaded", buildReportDownloadedProps(method));
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
