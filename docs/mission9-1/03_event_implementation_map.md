# 이벤트 구현 맵

| 이벤트 | 파일 | 호출 시점 |
|--------|------|-----------|
| `page_view` | `src/App.tsx` | `location.pathname` 변경 |
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
| `design_cta_clicked` save | `ProjectionScreen.tsx` | 저장 버튼 클릭 |
| `design_cta_clicked` plan | `ProjectionScreen.tsx` | 현금흐름 버튼 |
| `result_saved` | `ProjectionScreen.tsx` | `saveLatestDiagnosis` 성공 |
| identify auth | `useAuth` / App | 로그인 상태 변경 |

공통 모듈: `src/analytics/`
