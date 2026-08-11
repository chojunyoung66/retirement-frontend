# 미션 9-1 · 제출 산출물

갱신: 2026-08-11 · 상태: **구현·운영 반영 완료**

MVP(은퇴현금 설계센터) 유입·핵심 행동 수집 체계. 9-2 분석 입력용.

## 산출물 목록

| 파일 | 내용 |
|------|------|
| [01_metrics.md](./01_metrics.md) | 지표 설계 (≥3) |
| [02_tracking_plan.md](./02_tracking_plan.md) | Tracking Plan (P0 이벤트 ≥5) |
| [03_event_implementation_map.md](./03_event_implementation_map.md) | 코드 호출 맵 |
| [04_dev_checklist.md](./04_dev_checklist.md) | 계정·환경·CSP |
| [05_ga4_setup.md](./05_ga4_setup.md) | GA4 / DebugView |
| [06_utm_promotion.md](./06_utm_promotion.md) | UTM 3채널 링크·소재 |
| [07_qa_checklist.md](./07_qa_checklist.md) | 로그 QA |
| [08_evidence.md](./08_evidence.md) | 증빙 요약·차트·이슈 이력 |
| [utm-captures/](./utm-captures/) | 랜딩·게시 소재 캡처 |

제출 ZIP (로컬 생성, `dist/` gitignore):  
`docs/mission9-1/dist/mission9-1_evidence_20260811.zip`

## 운영

| 항목 | 값 |
|------|-----|
| Frontend | https://retirement-frontend-y2dn.vercel.app |
| Backend | https://retirement-backend-ph7y.onrender.com |
| Amplitude | org `long-shadow-923551` · project `은퇴현금 설계센터` (`850754`) |
| Save Funnel | https://app.amplitude.com/analytics/long-shadow-923551/chart/rz0rpnvs |
| GA4 Debug (운영) | `/?debug_mode=1` |

## 구현 요약

- `src/analytics/` — Amplitude SDK + GA4 미러 + UTM 세션 보존
- P0: `page_view`, `diagnosis_started`, `step_viewed`/`step_completed`, `diagnosis_completed`, `design_cta_clicked`, `result_saved`
- Amplitude `user_id`는 `user_{dbId}` (5자 미만 ID 400 방지)
- `result_saved`는 `diagnosis_id`당 1회 + HTTP API 폴백
- Vercel env: `VITE_AMPLITUDE_API_KEY`, `VITE_GA4_MEASUREMENT_ID`, `VITE_GOOGLE_CLIENT_ID`
