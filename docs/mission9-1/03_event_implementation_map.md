# 이벤트 구현 맵

갱신: 2026-10-05

공통 모듈: `src/analytics/` (`client`, `trackers`, `session`, `ga4`, `buckets`)  
초기화: `src/main.tsx` → `initAnalytics()` + `captureUtmFromLocation()`

| 이벤트 | 파일 | 호출 시점 |
|--------|------|-----------|
| `page_view` | `App.tsx` | `location.pathname` 변경 |
| UTM capture / identify | `App.tsx` | search 변경 시 `setUserProperties` |
| Amplitude `user_id` | `App.tsx` → `identifyUser` | 로그인 시 `user_{id}` |
| `auth_status` UP | `App.tsx` | guest / logged_in |
| `diagnosis_started` | `WelcomeScreen.tsx` | `handleStart` |
| `step_viewed` type | `DiagnosisTypeScreen.tsx` | mount |
| `step_completed` type | `DiagnosisTypeScreen.tsx` | 「다음」성공 |
| `step_viewed` profile | `ProfileScreen.tsx` | mount |
| `step_completed` profile | `ProfileScreen.tsx` | `handleNext` 성공 |
| `step_viewed` cashflow | `CashflowInputScreen.tsx` | mount |
| `step_completed` cashflow | `CashflowInputScreen.tsx` | `handleNext` 성공 |
| `step_viewed` scenario | `ScenarioScreen.tsx` | mount |
| `step_completed` scenario | `ScenarioScreen.tsx` | `handleNext` 성공 |
| `step_viewed` medical | `MedicalExpenseScreen.tsx` | mount |
| `step_completed` medical | `MedicalExpenseScreen.tsx` | `handleNext` 성공 |
| `diagnosis_completed` | `ProjectionScreen.tsx` | projection 있을 때 1회 |
| `design_cta_clicked` save | `ProjectionScreen.tsx` | 저장 버튼 |
| `design_cta_clicked` plan | `ProjectionScreen.tsx` | 현금흐름 버튼 |
| `result_saved` | `ProjectionScreen.tsx` | `saveLatestDiagnosis` 성공 직후 |
| `result_saved` 백업 | `SummaryScreen.tsx` | pending 플래그 있을 때만 (1차 실패 시) |
| `design_cta_clicked` scenarios | `ProjectionScreen.tsx` | 4개 인출 시나리오 버튼 |
| `auth_gate_shown` | `SignInScreen.tsx` | 기능 버튼·보호 화면에서 넘어온 경우 |
| `scenario_compare_view` | `WithdrawalScenariosScreen.tsx` | 세트 표시, 세트 id당 1회 |
| `scenario_selected` | `WithdrawalScenariosScreen.tsx` | `handleSelect` |
| `withdrawal_plan_view` | `WithdrawalPlanScreen.tsx` | 실행안 로드, 세트×유형 1회 |
| `report_created` | `WithdrawalPlanScreen.tsx` | 리포트 생성 성공 직후 |
| `report_preview_view` | `ReportScreen.tsx` | 리포트 표시 |
| `report_downloaded` | `ReportScreen.tsx` | 공유(`share`)·파일 받기(`download`)·인쇄(`print`) |
| `tax_health_check_run` | `TaxHealthCheckScreen.tsx` | `runTaxHealthCheck` 성공 직후 |
| `expert_review_requested` | `components/ExpertReviewButton.tsx` | 실행안·리포트 화면 버튼 클릭 (`VITE_EXPERT_REVIEW_URL` 설정 시에만 노출) |

속성 빌더(`build*Props`)는 `src/analytics/trackers.ts`에 있고, 금액이 섞이지 않는지 `*-events.test.ts`에서 확인한다.

## `result_saved` 전송 경로

1. SDK `track` + `flush`
2. HTTP API `trackViaHttp` (navigate 유실 대비, 타임아웃 포함)
3. `diagnosis_id`당 1회 (`session.wasResultSaved`)
