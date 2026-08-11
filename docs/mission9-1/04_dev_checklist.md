# 개발·계정 체크리스트

갱신: 2026-08-11

| 항목 | 상태 | 메모 |
|------|------|------|
| Amplitude 프로젝트·API Key | ✅ | `VITE_AMPLITUDE_API_KEY` · appId `850754` |
| GA4 Measurement ID | ✅ | `VITE_GA4_MEASUREMENT_ID=G-P429T2H21F` |
| Vercel env (y2dn Prod/Preview) | ✅ | Amplitude·GA4·Google Client ID |
| 로컬 `.env.local` | ✅ | API localhost:3000 + analytics 키 |
| CSP (vercel.json) Amplitude·GA | ✅ | connect-src / script-src |
| Tracking Plan ↔ 코드 일치 | ✅ | P0 연동 |
| `result_saved` Amplitude 수집 | ✅ | user_id 패딩 후 정상 |
| Save Funnel 차트 | ✅ | [rz0rpnvs](https://app.amplitude.com/analytics/long-shadow-923551/chart/rz0rpnvs) |
| 운영 배포 | ✅ | https://retirement-frontend-y2dn.vercel.app |
| 권한 블로커 | ✅ | 없음 |

키 없이 `npm run dev` 시 Amplitude는 DEV 콘솔 debug만, GA4는 Measurement ID 없으면 no-op.
