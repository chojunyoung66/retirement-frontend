# 이벤트 구현 맵

갱신: 2026-08-11

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

## `result_saved` 전송 경로

1. SDK `track` + `flush`
2. HTTP API `trackViaHttp` (navigate 유실 대비, 타임아웃 포함)
3. `diagnosis_id`당 1회 (`session.wasResultSaved`)
