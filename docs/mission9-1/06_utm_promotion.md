# UTM 홍보 · 3채널

랜딩 URL은 배포 주소로 교체한다. (예: `https://YOUR_DOMAIN/`)

## 링크표

| 채널 | URL |
|------|-----|
| 카카오톡 | `https://YOUR_DOMAIN/?utm_source=kakao&utm_medium=messenger&utm_campaign=mvp_launch_aug&utm_content=text_a` |
| 네이버 블로그 | `https://YOUR_DOMAIN/?utm_source=naver_blog&utm_medium=content&utm_campaign=mvp_launch_aug&utm_content=article_a` |
| 인스타그램 | `https://YOUR_DOMAIN/?utm_source=instagram&utm_medium=social&utm_campaign=mvp_launch_aug&utm_content=card_a` |

소재를 바꾸면 `utm_content`만 변경한다. (예: `text_b`, `card_b`)

## 채널별 문구 초안 (AI 소재)

### 카카오톡 (text_a)
내 연금으로 매달 얼마 들어올까요?  
1분 진단으로 은퇴 후 월 현금흐름을 숫자로 확인해 보세요.  
→ {링크}

### 네이버 블로그 (article_a)
제목: 은퇴 후 월 현금흐름, 1분이면 대략 알 수 있습니다  
본문: 국민·퇴직·개인·주택연금을 한 번에 넣어 보고, 희망 생활비와 비교해 보세요. 로그인 없이 결과 확인 가능.  
→ {링크}

### 인스타그램 (card_a)
카드 카피: 「내 연금, 매달 얼마?」 / 「1분 진단 · 은퇴현금 설계센터」  
스토리·피드에 링크 스티커 또는 프로필 링크에 UTM URL.

## 게시 후 확인

1. 링크 클릭 → 랜딩 정상
2. GA4 실시간에서 source/medium 구분
3. 게시 화면 캡처를 `06_utm_promotion`에 저장
