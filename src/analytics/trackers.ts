import { track, setUserProperties, flushAnalytics, trackViaHttp } from "./client";
import {
  markDiagnosisCompleted,
  markStepCompleted,
  resetDiagnosisId,
  wasDiagnosisCompleted,
  wasStepCompleted,
} from "./session";
import type { CtaName, StepName } from "./types";

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

/** 저장 성공 — SDK + HTTP 직접 전송으로 유실 방지 */
export async function trackResultSaved(householdType: string): Promise<void> {
  const props = { household_type: householdType };
  // 1) HTTP 직접 전송 (navigate 유실에 강함)
  await trackViaHttp("result_saved", props);
  // 2) SDK 경로도 유지 (Identify·세션 정합)
  track("result_saved", props);
  await flushAnalytics();
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.info("[analytics] result_saved done", householdType);
  }
}
