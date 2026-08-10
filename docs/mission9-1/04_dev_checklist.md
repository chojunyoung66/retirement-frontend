# 개발·계정 체크리스트

| 항목 | 상태 | 메모 |
|------|------|------|
| Amplitude 프로젝트·API Key | ☐ | `VITE_AMPLITUDE_API_KEY` |
| GA4 Measurement ID | ☐ | `VITE_GA4_MEASUREMENT_ID` |
| Vercel env (Production/Preview) | ☐ | |
| 로컬 `.env` / `.env.local` | ☐ | `.env.example` 참고 |
| CSP (vercel.json) Amplitude·GA | ✅ | 코드에 반영됨 |
| Tracking Plan ↔ 코드 일치 | ✅ | P0 이벤트 연동 |
| 권한 블로커 | ☐ | 있으면 payload·코드만 선행 |

키 없이 `npm run dev` 시 콘솔에 `[analytics]` debug만 출력된다.
