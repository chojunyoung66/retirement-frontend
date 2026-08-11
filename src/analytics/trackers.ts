import {
  track,
  setUserProperties,
  flushAnalytics,
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
import type { CtaName, StepName } from "./types";

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

/** 저장 성공 — diagnosis_id당 1회만 전송 */
export async function trackResultSaved(
  householdType: string,
): Promise<boolean> {
  // Strict Mode·Summary 백업 중복 방지
  if (wasResultSaved()) return true;
  markResultSaved();

  const props = { household_type: householdType };
  // eslint-disable-next-line no-console
  console.warn("[analytics] result_saved", householdType);

  const httpOk = await withTimeout(trackViaHttp("result_saved", props), 2500);
  track("result_saved", props);
  await withTimeout(flushAnalytics(), 2000);

  // eslint-disable-next-line no-console
  console.warn("[analytics] result_saved done", {
    householdType,
    httpOk,
  });
  return httpOk === true;
}
