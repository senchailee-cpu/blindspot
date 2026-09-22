# 🌿 AI 추천 사각지대 아카이브 & 뷰어 (AI Blind Spot Explorer)
> **안국·서촌편: 생성형 AI가 지나친 로컬 골목의 재발견 & 오버투어리즘 완화 솔루션**

[![Vercel Deployment](https://img.shields.io/badge/Deploy-Vercel-black?logo=vercel)](https://github.com/senchailee-cpu/blindspot)
[![GitHub Repository](https://img.shields.io/badge/GitHub-senchailee--cpu%2Fblindspot-blue?logo=github)](https://github.com/senchailee-cpu/blindspot)
[![Tech Stack](https://img.shields.io/badge/Vanilla%20JS%20%7C%20Leaflet%20%7C%20Chart.js-PWA-emerald)]()

---

## 📌 프로젝트 소개 (Overview)

생성형 AI(ChatGPT, Perplexity 등)와 SNS 알고리즘은 안국·서촌 일대 486개 실재 장소 중 상위 1% 핫플에만 추천을 92.2% 집중시킵니다.  
**AI 추천 사각지대 아카이브 & 뷰어**는 대기열과 소음으로 몸살을 앓는 주거지 밀집 핫플(런던베이글, 아티스트베이커리 등)과, 그 답이 지나쳐버린 보석 같은 골목 대안(배렴 가옥, 원서동 찻집 혜원 등)을 나란히 대조하여 보여주는 인터랙티브 웹 서비스입니다.

---

## ✨ 핵심 기능 (Key Features)

### 1. 📱 모바일 퍼스트 & 데스크톱 스마트폰 목업 UI
- **모바일 환경**: 3-Snap 인터랙티브 바텀시트, 실시간 GPS 위치 추적, 반경 350m 사각지대 레이더
- **데스크톱 환경**: 좌측 스마트폰 하드웨어 디바이스 목업 + 우측 와이드 대형 분석 콘텐츠 패널 지원

### 2. 🔍 실시간 AI 핫플 감사 & 골목 대안 대조 (XAI Dual Feed)
- 검색창에 핫플(예: `런던베이글`, `아티스트`, `어니언`, `스태픽스`) 입력 시 알고리즘 편중도와 즉각적인 골목 대안 경로 제시
- 핫플 대기시간 vs 골목 대안(대기 0분, 도보 분산 효과) 비교

### 3. 🚶 현장 실사 기반 골목길 네비게이션
- 도보 3~5분 이내 고요의 산책로 안내선 및 소음도 저감(▼72%) 지표 제공
- 원클릭 **카카오맵 / 네이버지도 길찾기** 딥링크 연동

### 4. 📊 5차원 알고리즘 편향 진단 & 데이터 출처 분석 (XAI Report)
- AI 추천 출처 비율 도넛 차트 (인스타그램 42%, 체험단 블로그 38%, 방송 미디어 15%, 공공데이터 5%)
- 상위 1% 언급 집중도, 상업성 의존도, 주거지 소음 리스크, 골목 분산 적합도 5차원 지표 시각화

### 5. 🏅 로컬 스탬프 투어 & 체크인 게이미피케이션
- 골목 장소 방문 시 실시간 GPS 체크인 및 로컬 수집가 뱃지 획득

### 6. 🏛️ 지자체 B2G 정책관 대시보드
- 북촌 특별관리지역(레드존) 17:00 이후 관람 제한 시간 실시간 모니터링
- 골목 분산 효과 및 주거 환경 보호 행정 가이드 제공

### 7. 🌐 4개 국어 다국어 지원 (i18n)
- 한국어(KO), 영어(EN), 일본어(JA), 중국어(ZH) 실시간 번역 지원

---

## 🛠️ 기술 스택 (Tech Stack)

| 구분 | 기술 |
|---|---|
| **Front-End** | Vanilla JavaScript (ES6+), HTML5 Semantic, Modern CSS3 |
| **Map Engine** | Leaflet.js (Custom Markers, LayerGroups, Polyline) |
| **Data Visualization** | Chart.js 4.x (Doughnut & Bar Analytics) |
| **PWA** | Service Worker, Web App Manifest (Offline Caching) |
| **Deployment** | Vercel Static Hosting / GitHub Actions |

---

## 🚀 로컬 실행 방법 (Getting Started)

```bash
# 1. 저장소 클론
git clone https://github.com/senchailee-cpu/blindspot.git
cd blindspot

# 2. 로컬 웹 서버 실행 (Python 예시)
python3 -m http.server 8080

# 3. 브라우저 접속
# http://localhost:8080
```

---

## 📂 디렉토리 구조 (Project Structure)

```
ai-blindspot-explorer/
├── index.html            # 메인 엔트리포인트 (모바일/데스크톱 반응형 뷰)
├── manifest.json         # PWA 매니페스트
├── sw.js                 # Service Worker (네트워크 퍼스트 캐싱)
├── vercel.json           # Vercel 호스팅 및 보안 헤더 설정
├── css/
│   ├── main.css          # 레이아웃, 모바일 바텀시트 & 폰 목업 스타일
│   ├── components.css    # 검색 아일랜드, 대조 피드 카드, 탭, 모달
│   └── map.css           # Leaflet 마커, 오버레이, 네비게이션 HUD
├── js/
│   ├── data.js           # 21개 핫플/사각지대 데이터셋 & 다국어 사전
│   ├── charts.js         # Chart.js 편향 분석 도넛 차트
│   ├── map.js            # Leaflet 맵 제어기 & GPS 네비게이션 엔진
│   └── app.js            # 메인 앱 상태 관리 및 이벤트 컨트롤러
└── images/               # 현장 실사 장소 썸네일 이미지
```

---

## 📄 라이선스 (License)

본 프로젝트는 AI 윤리 및 지역 상생 문화 조성을 위한 비영리 연구/아카이빙 목적으로 제작되었습니다.
