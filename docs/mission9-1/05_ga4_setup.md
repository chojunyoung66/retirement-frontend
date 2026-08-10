# GA4 · GTM 세팅 가이드

## 환경변수

```bash
VITE_GA4_MEASUREMENT_ID=G-XXXXXXXX
```

Vercel Production/Preview에 동일 키를 등록한다.  
코드는 `src/analytics/ga4.ts`에서 gtag를 로드하고 Amplitude 이벤트를 미러링한다.

## 콘솔 작업

1. GA4 속성 생성 → Measurement ID 복사
2. Admin → Data display → Custom definitions: `diagnosis_id`, `utm_campaign`, `step_name` 등 필요 시 등록
3. 전환 후보 마킹: `diagnosis_completed`, `result_saved`
4. DebugView에서 실시간 이벤트 확인 (Chrome GA Debugger 또는 `debug_mode`)

## GTM (선택)

GTM을 쓸 경우 컨테이너에 GA4 Configuration + 커스텀 이벤트 태그를 두고,  
CSP `script-src`/`connect-src`에 `www.googletagmanager.com`이 이미 포함되어 있다.

## 증빙 캡처

- DebugView: page_view, diagnosis_completed
- 실시간 보고서
- 획득 → 트래픽 획득 (UTM source/medium)
