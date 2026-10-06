export type StepName =
  | "type"
  | "profile"
  | "cashflow"
  | "scenario"
  | "medical";

export type CtaName = "save_result" | "cashflow_plan" | "withdrawal_scenarios";

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
  | "recalculation_started"
  | "scenario_compare_view"
  | "scenario_selected"
  | "withdrawal_plan_view"
  | "report_created"
  | "report_preview_view"
  | "report_downloaded"
  | "tax_health_check_run"
  | "expert_review_requested"
  | "report_checkout_started"
  | "report_purchased"
  | "report_purchase_failed"
  | "execution_plan_started"
  | "execution_item_completed";

export type ReportDownloadMethod = "share" | "download" | "print";

export type ReportFormat = "pdf" | "xlsx";

export type PaymentMethodType = "card" | "easy_pay" | "other";

export type ExpertReviewPlacement = "withdrawal_plan" | "report";

export type EventProps = Record<string, string | number | boolean | null | undefined>;
