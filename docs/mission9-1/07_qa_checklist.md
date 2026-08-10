# 로그 QA 체크리스트

갱신: 2026-08-10

## P0 시나리오

| # | 시나리오 | 기대 이벤트 순서 | 통과 |
|---|----------|------------------|------|
| 1 | 홈 → 진단 시작 → 전 단계 → 결과 | page_view → diagnosis_started → step_viewed/completed×5 → diagnosis_completed | ☐ |
| 2 | 입력 오류 후 수정 완료 | step_completed는 성공 시에만 | ☐ |
| 3 | 결과에서 뒤로가기 후 다시 결과 | diagnosis_completed 추가 전송 없음 | ☐ |
| 4 | 결과 새로고침 | diagnosis_completed 1회 유지(동일 diagnosis_id) | ☐ |
| 5 | 결과 저장 CTA → 로그인 → 저장 | design_cta_clicked → result_saved | ☐ |
| 6 | 현금흐름 설계 CTA | design_cta_clicked(cta_name=cashflow_plan) | ☐ |
| 7 | UTM 랜딩 후 진단 | 이후 이벤트에 utm_* 보존 | ☐ |

## 속성·보안

| 항목 | 기대 | 통과 |
|------|------|------|
| event_id / diagnosis_id / session_id | 모든 P0에 존재 | ☐ |
| 실금액·이메일·전화 | Amplitude payload에 없음 | ☐ |
| step_completed 중복 | step당 1회 | ☐ |

## 기기

| 환경 | 통과 |
|------|------|
| Chrome desktop | ☐ |
| Safari / mobile viewport | ☐ |

## 증빙

- Amplitude Event Stream 스크린샷 (날짜_도구_이벤트_결과)
- 사용자 타임라인 또는 CSV 샘플
- 실패 시: 원인 · 영향 · 후속조치 기록
