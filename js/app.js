/**
 * AI Blind Spot Explorer - Mobile-First App Controller & Navigation (v7.0)
 * Robust initialization, real-time AI Query Analyzer, PWA, Audio Docent, Stamp Tour
 */

const AppState = {
  currentLang: 'ko',
  currentMode: 'explorer', // 'explorer' | 'b2g_policy'
  currentRegion: 'all',
  currentScenarioId: 'general',
  activeTab: 'dual_comparison',
  isSidebarOpen: true,
  bottomSheetState: 'state-peek',
  isGpsActive: false,
  isRadarActive: false,
  isWalkingRouteActive: false,
  activeNavigationPlace: null,
  userCoords: null,
  gpsWatchId: null,
  radarResults: [],
  auditedHotspot: null,
  checkedInPlaces: [],
  isPlayingAudio: false
};

const LANDMARKS = {
  angukStation: { name: '안국역 1번 출구', coords: [37.5760, 126.9854] },
  gyeongbokgungStation: { name: '경복궁역 2번 출구', coords: [37.5758, 126.9734] }
};

document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

function initApp() {
  // 1. Register PWA Service Worker (Safe try/catch)
  try {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js').catch(err => console.log('SW registration error:', err));
    }
  } catch (e) {
    console.warn('PWA SW Init error:', e);
  }

  // 2. Load Check-in Data from LocalStorage
  try {
    const savedStamps = localStorage.getItem('blindspot_checked_in');
    if (savedStamps) {
      AppState.checkedInPlaces = JSON.parse(savedStamps);
    }
  } catch (e) {
    console.warn('LocalStorage error:', e);
  }

  // 3. URL Query Parameters for Deep Linking
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const scenarioParam = urlParams.get('scenario');
    const regionParam = urlParams.get('region');
    const placeParam = urlParams.get('place');
    const modeParam = urlParams.get('mode');
    const langParam = urlParams.get('lang');

    if (langParam && BLIND_SPOT_DATA.i18n && BLIND_SPOT_DATA.i18n[langParam]) {
      AppState.currentLang = langParam;
    }
    if (scenarioParam && BLIND_SPOT_DATA.scenarios && BLIND_SPOT_DATA.scenarios.some(s => s.id === scenarioParam)) {
      AppState.currentScenarioId = scenarioParam;
    }
    if (regionParam && BLIND_SPOT_DATA.regions && BLIND_SPOT_DATA.regions[regionParam]) {
      AppState.currentRegion = regionParam;
    }
    if (modeParam === 'b2g_policy' || modeParam === 'explorer') {
      AppState.currentMode = modeParam;
    }
  } catch (e) {
    console.warn('URL Param error:', e);
  }

  // 4. Initialize UI Components
  try { renderSidebarMetaStats(); } catch(e) { console.error('Meta stats error:', e); }
  try { renderRedZoneStatusPill(); } catch(e) { console.error('Red zone error:', e); }
  try { applyLanguage(AppState.currentLang); } catch(e) { console.error('Lang error:', e); }

  // 5. Initialize Leaflet Map
  try { MapManager.initMap('map'); } catch(e) { console.error('Map init error:', e); }

  // 6. Render Scenario Chips & Select Default
  try { renderScenarioChips(); } catch(e) { console.error('Chips error:', e); }
  try { selectScenario(AppState.currentScenarioId); } catch(e) { console.error('Scenario select error:', e); }

  // 7. Setup Mobile Bottom Sheet Touch Gestures & Compass
  try { setupBottomSheetGestures(); } catch(e) { console.error('Gestures error:', e); }
  try { setupDeviceCompass(); } catch(e) { console.error('Compass error:', e); }

  // 8. Setup Click & Touch Event Listeners
  try { setupEventListeners(); } catch(e) { console.error('Event listeners error:', e); }

  // 9. Apply Initial Mode & Region
  try { applyMode(AppState.currentMode); } catch(e) { console.error('Mode apply error:', e); }

  try {
    const urlParams = new URLSearchParams(window.location.search);
    const regionParam = urlParams.get('region');
    const placeParam = urlParams.get('place');

    if (regionParam) {
      const regionBtn = document.querySelector(`.region-btn[data-region="${regionParam}"]`);
      if (regionBtn) {
        document.querySelectorAll('.region-btn').forEach(b => b.classList.remove('active'));
        regionBtn.classList.add('active');
        MapManager.flyToRegion(regionParam);
      }
    }

    if (placeParam) {
      setTimeout(() => {
        openPlaceDetail(placeParam);
        MapManager.focusPlace(placeParam);
      }, 450);
    }
  } catch (e) {
    console.warn('Deep link auto focus error:', e);
  }

  // 10. Real-time Clock Checker
  setInterval(renderRedZoneStatusPill, 60000);
}

/**
 * 디바이스 자이로스코프 나침반 각도 감지
 */
function setupDeviceCompass() {
  if (window.DeviceOrientationEvent) {
    window.addEventListener('deviceorientation', (event) => {
      let heading = null;
      if (event.webkitCompassHeading) {
        heading = event.webkitCompassHeading;
      } else if (event.alpha !== null) {
        heading = 360 - event.alpha;
      }
      if (heading !== null && window.MapManager && window.MapManager.updateUserCompassHeading) {
        MapManager.updateUserCompassHeading(Math.round(heading));
      }
    }, true);
  }
}

/**
 * 다국어 (KO / EN / JA / ZH) 전환
 */
function setLanguage(langCode) {
  if (!BLIND_SPOT_DATA.i18n || !BLIND_SPOT_DATA.i18n[langCode]) return;
  AppState.currentLang = langCode;
  applyLanguage(langCode);
  renderCurrentTabContent();
  renderRedZoneStatusPill();
}

function applyLanguage(lang) {
  const dict = (BLIND_SPOT_DATA.i18n && BLIND_SPOT_DATA.i18n[lang]) ? BLIND_SPOT_DATA.i18n[lang] : (BLIND_SPOT_DATA.i18n ? BLIND_SPOT_DATA.i18n.ko : {});

  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.lang === lang);
  });

  const brandNameEl = document.getElementById('nav-brand-name');
  const subEl = document.getElementById('nav-brand-sub');
  const explorerBtn = document.getElementById('btn-mode-explorer');
  const policyBtn = document.getElementById('btn-mode-policy');
  const searchInput = document.getElementById('user-query-input');
  const tabDual = document.getElementById('tab-label-dual');
  const tabXai = document.getElementById('tab-label-xai');
  const tabArchive = document.getElementById('tab-label-archive');
  const tabStamp = document.getElementById('tab-label-stamp');

  if (brandNameEl && dict.brandTitle) brandNameEl.innerText = dict.brandTitle;
  if (subEl && dict.brandSub) subEl.innerText = dict.brandSub;
  if (explorerBtn && dict.explorerMode) explorerBtn.innerText = dict.explorerMode;
  if (policyBtn && dict.policyMode) policyBtn.innerText = dict.policyMode;
  if (searchInput && dict.searchPlaceholder) searchInput.placeholder = dict.searchPlaceholder;
  if (tabDual && dict.tabDual) tabDual.innerText = dict.tabDual;
  if (tabXai && dict.tabXai) tabXai.innerText = dict.tabXai;
  if (tabArchive && dict.tabArchive) tabArchive.innerText = dict.tabArchive;
  if (tabStamp && dict.tabStamp) tabStamp.innerText = `🏅 ${dict.tabStamp}`;
}

/**
 * 북촌 레드존 관람 허용 시간 (10:00 ~ 17:00) 실시간 체크
 */
function renderRedZoneStatusPill() {
  const pill = document.getElementById('redzone-status-pill');
  if (!pill) return;

  const dict = (BLIND_SPOT_DATA.i18n && BLIND_SPOT_DATA.i18n[AppState.currentLang]) ? BLIND_SPOT_DATA.i18n[AppState.currentLang] : (BLIND_SPOT_DATA.i18n ? BLIND_SPOT_DATA.i18n.ko : {});
  const now = new Date();
  const currentHour = now.getHours();
  const currentMin = String(now.getMinutes()).padStart(2, '0');
  const isOpen = currentHour >= 10 && currentHour < 17;

  if (isOpen) {
    pill.className = 'redzone-status-pill open';
    pill.innerHTML = `
      <span class="rz-dot"></span>
      <span>${dict.redzoneOpen || '북촌 관람가능'}</span>
      <span style="font-size: 0.62rem; color: #047857;">(${currentHour}:${currentMin})</span>
    `;
  } else {
    pill.className = 'redzone-status-pill closed';
    pill.innerHTML = `
      <span class="rz-dot"></span>
      <span>${dict.redzoneClosed || '북촌 방문제한'}</span>
      <span style="font-size: 0.62rem; color: #dc2626;">(${currentHour}:${currentMin})</span>
    `;
  }
}

/**
 * 사이드바 메타 통계
 */
function renderSidebarMetaStats() {
  const metaContainer = document.getElementById('sidebar-meta-container');
  if (!metaContainer || !BLIND_SPOT_DATA.meta) return;

  const meta = BLIND_SPOT_DATA.meta;
  metaContainer.innerHTML = `
    <div class="meta-stat-item">
      <span class="label">실재 로컬 장소</span>
      <span class="val" style="color: #0f172a;">${meta.totalGroundTruthPlaces}곳</span>
    </div>
    <div class="meta-stat-item">
      <span class="label">AI 다빈도 핫플</span>
      <span class="val" style="color: #dc2626;">${meta.totalAiMentionedPlaces}곳 (7.8%)</span>
    </div>
    <div class="meta-stat-item">
      <span class="label">미언급 사각지대</span>
      <span class="val" style="color: #059669;">${meta.blindSpotRatio}%</span>
    </div>
  `;
}

/**
 * 시나리오 칩 렌더링
 */
function renderScenarioChips() {
  const container = document.getElementById('scenario-chips-container');
  if (!container || !BLIND_SPOT_DATA.scenarios) return;

  container.innerHTML = BLIND_SPOT_DATA.scenarios.map(scenario => `
    <button class="island-chip ${scenario.id === AppState.currentScenarioId ? 'active' : ''}" 
            data-scenario-id="${scenario.id}"
            onclick="window.AppManager.selectScenario('${scenario.id}')">
      ${scenario.badge || scenario.title || '추천 질의'}
    </button>
  `).join('');
}

function selectScenario(scenarioId) {
  let scenario = BLIND_SPOT_DATA.scenarios.find(s => s.id === scenarioId);
  if (!scenario) {
    scenario = BLIND_SPOT_DATA.scenarios[0];
  }
  if (!scenario) return;

  AppState.currentScenarioId = scenario.id;
  AppState.auditedHotspot = null;

  document.querySelectorAll('.island-chip').forEach(chip => {
    chip.classList.toggle('active', chip.dataset.scenarioId === scenario.id);
  });

  const queryInput = document.getElementById('user-query-input');
  if (queryInput) {
    queryInput.value = scenario.query;
    const clearBtn = document.getElementById('search-clear-btn');
    if (clearBtn) clearBtn.style.display = 'flex';
  }

  updatePeekHeaderForScenario(scenario);
  renderCurrentTabContent();
}

function updatePeekHeaderForScenario(scenario) {
  const titleEl = document.getElementById('peek-title-text');
  const subtitleEl = document.getElementById('peek-subtitle-text');
  if (titleEl && subtitleEl && scenario) {
    titleEl.innerText = `🌿 ${scenario.title || scenario.badge || 'AI 사각지대 골목 대조'}`;
    subtitleEl.innerText = `AI 질의: "${scenario.query}"`;
  }
}

/**
 * 3단 스냅 모바일 바텀시트 터치 제스처 관리자
 */
function setupBottomSheetGestures() {
  const panel = document.getElementById('sidebar-panel');
  const handle = document.getElementById('bottom-sheet-handle');
  if (!panel || !handle) return;

  let startY = 0;
  let currentY = 0;
  let isDragging = false;

  handle.addEventListener('touchstart', (e) => {
    if (window.innerWidth > 900) return;
    startY = e.touches[0].clientY;
    isDragging = true;
  }, { passive: true });

  window.addEventListener('touchmove', (e) => {
    if (!isDragging || window.innerWidth > 900) return;
    currentY = e.touches[0].clientY;
  }, { passive: true });

  window.addEventListener('touchend', () => {
    if (!isDragging || window.innerWidth > 900) return;
    isDragging = false;
    const deltaY = currentY - startY;

    if (Math.abs(deltaY) < 15) return;

    if (deltaY < -40) {
      if (AppState.bottomSheetState === 'state-peek') {
        setBottomSheetState('state-half');
      } else if (AppState.bottomSheetState === 'state-half') {
        setBottomSheetState('state-full');
      }
    } else if (deltaY > 40) {
      if (AppState.bottomSheetState === 'state-full') {
        setBottomSheetState('state-half');
      } else if (AppState.bottomSheetState === 'state-half') {
        setBottomSheetState('state-peek');
      }
    }
  });
}

function setBottomSheetState(stateName) {
  const panel = document.getElementById('sidebar-panel');
  const badge = document.getElementById('peek-action-badge');
  if (!panel) return;

  panel.classList.remove('state-peek', 'state-half', 'state-full');
  panel.classList.add(stateName);
  AppState.bottomSheetState = stateName;

  if (badge) {
    if (stateName === 'state-peek') {
      badge.innerText = '탭하여 열기 ▲';
    } else if (stateName === 'state-half') {
      badge.innerText = '전체 보기 ▲';
    } else {
      badge.innerText = '접기 ▼';
    }
  }
}

function toggleBottomSheetSnap() {
  if (AppState.bottomSheetState === 'state-peek') {
    setBottomSheetState('state-half');
  } else if (AppState.bottomSheetState === 'state-half') {
    setBottomSheetState('state-full');
  } else {
    setBottomSheetState('state-peek');
  }
}

/**
 * 실시간 GPS 위치 토글
 */
function toggleGpsLocation() {
  const gpsBtn = document.getElementById('fab-gps');

  if (AppState.isGpsActive) {
    if (AppState.gpsWatchId) {
      navigator.geolocation.clearWatch(AppState.gpsWatchId);
      AppState.gpsWatchId = null;
    }
    AppState.isGpsActive = false;
    if (gpsBtn) gpsBtn.classList.remove('active', 'tracking');
    return;
  }

  if (!navigator.geolocation) {
    alert('이 브라우저에서는 GPS 위치 정보를 지원하지 않습니다.');
    return;
  }

  AppState.isGpsActive = true;
  if (gpsBtn) gpsBtn.classList.add('active', 'tracking');

  navigator.geolocation.getCurrentPosition(
    (position) => {
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      const accuracy = position.coords.accuracy || 15;
      AppState.userCoords = [lat, lng];

      MapManager.updateUserGpsLocation(lat, lng, accuracy);
      runNearbyRadar(lat, lng);
    },
    (err) => {
      console.warn('GPS Fallback to Anguk Landmark.', err);
      const fallback = LANDMARKS.angukStation;
      AppState.userCoords = fallback.coords;
      MapManager.updateUserGpsLocation(fallback.coords[0], fallback.coords[1], 30);
      runNearbyRadar(fallback.coords[0], fallback.coords[1]);
    },
    { enableHighAccuracy: true, timeout: 8000, maximumAge: 10000 }
  );
}

/**
 * 반경 350m 내 사각지대 레이더 검색
 */
function toggleLocationRadar() {
  const radarBtn = document.getElementById('fab-radar');
  AppState.isRadarActive = !AppState.isRadarActive;

  if (AppState.isRadarActive) {
    if (radarBtn) radarBtn.classList.add('active');
    const origin = AppState.userCoords || LANDMARKS.angukStation.coords;
    runNearbyRadar(origin[0], origin[1]);
    setBottomSheetState('state-half');
  } else {
    if (radarBtn) radarBtn.classList.remove('active');
    MapManager.clearRadar();
    AppState.radarResults = [];
    renderCurrentTabContent();
  }
}

function runNearbyRadar(userLat, userLng) {
  MapManager.renderRadarCircle(userLat, userLng, 350);

  const gems = BLIND_SPOT_DATA.places.filter(p => p.type === 'blind_gem' || p.type === 'local_life');
  const results = gems.map(gem => {
    const dist = MapManager.calculateDistance(userLat, userLng, gem.coords[0], gem.coords[1]);
    const walkMin = MapManager.calculateWalkingMinutes(dist);
    return { ...gem, currentDistance: dist, walkingMinutes: walkMin };
  }).sort((a, b) => a.currentDistance - b.currentDistance).slice(0, 5);

  AppState.radarResults = results;
  renderCurrentTabContent();
}

/**
 * 인앱 보행자 길안내 시작 (Navigation HUD & Route)
 */
function startNavigation(placeId) {
  const place = BLIND_SPOT_DATA.places.find(p => p.id === placeId);
  if (!place) return;

  AppState.activeNavigationPlace = place;

  let origin = AppState.userCoords;
  let originName = '내 현재 위치';

  if (!origin) {
    if (place.region === 'seochon') {
      origin = LANDMARKS.gyeongbokgungStation.coords;
      originName = '경복궁역 2번 출구';
    } else {
      origin = LANDMARKS.angukStation.coords;
      originName = '안국역 1번 출구';
    }
  }

  const dist = MapManager.calculateDistance(origin[0], origin[1], place.coords[0], place.coords[1]);
  const walkMin = MapManager.calculateWalkingMinutes(dist);

  MapManager.drawNavigationRoute(origin, place.coords, originName, place.name);

  const hud = document.getElementById('navigation-hud');
  const targetNameEl = document.getElementById('nav-hud-target-name');
  const etaInfoEl = document.getElementById('nav-hud-eta-info');
  const kakaoBtn = document.getElementById('nav-btn-kakao');
  const naverBtn = document.getElementById('nav-btn-naver');

  if (hud && targetNameEl && etaInfoEl && kakaoBtn && naverBtn) {
    targetNameEl.innerText = `${place.name} (${place.category})`;
    etaInfoEl.innerText = `도보 ${walkMin}분 (${dist}m) · ${originName} 출발`;

    kakaoBtn.href = `https://map.kakao.com/link/to/${encodeURIComponent(place.name)},${place.coords[0]},${place.coords[1]}`;
    naverBtn.href = `https://map.naver.com/v5/directions/-/-/${place.coords[1]},${place.coords[0]},${encodeURIComponent(place.name)}/walk`;

    hud.style.display = 'flex';
  }

  setBottomSheetState('state-peek');
  document.getElementById('place-modal-container').innerHTML = '';
}

function stopNavigation() {
  AppState.activeNavigationPlace = null;
  const hud = document.getElementById('navigation-hud');
  if (hud) hud.style.display = 'none';
  MapManager.clearNavigationRoute();
}

/**
 * 고요의 산책로 토글
 */
function toggleWalkingRoute() {
  AppState.isWalkingRouteActive = !AppState.isWalkingRouteActive;
  const banner = document.getElementById('walking-course-banner');
  const fab = document.getElementById('fab-walking-route');

  if (AppState.isWalkingRouteActive) {
    if (banner) banner.style.display = 'flex';
    if (fab) fab.classList.add('active');
    MapManager.showWalkingRoute();
  } else {
    if (banner) banner.style.display = 'none';
    if (fab) fab.classList.remove('active');
    MapManager.hideWalkingRoute();
  }
}

/**
 * 오디오 도슨트 (Web Speech API TTS)
 */
function toggleAudioDocent(text) {
  if (AppState.isPlayingAudio) {
    stopAudioDocent();
  } else {
    playAudioDocent(text);
  }
}

function playAudioDocent(text) {
  if (!('speechSynthesis' in window)) {
    alert('이 브라우저에서는 음성 도슨트 기능을 지원하지 않습니다.');
    return;
  }

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);

  const langMap = { ko: 'ko-KR', en: 'en-US', ja: 'ja-JP', zh: 'zh-CN' };
  utterance.lang = langMap[AppState.currentLang] || 'ko-KR';
  utterance.rate = 0.95;

  utterance.onstart = () => {
    AppState.isPlayingAudio = true;
    document.querySelectorAll('.audio-guide-btn').forEach(b => {
      b.classList.add('playing');
      b.innerHTML = `<span>⏹️ 재생 중지</span>`;
    });
  };

  utterance.onend = utterance.onerror = () => {
    stopAudioDocent();
  };

  window.speechSynthesis.speak(utterance);
}

function stopAudioDocent() {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
  AppState.isPlayingAudio = false;
  const dict = (BLIND_SPOT_DATA.i18n && BLIND_SPOT_DATA.i18n[AppState.currentLang]) ? BLIND_SPOT_DATA.i18n[AppState.currentLang] : (BLIND_SPOT_DATA.i18n ? BLIND_SPOT_DATA.i18n.ko : {});
  document.querySelectorAll('.audio-guide-btn').forEach(b => {
    b.classList.remove('playing');
    b.innerHTML = `<span>🔊 ${dict.audioListen || '오디오 도슨트'}</span>`;
  });
}

/**
 * 현장 체크인 & 스탬프 획득
 */
function checkInPlace(placeId) {
  if (!AppState.checkedInPlaces.includes(placeId)) {
    AppState.checkedInPlaces.push(placeId);
    try {
      localStorage.setItem('blindspot_checked_in', JSON.stringify(AppState.checkedInPlaces));
    } catch (e) {
      console.warn(e);
    }
  }

  MapManager.highlightCheckInPlace(placeId);
  openPlaceDetail(placeId);
  if (AppState.activeTab === 'stamp_tour') {
    renderCurrentTabContent();
  }
}

/**
 * 탭 콘텐츠 렌더링
 */
function renderCurrentTabContent() {
  const container = document.getElementById('sidebar-dynamic-content');
  if (!container) return;

  if (AppState.currentMode === 'b2g_policy') {
    renderB2gPolicyView(container);
    return;
  }

  const scenario = BLIND_SPOT_DATA.scenarios.find(s => s.id === AppState.currentScenarioId) || BLIND_SPOT_DATA.scenarios[0];

  if (AppState.activeTab === 'dual_comparison') {
    renderDualComparisonView(container, scenario);
  } else if (AppState.activeTab === 'xai_report') {
    renderXaiReportView(container, scenario);
  } else if (AppState.activeTab === 'archive_list') {
    renderArchiveListView(container);
  } else if (AppState.activeTab === 'stamp_tour') {
    renderStampTourView(container);
  }
}

/**
 * Side-by-Side 대조 피드 렌더링 (핫플 실시간 감사 배너 지원)
 */
function renderDualComparisonView(container, scenario) {
  let pairs = [];
  const places = BLIND_SPOT_DATA.places || [];

  if (scenario && scenario.recommendedPlaces && scenario.recommendedPlaces.length > 0) {
    scenario.recommendedPlaces.forEach((hotId, idx) => {
      const hot = places.find(p => p.id === hotId);
      if (!hot) return;
      let gem = places.find(p => p.id === hot.counterpartId);
      if (!gem && scenario.alternativePlaces && scenario.alternativePlaces[idx]) {
        gem = places.find(p => p.id === scenario.alternativePlaces[idx]);
      }
      if (!gem) {
        gem = places.find(p => p.type === 'blind_gem' && p.region === hot.region);
      }
      if (hot && gem) {
        pairs.push({ hot, gem });
      }
    });
  }

  // Fallback: If no scenario-specific pairs, pair all hotspots with their counterpart gems
  if (pairs.length === 0) {
    const hotspots = places.filter(p => p.type === 'hotspot');
    hotspots.forEach(hot => {
      const gem = places.find(p => p.id === hot.counterpartId) || places.find(p => p.type === 'blind_gem' && p.region === hot.region);
      if (hot && gem) {
        pairs.push({ hot, gem });
      }
    });
  }

  if (AppState.currentRegion !== 'all') {
    pairs = pairs.filter(p => p.hot.region === AppState.currentRegion || p.gem.region === AppState.currentRegion);
  }

  const dict = (BLIND_SPOT_DATA.i18n && BLIND_SPOT_DATA.i18n[AppState.currentLang]) ? BLIND_SPOT_DATA.i18n[AppState.currentLang] : (BLIND_SPOT_DATA.i18n ? BLIND_SPOT_DATA.i18n.ko : {});

  // 1. Audited Hotspot Banner (When searched e.g. "런던베이글")
  let auditBannerHtml = '';
  if (AppState.auditedHotspot) {
    const hot = AppState.auditedHotspot;
    const counterpart = BLIND_SPOT_DATA.places.find(p => p.id === hot.counterpartId) || BLIND_SPOT_DATA.places.find(p => p.type === 'blind_gem');
    
    auditBannerHtml = `
      <div style="background: #fff; border: 2px solid #f43f5e; border-radius: var(--radius-md); padding: 12px; margin-bottom: 12px; box-shadow: var(--shadow-md);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
          <span style="background: #fee2e2; color: #b91c1c; font-size: 0.68rem; font-weight: 800; padding: 2px 7px; border-radius: 4px;">
            🔍 AI 핫플 실시간 감사 결과
          </span>
          <button onclick="window.AppManager.clearAudit()" style="background: none; border: none; font-size: 0.75rem; color: var(--text-muted); cursor: pointer;">✕ 닫기</button>
        </div>
        <div style="font-size: 0.88rem; font-weight: 800; color: #0f172a;">${hot.name}</div>
        <div style="font-size: 0.72rem; color: #b91c1c; font-weight: 700; margin-top: 2px;">
          ⚠️ AI 추천 언급률 ${hot.aiMentionRate}% · 평균 대기 ${hot.avgWaitTime}
        </div>
        <p style="font-size: 0.7rem; color: var(--text-body); margin-top: 4px; line-height: 1.35;">
          ${hot.realityCheck || hot.aiSummary}
        </p>

        ${counterpart ? `
          <div style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: var(--radius-xs); padding: 8px; margin-top: 8px; display: flex; justify-content: space-between; align-items: center;">
            <div>
              <span style="font-size: 0.62rem; color: #047857; font-weight: 800; display: block;">💡 추천 골목 사각지대 대안</span>
              <strong style="font-size: 0.8rem; color: #0f172a;">${counterpart.name}</strong>
              <span style="font-size: 0.66rem; color: #059669; display: block;">대기 0분 · ${counterpart.curationMood}</span>
            </div>
            <button onclick="window.AppManager.startNavigation('${counterpart.id}')" style="background: #059669; color: #fff; border: none; padding: 6px 10px; border-radius: 4px; font-size: 0.72rem; font-weight: 800; cursor: pointer; white-space: nowrap;">
              ${dict.walkNav} →
            </button>
          </div>
        ` : ''}
      </div>
    `;
  }

  // 2. Radar Results
  let radarResultsHtml = '';
  if (AppState.radarResults.length > 0) {
    radarResultsHtml = `
      <div style="background: #eff6ff; border: 1.5px solid #3b82f6; border-radius: var(--radius-sm); padding: 10px; margin-bottom: 10px;">
        <div style="font-size: 0.76rem; font-weight: 800; color: #1e40af; margin-bottom: 6px;">
          🎯 내 주변 반경 350m 실시간 사각지대 (${AppState.radarResults.length}곳)
        </div>
        <div style="display: flex; flex-direction: column; gap: 4px;">
          ${AppState.radarResults.map(r => `
            <div style="display: flex; align-items: center; justify-content: space-between; background: #fff; padding: 6px 8px; border-radius: 4px; font-size: 0.72rem;">
              <div>
                <strong>${r.name}</strong> <span style="color: var(--text-muted);">(${r.category})</span>
              </div>
              <div style="display: flex; gap: 4px;">
                <span style="color: #059669; font-weight: 800;">${r.currentDistance}m (${r.walkingMinutes}분)</span>
                <button onclick="window.AppManager.startNavigation('${r.id}')" style="background: #0f172a; color: #fff; border: none; padding: 2px 6px; border-radius: 3px; font-size: 0.65rem; font-weight: 700; cursor: pointer;">${dict.walkNav}</button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  const cardsHtml = pairs.map(pair => {
    return `
      <div class="comparison-card">
        <div class="comparison-card-grid">
          <!-- Hotspot Side -->
          <div class="card-half hot-side">
            ${pair.hot.image ? `
              <div class="card-img-wrapper">
                <img src="${pair.hot.image}" alt="${pair.hot.name}" loading="lazy">
                <span class="img-type-badge hot">AI 다빈도 핫플</span>
              </div>
            ` : ''}
            <span class="place-category-tag">${pair.hot.category}</span>
            <div class="place-name">${pair.hot.name}</div>
            <div class="metric-pill red">
              언급률 ${pair.hot.aiMentionRate}% · 대기 ${pair.hot.avgWaitTime}
            </div>
            <p class="place-brief">${pair.hot.aiSummary}</p>
          </div>

          <!-- Blind Gem Side -->
          <div class="card-half gem-side">
            ${pair.gem.image ? `
              <div class="card-img-wrapper">
                <img src="${pair.gem.image}" alt="${pair.gem.name}" loading="lazy">
                <span class="img-type-badge gem">골목 대안</span>
              </div>
            ` : ''}
            <span class="place-category-tag">${pair.gem.category}</span>
            <div class="place-name">${pair.gem.name}</div>
            <div class="metric-pill mint">
              ${pair.gem.curationMood ? pair.gem.curationMood.split('·')[0] : '로컬 명소'}
            </div>
            <p class="place-brief">${pair.gem.story ? pair.gem.story.substring(0, 50) + '...' : ''}</p>
          </div>
        </div>

        <div class="comparison-card-footer">
          <div class="footer-distance">
            <span>🚶 ${pair.gem.distanceFromHotspot || '인근 도보 3분'}</span>
          </div>
          <div class="card-nav-actions">
            <button class="card-btn primary" onclick="window.AppManager.startNavigation('${pair.gem.id}')">
              ${dict.walkNav || '길안내'}
            </button>
            <button class="card-btn" onclick="window.AppManager.focusMatch('${pair.hot.id}', '${pair.gem.id}')">
              대조 보기 →
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');

  container.innerHTML = `
    ${auditBannerHtml}
    ${radarResultsHtml}
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px;">
      <span style="font-size: 0.78rem; font-weight: 800; color: #0f172a;">AI 핫플 vs 골목 대안 (${pairs.length}쌍)</span>
      <span style="font-size: 0.68rem; color: var(--text-muted);">안국 · 서촌</span>
    </div>
    ${cardsHtml}
  `;
}

/**
 * XAI 편향 진단 뷰
 */
function renderXaiReportView(container, scenario) {
  const bias = scenario.decomposedBias || {
    mentionSkew: { score: 96, label: "상위 1% 언급 집중도", desc: "추천 결과의 96%가 상위 5개 매장에 편중" },
    commerciality: { score: 93, label: "SNS·체험단 상업성 의존도", desc: "인스타그램 및 네이버 블로그 체험단 비중 93%" },
    dataFreshness: { score: 94, label: "현장 실사 최신성", desc: "2026.09 현장 방문 및 영업 상태 실사 완료" },
    residentialRisk: { score: 88, label: "주거지 소음·과밀 리스크", desc: "주거 밀집 골목 대기열로 주민 민원 발생 가능성 높음" },
    dispersionFeasibility: { score: 95, label: "골목 대안 분산 적합도", desc: "도보 5분 이내 훌륭한 대안 동선 존재" }
  };

  const dist = scenario.aiSourceDistribution || { instagram: 42, viralBlog: 38, mediaBroadcast: 15, officialOpenData: 5 };

  container.innerHTML = `
    <!-- AI 추천 출처 비율 차트 카드 -->
    <div class="source-chart-card">
      <div style="font-size: 0.8rem; font-weight: 800; color: #0f172a;">AI 추천의 데이터 출처 분석</div>
      <div class="chart-body-layout">
        <div class="donut-wrapper">
          <canvas id="sourceDistributionCanvas" width="90" height="90"></canvas>
        </div>
        <div class="chart-legend-list">
          <div class="legend-row">
            <div class="legend-label-group">
              <span class="legend-color-dot" style="background: #FF3366;"></span>
              <span>인스타그램 (SNS)</span>
            </div>
            <span class="legend-pct" style="color: #FF3366;">${dist.instagram}%</span>
          </div>
          <div class="legend-row">
            <div class="legend-label-group">
              <span class="legend-color-dot" style="background: #00C73C;"></span>
              <span>체험단 블로그</span>
            </div>
            <span class="legend-pct" style="color: #00C73C;">${dist.viralBlog}%</span>
          </div>
          <div class="legend-row">
            <div class="legend-label-group">
              <span class="legend-color-dot" style="background: #3B82F6;"></span>
              <span>방송/언론 클리셰</span>
            </div>
            <span class="legend-pct" style="color: #3B82F6;">${dist.mediaBroadcast}%</span>
          </div>
          <div class="legend-row">
            <div class="legend-label-group">
              <span class="legend-color-dot" style="background: #8B5CF6;"></span>
              <span>공공 문화재 데이터</span>
            </div>
            <span class="legend-pct" style="color: #8B5CF6;">${dist.officialOpenData}%</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 5차원 편향 진단 게이지 바 -->
    <div class="decomposed-metrics-list">
      <div style="font-size: 0.78rem; font-weight: 800; color: #0f172a; margin-top: 4px;">5차원 알고리즘 편향 지표</div>
      ${Object.entries(bias).map(([key, item]) => {
        const colorClass = item.score > 85 ? 'red' : (item.score > 70 ? 'orange' : 'mint');
        return `
          <div class="decomposed-metric-item">
            <div style="display: flex; justify-content: space-between; font-size: 0.72rem;">
              <strong>${item.label}</strong>
              <span style="font-weight: 800; color: ${item.score > 85 ? '#dc2626' : '#059669'};">${item.score}점</span>
            </div>
            <div class="metric-bar-bg">
              <div class="metric-bar-fill ${colorClass}" style="width: ${item.score}%;"></div>
            </div>
            <span style="font-size: 0.65rem; color: var(--text-muted);">${item.desc}</span>
          </div>
        `;
      }).join('')}
    </div>
  `;

  setTimeout(() => {
    if (window.ChartManager && window.ChartManager.renderDonutChart) {
      window.ChartManager.renderDonutChart('sourceDistributionCanvas', dist);
    }
  }, 100);
}

/**
 * 사각지대 아카이브 리스트
 */
function renderArchiveListView(container) {
  const places = BLIND_SPOT_DATA.places.filter(p => p.type === 'blind_gem' || p.type === 'local_life');
  const dict = (BLIND_SPOT_DATA.i18n && BLIND_SPOT_DATA.i18n[AppState.currentLang]) ? BLIND_SPOT_DATA.i18n[AppState.currentLang] : (BLIND_SPOT_DATA.i18n ? BLIND_SPOT_DATA.i18n.ko : {});

  container.innerHTML = `
    <div style="font-size: 0.78rem; font-weight: 800; color: #0f172a; margin-bottom: 4px;">
      안국 · 서촌 숨은 로컬 아카이브 (${places.length}곳)
    </div>
    <div style="display: flex; flex-direction: column; gap: 8px;">
      ${places.map(p => {
        const isChecked = AppState.checkedInPlaces.includes(p.id);
        return `
          <div style="background: #ffffff; border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); padding: 10px; display: flex; flex-direction: column; gap: 4px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="font-size: 0.65rem; color: var(--text-muted);">${p.category}</span>
              <span class="verification-badge">${isChecked ? '🏅 체크인 완료' : '✓ 실사완료'}</span>
            </div>
            <strong style="font-size: 0.85rem; color: #0f172a;">${p.name}</strong>
            <p style="font-size: 0.7rem; color: var(--text-body); line-height: 1.35;">${p.story ? p.story.substring(0, 60) + '...' : ''}</p>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 4px; padding-top: 6px; border-top: 1px solid var(--border-subtle);">
              <span style="font-size: 0.65rem; color: #059669; font-weight: 700;">📍 ${p.address}</span>
              <div style="display: flex; gap: 4px;">
                <button class="card-btn primary" onclick="window.AppManager.startNavigation('${p.id}')">${dict.walkNav || '길안내'}</button>
                <button class="card-btn" onclick="window.AppManager.openPlaceDetail('${p.id}')">상세</button>
              </div>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

/**
 * 스탬프 투어 및 체크인 게이미피케이션 뷰
 */
function renderStampTourView(container) {
  const dict = (BLIND_SPOT_DATA.i18n && BLIND_SPOT_DATA.i18n[AppState.currentLang]) ? BLIND_SPOT_DATA.i18n[AppState.currentLang] : (BLIND_SPOT_DATA.i18n ? BLIND_SPOT_DATA.i18n.ko : {});
  const badges = (BLIND_SPOT_DATA.stampTour && BLIND_SPOT_DATA.stampTour.badges) ? BLIND_SPOT_DATA.stampTour.badges : [];
  const count = AppState.checkedInPlaces.length;
  const total = 5;
  const progressPct = Math.min(100, Math.round((count / total) * 100));

  container.innerHTML = `
    <div class="stamp-tour-container">
      <div class="stamp-hero-banner">
        <div style="font-size: 0.85rem; font-weight: 800;">🏅 ${dict.stampTitle || '골목 스탬프 투어'}</div>
        <div style="font-size: 0.7rem; opacity: 0.9;">골목길 사각지대를 방문하고 로컬 스탬프를 모아보세요!</div>
        <div style="display: flex; justify-content: space-between; font-size: 0.7rem; font-weight: 800; margin-top: 4px;">
          <span>달성 현황: ${count} / ${total}곳 방문</span>
          <span>${progressPct}%</span>
        </div>
        <div class="stamp-progress-wrapper">
          <div class="stamp-progress-fill" style="width: ${progressPct}%;"></div>
        </div>
      </div>

      <div style="font-size: 0.78rem; font-weight: 800; color: #0f172a; margin-top: 2px;">수집 가능한 로컬 뱃지</div>
      <div class="stamp-badge-grid">
        ${badges.map(b => {
          const unlocked = count >= b.reqCount;
          return `
            <div class="stamp-badge-card ${unlocked ? 'unlocked' : ''}">
              <div class="badge-icon">${unlocked ? '🎉' : '🔒'}</div>
              <div class="badge-name">${b.name}</div>
              <div class="badge-desc">${b.desc}</div>
              <span style="font-size: 0.6rem; font-weight: 800; color: ${unlocked ? '#059669' : '#94a3b8'};">
                ${unlocked ? '✓ 뱃지 획득 완료!' : `방문 필요: ${b.reqCount}곳`}
              </span>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

/**
 * 지자체 B2G 정책관 뷰
 */
function renderB2gPolicyView(container) {
  container.innerHTML = `
    <div class="b2g-kpi-grid">
      <div class="b2g-kpi-card">
        <span style="font-size: 0.65rem; color: var(--text-muted);">골목 분산 효과</span>
        <span class="val" style="color: #059669;">38.4%</span>
      </div>
      <div class="b2g-kpi-card">
        <span style="font-size: 0.65rem; color: var(--text-muted);">주거지 소음 저감</span>
        <span class="val" style="color: #2563eb;">▼ 72%</span>
      </div>
      <div class="b2g-kpi-card">
        <span style="font-size: 0.65rem; color: var(--text-muted);">사각지대 상권 체류</span>
        <span class="val" style="color: #7c3aed;">+42분</span>
      </div>
      <div class="b2g-kpi-card">
        <span style="font-size: 0.65rem; color: var(--text-muted);">오버투어리즘 완화</span>
        <span class="val" style="color: #d97706;">A등급</span>
      </div>
    </div>

    <div class="b2g-directive-card" style="margin-top: 8px;">
      <strong>🏛️ 종로구 지속가능 관광 행정 가이드</strong>
      <span>북촌 레드존 시간 제한(17:00 이후) 준수와 안국·서촌 외곽 로컬 상권으로의 분산 유도가 원활하게 작동 중입니다.</span>
    </div>
  `;
}

/**
 * 장소 상세 모달 및 바텀시트 연동
 */
function openPlaceDetail(placeId) {
  const place = BLIND_SPOT_DATA.places.find(p => p.id === placeId);
  if (!place) return;

  const modalContainer = document.getElementById('place-modal-container');
  const isHot = place.type === 'hotspot';
  const tagColor = isHot ? '#dc2626' : '#059669';
  const tagLabel = isHot ? 'AI 다빈도 핫플' : (place.type === 'blind_gem' ? 'AI 사각지대 로컬 대안' : '동네 생활유산');
  const tier = (BLIND_SPOT_DATA.disclosureTiers && BLIND_SPOT_DATA.disclosureTiers[place.disclosureTier]) || { icon: '🟢', name: '일반 공개', badgeClass: 'badge-tier-public' };
  const isChecked = AppState.checkedInPlaces.includes(place.id);
  const dict = (BLIND_SPOT_DATA.i18n && BLIND_SPOT_DATA.i18n[AppState.currentLang]) ? BLIND_SPOT_DATA.i18n[AppState.currentLang] : (BLIND_SPOT_DATA.i18n ? BLIND_SPOT_DATA.i18n.ko : {});

  const kakaoUrl = `https://map.kakao.com/link/to/${encodeURIComponent(place.name)},${place.coords[0]},${place.coords[1]}`;
  const naverUrl = `https://map.naver.com/v5/directions/-/-/${place.coords[1]},${place.coords[0]},${encodeURIComponent(place.name)}/walk`;

  const audioText = `${place.name}. ${place.story || place.aiSummary || ''}. ${place.whyMissed ? 'AI가 지나친 이유: ' + place.whyMissed : ''}`;

  modalContainer.innerHTML = `
    <div class="place-detail-modal">
      ${place.image ? `
        <div class="modal-banner-img-wrapper">
          <img src="${place.image}" alt="${place.name}" class="modal-banner-img">
        </div>
      ` : ''}
      <div class="detail-modal-header">
        <div>
          <div style="display: flex; align-items: center; gap: 4px; margin-bottom: 2px;">
            <span style="font-size: 0.64rem; font-weight: 800; color: ${tagColor}; text-transform: uppercase;">
              ${tagLabel}
            </span>
            <span class="tier-pill ${tier.badgeClass}" style="font-size: 0.6rem;">${tier.icon} ${tier.name}</span>
          </div>
          <h3 style="font-size: 0.95rem; font-weight: 800; color: #0f172a;">${place.name}</h3>
          <p style="font-size: 0.68rem; color: var(--text-muted);">📍 ${place.address}</p>
        </div>
        <button class="detail-modal-close" onclick="document.getElementById('place-modal-container').innerHTML = ''">✕</button>
      </div>

      <div class="detail-modal-body">
        <!-- Audio Docent Button -->
        <button class="audio-guide-btn" onclick="window.AppManager.toggleAudioDocent('${audioText.replace(/'/g, "\\'")}')">
          <span>🔊 ${dict.audioListen || '오디오 도슨트'}</span>
        </button>

        ${isHot ? `
          <div class="detail-story-box">
            <strong>🤖 AI 추천 요약:</strong> ${place.aiSummary}<br><br>
            <strong>⏳ 대기 및 혼잡도:</strong> ${place.avgWaitTime}
          </div>
        ` : `
          <div class="detail-story-box">${place.story}</div>
          <div class="detail-why-box">
            <div class="detail-why-title">❓ 왜 AI는 이 장소를 지나쳤을까요?</div>
            ${place.whyMissed}
          </div>
        `}

        <!-- Check-In Action Button -->
        ${!isHot ? `
          <button class="check-in-btn ${isChecked ? 'checked' : ''}" onclick="window.AppManager.checkInPlace('${place.id}')">
            ${isChecked ? (dict.checkedIn || '✓ 체크인 완료') : (dict.checkInBtn || '📍 현장 체크인')}
          </button>
        ` : ''}

        <div class="modal-nav-toolbar">
          <button class="modal-nav-btn inapp" onclick="window.AppManager.startNavigation('${place.id}')">
            ${dict.walkNav || '도보 안내'}
          </button>
          <a href="${kakaoUrl}" target="_blank" rel="noopener noreferrer" class="modal-nav-btn kakao">
            ${dict.kakaoMap || '카카오맵'}
          </a>
          <a href="${naverUrl}" target="_blank" rel="noopener noreferrer" class="modal-nav-btn naver">
            ${dict.naverMap || '네이버지도'}
          </a>
        </div>
      </div>
    </div>
  `;

  const titleEl = document.getElementById('peek-title-text');
  const subtitleEl = document.getElementById('peek-subtitle-text');
  if (titleEl && subtitleEl) {
    titleEl.innerText = `📍 ${place.name} (${place.category})`;
    subtitleEl.innerText = `${place.address}`;
  }
}

function selectPlace(placeId) {
  openPlaceDetail(placeId);
}

function focusMatch(hotId, gemId) {
  MapManager.focusPlace(gemId);
  openPlaceDetail(gemId);
}

function clearAudit() {
  AppState.auditedHotspot = null;
  renderCurrentTabContent();
}

/**
 * 실시간 AI 질의 및 핫플 분석 엔진 (Custom Query & Hotspot Analyzer)
 */
function handleCustomQuery(event) {
  try {
    if (event) event.preventDefault();
    console.log('[handleCustomQuery] 분석 버튼 클릭됨');

    const input = document.getElementById('user-query-input');
    if (!input) { console.warn('[handleCustomQuery] input not found'); return; }

    const query = input.value.trim().toLowerCase();
    if (!query) { console.warn('[handleCustomQuery] empty query'); return; }

    console.log('[handleCustomQuery] query:', query);

    // Show clear button
    const clearBtn = document.getElementById('search-clear-btn');
    if (clearBtn) clearBtn.style.display = 'flex';

    // 1. Check if user query matches any Hotspot (e.g. "런던베이글", "아티스트베이커리", "스태픽스", "토속촌", "어니언")
    const matchedHotspot = BLIND_SPOT_DATA.places.find(p => 
      p.type === 'hotspot' && (
        p.name.toLowerCase().includes(query) || 
        query.includes(p.name.toLowerCase()) || 
        (query.includes('런던') && p.id === 'hot_anguk_1') || 
        (query.includes('베이글') && p.id === 'hot_anguk_1') || 
        (query.includes('아티스트') && p.id === 'hot_anguk_2') || 
        (query.includes('스태픽스') && p.id === 'hot_seochon_1') ||
        (query.includes('어니언') && p.id === 'hot_anguk_3') ||
        (query.includes('onion') && p.id === 'hot_anguk_3')
      )
    );

    if (matchedHotspot) {
      console.log('[handleCustomQuery] Hotspot matched:', matchedHotspot.name);
      AppState.auditedHotspot = matchedHotspot;
      AppState.activeTab = 'dual_comparison';

      // Sync tab button active state
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      const dualTab = document.querySelector('.tab-btn[data-tab="dual_comparison"]');
      if (dualTab) dualTab.classList.add('active');

      // Find counterpart gem
      const gem = BLIND_SPOT_DATA.places.find(p => p.id === matchedHotspot.counterpartId);
      console.log('[handleCustomQuery] Counterpart gem:', gem ? gem.name : 'not found');

      if (gem && MapManager && MapManager.drawDestinationPairLine) {
        MapManager.drawDestinationPairLine(matchedHotspot.coords, gem.coords, matchedHotspot.name, gem.name);
        MapManager.focusPlace(gem.id);
      } else if (MapManager && MapManager.focusPlace) {
        MapManager.focusPlace(matchedHotspot.id);
      }

      renderCurrentTabContent();
      setBottomSheetState('state-half');
      console.log('[handleCustomQuery] Audit banner rendered successfully');
      return;
    }

    // 2. Check if user query matches scenario keywords
    if (query.includes('조용') || query.includes('혼자') || query.includes('사색') || query.includes('책') || query.includes('북카페') || query.includes('독서')) {
      selectScenario('quiet_solo');
      setBottomSheetState('state-half');
      return;
    } else if (query.includes('비') || query.includes('운치') || query.includes('날씨')) {
      selectScenario('rainy_day');
      setBottomSheetState('state-half');
      return;
    } else if (query.includes('장인') || query.includes('공방') || query.includes('유산') || query.includes('전통') || query.includes('공예')) {
      selectScenario('local_artisan');
      setBottomSheetState('state-half');
      return;
    } else if (query.includes('차') || query.includes('다실') || query.includes('혜원')) {
      const gem = BLIND_SPOT_DATA.places.find(p => p.id === 'gem_anguk_4' || p.name.includes('혜원') || p.category.includes('다실'));
      if (gem) {
        MapManager.focusPlace(gem.id);
        openPlaceDetail(gem.id);
        setBottomSheetState('state-half');
        return;
      }
    }

    // 3. Check if user query matches any hidden gem or local place name
    const matchedPlace = BLIND_SPOT_DATA.places.find(p => 
      p.name.toLowerCase().includes(query) || p.category.toLowerCase().includes(query) || p.address.toLowerCase().includes(query)
    );

    if (matchedPlace) {
      console.log('[handleCustomQuery] Place matched:', matchedPlace.name);
      MapManager.focusPlace(matchedPlace.id);
      openPlaceDetail(matchedPlace.id);
      setBottomSheetState('state-half');
    } else {
      console.log('[handleCustomQuery] No match, fallback to general');
      selectScenario('general');
      setBottomSheetState('state-half');
    }
  } catch (err) {
    console.error('[handleCustomQuery] Error:', err);
  }
}


/**
 * 모드 적용 (여행자 vs 지자체)
 */
function applyMode(mode) {
  AppState.currentMode = mode;

  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === mode);
  });

  const viewTabs = document.getElementById('view-tabs-container');
  if (viewTabs) {
    viewTabs.style.display = mode === 'b2g_policy' ? 'none' : 'flex';
  }

  renderCurrentTabContent();
}

/**
 * 데스크톱 사이드바 토글
 */
function toggleSidebar() {
  const sidebar = document.getElementById('sidebar-panel');
  const layout = document.getElementById('workspace-layout');
  const icon = document.getElementById('sidebar-toggle-icon');

  if (!sidebar) return;

  AppState.isSidebarOpen = !AppState.isSidebarOpen;
  sidebar.classList.toggle('collapsed', !AppState.isSidebarOpen);

  if (layout) {
    layout.classList.toggle('sidebar-closed', !AppState.isSidebarOpen);
  }

  if (icon) {
    icon.innerHTML = AppState.isSidebarOpen
      ? '<polyline points="9 18 15 12 9 6"></polyline>'
      : '<polyline points="15 18 9 12 15 6"></polyline>';
  }

  MapManager.resize();
}

/**
 * 이벤트 리스너 설정
 */
function setupEventListeners() {
  document.querySelectorAll('.region-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.region-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const region = btn.dataset.region;
      AppState.currentRegion = region;
      MapManager.flyToRegion(region);
      renderCurrentTabContent();
    });
  });

  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      applyMode(btn.dataset.mode);
    });
  });

  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      AppState.activeTab = btn.dataset.tab;
      renderCurrentTabContent();
    });
  });

  document.querySelectorAll('.cat-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.cat-filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const cat = btn.dataset.cat;
      MapManager.renderPlaceMarkers(AppState.currentRegion, cat);
    });
  });

  // Custom Query Form: JS-based submit handler (backup for onsubmit attribute)
  const queryForm = document.getElementById('custom-query-form');
  if (queryForm) {
    queryForm.addEventListener('submit', (e) => {
      e.preventDefault();
      handleCustomQuery(e);
    });
  }

  // Custom Query Input: handle Enter key and show/hide clear button
  const queryInput = document.getElementById('user-query-input');
  if (queryInput) {
    queryInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleCustomQuery(e);
      }
    });
    queryInput.addEventListener('input', () => {
      const clearBtn = document.getElementById('search-clear-btn');
      if (clearBtn) {
        clearBtn.style.display = queryInput.value.length > 0 ? 'flex' : 'none';
      }
    });
  }
}

window.AppManager = {
  selectScenario,
  openPlaceDetail,
  selectPlace,
  focusMatch,
  clearAudit,
  handleCustomQuery,
  toggleSidebar,
  toggleBottomSheetSnap,
  toggleGpsLocation,
  toggleLocationRadar,
  toggleWalkingRoute,
  startNavigation,
  stopNavigation,
  setLanguage,
  toggleAudioDocent,
  checkInPlace
};
