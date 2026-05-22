
import axios from 'axios';

//----------- 카카오 맵 API 타입을 위한 선언 (에러 방지)----------------
declare global {
  interface Window {
    kakao: any;
  }
}

//--------------재난문자 모킹-------------------
export interface DisasterMessage {
  id: number;
  msgId: string;
  originalText: string;
  category: string;
  extractedLocation: string;
  latitude: number;
  longitude: number;
  hasLocation: boolean;
  aiSummary: string;
  severity: 'LOW' | 'MID' | 'HIGH';
  sentAt: string;
}
const MOCK_DATA: DisasterMessage[] = [
  {
    id: 1,
    msgId: "MSG_2026_001",
    originalText: "[광주광역시] 오늘 14시부로 동구 지역 호우경보 발효. 하천 인근 주민들은 대피 바랍니다.",
    category: "폭우",
    extractedLocation: "광주광역시 동구 조선대길 146",
    latitude: 35.143,
    longitude: 126.924,
    hasLocation: true,
    aiSummary: "고지대로 이동하세요. 하수관 역류 및 인근 저지대 주택 침수가 예상됩니다.",
    severity: "HIGH",
    sentAt: new Date().toISOString(),
  },
  {
    id: 2,
    msgId: "MSG_2026_002",
    originalText: "[동구청] 서석동 인근 상가 화재 발생. 주변 도로 통제 중이니 우회 바랍니다.",
    category: "화재",
    extractedLocation: "광주광역시 동구 조선대길 146",
    latitude: 35.146,
    longitude: 126.928,
    hasLocation: true,
    aiSummary: "젖은 수건을 지참하고, 비상계단만 이용하세요. 현재 유독가스가 확산 중입니다.",
    severity: "HIGH",
    sentAt: new Date().toISOString(),
  },
  {
    id: 3,
    msgId: "MSG_2026_003",
    originalText: "[산림청] 동구 지산동 인근 산불 주의보 발령. 입산을 자제 바랍니다.",
    category: "산불",
    extractedLocation: "광주광역시 동구 지산동",
    latitude: 35.148,
    longitude: 126.942,
    hasLocation: true,
    aiSummary: "지산유원지 인근 산불 확산 우려. 등산객은 즉시 하산하십시오.",
    severity: "MID",
    sentAt: new Date().toISOString(),
  }
];
export const getDisasterMessages = async (): Promise<DisasterMessage[]> => {
  return new Promise((resolve) => {
    setTimeout(() => resolve(MOCK_DATA), 300);
  });
};
//-----------------안전 시설-----------------

export type SafetyFacilityType = 'AED' | 'FIRE_WATER' | 'RESCUE_BOX' | 'SHELTER';

export interface SafetyFacility {
  id: Number;
  type: SafetyFacilityType;   // 시설 종류 (예: "AED", "SHELTER", "FIRE_WATER", "RESCUE_BOX")
  name: string;               // 시설명 (REARE_NM / MNG_INST_NM 등 백엔드가 매핑한 이름)
  address: string;            // 주소 (RONA_DADDR / ADDR)
  latitude: number;           // 위도 (LAT)
  longitude: number;          // 경도 (LOT)
  phone?: string | null;      //관리자 번호
}

export interface GetSafetyFacilitiesParams {
  swLat: number;         // 지도 남서 위도
  swLng: number;         // 지도 남서 경도
  neLat: number;         // 지도 북동 위도
  neLng: number;         // 지도 북동 경도
  types?: string;        // 타입 필터 (예: "AED" 또는 "AED,RESCUE_BOX")
}

export const getSafetyFacilities = async (params: GetSafetyFacilitiesParams): Promise<SafetyFacility[]> => {
  const response = await api.get<SafetyFacility[]>('/api/safety/facilities', {
    params: {
      swLat: params.swLat,
      swLng: params.swLng,
      neLat: params.neLat,
      neLng: params.neLng,
      types: params.types // 백엔드가 문자열 포맷(AED,RESCUE_BOX)을 원하므로 가이드대로 전달
    }
  });
  
  return response.data;
};

//----------------기상특보 모킹--------------------
export interface WeatherAlert {
  id: number;
  alertId: string;
  regionName: string;
  latitude: number;
  longitude: number;
  boundaryGeojson: string;
  alertType: string;
  severity: 'LOW' | 'MID' | 'HIGH';
  startAt: string;
  endAt: string | null;
  originalText?: string; // 상세창 표시용 추가
  aiSummary?: string;    // 상세창 표시용 추가
}

export const mockWeatherAlerts: WeatherAlert[] = [
  {
    id: 1,
    alertId: "KMA_20260403_001",
    regionName: "광주광역시 동구",
    latitude: 35.143,
    longitude: 126.924,
    boundaryGeojson: JSON.stringify({
      type: "Polygon",
      coordinates: [[
        [126.920, 35.140], [126.930, 35.140],
        [126.930, 35.148], [126.920, 35.148],
        [126.920, 35.140]
      ]]
    }),
    alertType: "강풍주의보",
    severity: "MID",
    startAt: "2026-04-03T10:00:00",
    endAt: null,
    originalText: "[기상특보] 광주지역 강풍주의보 발효 중. 시설물 관리 유의.",
    aiSummary: "광주 동구 지역에 강한 바람이 예상됩니다. 간판 및 시설물 고정에 유의하세요."
  }
];

export const getWeatherAlerts = async (): Promise<WeatherAlert[]> => {
  return new Promise((resolve) => {
    setTimeout(() => resolve(mockWeatherAlerts), 300);
  });
};


//-------------소방서------------------
export interface FireStation {
  id: number;
  frstCntrid: string;
  frstCetrNm: string;
  centerLatitude: number;
  centerLongitude: number;
  boundaryGeojson: string;
}

export interface FireDailyStat {
  id: number;
  ocrnYmd: string;
  fireRcptMnb: number; // 화재 접수 건수
  fireProgMnb: number; // 화재 진행 건수
  stnEndMnb: number;   // 상황 종료 건수
  slfExtshMnb: number; // 자체 진화 건수
}

// 소방서 목록 모킹 데이터
const MOCK_FIRE_STATIONS: FireStation[] = [
  {
    id: 101,
    frstCntrid: "6410111",
    frstCetrNm: "광주동부소방서",
    centerLatitude: 35.151,
    centerLongitude: 126.918,
    boundaryGeojson: JSON.stringify({
      type: "Polygon",
      coordinates: [[
        [126.910, 35.145], [126.925, 35.145],
        [126.925, 35.155], [126.910, 35.155],
        [126.910, 35.145]
      ]]
    })
  }
];

// -----------------특정 소방서 통계 모킹 데이터-----------------------
const MOCK_FIRE_STATS: Record<number, FireDailyStat> = {
  101: {
    id: 1,
    ocrnYmd: "2026-04-03",
    fireRcptMnb: 5,
    fireProgMnb: 1, // 현재 진행 중인 화재 1건
    stnEndMnb: 3,
    slfExtshMnb: 1
  }
};

export const getFireStations = async (): Promise<FireStation[]> => {
  return new Promise((resolve) => setTimeout(() => resolve(MOCK_FIRE_STATIONS), 300));
};

export const getFireStationStats = async (id: number): Promise<FireDailyStat> => {
  return new Promise((resolve) => setTimeout(() => resolve(MOCK_FIRE_STATS[id]), 200));
};




//---------------제보 api--------------

const api = axios.create({
  baseURL: `${process.env.NEXT_PUBLIC_API_URL}`, 
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token'); 
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

export interface Report {
  id: number;
  userId: number;
  nickname: string;
  type: string;          
  description: string;

  pinLatitude: number;         
  pinLongitude: number;        

  userLatitude: number;   
  userLongitude: number;     
  userAccuracyMeters: number; // GPS 정확도 오차 범위
  distanceMeters: number;     // 사고 중심지 또는 마커 간의 계산된 거리
  gpsVerified: boolean;       // 위치 인증 여부
  
  status: string;             // 'ACTIVE' | 'HIDDEN' | 'RESOLVED' 등
  likeCount: number;          
  reportCount: number;        // 허위 제보 신고 누적 수
  imageUrls: string[];       
  createdAt: string;        
}

export type ReportResponse = Report;

export interface ReportCreateRequest {
  type: string;
  description: string;
  pinLatitude: number;
  pinLongitude: number;
  userLatitude: number;
  userLongitude: number;
  userAccuracyMeters: number;
  images?: File[];           
}

export interface ReportUpdateRequest {
  type: string;
  description: string;
}

export const getReports = async (): Promise<ReportResponse[]> => {
  const response = await api.get<ReportResponse[]>('/api/reports');
  return response.data;
};

export const createReport = async (data: ReportCreateRequest): Promise<ReportResponse> => {
  const formData = new FormData();
  
  formData.append('type', data.type);
  formData.append('description', data.description);
  formData.append('pinLatitude', String(data.pinLatitude));
  formData.append('pinLongitude', String(data.pinLongitude));
  formData.append('userLatitude', String(data.userLatitude));
  formData.append('userLongitude', String(data.userLongitude));
  formData.append('userAccuracyMeters', String(data.userAccuracyMeters ?? 0));

  if (data.images && data.images.length > 0) {
    data.images.forEach((file) => {
      formData.append('images', file); 
    });
  }

  
  const response = await api.post<ReportResponse>('/api/reports', formData);
  
  return response.data;
};

export const updateReport = async (
  reportId: number,
  data: ReportUpdateRequest
): Promise<ReportResponse> => {
  
  const formData = new FormData();
  
  formData.append('type', data.type.trim());
  formData.append('description', data.description.trim());

  const response = await api.patch<ReportResponse>(`/api/reports/${reportId}`, {
    type: data.type.trim(),
    description: data.description.trim(),
  });
  
  return response.data;
};

export const deleteReport = async (reportId: number): Promise<boolean> => {
  try {
    const response = await api.delete(`/api/reports/${reportId}`);
    return response.status === 200 || response.status === 204;
  } catch (error) {
    console.error("제보 삭제 API 에러:", error);
    throw error;
  }
};

export const toggleLikeReport = async (reportId: number): Promise<boolean> => {
  const response = await api.post<{ liked: boolean }>(`/api/reports/${reportId}/like`);
  return response.data.liked;
};

export const flagReport = async (reportId: number): Promise<ReportResponse> => {
  const response = await api.post<ReportResponse>(`/api/reports/${reportId}/flag`);
  return response.data;
};

export const getMyLikedReports = async (): Promise<Report[]> => {
  const response = await api.get<Report[]>('/api/reports/liked');
  return response.data;
};

//----------------------댓글피드------------
export interface ReportComment {
  id: number;
  reportId: number;
  userId: number;
  nickname: string;
  content: string;
  imageUrl?: string | null;
  createdAt: string;
  targetId: number;
  targetType: 'DISASTER' | 'WEATHER' | 'FIRE' | 'SAFETY' | 'REPORT';
}


let MOCK_SIDEBAR_COMMENTS: ReportComment[] = [
  {
    id: 1,
    reportId: 0,
    userId: 42,
    nickname: "지나가던시민",
    content: "연기가 너무 심해요. 다들 조심하세요.",
    imageUrl: null,
    createdAt: "2026-04-04T20:20:00",
    targetId: 2,
    targetType: 'DISASTER'
  },
  {
    id: 2,
    reportId: 0,
    userId: 10,
    nickname: "홍길동",
    content: "현재 소방차 도착해서 진압 중입니다!",
    imageUrl: null,
    createdAt: "2026-04-04T20:15:00",
    targetId: 2,
    targetType: 'DISASTER'
  }
];

export const getSidebarComments = async (targetId?: number, targetType?: string): Promise<ReportComment[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      if (targetId && targetType) {
        const filtered = MOCK_SIDEBAR_COMMENTS.filter(
          (c) => c.targetId === targetId && c.targetType === targetType
        );
        resolve(filtered);
      } else {
        resolve(MOCK_SIDEBAR_COMMENTS);
      }
    }, 300);
  });
};

export const createSidebarComment = async (
  content: string,
  userId: number,
  targetId: number,
  targetType: 'DISASTER' | 'WEATHER' | 'FIRE' | 'SAFETY' | 'REPORT'
): Promise<ReportComment> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const newComment: ReportComment = {
        id: Date.now(),
        reportId: 0,
        userId: userId,
        nickname: "사용자",
        content: content,
        imageUrl: null,
        createdAt: new Date().toISOString(),
        targetId: targetId,
        targetType: targetType
      };
      MOCK_SIDEBAR_COMMENTS = [newComment, ...MOCK_SIDEBAR_COMMENTS];
      resolve(newComment);
    }, 200);
  });
};

export const deleteSidebarComment = async (commentId: number): Promise<boolean> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      MOCK_SIDEBAR_COMMENTS = MOCK_SIDEBAR_COMMENTS.filter((c) => c.id !== commentId);
      resolve(true);
    }, 200);
  });
};





//-------------화재마커------------
//0512
export interface FireMarker {
  id: number;
  sn: string;
  messageContent: string;
  rcptnRgnNm: string;
  parsedAddress?: string | null;
  latitude: number;
  longitude: number;
  createdAt: string;
}
//0512
export const fetchFireMarkers = async (): Promise<FireMarker[]> => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/fire/markers`);
  if (!response.ok) throw new Error('화재 마커를 불러오는데 실패했습니다.');
  return response.json();
};

export const testFireMarker = async (message: string, rcptnRgnNm?: string): Promise<FireMarker> => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/fire/test`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, rcptnRgnNm: rcptnRgnNm || '' }),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(errText || '테스트 마커 추가 실패');
  }
  return res.json();
};

export interface DisasterExtractResult {
  time: string | null;
  location: string | null;
  lat: number | null;
  lng: number | null;
}

export const extractDisasterInfo = async (message: string): Promise<DisasterExtractResult> => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/disaster/extract`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message }),
  });
  if (!res.ok) throw new Error('재난문자 분석 실패');
  return res.json();
};




//----------로그인----------

export interface LoginResponse {
  id: number;
  token: string;
  nickname?: string;
  email: string;
}

export const googleLogin = async (code: string): Promise<LoginResponse> => {
  const response = await api.post<LoginResponse>('/member/google/doLogin', { code });
  return response.data;
};

export const kakaoLogin = async (code: string): Promise<LoginResponse> => {
  const response = await api.post<LoginResponse>('/member/kakao/doLogin', { code });
  return response.data;
};

