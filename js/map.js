/**
 * Leaflet Map Controller & Mobile-First Navigation Engine (v6.0)
 */

let mapInstance = null;
let markerLayers = {
  hotspot: null,
  blind_gem: null,
  local_life: null
};
let redZoneLayer = null;
let b2gPolicyLayer = null;
let connectionLinesLayer = null;
let navigationRouteLayer = null;
let walkingRouteLayer = null;
let activeMarkersMap = {};
let fuzzyCirclesMap = {};
let userGpsMarker = null;
let userGpsAccuracyCircle = null;
let radarCircleLayer = null;
let dynamicLineLayer = null;
let currentCategoryFilter = 'all';

function initMap(containerId = 'map') {
  const initialCenter = BLIND_SPOT_DATA.regions.all.center;
  const initialZoom = BLIND_SPOT_DATA.regions.all.zoom;

  mapInstance = L.map(containerId, {
    zoomControl: false,
    attributionControl: false
  }).setView(initialCenter, initialZoom);

  // Base Tile Layers (Detailed Korean Streets)
  const osmStandard = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap'
  });

  osmStandard.addTo(mapInstance);

  // Reposition zoom control
  L.control.zoom({ position: 'topright' }).addTo(mapInstance);

  // Initialize Layer Groups
  markerLayers.hotspot = L.layerGroup().addTo(mapInstance);
  markerLayers.blind_gem = L.layerGroup().addTo(mapInstance);
  markerLayers.local_life = L.layerGroup().addTo(mapInstance);
  connectionLinesLayer = L.layerGroup().addTo(mapInstance);
  redZoneLayer = L.layerGroup().addTo(mapInstance);
  b2gPolicyLayer = L.layerGroup().addTo(mapInstance);
  navigationRouteLayer = L.layerGroup().addTo(mapInstance);
  walkingRouteLayer = L.layerGroup().addTo(mapInstance);

  // Render Initial Overlays & Markers
  renderRedZone();
  renderPlaceMarkers();
  renderConnectionLines();

  return mapInstance;
}

/**
 * 북촌 특별관리지역 (레드존) 폴리곤 렌더링
 */
function renderRedZone() {
  redZoneLayer.clearLayers();
  const redZoneData = BLIND_SPOT_DATA.bukchonRedZone;
  if (!redZoneData || !redZoneData.polygon) return;

  const polygon = L.polygon(redZoneData.polygon, {
    color: '#dc2626',
    weight: 2,
    dashArray: '5, 5',
    fillColor: '#ef4444',
    fillOpacity: 0.12,
    className: 'red-zone-polygon'
  });

  const popupContent = `
    <div class="map-popup-card">
      <span class="map-popup-badge hot">🚨 북촌 특별관리지역 (레드존)</span>
      <div class="map-popup-title">${redZoneData.name}</div>
      <p class="map-popup-desc">${redZoneData.summary}</p>
      <div style="font-size: 0.72rem; color: #059669; font-weight: 700; margin-top: 2px;">
        ⏰ 허용 시간: ${redZoneData.allowedHours} (${redZoneData.fineAmount})
      </div>
    </div>
  `;
  polygon.bindPopup(popupContent);
  redZoneLayer.addLayer(polygon);
}

/**
 * 커스텀 아이콘 생성
 */
function createCustomIcon(place) {
  let className = 'custom-pin';
  let html = '';
  let iconSize = [34, 34];
  let iconAnchor = [17, 17];

  if (place.type === 'hotspot') {
    className += ' pin-hotspot';
    html = `
      <div class="pin-hotspot-pulse"></div>
      <div class="pin-hotspot-core">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
        </svg>
      </div>
    `;
  } else if (place.type === 'blind_gem') {
    className += ' pin-blind-gem';
    html = `
      <div class="pin-blind-gem-pulse"></div>
      <div class="pin-blind-gem-core">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
        </svg>
      </div>
    `;
  } else {
    className += ' pin-local-life';
    iconSize = [30, 30];
    iconAnchor = [15, 15];
    html = `
      <div class="pin-local-life-core">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
        </svg>
      </div>
    `;
  }

  return L.divIcon({
    className: className,
    html: html,
    iconSize: iconSize,
    iconAnchor: iconAnchor
  });
}

/**
 * 장소 마커 렌더링
 */
function renderPlaceMarkers(filterRegion = 'all', filterCategory = 'all', filterTier = 'all') {
  currentCategoryFilter = filterCategory;

  markerLayers.hotspot.clearLayers();
  markerLayers.blind_gem.clearLayers();
  markerLayers.local_life.clearLayers();
  activeMarkersMap = {};
  fuzzyCirclesMap = {};

  BLIND_SPOT_DATA.places.forEach(place => {
    if (filterRegion !== 'all' && place.region !== filterRegion) return;
    if (filterCategory !== 'all' && !place.category.includes(filterCategory)) return;
    if (filterTier !== 'all' && place.disclosureTier !== filterTier) return;

    if (place.disclosureTier === 'tier_fuzzy') {
      const fuzzyCircle = L.circle(place.coords, {
        radius: 40,
        color: '#8b5cf6',
        weight: 1.5,
        dashArray: '4, 4',
        fillColor: '#a78bfa',
        fillOpacity: 0.15
      });
      fuzzyCirclesMap[place.id] = fuzzyCircle;
      markerLayers.local_life.addLayer(fuzzyCircle);
    }

    const icon = createCustomIcon(place);
    const marker = L.marker(place.coords, { icon: icon });

    const isHot = place.type === 'hotspot';
    const tagClass = isHot ? 'hot' : (place.type === 'blind_gem' ? 'gem' : 'life');
    const tagLabel = isHot ? `AI 핫플 (${place.aiMentionRate}%)` : (place.type === 'blind_gem' ? 'AI 사각지대 골목' : '생활유산');

    const kakaoUrl = `https://map.kakao.com/link/to/${encodeURIComponent(place.name)},${place.coords[0]},${place.coords[1]}`;
    const naverUrl = `https://map.naver.com/v5/directions/-/-/${place.coords[1]},${place.coords[0]},${encodeURIComponent(place.name)}/walk`;

    const popupHtml = `
      <div class="map-popup-card">
        <span class="map-popup-badge ${tagClass}">${tagLabel}</span>
        <div class="map-popup-title">${place.name}</div>
        <p class="map-popup-desc">${isHot ? (place.aiSummary || '') : (place.story ? place.story.substring(0, 50) + '...' : '')}</p>
        <div class="map-popup-actions">
          <button class="map-popup-btn primary" onclick="window.AppManager.startNavigation('${place.id}')">
            🚶 보행 길안내
          </button>
          <button class="map-popup-btn" onclick="window.AppManager.openPlaceDetail('${place.id}')">
            상세정보
          </button>
        </div>
      </div>
    `;

    marker.bindPopup(popupHtml);

    marker.on('click', () => {
      window.AppManager.selectPlace(place.id);
    });

    activeMarkersMap[place.id] = marker;

    if (place.type === 'hotspot') {
      markerLayers.hotspot.addLayer(marker);
    } else if (place.type === 'blind_gem') {
      markerLayers.blind_gem.addLayer(marker);
    } else {
      markerLayers.local_life.addLayer(marker);
    }
  });
}

/**
 * 장소 포커스 (모바일 바텀시트 가림 방지 오프셋 적용)
 */
function focusPlace(placeId, shouldOpenDetail = true) {
  const place = BLIND_SPOT_DATA.places.find(p => p.id === placeId);
  if (!place || !mapInstance) return;

  const isMobile = window.innerWidth <= 900;
  let targetLat = place.coords[0];
  let targetLng = place.coords[1];

  // On mobile, offset latitude downwards so pin appears in top 50% of viewport
  if (isMobile) {
    targetLat = targetLat - 0.0022;
  }

  mapInstance.flyTo([targetLat, targetLng], 17, {
    duration: 0.75,
    easeLinearity: 0.25
  });

  const marker = activeMarkersMap[placeId];
  if (marker && marker.openPopup) {
    setTimeout(() => {
      try { marker.openPopup(); } catch(e) {}
    }, 450);
  }


  if (shouldOpenDetail && window.AppManager && window.AppManager.openPlaceDetail) {
    window.AppManager.openPlaceDetail(placeId);
  }
}

/**
 * 인앱 보행자 도보 내비게이션 라인 그리기
 */
function drawNavigationRoute(originCoords, destCoords, originName = '내 위치', destName = '') {
  if (!mapInstance) return;

  if (navigationRouteLayer) {
    navigationRouteLayer.clearLayers();
  } else {
    navigationRouteLayer = L.layerGroup().addTo(mapInstance);
  }

  // Generate realistic walking alley waypoint between origin and destination
  const midLat = (originCoords[0] + destCoords[0]) / 2 + (Math.random() - 0.5) * 0.0004;
  const midLng = (originCoords[1] + destCoords[1]) / 2 + (Math.random() - 0.5) * 0.0004;
  const routePoints = [originCoords, [midLat, midLng], destCoords];

  const polyline = L.polyline(routePoints, {
    color: '#059669',
    weight: 5,
    opacity: 0.9,
    dashArray: '8, 8',
    lineCap: 'round',
    className: 'navigation-route-line'
  });

  navigationRouteLayer.addLayer(polyline);

  // Origin Marker
  const startIcon = L.divIcon({
    className: 'nav-start-pin',
    html: `<div style="background: #2563eb; color: #fff; width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.65rem; font-weight: 800; border: 2px solid #fff; box-shadow: 0 2px 6px rgba(0,0,0,0.3);">출발</div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11]
  });
  navigationRouteLayer.addLayer(L.marker(originCoords, { icon: startIcon }));

  // Fit bounds taking mobile UI into account
  const isMobile = window.innerWidth <= 900;
  const paddingOptions = isMobile ? { paddingTopLeft: [40, 90], paddingBottomRight: [40, 160] } : { padding: [80, 80] };
  mapInstance.fitBounds(polyline.getBounds(), paddingOptions);
}

function clearNavigationRoute() {
  if (navigationRouteLayer) {
    navigationRouteLayer.clearLayers();
  }
}

/**
 * 고요의 산책로 1.8km 추천 코스 렌더링
 */
function showWalkingRoute() {
  if (!walkingRouteLayer) {
    walkingRouteLayer = L.layerGroup().addTo(mapInstance);
  }
  walkingRouteLayer.clearLayers();

  const routePoints = [
    [37.5833, 126.9872], // 배렴가옥
    [37.5818, 126.9892], // 혜원
    [37.5831, 126.9845], // 동림매듭
    [37.5808, 126.9835], // 정독도서관
    [37.5786, 126.9729], // 보안책방
    [37.5789, 126.9708], // 이상의 집
    [37.5785, 126.9685], // 흙과나무
    [37.5816, 126.9632]  // 수성동 계곡
  ];

  const polyline = L.polyline(routePoints, {
    color: '#059669',
    weight: 4,
    opacity: 0.85,
    dashArray: '8, 8',
    lineCap: 'round'
  });

  walkingRouteLayer.addLayer(polyline);
  mapInstance.fitBounds(polyline.getBounds(), { padding: [60, 60] });
}

function hideWalkingRoute() {
  if (walkingRouteLayer) {
    walkingRouteLayer.clearLayers();
  }
}

/**
 * 핫플 - 사각지대 연결 점선
 */
function renderConnectionLines() {
  connectionLinesLayer.clearLayers();

  BLIND_SPOT_DATA.places.forEach(place => {
    if (place.type === 'hotspot' && place.counterpartId) {
      const counterpart = BLIND_SPOT_DATA.places.find(p => p.id === place.counterpartId);
      if (counterpart) {
        const line = L.polyline([place.coords, counterpart.coords], {
          color: '#10b981',
          weight: 2,
          opacity: 0.55,
          dashArray: '5, 8',
          lineCap: 'round'
        });
        connectionLinesLayer.addLayer(line);
      }
    }
  });
}

/**
 * 실시간 GPS 위치 표시 (나침반 방향각 지원)
 */
let currentUserHeading = 0;

function updateUserGpsLocation(lat, lng, accuracy = 20) {
  if (!mapInstance) return;

  if (userGpsMarker) {
    userGpsMarker.setLatLng([lat, lng]);
  } else {
    const icon = L.divIcon({
      className: 'user-location-pin',
      html: `
        <div class="user-location-heading-cone" id="user-heading-cone" style="transform: rotate(${currentUserHeading}deg);"></div>
        <div class="user-location-pulse"></div>
        <div class="user-location-core"></div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });
    userGpsMarker = L.marker([lat, lng], { icon: icon, zIndexOffset: 1000 }).addTo(mapInstance);
  }

  if (userGpsAccuracyCircle) {
    userGpsAccuracyCircle.setLatLng([lat, lng]);
    userGpsAccuracyCircle.setRadius(accuracy);
  } else {
    userGpsAccuracyCircle = L.circle([lat, lng], {
      radius: accuracy,
      color: '#3b82f6',
      weight: 1,
      fillColor: '#93c5fd',
      fillOpacity: 0.15
    }).addTo(mapInstance);
  }
}

/**
 * 디바이스 자이로스코프 나침반 각도 갱신
 */
function updateUserCompassHeading(headingDeg) {
  currentUserHeading = headingDeg;
  const cone = document.getElementById('user-heading-cone');
  if (cone) {
    cone.style.transform = `rotate(${headingDeg}deg)`;
  }
}

/**
 * 장소 체크인 시 시각적 축하 펄스 이펙트
 */
function highlightCheckInPlace(placeId) {
  const marker = activeMarkersMap[placeId];
  if (marker && mapInstance) {
    const el = marker.getElement ? marker.getElement() : (marker._icon || null);
    if (el && el.classList) {
      el.classList.add('stamp-celebrate-pulse');
      setTimeout(() => el.classList.remove('stamp-celebrate-pulse'), 3000);
    }
  }
}



/**
 * 레이더 서클 렌더링
 */
function renderRadarCircle(lat, lng, radius = 350) {
  if (!mapInstance) return;

  if (radarCircleLayer) {
    mapInstance.removeLayer(radarCircleLayer);
  }

  radarCircleLayer = L.circle([lat, lng], {
    radius: radius,
    color: '#2563eb',
    weight: 2,
    dashArray: '6, 6',
    fillColor: '#3b82f6',
    fillOpacity: 0.08,
    className: 'radar-scan-circle'
  }).addTo(mapInstance);

  const isMobile = window.innerWidth <= 900;
  const targetLat = isMobile ? lat - 0.0018 : lat;
  mapInstance.flyTo([targetLat, lng], 16, { duration: 0.8 });
}

function clearRadar() {
  if (radarCircleLayer && mapInstance) {
    mapInstance.removeLayer(radarCircleLayer);
    radarCircleLayer = null;
  }
  if (dynamicLineLayer && mapInstance) {
    mapInstance.removeLayer(dynamicLineLayer);
    dynamicLineLayer = null;
  }
}

/**
 * 두 좌표 사이 거리 (미터) 및 도보 시간 계산
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const directDist = R * c;
  // Apply urban alley detour factor (~1.25x)
  return Math.round(directDist * 1.25);
}

function calculateWalkingMinutes(distanceMeters) {
  // Average pedestrian alley speed: ~70m per min
  return Math.max(1, Math.round(distanceMeters / 70));
}

function flyToRegion(regionKey) {
  if (!mapInstance || !BLIND_SPOT_DATA.regions[regionKey]) return;
  const region = BLIND_SPOT_DATA.regions[regionKey];
  mapInstance.flyTo(region.center, region.zoom, { duration: 0.9 });
  renderPlaceMarkers(regionKey, currentCategoryFilter);
}

function resize() {
  if (mapInstance) {
    setTimeout(() => {
      mapInstance.invalidateSize();
    }, 300);
  }
}

function drawDestinationPairLine(hotCoords, gemCoords, hotName = '', gemName = '') {
  if (!mapInstance) return;

  if (dynamicLineLayer) {
    dynamicLineLayer.clearLayers();
  } else {
    dynamicLineLayer = L.layerGroup().addTo(mapInstance);
  }

  const polyline = L.polyline([hotCoords, gemCoords], {
    color: '#059669',
    weight: 4,
    opacity: 0.9,
    dashArray: '6, 8',
    lineCap: 'round',
    className: 'navigation-route-line'
  });

  dynamicLineLayer.addLayer(polyline);

  const midLat = (hotCoords[0] + gemCoords[0]) / 2;
  const midLng = (hotCoords[1] + gemCoords[1]) / 2;
  const dist = calculateDistance(hotCoords[0], hotCoords[1], gemCoords[0], gemCoords[1]);
  const walkMin = calculateWalkingMinutes(dist);

  const midIcon = L.divIcon({
    className: 'pair-distance-badge',
    html: `<div style="background: #0f172a; color: #ffffff; padding: 3px 8px; border-radius: 9999px; font-size: 0.68rem; font-weight: 800; border: 1.5px solid #10b981; box-shadow: 0 2px 8px rgba(0,0,0,0.3); white-space: nowrap;">🚶 도보 ${walkMin}분 (${dist}m) 골목 대안</div>`,
    iconSize: [140, 22],
    iconAnchor: [70, 11]
  });

  const midMarker = L.marker([midLat, midLng], { icon: midIcon });
  dynamicLineLayer.addLayer(midMarker);

  const isMobile = window.innerWidth <= 900;
  const paddingOptions = isMobile ? { paddingTopLeft: [40, 90], paddingBottomRight: [40, 160] } : { padding: [80, 80] };
  mapInstance.fitBounds(polyline.getBounds(), paddingOptions);
}

function clearDestinationPairLine() {
  if (dynamicLineLayer) {
    dynamicLineLayer.clearLayers();
  }
}

window.MapManager = {
  initMap,
  renderPlaceMarkers,
  flyToRegion,
  focusPlace,
  showWalkingRoute,
  hideWalkingRoute,
  renderRedZone,
  updateUserGpsLocation,
  updateUserCompassHeading,
  highlightCheckInPlace,
  drawNavigationRoute,
  clearNavigationRoute,
  drawDestinationPairLine,
  clearDestinationPairLine,
  renderRadarCircle,
  clearRadar,
  calculateDistance,
  calculateWalkingMinutes,
  resize
};


