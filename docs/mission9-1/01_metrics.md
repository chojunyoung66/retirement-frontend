# 은퇴현금 설계센터 · 지표 설계서 (미션 9-1)

갱신: 2026-08-11 · 대상: MVP (Vite + React Router) · **운영 반영 완료**

## 1. 목적

MVP 유입과 핵심 행동을 측정해 9-2에서 개선 방향을 도출한다.  
핵심은 **진단 결과를 처음 보는 순간(아하 모먼트)** 까지의 전환이다.

## 2. 핵심 지표

| 지표 | 정의 | 계산 | 도구 |
|------|------|------|------|
| 진단 완료율 | 진단을 시작해 결과까지 도달 | `diagnosis_completed` ÷ `diagnosis_started` (diagnosis_id) | Amplitude |
| 단계 이탈률 | 입력 퍼널 단계별 이탈 | 1 − (다음 `step_completed` ÷ 해당 `step_viewed`) | Amplitude |
| 결과 저장 전환율 | 결과 후 요약 저장 | `result_saved` ÷ `diagnosis_completed` | Amplitude |
| 채널별 방문 | UTM 유입 | sessions by `source/medium` | GA4 |
| 설계 활용 CTR | 저장·현금흐름 CTA | `design_cta_clicked` ÷ `diagnosis_completed` | Amplitude |

## 3. 핵심 퍼널

```text
방문(page_view /)
  → 진단 시작(diagnosis_started → /diagnosis)
  → 유형 → 프로필 → 연금 → 생활비 → 의료
  → 결과(diagnosis_completed /result)
  → 활용(design_cta_clicked → result_saved | cashflow-plan)
```

저장 전환 퍼널 차트:  
https://app.amplitude.com/analytics/long-shadow-923551/chart/rz0rpnvs  
(`diagnosis_completed` → `design_cta_clicked`/`save_result` → `result_saved`)

| 단계 | 라우트 | 단계별 지표 |
|------|--------|-------------|
| 방문 | `/` | UV, 시작 CTA |
| 진단 시작 | `/diagnosis` | 시작 수 |
| 유형~의료 | 5 step | step 완주·이탈 |
| 결과 | `/result` | 완료율(핵심) |
| 활용 | 저장 / 현금흐름 | CTA CTR, 저장 전환 |

## 4. 아하 모먼트

**결과 화면(`/result`)에서 월 현금흐름·갭을 처음 확인** = `diagnosis_completed` (diagnosis_id당 1회).  
ProgressBar는 측정하지 않는다.

## 5. 비목표

- 상담 신청 퍼널 (제품에 없음)
- 시뮬레이션 세부 전환 (9-2 확장)
- 실금액·PII 세그먼트

## 6. 9-2 연결

Amplitude 퍼널·GA4 UTM으로 이탈 구간·채널 효율·저장 전환을 비교한다.
