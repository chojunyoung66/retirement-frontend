# 로그 QA 체크리스트

갱신: 2026-08-11 · 로컬 Chrome 기준 통과 · 운영 배포 확인

## P0 시나리오

| # | 시나리오 | 기대 이벤트 순서 | 통과 |
|---|----------|------------------|------|
| 1 | 홈 → 진단 시작 → 전 단계 → 결과 | page_view → diagnosis_started → step_viewed/completed×5 → diagnosis_completed | ☑ |
| 2 | 입력 오류 후 수정 완료 | step_completed는 성공 시에만 | ☑ |
| 3 | 결과에서 뒤로가기 후 다시 결과 | diagnosis_completed 추가 전송 없음 | ☑ |
| 4 | 결과 새로고침 | diagnosis_completed 1회 유지(동일 diagnosis_id) | ☑ |
| 5 | 결과 저장 CTA → 로그인 → 저장 | design_cta_clicked → result_saved | ☑ |
| 6 | 현금흐름 설계 CTA | design_cta_clicked(cta_name=cashflow_plan) | ☑ |
| 7 | UTM 랜딩 | 이후 이벤트에 utm_* 보존 | ☑ |

## 속성·보안

| 항목 | 기대 | 통과 |
|------|------|------|
| event_id / diagnosis_id / session_id | 모든 P0에 존재 | ☑ |
| 실금액·이메일·전화 | Amplitude payload에 없음 | ☑ |
| step_completed 중복 | step당 1회 | ☑ |
| result_saved 중복 | diagnosis_id당 1회 | ☑ |
| Amplitude user_id | `user_{id}` (≥5자) | ☑ |

## GA4

| 항목 | 통과 |
|------|------|
| 로컬 DebugView (`npm run dev`) | ☑ |
| 운영 실시간 보고서 | ☑ (일반 URL) |
| 운영 DebugView (`/?debug_mode=1`) | ☑ (배포 후) |

## 기기

| 환경 | 통과 |
|------|------|
| Chrome desktop | ☑ |
| Safari / mobile viewport | ☐ (선택) |

## 증빙

- Amplitude Save Funnel: https://app.amplitude.com/analytics/long-shadow-923551/chart/rz0rpnvs
- 상세·이슈 이력: `08_evidence.md`
- UTM 캡처: `utm-captures/`
