/**
 * AI 추천 사각지대 데이터셋 (안국·서촌편)
 * - Hotspots: AI 언급 빈도 80~100% (다빈도 추천 핫플)
 * - Blind Spots (Hidden Gems): AI 언급 빈도 0~10% (방문 가치가 높은 숨은 로컬 명소)
 * - Local Life: AI 언급 빈도 0% (동네의 일상을 지탱하는 생활·문화 인프라)
 * - Disclosure Tiers: 공개 강도 4단계 (일반공개 / 예약제 / 스토리권역 / 주거보호)
 */

const BLIND_SPOT_DATA = {
  meta: {
    regionName: "안국 · 서촌 (Jongno, Seoul)",
    updatedAt: "2026-09-15",
    totalGroundTruthPlaces: 486,
    totalAiMentionedPlaces: 38,
    blindSpotRatio: 92.2, // 92.2% of real places are never mentioned by AI
    aiBiasIndex: 8.7, // 10점 만점 중 8.7의 편향도
    auditVersion: "v2.4 (2026.09 현장 실사 완료)"
  },

  // 북촌 특별관리지역 (레드존) 규제 지리정보
  bukchonRedZone: {
    name: "북촌 특별관리지역 (레드존)",
    legalBasis: "서울시 종로구 북촌 한옥마을 특별관리지역 조례",
    allowedHours: "10:00 ~ 17:00",
    fineAmount: "위반 시 과태료 10만 원 부과",
    summary: "주민 정주권과 고요한 일상을 보호하기 위해 관광객 방문 시간이 엄격히 제한되는 주거 밀집 한옥 구역",
    polygon: [
      [37.5818, 126.9828],
      [37.5858, 126.9832],
      [37.5862, 126.9868],
      [37.5835, 126.9882],
      [37.5812, 126.9860]
    ]
  },

  // 공개 강도 (Disclosure Tiers) 정책 정의
  disclosureTiers: {
    tier_public: {
      id: "tier_public",
      name: "일반 공개",
      icon: "🟢",
      badgeClass: "badge-tier-public",
      desc: "공공 문화재·미술관 등 상시 방문 및 다수 인원 수용이 가능한 공간",
      color: "#059669"
    },
    tier_reservation: {
      id: "tier_reservation",
      name: "예약 · 시간제 공개",
      icon: "🟡",
      badgeClass: "badge-tier-reservation",
      desc: "작은 공방·다실 등 소규모 인원 예약 권장 및 수용력 관리 공간",
      color: "#d97706"
    },
    tier_fuzzy: {
      id: "tier_fuzzy",
      name: "스토리 · 권역 안내",
      icon: "🟣",
      badgeClass: "badge-tier-fuzzy",
      desc: "주거지 인접 골목으로 정밀 핀 대신 골목 반경 블록으로 표시하여 주민 보호",
      color: "#7c3aed"
    },
    tier_protected: {
      id: "tier_protected",
      name: "주거 보호 (비공개)",
      icon: "🔒",
      badgeClass: "badge-tier-protected",
      desc: "주민 생활권 침해 우려로 정확한 위치를 비공개 처리하고 이야기만 보존",
      color: "#64748b"
    }
  },

  // 구역별 중심 좌표 및 바운더리 정보
  regions: {
    all: {
      id: "all",
      name: "안국 & 서촌 전체",
      center: [37.5800, 126.9780],
      zoom: 14,
      description: "경복궁을 사이에 둔 동쪽(북촌/안국)과 서쪽(서촌)의 대비",
      stats: { totalPlaces: 486, aiPlaces: 38, blindRatio: 92.2 }
    },
    anguk: {
      id: "anguk",
      name: "안국 · 북촌 (계동/삼청/원서)",
      center: [37.5802, 126.9855],
      zoom: 15,
      description: "조선 왕실과 근현대 한옥이 공존하는 문화예술의 결 (레드존 포함)",
      stats: { totalPlaces: 254, aiPlaces: 18, blindRatio: 92.9 }
    },
    seochon: {
      id: "seochon",
      name: "서촌 (통의/통인/누하/옥인/체부)",
      center: [37.5800, 126.9695],
      zoom: 15,
      description: "인왕산 자락 아래 예술가들의 골목과 오래된 생활의 터",
      stats: { totalPlaces: 232, aiPlaces: 20, blindRatio: 91.4 }
    }
  },

  // 프롬프트 시나리오 프리셋 및 5차원 분해형 편향 지표
  scenarios: [
    {
      id: "general",
      title: "기본 추천 질의",
      query: "안국·서촌에서 요즘 제일 가볼 만한 곳 추천해줘",
      badge: "표준 질의",
      description: "가장 일반적인 검색 시 AI가 소환하는 상위 1% 핫플과 배제된 99% 골목",
      aiSourceDistribution: { instagram: 72, viralBlog: 21, mediaBroadcast: 5, officialOpenData: 2 },
      aiHallmark: "웨이팅 1~2시간 필수, 비주얼 중심 베이커리/카페 집중",
      decomposedBias: {
        mentionSkew: { score: 96, label: "상위 1% 언급 집중도", desc: "추천 결과의 96%가 상위 5개 매장에 편중" },
        commerciality: { score: 93, label: "SNS·체험단 상업성 의존도", desc: "인스타그램 및 네이버 블로그 체험단 비중 93%" },
        dataFreshness: { score: 94, label: "현장 실사 최신성", desc: "2026.09 현장 방문 및 영업 상태 실사 완료" },
        residentialRisk: { score: 88, label: "주거지 소음·과밀 리스크", desc: "주거 밀집 골목 대기열로 주민 민원 발생 가능성 높음" },
        dispersionFeasibility: { score: 95, label: "골목 대안 분산 적합도", desc: "도보 5분 이내 훌륭한 대안 동선 존재" }
      },
      recommendedPlaces: ["hot_anguk_1", "hot_anguk_2", "hot_seochon_1", "hot_seochon_2"],
      alternativePlaces: ["gem_anguk_1", "gem_anguk_2", "gem_seochon_1", "gem_seochon_2"]
    },
    {
      id: "quiet_solo",
      title: "혼자 · 조용한 사색",
      query: "서촌과 안국에서 사람 붐비지 않고 혼자 책 읽거나 사색하기 좋은 곳",
      badge: "분위기 필터",
      description: "'조용한' 조건을 넣어도 AI는 여전히 SNS 유명 카페를 '조용한 편'이라며 추천하는 경향",
      aiSourceDistribution: { instagram: 58, viralBlog: 32, mediaBroadcast: 7, officialOpenData: 3 },
      aiHallmark: "실제로는 평일 낮에도 만석인 인스타 감성 북카페 위주 지목",
      decomposedBias: {
        mentionSkew: { score: 89, label: "상위 1% 언급 집중도", desc: "'조용한' 키워드에도 대형 북카페 쏠림" },
        commerciality: { score: 90, label: "SNS·체험단 상업성 의존도", desc: "감성 사진 위주 포스팅 90% 반영" },
        dataFreshness: { score: 95, label: "현장 실사 최신성", desc: "조용한 시간대 현장 소음도 실측 완료" },
        residentialRisk: { score: 42, label: "주거지 소음·과밀 리스크", desc: "단독 방문자 위주로 주거지 리스크 낮음" },
        dispersionFeasibility: { score: 98, label: "골목 대안 분산 적합도", desc: "고택 마루 및 구내 숲길로 완벽 분산 가능" }
      },
      recommendedPlaces: ["hot_seochon_3", "hot_anguk_3", "hot_seochon_1"],
      alternativePlaces: ["gem_anguk_4", "gem_seochon_3", "gem_seochon_4"]
    },
    {
      id: "rainy_day",
      title: "비 오는 날의 정취",
      query: "비 오는 날 안국이나 서촌 골목 걷기 좋은 운치 있는 장소",
      badge: "날씨/정취",
      description: "빗소리가 어울리는 고택과 작은 갤러리 대신 대형 유리창 한옥 카페 위주 응답",
      aiSourceDistribution: { instagram: 79, viralBlog: 16, mediaBroadcast: 4, officialOpenData: 1 },
      aiHallmark: "사진이 잘 나오는 통유리 베이커리 & 대형 미술관에 집중",
      decomposedBias: {
        mentionSkew: { score: 92, label: "상위 1% 언급 집중도", desc: "대형 통유리 매장 위주 편중" },
        commerciality: { score: 95, label: "SNS·체험단 상업성 의존도", desc: "비 오는 날 뷰 맛집 바이럴 피드 95%" },
        dataFreshness: { score: 92, label: "현장 실사 최신성", desc: "우천 시 보행 안전 동선 확인" },
        residentialRisk: { score: 65, label: "주거지 소음·과밀 리스크", desc: "골목길 우산 보행 시 통행 불편 위험" },
        dispersionFeasibility: { score: 91, label: "골목 대안 분산 적합도", desc: "처마 밑 툇마루 다실로 안전 전환" }
      },
      recommendedPlaces: ["hot_anguk_2", "hot_anguk_4", "hot_seochon_4"],
      alternativePlaces: ["gem_anguk_1", "gem_seochon_5", "life_seochon_1"]
    },
    {
      id: "local_artisan",
      title: "골목 장인 · 생활의 결",
      query: "서촌·안국 골목의 진짜 오래된 가게나 전통 공예, 로컬 공방",
      badge: "로컬 헤리티지",
      description: "장소 데이터와 리뷰 수가 적어 AI가 거의 인지하지 못하는 동네의 진짜 뿌리",
      aiSourceDistribution: { instagram: 35, viralBlog: 45, mediaBroadcast: 15, officialOpenData: 5 },
      aiHallmark: "방송에 수차례 방영된 극소수 관광형 서점/시장 가게만 반복 출력",
      decomposedBias: {
        mentionSkew: { score: 78, label: "상위 1% 언급 집중도", desc: "미디어 방영 유명 가게에 편중" },
        commerciality: { score: 80, label: "SNS·체험단 상업성 의존도", desc: "전통 장인 데이터의 온라인 부재" },
        dataFreshness: { score: 96, label: "현장 실사 최신성", desc: "장인 작업실 및 방앗간 운영 확인 완료" },
        residentialRisk: { score: 30, label: "주거지 소음·과밀 리스크", desc: "로컬 상생 효과 극대화" },
        dispersionFeasibility: { score: 94, label: "골목 대안 분산 적합도", desc: "골목 경제 활성화 기여도 매우 높음" }
      },
      recommendedPlaces: ["hot_seochon_2", "hot_seochon_4"],
      alternativePlaces: ["gem_anguk_3", "gem_seochon_2", "life_anguk_1", "life_seochon_2"]
    }
  ],

  // B2G 지자체·관광재단(DMO) 전용 혼잡 분산 정책 시뮬레이션 지표
  b2gPolicyData: {
    headline: "종로구 · 서울관광재단 DMO 관광 분산 의사결정 대시보드",
    kpis: {
      waitHoursSaved: "1,420시간 / 주말 1일",
      economicDispersal: "+3.8억 원 / 분기",
      residentComplaints: "▼ 68.4% 감소",
      dispersionSuccessRate: "34.2%"
    },
    riskZones: [
      {
        id: "bukchon_gahoe",
        name: "북촌 가회동 31번지 (레드존)",
        level: "CRITICAL",
        crowdDensity: "148% (과밀 경보)",
        actionRequired: "17시 이후 관람 제한 및 다국어 안내원 배치",
        targetDispersion: "계동 배렴가옥 및 원서동 돌담길로 250명/일 전환"
      },
      {
        id: "seochon_tongin",
        name: "서촌 통인시장 ~ 옥인동 진입로",
        level: "WARNING",
        crowdDensity: "112% (주의)",
        actionRequired: "수성동 계곡 및 인왕산 숲길 방면 분산 유도",
        targetDispersion: "수성동 계곡 및 보안책방 방면으로 180명/일 전환"
      }
    ],
    policyDirectives: [
      { title: "AI 추천 편향 정정 지침", desc: "서울시 공공 포털 및 관광 앱에 상위 5대 핫플 대신 사각지대 공방 12선 교차 노출" },
      { title: "북촌 안심 산책 패스 시범 운영", desc: "사각지대 문화재 4개소 연계 모바일 스탬프 투어로 골목 체류 시간 분산" },
      { title: "소상공인 데이터 등록 지원", desc: "온라인 기록이 없는 골목 장인 30개소의 기본 프로필 및 에티켓 다국어 DB 구축" }
    ]
  },

  // 장소 데이터 (AI 핫플 vs 사각지대 숨은 명소 vs 생활 인프라)
  places: [
    // === [안국 AI 핫플] ===
    {
      id: "hot_anguk_1",
      region: "anguk",
      type: "hotspot",
      category: "베이커리/카페",
      name: "런던베이글뮤지엄 안국점",
      image: "images/hot_anguk_1.jpg",
      address: "서울 종로구 북촌로4길 20",
      coords: [37.5794, 126.9863],
      disclosureTier: "tier_public",
      freshnessDate: "2026-09-08",
      verificationStatus: "현장 실사 완료",
      aiMentionRate: 98,
      avgWaitTime: "90~150분",
      sourceBreakdown: { instagram: 82, blog: 14, media: 4 },
      aiSummary: "북촌의 대표적 핫플레이스로 이국적인 인테리어와 베이글로 극찬받는 필수 방문 코스.",
      realityCheck: "온라인 언급량 1위. 극심한 대기열로 인해 골목 주민들의 통행 불편 민원이 잦음.",
      etiquette: ["🚶 대기선 준수", "🚗 골목 내 주차 절대 불가", "🤫 주민 주택 앞 정숙"],
      counterpartId: "gem_anguk_1"
    },
    {
      id: "hot_anguk_2",
      region: "anguk",
      type: "hotspot",
      category: "베이커리/카페",
      name: "아티스트 베이커리 안국",
      image: "images/hot_anguk_2.jpg",
      address: "서울 종로구 율곡로 45 1층",
      coords: [37.5768, 126.9853],
      disclosureTier: "tier_public",
      freshnessDate: "2026-09-08",
      verificationStatus: "현장 실사 완료",
      aiMentionRate: 94,
      avgWaitTime: "60~120분",
      sourceBreakdown: { instagram: 85, blog: 12, media: 3 },
      aiSummary: "안국역 바로 앞 소금빵 전문 베이커리로 여행 시작점으로 강력 추천.",
      realityCheck: "SNS 바이럴 중심 추천. 상위 노출 블로그 포스팅만 4,000건 이상 축적.",
      etiquette: ["🚇 지하철 출구 앞 보행 통로 확보"],
      counterpartId: "gem_anguk_3"
    },
    {
      id: "hot_anguk_3",
      region: "anguk",
      type: "hotspot",
      category: "카페/한옥",
      name: "어니언 안국 (Cafe Onion)",
      image: "images/gem_anguk_1.jpg",
      address: "서울 종로구 계동길 5",
      coords: [37.5786, 126.9868],
      disclosureTier: "tier_public",
      freshnessDate: "2026-09-08",
      verificationStatus: "현장 실사 완료",
      aiMentionRate: 91,
      avgWaitTime: "40~80분",
      sourceBreakdown: { instagram: 74, blog: 22, media: 4 },
      aiSummary: "전통 한옥을 현대적으로 재해석한 대형 베이커리 카페로 마당 뷰가 돋보임.",
      realityCheck: "외국인 관광객 필수 코스로 꼽히며 항상 인파로 붐벼 고즈넉한 한옥 정취는 느끼기 어려움.",
      etiquette: ["🤫 마당 내 고성방가 자제"],
      counterpartId: "gem_anguk_4"
    },
    {
      id: "hot_anguk_4",
      region: "anguk",
      type: "hotspot",
      category: "미술관/복합문화",
      name: "국립현대미술관 서울관",
      image: "images/hot_seochon_1.jpg",
      address: "서울 종로구 삼청로 30",
      coords: [37.5790, 126.9806],
      disclosureTier: "tier_public",
      freshnessDate: "2026-09-08",
      verificationStatus: "공공기관 DB 검증",
      aiMentionRate: 88,
      avgWaitTime: "예약제/원활",
      sourceBreakdown: { instagram: 45, blog: 35, media: 20 },
      aiSummary: "삼청동 초입에 위치한 대한민국 대표 현대미술관.",
      realityCheck: "공공 문화시설로 데이터가 풍부해 문화 예술 프롬프트마다 1순위 출력됨.",
      etiquette: ["🏛️ 전시장 내 플래시 금지"],
      counterpartId: "gem_anguk_2"
    },

    // === [안국 사각지대 - Hidden Gems] ===
    {
      id: "gem_anguk_1",
      region: "anguk",
      type: "blind_gem",
      category: "전통문화/고택",
      name: "계동 배렴 가옥",
      image: "images/gem_anguk_1.jpg",
      address: "서울 종로구 계동길 89",
      coords: [37.5833, 126.9872],
      disclosureTier: "tier_public",
      freshnessDate: "2026-09-08",
      verificationStatus: "현장 실사 & 국가등록문화재 확인",
      distanceFromHotspot: "런던베이글에서 도보 4분 (280m)",
      aiMentionRate: 2,
      curationMood: "고요한 툇마루 · 등록문화재 한옥",
      sourceBreakdown: { instagram: 8, blog: 22, official: 70 },
      story: "한국화가 제당 배렴이 생전에 머물렀던 등록문화재 한옥. 툇마루에 앉아 무료로 계동 골목의 고요한 바람 소리를 들으며 소규모 기획 전시를 감상할 수 있습니다.",
      whyMissed: "상업적 바이럴 마케팅이 없고 무료 공공 문화재라 SNS 인플루언서 피드에 오르지 않아 AI의 시선 밖.",
      suggestedAction: "웨이팅에 지쳤을 때 3분만 걸어 올라와 고택 마루에서 잠시 숨을 고르세요.",
      etiquette: ["🤫 실내 정숙", "👟 신발 벗고 입장", "📸 상업적 촬영 금지"]
    },
    {
      id: "gem_anguk_2",
      region: "anguk",
      type: "blind_gem",
      category: "전통공예/갤러리",
      name: "북촌 동림매듭공방 & 한옥박물관",
      image: "images/gem_anguk_3.jpg",
      address: "서울 종로구 북촌로12길 10",
      coords: [37.5831, 126.9845],
      disclosureTier: "tier_reservation",
      freshnessDate: "2026-09-08",
      verificationStatus: "공방 장인 인터뷰 완료",
      distanceFromHotspot: "국현미 서울관에서 도보 6분 (420m)",
      aiMentionRate: 4,
      curationMood: "조선 매듭의 아름다움 · 장인의 손길",
      sourceBreakdown: { instagram: 12, blog: 38, official: 50 },
      story: "실 한 올을 엮어 생명을 불어넣는 전통 매듭 장인의 숨결이 깃든 아담한 한옥 공방. 화려한 카페 대신 한국 전통 공예의 깊은 조형미를 조용히 마주할 수 있는 곳.",
      whyMissed: "체험 위주의 작은 공방으로 인스타 '인생샷' 소비 패턴 데이터셋에 포함되지 못함.",
      etiquette: ["📞 체험 프로그램 사전 예약 권장", "🤫 북촌 골목길 정숙 보행", "🚫 17시 이후 관람 제한"]
    },
    {
      id: "gem_anguk_3",
      region: "anguk",
      type: "blind_gem",
      category: "로컬티룸/찻집",
      name: "원서동 찻집 혜원 (惠園)",
      image: "images/gem_anguk_3.jpg",
      address: "서울 종로구 창덕궁길 73",
      coords: [37.5818, 126.9892],
      disclosureTier: "tier_reservation",
      freshnessDate: "2026-09-08",
      verificationStatus: "현장 방문 검증",
      distanceFromHotspot: "아티스트베이커리에서 도보 7분 (500m)",
      aiMentionRate: 1,
      curationMood: "창덕궁 돌담길 뷰 · 잎차와 다도",
      sourceBreakdown: { instagram: 15, blog: 45, official: 40 },
      story: "창덕궁 빨래터 옆 돌담길을 따라 걷다 마주치는 작은 다실. 주인장이 직접 우리는 계절 발효차와 수제 다식을 내어주며 오롯이 차의 온기에 집중하게 합니다.",
      whyMissed: "가게 홍보를 전혀 하지 않고 하루 예약 인원을 제한해 검색 코퍼스에 텍스트가 극히 희소함.",
      etiquette: ["🍵 1인 1차 주문", "🤫 작은 목소리로 대화", "📸 타 손님 얼굴 촬영 금지"]
    },
    {
      id: "gem_anguk_4",
      region: "anguk",
      type: "blind_gem",
      category: "도서관/정원",
      name: "정독도서관 구내 숲길 & 한옥 서가",
      image: "images/gem_anguk_1.jpg",
      address: "서울 종로구 북촌로5길 48",
      coords: [37.5808, 126.9835],
      disclosureTier: "tier_public",
      freshnessDate: "2026-09-08",
      verificationStatus: "공공시설 데이터 검증",
      distanceFromHotspot: "어니언 안국에서 도보 5분 (350m)",
      aiMentionRate: 6,
      curationMood: "수령 100년 벚나무 숲 · 조용한 책읽기",
      sourceBreakdown: { instagram: 20, blog: 40, official: 40 },
      story: "옛 경기고등학교 터에 자리 잡은 공공 도서관. 봄 벚꽃뿐 아니라 사계절 빽빽한 고목 숲과 서울교육박물관 뒤뜰의 한옥 열람실은 북촌에서 가장 평화로운 도심 쉼터입니다.",
      whyMissed: "상업 시설이 아닌 공공 도서관이라 관광/데이트 AI 추천 알고리즘의 필터에 누락됨.",
      etiquette: ["📚 도서관 열람 에티켓 준수", "🌿 정원 잔디밭 및 나무 훼손 금지"]
    },

    // === [안국 사각지대 - Local Life 일상 인프라] ===
    {
      id: "life_anguk_1",
      region: "anguk",
      type: "local_life",
      category: "생활유산/방앗간",
      name: "계동 방앗간 & 참기름",
      address: "서울 종로구 계동길 62",
      coords: [37.5812, 126.9870],
      disclosureTier: "tier_fuzzy",
      freshnessDate: "2026-09-08",
      verificationStatus: "로컬 상가 인허가 대조 완료",
      aiMentionRate: 0,
      curationMood: "35년째 이어오는 고소한 동네 참기름 냄새",
      story: "북촌 주민들의 밥상을 수십 년간 책임져온 진짜 골목의 일상. 갓 짠 들기름과 미숫가루 냄새가 골목 가득 퍼집니다.",
      whyMissed: "관광 데이터셋에 완전 배제된 생활 필수 시설",
      etiquette: ["🛍️ 로컬 주민 통행 및 장보기 우선", "📸 허가 없는 장인 촬영 자제"]
    },
    {
      id: "life_anguk_2",
      region: "anguk",
      type: "local_life",
      category: "생활유산/공방",
      name: "가회동 은공예 수선방",
      address: "서울 종로구 북촌로 43",
      coords: [37.5825, 126.9858],
      disclosureTier: "tier_fuzzy",
      freshnessDate: "2026-09-08",
      verificationStatus: "현장 방문 확인",
      aiMentionRate: 0,
      curationMood: "할머니 은비녀부터 옛 은수저까지 고치는 손길",
      story: "골목 한 켠에서 30년간 묵묵히 금은 수공예품을 수리하고 다듬어온 동네 장인의 작업실.",
      whyMissed: "관광 포털 미등재, 상가 인허가 데이터에만 존재하는 로컬 생활 인프라",
      etiquette: ["🔨 장인 작업 방해 금지", "🤫 주거 골목 정숙"]
    },

    // === [서촌 AI 핫플] ===
    {
      id: "hot_seochon_1",
      region: "seochon",
      type: "hotspot",
      category: "카페/베이커리",
      name: "스태픽스 (STAFFPICKS)",
      image: "images/hot_seochon_1.jpg",
      address: "서울 종로구 사직로9길 22",
      coords: [37.5762, 126.9678],
      disclosureTier: "tier_public",
      freshnessDate: "2026-09-08",
      verificationStatus: "현장 실사 완료",
      aiMentionRate: 96,
      avgWaitTime: "40~90분",
      sourceBreakdown: { instagram: 88, blog: 10, media: 2 },
      aiSummary: "서촌 인왕산 뷰와 거대한 은행나무 마당이 아름다운 파운드케이크 맛집.",
      realityCheck: "주말마다 야외 잔디밭 자리 쟁탈전과 사진 촬영 줄로 북새통.",
      etiquette: ["🍂 은행나무 훼손 금지", "🐕 반려견 목줄 필수"],
      counterpartId: "gem_seochon_1"
    },
    {
      id: "hot_seochon_2",
      region: "seochon",
      type: "hotspot",
      category: "전통/관광지",
      name: "통인시장 엽전도시락 & 기름떡볶이",
      image: "images/hot_anguk_2.jpg",
      address: "서울 종로구 자하문로15길 18",
      coords: [37.5807, 126.9705],
      disclosureTier: "tier_public",
      freshnessDate: "2026-09-08",
      verificationStatus: "공공데이터 대조 완료",
      aiMentionRate: 93,
      avgWaitTime: "30~60분",
      sourceBreakdown: { instagram: 40, blog: 30, media: 30 },
      aiSummary: "엽전으로 반찬을 사 먹는 서촌의 대표 전통시장 명소.",
      realityCheck: "TV 예능 프로그램과 관광공사 추천에 단골 등장하여 서촌 검색 시 AI가 기계적으로 1순위 출력.",
      etiquette: ["🍱 시장 통로 내 음식 취식 예절", "🗑️ 도시락 용기 지정 장소 반납"],
      counterpartId: "gem_seochon_2"
    },
    {
      id: "hot_seochon_3",
      region: "seochon",
      type: "hotspot",
      category: "카페/문화",
      name: "대오서점",
      image: "images/gem_anguk_1.jpg",
      address: "서울 종로구 자하문로7길 55",
      coords: [37.5802, 126.9692],
      disclosureTier: "tier_public",
      freshnessDate: "2026-09-08",
      verificationStatus: "현장 실사 완료",
      aiMentionRate: 89,
      avgWaitTime: "입장 대기 20~40분",
      sourceBreakdown: { instagram: 65, blog: 20, media: 15 },
      aiSummary: "서울에서 가장 오래된 서점으로 아이유 앨범 커버 촬영지로 유명.",
      realityCheck: "서점 본래의 기능보다는 음료 주문 후 사진 촬영하는 포토존으로 소비됨.",
      etiquette: ["🤫 실내 사진 촬영 시 타인 배려", "📚 전시 고서 만지지 않기"],
      counterpartId: "gem_seochon_3"
    },
    {
      id: "hot_seochon_4",
      region: "seochon",
      type: "hotspot",
      category: "카페/핸드드립",
      name: "서촌 mk2",
      image: "images/hot_anguk_2.jpg",
      address: "서울 종로구 자하문로10길 17",
      coords: [37.5796, 126.9723],
      disclosureTier: "tier_public",
      freshnessDate: "2026-09-08",
      verificationStatus: "현장 실사 완료",
      aiMentionRate: 86,
      avgWaitTime: "30~50분",
      sourceBreakdown: { instagram: 78, blog: 18, media: 4 },
      aiSummary: "서촌 카페 문화의 원조격으로 바우하우스 가구와 당근케이크가 시그니처.",
      realityCheck: "유명세로 인해 상시 만석이며 실내 소음도가 높아 조용한 대화는 제한적.",
      etiquette: ["🪑 빈티지 가구 착석 주의"],
      counterpartId: "gem_seochon_4"
    },

    // === [서촌 사각지대 - Hidden Gems] ===
    {
      id: "gem_seochon_1",
      region: "seochon",
      type: "blind_gem",
      category: "자연/문학유산",
      name: "수성동 계곡 & 안평대군 비해당 터",
      image: "images/gem_seochon_1.jpg",
      address: "서울 종로구 옥인동 185-3",
      coords: [37.5816, 126.9632],
      disclosureTier: "tier_public",
      freshnessDate: "2026-09-08",
      verificationStatus: "서울시 기념물 지정 현장 실사",
      distanceFromHotspot: "스태픽스에서 인왕산 방향 도보 8분 (600m)",
      aiMentionRate: 7,
      curationMood: "겸재 정선의 진경산수화 속 맑은 물소리",
      sourceBreakdown: { instagram: 25, blog: 45, official: 30 },
      story: "인왕산 치마바위 아래, 겸재 정선이 화폭에 담았던 옛 모습 그대로 복원된 계곡. 기린교 돌다리와 울창한 소나무 숲에서 서울 한복판이라고 믿기지 않는 청량한 물소리를 만납니다.",
      whyMissed: "상업 카페가 아닌 자연 생태 공원이라 '서촌 맛집/가볼만한곳' 쿼리에서 텍스트 밀도 부족으로 후순위 밀림.",
      etiquette: ["🌿 자연보호구역", "🗑️ 쓰레기 되가져가기", "🚫 야간 음주·고성방가 절대 금지"]
    },
    {
      id: "gem_seochon_2",
      region: "seochon",
      type: "blind_gem",
      category: "독립서점/인문학",
      name: "보안책방 & 아트스페이스 보안",
      image: "images/gem_anguk_3.jpg",
      address: "서울 종로구 효자로 33",
      coords: [37.5786, 126.9729],
      disclosureTier: "tier_public",
      freshnessDate: "2026-09-08",
      verificationStatus: "현장 실사 완료",
      distanceFromHotspot: "통인시장에서 경복궁 방향 도보 5분 (380m)",
      aiMentionRate: 9,
      curationMood: "80년 통의동 보안여관의 예술적 환생",
      sourceBreakdown: { instagram: 35, blog: 40, official: 25 },
      story: "시인 서정주, 김동리 등이 문학동인지를 창간했던 옛 보안여관 건물이 서점과 복합문화공간으로 재탄생한 곳. 경복궁 영추문 돌담길을 창밖으로 보며 엄선된 인문·예술 서적을 읽을 수 있습니다.",
      whyMissed: "단순 관광 포토존보다 깊이 있는 예술 서적으로 큐레이션되어 바이럴 알고리즘에서 저평가됨.",
      etiquette: ["📖 서점 내 정숙", "☕ 전시관 음료 반입 주의"]
    },
    {
      id: "gem_seochon_3",
      region: "seochon",
      type: "blind_gem",
      category: "문학공간/기념관",
      name: "이상의 집 (House of Yi Sang)",
      image: "images/gem_anguk_1.jpg",
      address: "서울 종로구 자하문로7길 18",
      coords: [37.5789, 126.9708],
      disclosureTier: "tier_public",
      freshnessDate: "2026-09-08",
      verificationStatus: "문화유산국민신탁 운영 확인",
      distanceFromHotspot: "대오서점에서 도보 2분 (150m)",
      aiMentionRate: 8,
      curationMood: "천재 시인 이상의 아방가르드 아카이브",
      sourceBreakdown: { instagram: 22, blog: 48, official: 30 },
      story: "시인 이상이 유년 시절을 보낸 집터에 조성된 문화공간. 이상의 초판본 도서와 영인본을 자유롭게 열람하며, 작은 철문을 열고 들어가는 '빛의 방'에서 이상의 시 세계를 미디어로 체험합니다.",
      whyMissed: "무료 개방 문화공간으로 상업적 프로모션이 없어 대오서점 등 유명 포토스팟에 가려짐.",
      etiquette: ["🤫 기념관 정숙", "📸 플래시 금지", "☕ 무료 차 음용 후 컵 정리"]
    },
    {
      id: "gem_seochon_4",
      region: "seochon",
      type: "blind_gem",
      category: "골목찻집/공방",
      name: "누하동 흙과 나무 도자 갤러리",
      image: "images/gem_anguk_3.jpg",
      address: "서울 종로구 필운대로 27-4",
      coords: [37.5785, 126.9685],
      disclosureTier: "tier_reservation",
      freshnessDate: "2026-09-08",
      verificationStatus: "장인 작업실 실사",
      distanceFromHotspot: "서촌 mk2에서 골목 안쪽 도보 4분 (290m)",
      aiMentionRate: 2,
      curationMood: "흙 냄새 나는 따뜻한 골목 도예 작업실",
      sourceBreakdown: { instagram: 10, blog: 30, official: 60 },
      story: "서촌 토박이 도예가가 20년째 물레를 돌리는 작업실 겸 쇼룸. 투박하지만 정겨운 분청 다기와 손으로 빚은 도자기 소품들이 은은한 차 향과 함께 반겨줍니다.",
      whyMissed: "SNS 마케팅 부재, 골목 막다른 길 안쪽에 위치해 지도 데이터 외 텍스트 전무.",
      etiquette: ["🏺 도자기 작품 파손 주의", "🤫 골목길 조용한 이동", "📞 방문 전 유선 확인 권장"]
    },
    {
      id: "gem_seochon_5",
      region: "seochon",
      type: "blind_gem",
      category: "한옥다실",
      name: "체부동 풍류관 (風流館)",
      image: "images/gem_anguk_3.jpg",
      address: "서울 종로구 필운대로1길 8",
      coords: [37.5772, 126.9702],
      disclosureTier: "tier_reservation",
      freshnessDate: "2026-09-08",
      verificationStatus: "현장 실사 완료",
      distanceFromHotspot: "경복궁역 2번 출구에서 골목 도보 3분 (220m)",
      aiMentionRate: 5,
      curationMood: "어둠 속에서 피어나는 한국의 차와 디저트",
      sourceBreakdown: { instagram: 40, blog: 45, official: 15 },
      story: "서촌 한옥의 고즈넉한 그늘과 묵직한 목재 향 속에서, 계절별 블렌딩 티와 전통 한식을 모던하게 풀어낸 페어링 디저트를 선사하는 다도 살롱.",
      whyMissed: "간판이 작고 조용한 분위기를 지향하여 대규모 바이럴 대상에서 제외됨.",
      etiquette: ["🤫 소음 자제 (조용한 대화)", "🍵 1인 1음료/세트 주문"]
    },

    // === [서촌 사각지대 - Local Life 일상 인프라] ===
    {
      id: "life_seochon_1",
      region: "seochon",
      type: "local_life",
      category: "생활유산/세탁소",
      name: "누하동 백조세탁소",
      address: "서울 종로구 필운대로 35",
      coords: [37.5798, 126.9682],
      disclosureTier: "tier_fuzzy",
      freshnessDate: "2026-09-08",
      verificationStatus: "서울 미래유산 후보지 실사",
      aiMentionRate: 0,
      curationMood: "40년 세월을 다림질해온 서촌의 산증인",
      story: "간판의 빛바랜 글씨처럼 40년 넘게 서촌 주민들의 옷가지를 매만져온 동네 터줏대감 세탁소.",
      whyMissed: "관광 데이터셋에 완전 배제된 생활 필수 시설",
      etiquette: ["👕 주민 생활권 존중", "📸 무단 내부 촬영 금지"]
    },
    {
      id: "life_seochon_2",
      region: "seochon",
      type: "local_life",
      category: "생활유산/철물",
      name: "통인동 한일상사 & 철물",
      address: "서울 종로구 자하문로 40",
      coords: [37.5815, 126.9718],
      disclosureTier: "tier_fuzzy",
      freshnessDate: "2026-09-08",
      verificationStatus: "로컬 상권 실재 확인",
      aiMentionRate: 0,
      curationMood: "골목 한옥의 못 하나, 문고리 하나 고쳐주는 동네 보물창고",
      story: "서촌 한옥을 수리하는 오래된 장인들과 주민들이 매일 드나드는 생활의 근간.",
      whyMissed: "관광 데이터셋에 완전 배제된 생활 필수 시설",
      etiquette: ["🛍️ 로컬 상업 존중", "📸 상점 운영 방해 금지"]
    }
  ],

  // AI 추천 출처 유형 가이드
  sourceTypes: {
    instagram: { name: "SNS / 인스타그램", color: "#FF3366", desc: "시각적 연출, 인생샷, 대기열 중심 바이럴 데이터" },
    viralBlog: { name: "체험단 / 블로그", color: "#00C73C", desc: "협찬·상위 노출 최적화 포스팅 및 맛집 키워드" },
    mediaBroadcast: { name: "TV방송 / 언론", color: "#3B82F6", desc: "예능/다큐 방영으로 고정된 관광 명소 클리셰" },
    officialOpenData: { name: "공공데이터 / 문화재", color: "#8B5CF6", desc: "역사문화 기록, 등록문화재, 지자체 인허가 데이터" }
  },

  // 다국어 i18n 번역 사전 (KO, EN, JA, ZH)
  i18n: {
    ko: {
      brandTitle: "AI 사각지대",
      brandSub: "안국·서촌",
      explorerMode: "🌿 여행자",
      policyMode: "🏛️ 정책관",
      redzoneOpen: "북촌 관람가능",
      redzoneClosed: "북촌 방문제한",
      regionAll: "전체",
      regionAnguk: "안국",
      regionSeochon: "서촌",
      searchPlaceholder: "AI 질문 또는 핫플 검색 (예: 런던베이글, 찻집)",
      searchBtn: "분석",
      tabDual: "대조 피드",
      tabXai: "AI 편향 분석",
      tabArchive: "골목 아카이브",
      tabStamp: "스탬프 투어",
      walkNav: "🚶 보행 길안내",
      kakaoMap: "📱 카카오맵",
      naverMap: "🗺️ 네이버지도",
      audioListen: "🔊 오디오 도슨트 듣기",
      audioStop: "⏹️ 재생 중지",
      checkInBtn: "📍 현장 체크인",
      checkedIn: "✓ 체크인 완료",
      stampTitle: "안국·서촌 골목길 수호자 스탬프 투어"
    },
    en: {
      brandTitle: "AI Blind Spot",
      brandSub: "Anguk · Seochon",
      explorerMode: "🌿 Explorer",
      policyMode: "🏛️ Policy",
      redzoneOpen: "Bukchon Open",
      redzoneClosed: "Bukchon Restricted",
      regionAll: "All",
      regionAnguk: "Anguk",
      regionSeochon: "Seochon",
      searchPlaceholder: "Search AI prompts or hotspots (e.g. Bagel, Tea house)",
      searchBtn: "Analyze",
      tabDual: "Dual Feed",
      tabXai: "XAI Bias Report",
      tabArchive: "Alley Archive",
      tabStamp: "Stamp Tour",
      walkNav: "🚶 Walking Guide",
      kakaoMap: "📱 KakaoMap",
      naverMap: "🗺️ Naver Map",
      audioListen: "🔊 Listen Audio Guide",
      audioStop: "⏹️ Stop Audio",
      checkInBtn: "📍 Check-in Here",
      checkedIn: "✓ Checked-in",
      stampTitle: "Anguk · Seochon Alley Stamp Tour"
    },
    ja: {
      brandTitle: "AI 死角地帯",
      brandSub: "安国・西村",
      explorerMode: "🌿 旅行者",
      policyMode: "🏛️ 政策官",
      redzoneOpen: "北村 観覧可能",
      redzoneClosed: "北村 訪問制限",
      regionAll: "全体",
      regionAnguk: "安国",
      regionSeochon: "西村",
      searchPlaceholder: "AIの質問または人気店検索 (例: ベーグル, 茶屋)",
      searchBtn: "分析",
      tabDual: "対比フィード",
      tabXai: "AI偏向分析",
      tabArchive: "路地アーカイブ",
      tabStamp: "スタンプツアー",
      walkNav: "🚶 徒歩案内",
      kakaoMap: "📱 カカオマップ",
      naverMap: "🗺️ ネイバー地図",
      audioListen: "🔊 音声ガイドを聞く",
      audioStop: "⏹️ 停止",
      checkInBtn: "📍 現地チェックイン",
      checkedIn: "✓ チェックイン済み",
      stampTitle: "安国・西村 路地裏スタンプツアー"
    },
    zh: {
      brandTitle: "AI 盲区探索",
      brandSub: "安国·西村",
      explorerMode: "🌿 旅行者",
      policyMode: "🏛️ 政策官",
      redzoneOpen: "北村 开放参观",
      redzoneClosed: "北村 限制入内",
      regionAll: "全部",
      regionAnguk: "安国",
      regionSeochon: "西村",
      searchPlaceholder: "搜索 AI 提问或热门地标 (例: 贝果, 茶馆)",
      searchBtn: "分析",
      tabDual: "对照流",
      tabXai: "AI 偏见分析",
      tabArchive: "胡同档案",
      tabStamp: "印章之旅",
      walkNav: "🚶 步行导航",
      kakaoMap: "📱 Kakao 地图",
      naverMap: "🗺️ Naver 地图",
      audioListen: "🔊 播放语音导览",
      audioStop: "⏹️ 停止播放",
      checkInBtn: "📍 现场打卡",
      checkedIn: "✓ 打卡成功",
      stampTitle: "安国·西村 深度胡同打卡之旅"
    }
  },

  // 디지털 스탬프 투어 및 뱃지 정의
  stampTour: {
    badges: [
      { id: "badge_tea", name: "🍵 고요한 다도 마스터", reqCount: 1, desc: "안국/서촌의 숨은 전통 다실 1곳 방문" },
      { id: "badge_book", name: "📚 골목 인문학 산책자", reqCount: 2, desc: "오래된 독립 서점 2곳 방문" },
      { id: "badge_craft", name: "🧵 전통 장인 계승자", reqCount: 3, desc: "공방 및 생활유산 3곳 방문" },
      { id: "badge_guardian", name: "🌿 북촌·서촌 골목 수호자", reqCount: 5, desc: "사각지대 5곳 이상 방문 및 분산 기여" }
    ]
  }
};

if (typeof window !== 'undefined') {
  window.BLIND_SPOT_DATA = BLIND_SPOT_DATA;
}
if (typeof globalThis !== 'undefined') {
  globalThis.BLIND_SPOT_DATA = BLIND_SPOT_DATA;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = BLIND_SPOT_DATA;
}


