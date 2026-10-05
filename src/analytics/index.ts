/**
 * Analytics public API — Amplitude + optional GA4 mirror.
 */
export { initAnalytics, track, identifyUser, toAmplitudeUserId, setUserProperties, flushAnalytics, trackViaHttp } from "./client";
export {
  captureUtmFromLocation,
  readUtmFromSearch,
  getOrCreateDiagnosisId,
  resetDiagnosisId,
  markDiagnosisCompleted,
  wasDiagnosisCompleted,
  markStepCompleted,
  wasStepCompleted,
} from "./session";
export { toAssetBucket, toExpenseBucket, toWanBucket } from "./buckets";
export type { AnalyticsEventName, StepName, CtaName, ReportDownloadMethod } from "./types";
export { trackPageView } from "./trackers";
export {
  trackDiagnosisStarted,
  trackStepViewed,
  trackStepCompleted,
  trackDiagnosisCompleted,
  trackDesignCtaClicked,
  trackResultSaved,
  buildScenarioCompareProps,
  trackScenarioCompareView,
  trackScenarioSelected,
  trackWithdrawalPlanView,
  trackReportCreated,
  buildReportPreviewProps,
  trackReportPreviewView,
  buildReportDownloadedProps,
  trackReportDownloaded,
} from "./trackers";
