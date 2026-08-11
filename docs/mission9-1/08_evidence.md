# 미션 9-1 · 증빙 요약

갱신: 2026-08-11 · 운영 반영·문서 최신화 완료

## 1. Amplitude

- Org: `long-shadow-923551`
- Project: 은퇴현금 설계센터 (`appId: 850754`)
- 검증: 로컬 2026-08-11 · 운영 배포 동일 키

| 이벤트 | queryable |
|--------|-----------|
| `page_view` | ✓ |
| `diagnosis_started` | ✓ |
| `step_viewed` / `step_completed` | ✓ |
| `diagnosis_completed` | ✓ |
| `design_cta_clicked` | ✓ |
| `result_saved` | ✓ |

### 장애·수정 이력

| 이슈 | 원인 | 조치 |
|------|------|------|
| `result_saved` 미수집 | `user_id` 5자 미만 → 400 | `user_{id}` |
| 콘솔 로그 혼동 | 백엔드 터미널 vs DevTools | FE `console.warn` |
| 중복 전송 | Strict Mode + Summary 백업 | diagnosis_id 1회 |
| `/auth/me` 429 | auth limiter에 `/me` 포함 | BE skip `/me`·`/logout` |
| DB 저장 실패 | `housingPension` 미마이그레이션 | `prisma migrate deploy` |
| GA4 DebugView 로컬 실패 | gtag 배열 push | `arguments` push + event `debug_mode` |
| GA4 DebugView 운영 미표시 | prod에 debug_mode 없음 | `/?debug_mode=1` (의도) |

## 2. 차트

| 차트 | URL |
|------|-----|
| Save Funnel | https://app.amplitude.com/analytics/long-shadow-923551/chart/rz0rpnvs |

스냅샷 (Last 30 Days, 2026-08-11): completed 6 → save CTA 6 → saved 1 · 전환 **16.7%**

## 3. GA4

- Measurement ID: `G-P429T2H21F` (로컬·Vercel Production/Preview)
- 로컬 DebugView: DEV `debug_mode` 자동
- 운영 DebugView: `https://retirement-frontend-y2dn.vercel.app/?debug_mode=1`
- 일반 트래픽: GA4 **실시간** 보고서

## 4. UTM

- 문서: `06_utm_promotion.md`
- 캡처: `utm-captures/` (랜딩 3종 · 소재 · 게시 시뮬레이션)
- ※ SNS 실제 계정 게시는 동일 파일명으로 교체 가능

## 5. 배포

| 항목 | 값 |
|------|-----|
| Frontend prod | https://retirement-frontend-y2dn.vercel.app |
| Git `main` | analytics + GA4 debug flag 포함 |
| Backend `main` | auth rate-limit skip `/me` |

## 6. 산출물

- `README.md` ~ `08_evidence.md`
- `utm-captures/`
- ZIP: `dist/mission9-1_evidence_*.zip` (gitignore · 로컬 제출용)
