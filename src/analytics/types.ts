export type StepName =
  | "type"
  | "profile"
  | "cashflow"
  | "scenario"
  | "medical";

export type CtaName = "save_result" | "cashflow_plan";

export type AnalyticsEventName =
  | "page_view"
  | "diagnosis_started"
  | "step_viewed"
  | "step_completed"
  | "diagnosis_completed"
  | "design_cta_clicked"
  | "result_saved"
  | "field_validation_failed"
  | "auth_gate_shown"
  | "recalculation_started";

export type EventProps = Record<string, string | number | boolean | null | undefined>;
