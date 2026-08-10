/**
 * Analytics public API — Amplitude + optional GA4 mirror.
 */
export { initAnalytics, track, identifyUser, setUserProperties } from "./client";
export {
  captureUtmFromLocation,
  getOrCreateDiagnosisId,
  resetDiagnosisId,
  markDiagnosisCompleted,
  wasDiagnosisCompleted,
  markStepCompleted,
  wasStepCompleted,
} from "./session";
export { toExpenseBucket, toWanBucket } from "./buckets";
export type { AnalyticsEventName, StepName, CtaName } from "./types";
export { trackPageView } from "./trackers";
export {
  trackDiagnosisStarted,
  trackStepViewed,
  trackStepCompleted,
  trackDiagnosisCompleted,
  trackDesignCtaClicked,
  trackResultSaved,
} from "./trackers";
