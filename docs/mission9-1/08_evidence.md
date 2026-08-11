# 미션 9-1 · 증빙 요약

갱신: 2026-08-11

## 1. Amplitude 프로젝트

- Org: `long-shadow-923551`
- Project: 은퇴현금 설계센터 (`appId: 850754`)
- 로컬 검증일: 2026-08-11

## 2. P0 이벤트 수집 확인

| 이벤트 | Amplitude queryable | 비고 |
|--------|---------------------|------|
| `page_view` | ✓ (로컬·개발 수집) | |
| `diagnosis_started` | ✓ | |
| `step_viewed` / `step_completed` | ✓ | |
| `diagnosis_completed` | ✓ | |
| `design_cta_clicked` | ✓ | `cta_name=save_result` 포함 |
| `result_saved` | ✓ | 로그인 후 저장 성공 시 |

### `result_saved` 장애·수정

| 이슈 | 원인 | 조치 |
|------|------|------|
| 이벤트 미수집 | 로그인 `user_id`가 `1` 등 5자 미만 → Amplitude 400 | `user_${id}` 접두 적용 |
| 콘솔에 로그 없음 | 브라우저 DevTools가 아닌 백엔드 터미널을 확인 | FE 콘솔 `[analytics] result_saved` 확인 |
| 중복 다수 전송 | Strict Mode + Summary 백업 | diagnosis_id당 1회 + 성공 시 백업 스킵 |
| `/auth/me` 429 | auth rate limit 20/15분에 `/me` 포함 | `/me`·`/logout` 제외, 개발 한도 상향 |
| DB 저장 실패 | `housingPension` 마이그레이션 미적용 | `prisma migrate deploy` |

## 3. Amplitude 차트

| 차트 | URL |
|------|-----|
| Save Funnel (completed → save CTA → result_saved) | https://app.amplitude.com/analytics/long-shadow-923551/chart/rz0rpnvs |

퍼널 스냅샷 (Last 30 Days, 2026-08-11 조회):

- `diagnosis_completed`: 6
- `design_cta_clicked` (`save_result`): 6
- `result_saved`: 1
- 전체 전환율: **16.7%**

## 4. GA4

- Measurement ID: `G-P429T2H21F` (로컬 `.env.local`)
- `gtag` arguments 푸시 버그 수정 후 Debug/실시간 수집 확인

## 5. UTM

- 링크·소재: `06_utm_promotion.md`
- 배포 도메인: `https://retirement-frontend-y2dn.vercel.app`
- 캡처 폴더: `utm-captures/`
  - 랜딩 3종 + 게시 소재 미리보기 + 인스타 카드
  - 채널 게시 화면 시뮬레이션 3종 (`post_*_live.png`)
  - ※ 실제 SNS 계정 게시물 교체 가능

## 6. 산출물 파일

- `01_metrics.md` ~ `08_evidence.md`
- `utm-captures/` (랜딩·소재·게시 시뮬레이션)
- ZIP: `dist/mission9-1_evidence_*.zip`
