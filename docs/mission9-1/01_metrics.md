# 은퇴현금 설계센터 · 지표 설계서 (미션 9-1)

갱신: 2026-08-10 · 대상: MVP (Vite + React Router)

## 1. 목적

MVP 유입과 핵심 행동을 측정해 9-2에서 개선 방향을 도출한다.  
핵심은 **진단 결과를 처음 보는 순간(아하 모먼트)** 까지의 전환이다.

## 2. 핵심 지표

| 지표 | 정의 | 계산 |
|------|------|------|
| 진단 완료율 | 진단을 시작해 결과 화면까지 도달한 비율 | `diagnosis_completed` 고유 diagnosis_id ÷ `diagnosis_started` 고유 diagnosis_id |
| 단계 이탈률 | 입력 퍼널 각 단계에서 이탈하는 비율 | 1 − (다음 `step_completed` ÷ 해당 `step_viewed`) |
| 결과 저장 전환율 | 결과 확인 후 계정에 요약을 저장한 비율 | `result_saved` ÷ `diagnosis_completed` |
| 채널별 방문 | UTM으로 구분한 유입 방문 | GA4 sessions by `source/medium` |
| 설계 활용 CTR | 결과에서 저장·현금흐름 CTA 클릭 비율 | `design_cta_clicked` ÷ `diagnosis_completed` |

최소 3개 이상 충족: 진단 완료율, 결과 저장 전환율, 채널별 방문(+ 단계 이탈·활용 CTR).

## 3. 핵심 퍼널

```text
방문(page_view /)
  → 진단 시작(diagnosis_started → /diagnosis)
  → 유형(/diagnosis) → 프로필(/profile) → 연금(/cashflow)
  → 생활비(/scenario) → 의료(/medical)
  → 결과(diagnosis_completed /result)
  → 활용(design_cta_clicked → result_saved | cashflow-plan)
```

| 단계 | 라우트 | 단계별 지표 |
|------|--------|-------------|
| 방문 | `/` | UV, 시작 CTA 클릭 |
| 진단 시작 | `/diagnosis` | 시작 수 |
| 유형 선택 | `/diagnosis` | step 완주 |
| 기본 정보 | `/profile` | step 완주 |
| 은퇴 소득 | `/cashflow` | step 완주 |
| 생활비 | `/scenario` | step 완주 |
| 의료비 | `/medical` | step 완주 |
| 결과 | `/result` | 완료율(핵심) |
| 활용 | 저장 / 현금흐름 | CTA CTR, 저장 전환 |

## 4. 아하 모먼트

**결과 화면(`/result`)에서 월 현금흐름·갭을 처음 확인하는 시점** = `diagnosis_completed`.  
ProgressBar 자체는 측정하지 않는다.

## 5. 비목표 (이번 미션)

- 상담 신청 퍼널 (제품에 상담 기능 없음)
- 시뮬레이션 세부 전환 (9-2에서 확장 가능)
- 실금액·PII 기반 세그먼트

## 6. 9-2 연결

수집된 Amplitude 퍼널·GA4 UTM으로 이탈 구간·채널 효율·저장 전환을 비교 분석한다.
