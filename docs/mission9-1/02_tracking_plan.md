# Tracking Plan v1.1 · 은퇴현금 설계센터

갱신: 2026-08-11 · Amplitude (행동) + GA4 (유입·미러)

## 1. 공통 속성 (모든 이벤트)

| 속성 | 타입 | 설명 |
|------|------|------|
| `event_id` | string | UUID (중복 제거) |
| `diagnosis_id` | string \| null | 진단 세션 UUID (sessionStorage) |
| `session_id` | string | 브라우저 세션 UUID |
| `environment` | string | `development` \| `production` |
| `app_version` | string | package.json / `VITE_APP_VERSION` |
| `path` | string | pathname |
| `utm_source` / `utm_medium` / `utm_campaign` / `utm_content` | string \| null | 세션 보존 UTM |

## 2. User Property · Amplitude user_id

| 속성 | 값 | 시점 |
|------|-----|------|
| `auth_status` | `guest` \| `logged_in` | 로그인/로그아웃 |
| `utm_*` | string | 첫 UTM 유입 identify |
| `diagnosis_type` | `individual` \| `couple` | 유형 선택 후 |

- Amplitude `user_id`: DB id를 `user_{id}`로 전송 (5자 미만 ID → HTTP 400 방지)
- 이메일·이름·전화는 User Property로 **설정하지 않음**

## 3. P0 이벤트

| 이벤트 | Trigger | 추가 속성 | 중복 규칙 |
|--------|---------|-----------|-----------|
| `page_view` | Router pathname 변경 (`App.tsx`) | `path` | — |
| `diagnosis_started` | Welcome 시작 CTA | `entry`=`new`\|`resume_saved` | 새 diagnosis_id 발급 |
| `step_viewed` | 단계 mount | `step_name` | — |
| `step_completed` | 다음 단계 직전 | `step_name` | diagnosis_id×step 1회 |
| `diagnosis_completed` | `/result` + projection | `diagnosis_type` | diagnosis_id 1회 |
| `design_cta_clicked` | 저장/현금흐름 버튼 | `cta_name`, `cta_placement` | 클릭마다 |
| `result_saved` | PUT diagnosis 성공 | `household_type` | diagnosis_id 1회 · HTTP+SDK |

`step_name`: `type` \| `profile` \| `cashflow` \| `scenario` \| `medical`  
`cta_name`: `save_result` \| `cashflow_plan`  
`cta_placement`: `primary` \| `secondary`

### P1 (미구현 · 9-2 후보)

`field_validation_failed`, `auth_gate_shown`, `recalculation_started`

## 4. step ↔ 라우트

| step_name | path | 화면 |
|-----------|------|------|
| `type` | `/diagnosis` | DiagnosisTypeScreen |
| `profile` | `/profile` | ProfileScreen |
| `cashflow` | `/cashflow` | CashflowInputScreen |
| `scenario` | `/scenario` | ScenarioScreen |
| `medical` | `/medical` | MedicalExpenseScreen |

## 5. PII / 금액

- **금지:** 실금액(원), 이름, 전화, 이메일, JWT
- **허용:** enum, UUID, (버킷 유틸 `src/analytics/buckets.ts` 준비됨)

## 6. GA4

- 동일 이벤트명 gtag 미러 (`src/analytics/ga4.ts`)
- 로컬: `debug_mode` 자동 · 운영 DebugView: `/?debug_mode=1`
- 일반 운영 트래픽: **실시간 보고서** (DebugView 아님)
- 전환 후보: `diagnosis_completed`, `result_saved`

## 7. UTM

| 채널 | source | medium | campaign | content |
|------|--------|--------|----------|---------|
| 카카오톡 | kakao | messenger | mvp_launch_aug | text_a |
| 네이버 블로그 | naver_blog | content | mvp_launch_aug | article_a |
| 인스타그램 | instagram | social | mvp_launch_aug | card_a |

운영 베이스: `https://retirement-frontend-y2dn.vercel.app/`
