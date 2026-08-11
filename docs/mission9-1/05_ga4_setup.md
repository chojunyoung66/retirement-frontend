# GA4 · GTM 세팅 가이드

## 환경변수

```bash
VITE_GA4_MEASUREMENT_ID=G-XXXXXXXX
```

Vercel Production/Preview에 동일 키를 등록한다.  
코드는 `src/analytics/ga4.ts`에서 gtag를 로드하고 Amplitude 이벤트를 미러링한다.  
로컬(`npm run dev`)에서는 `debug_mode: true`가 config·이벤트에 자동 붙는다.  
운영 DebugView 확인:  
`https://retirement-frontend-y2dn.vercel.app/?debug_mode=1`  
(세션 동안 유지. 일반 운영 트래픽은 DebugView가 아니라 **실시간 보고서**에 나타남)

## DebugView가 안 보일 때

### 로컬
1. `.env.local`에 `VITE_GA4_MEASUREMENT_ID` 확인 후 Vite 재시작
2. http://localhost:5173 하드 새로고침
3. Network에서 `g/collect` 확인 — 없으면 광고 차단기 OFF
4. GA4 DebugView → debug 기기 선택

### 운영
1. **일반 URL로는 DebugView에 안 잡힘** (의도된 동작 — `debug_mode` 없음)
2. 아래 URL로 접속해 DebugView 확인  
   `https://retirement-frontend-y2dn.vercel.app/?debug_mode=1`
3. 평소 트래픽 확인은 GA4 **보고서 → 실시간** 사용
4. Chrome 확장 Google Analytics Debugger도 운영 DebugView에 유효

## 콘솔 작업

1. GA4 속성 생성 → Measurement ID 복사
2. Admin → Data display → Custom definitions: `diagnosis_id`, `utm_campaign`, `step_name` 등 필요 시 등록
3. 전환 후보 마킹: `diagnosis_completed`, `result_saved`
4. DebugView에서 실시간 이벤트 확인

## GTM (선택)

GTM을 쓸 경우 컨테이너에 GA4 Configuration + 커스텀 이벤트 태그를 두고,  
CSP `script-src`/`connect-src`에 `www.googletagmanager.com`이 이미 포함되어 있다.

## 증빙 캡처

- DebugView: page_view, diagnosis_completed
- 실시간 보고서
- 획득 → 트래픽 획득 (UTM source/medium)
