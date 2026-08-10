# Tracking Plan v1.0 · 은퇴현금 설계센터

갱신: 2026-08-10 · 도구: Amplitude (제품 행동) + GA4 (유입)

## 1. 공통 속성 (모든 이벤트)

| 속성 | 타입 | 설명 |
|------|------|------|
| `event_id` | string | 이벤트 UUID (중복 제거) |
| `diagnosis_id` | string \| null | 진단 세션 UUID (게스트 sessionStorage) |
| `session_id` | string | 브라우저 세션 UUID |
| `environment` | string | `development` \| `production` |
| `app_version` | string | package.json version |
| `path` | string | 현재 pathname |
| `utm_source` | string \| null | 보존된 UTM |
| `utm_medium` | string \| null | |
| `utm_campaign` | string \| null | |
| `utm_content` | string \| null | 소재 구분 |

## 2. User Property

| 속성 | 값 | 갱신 시점 |
|------|-----|-----------|
| `auth_status` | `guest` \| `logged_in` | 로그인/로그아웃 |
| `utm_source` | string | 첫 UTM 유입 시 identify |
| `utm_medium` | string | |
| `utm_campaign` | string | |
| `diagnosis_type` | `individual` \| `couple` | 유형 선택 후 |

이메일·이름·전화는 User Property로 **설정하지 않는다**.

## 3. 이벤트 목록

### P0

| 이벤트 | 설명 | Trigger | 추가 속성 |
|--------|------|---------|-----------|
| `page_view` | 화면 조회 | Router pathname 변경 (1곳) | `path` |
| `diagnosis_started` | 진단 시작 | Welcome「진단 시작」CTA | `entry`=`new`\|`resume_saved` |
| `step_viewed` | 입력 단계 진입 | 해당 화면 mount | `step_name` |
| `step_completed` | 입력 단계 완료 | 다음 단계 navigate 직전 | `step_name` (diagnosis_id당 step당 1회) |
| `diagnosis_completed` | 결과 최초 도달 | `/result` + projection 존재 | `diagnosis_type` (diagnosis_id당 1회) |
| `design_cta_clicked` | 결과 활용 CTA | 저장 / 현금흐름 버튼 | `cta_name`, `cta_placement` |
| `result_saved` | 진단 요약 저장 성공 | PUT diagnosis 성공 | `household_type` |

`step_name` enum: `type` \| `profile` \| `cashflow` \| `scenario` \| `medical`  
`cta_name`: `save_result` \| `cashflow_plan`  
`cta_placement`: `primary` \| `secondary`

### P1 (P0 QA 후)

| 이벤트 | Trigger | 추가 속성 |
|--------|---------|-----------|
| `field_validation_failed` | zod 실패 | `step_name`, `field` (필드명만) |
| `auth_gate_shown` | 저장 위해 로그인 유도 | `from`=`result_save` |
| `recalculation_started` | 결과에서 재진단 시작 | |

## 4. step ↔ 라우트

| step_name | path | 화면 |
|-----------|------|------|
| `type` | `/diagnosis` | DiagnosisTypeScreen |
| `profile` | `/profile` | ProfileScreen |
| `cashflow` | `/cashflow` | CashflowInputScreen |
| `scenario` | `/scenario` | ScenarioScreen |
| `medical` | `/medical` | MedicalExpenseScreen |

## 5. PII / 금액 규칙

- **전송 금지:** 실금액(원), 이름, 전화, 이메일, JWT
- **허용:** 구간 버킷 (예: `living_expense_bucket`: `0-50` / `50-100` / `100-200` / `200+` 만원), enum, UUID
- 네트워크 payload를 QA에서 직접 확인

## 6. GA4 대응

동일 이벤트명을 dataLayer/gtag로 미러링한다.  
전환 후보: `diagnosis_completed`, `result_saved`.  
유입 분석은 GA4 Acquisition + UTM.

## 7. UTM 규칙

| 채널 | source | medium | campaign | content |
|------|--------|--------|----------|---------|
| 카카오톡 | kakao | messenger | mvp_launch_aug | text_a |
| 네이버 블로그 | naver_blog | content | mvp_launch_aug | article_a |
| 인스타그램 | instagram | social | mvp_launch_aug | card_a |
