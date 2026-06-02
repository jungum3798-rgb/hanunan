
import axios from 'axios';




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

//----------api 정의---------------
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

let isAuthAlertShowing = false;

api.interceptors.response.use(
  (response) => {
    // 200번대 정상 응답은 그대로 리턴
    return response;
  },
  (error) => {
    // 백엔드 SecurityConfig의 EntryPoint가 뱉은 401 + TOKEN_EXPIRED 조건 검증
    if (error.response?.status === 401) {
      if (isAuthAlertShowing) {
        return new Promise(() => {}); // 뒤쪽 에러들이 컴포넌트를 터트리지 않게 대기 상태로 고립
      }

      // 🚩 첫 번째 401 에러 진입 시 플래그를 true로 잠금!
      isAuthAlertShowing = true;

      alert("인증 세션이 만료되어 로그아웃되었습니다. 다시 로그인해 주세요.");
        
        // 인증 관련 토큰 및 유저 정보 속성을 로컬 스토리지에서 완벽히 제거
        localStorage.removeItem('token');
        localStorage.removeItem('user'); // 유저 정보가 들어있는 key도 함께 청소
        
        // 강제 페이지 이동 대신, 현재 화면을 새로고침하여 '비로그인 UI'로 전환
        window.location.reload();
      
      // 더 이상 뒤쪽 컴포넌트 코드가 실행되지 않도록 여기서 요청 중단
      return new Promise(() => {}); 
    }
    // 401 외의 일반 에러(400, 500 등)들은 호출한 컴포넌트의 catch문으로 그대로 던짐
    return Promise.reject(error);
  }
);


//----------------기상 재난문자--------------------
export interface WeatherAlert {
  id: number;
  sn: string;
  messageContent: string;
  rcptnRgnNm: string;
  dstSeNm: string;
  alertLevel: string;
  createdAt: string;
}
export interface Region {
  region1: string; // 시/도   
  region2: string; // 시/군/구 
  region3: string; // 읍/면/동 
}
export interface WeatherAlertsResponse {
  region: Region;
  alerts: WeatherAlert[];
}

export async function getWeatherAlertsByLocation(
  lat: number,
  lng: number
): Promise<WeatherAlertsResponse | null> {
  try {
    const response = await api.get<WeatherAlertsResponse>(
      '/api/weather/alerts',
      { params: { lat, lng } }
    );
    return response.data;
  } catch (error) {
    return null;
  }
}

//---------------제보 api--------------
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
  formData.append('pinLatitude', String(data.pinLatitude)|| "");
  formData.append('pinLongitude', String(data.pinLongitude) || "");
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
  if (typeof window !== 'undefined' && !localStorage.getItem('token')) {
    return []; 
  }

  const response = await api.get<Report[]>('/api/reports/liked');
  return response.data;
};

// //----------------------댓글 피드 (Citizen Feed)------------
// export type FeedCommentType = 'DISASTER' | 'SAFETY' | 'REPORT';

// export interface FeedComment {
//   id: number;
//   type: FeedCommentType;
//   content: string;
//   userId: number;
//   userName: string | null;
//   createdAt: string;
// }

// /** @deprecated FeedComment 사용 */
// export type ReportComment = FeedComment;

// export const getCommentsByType = async (type: FeedCommentType): Promise<FeedComment[]> => {
//   const response = await api.get<FeedComment[]>('/api/comments', { params: { type } });
//   return response.data;
// };

// export const getAllComments = async (): Promise<FeedComment[]> => {
//   const types: FeedCommentType[] = ['DISASTER', 'SAFETY', 'REPORT'];
//   const results = await Promise.all(types.map(getCommentsByType));
//   return results
//     .flat()
//     .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
// };

// export const createComment = async (type: FeedCommentType, content: string): Promise<FeedComment> => {
//   const response = await api.post<FeedComment>('/api/comments', { type, content });
//   return response.data;
// };

// export const deleteComment = async (commentId: number): Promise<void> => {
//   await api.delete(`/api/comments/${commentId}`);
// };

// export const getCommentAuthorName = (comment: FeedComment) =>
//   comment.userName?.trim() || `사용자${comment.userId}`;


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

interface CommentApiResponse {
  id: number;
  type: string;
  content: string;
  userId: number;
  userName: string;
  createdAt: string;
}

const mapCommentResponse = (comment: CommentApiResponse): ReportComment => ({
  id: comment.id,
  reportId: 0,
  userId: comment.userId,
  nickname: comment.userName,
  content: comment.content,
  imageUrl: null,
  createdAt: comment.createdAt,
  targetId: 0,
  targetType: comment.type as ReportComment['targetType'],
});

export const getSidebarComments = async (
  type: 'DISASTER' | 'SAFETY' | 'REPORT' = 'DISASTER',
): Promise<ReportComment[]> => {
  const response = await api.get<CommentApiResponse[]>('/api/comments', {
    params: { type },
  });
  return response.data.map(mapCommentResponse);
};

const COMMENT_MAP_TYPES: Array<'DISASTER' | 'SAFETY' | 'REPORT'> = [
  'DISASTER',
  'SAFETY',
  'REPORT',
];

export const getMyComments = async (userId: number): Promise<ReportComment[]> => {
  const responses = await Promise.all(
    COMMENT_MAP_TYPES.map((type) => getSidebarComments(type)),
  );

  return responses
    .flat()
    .filter((comment) => comment.userId === userId)
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
};




//-------------화재마커------------
//0512
export interface FireMarker {
  id: number;
  sn: string;
  messageContent: string;
  rcptnRgnNm: string;
  parsedAddress: string;
  latitude: number;
  longitude: number;
  createdAt: string;
  alertLevel?: string;
}

//-------------재난 알림 마커 (테러·붕괴·폭발·산사태)------------
export interface DisasterAlertMarker {
  id: number;
  sn: string;
  messageContent: string;
  rcptnRgnNm: string;
  parsedAddress: string;
  latitude: number;
  longitude: number;
  createdAt: string;
  alertLevel: string;
  disasterType: string;
}

export const connectSse = (
  onInit: (fireMarkers: FireMarker[], disasterMarkers: DisasterAlertMarker[]) => void,
  onFireMarker: (marker: FireMarker) => void,
  onDisasterMarker: (marker: DisasterAlertMarker) => void,
) => {
  const es = new EventSource(`${process.env.NEXT_PUBLIC_API_URL}/api/sse/subscribe`);

  es.addEventListener('init', (e) => {
    const data = JSON.parse(e.data);
    onInit(data.fireMarkers ?? [], data.disasterMarkers ?? []);
  });

  es.addEventListener('fire-marker', (e) => {
    onFireMarker(JSON.parse(e.data));
  });

  es.addEventListener('disaster-marker', (e) => {
    onDisasterMarker(JSON.parse(e.data));
  });

  return es;
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

//---------화재 마커 뉴스----------
export interface NewsArticle {
    title: string;
    link: string;
    naverLink: string;
    description: string;
    pubDate: string;
}

export async function getDisasterNews(disasterId: number): Promise<NewsArticle[]> {
    try {
        const response = await api.get<NewsArticle[]>(`/api/fire/${disasterId}/news`);
        return response.data; // NewsArticleDto[] 배열 반환
    } catch (error) {
        console.error(`재난 ID ${disasterId}의 뉴스 조회 실패:`, error);
        return []; // 에러 시 빈 배열 반환
    }
}

export async function getDisasterAlertNews(
  disasterId: number,
  disasterType: string,
): Promise<NewsArticle[]> {
  try {
    const response = await api.get<NewsArticle[]>(
      `/api/disaster/${disasterId}/news`,
      { params: { type: disasterType } },
    );
    return response.data;
  } catch (error) {
    console.error(`재난 알림 ID ${disasterId}(${disasterType}) 뉴스 조회 실패:`, error);
    return [];
  }
}


//------------기타 재난문자 뉴스---------

//-------------기타 재난문자 유튜브--------------

// 유튜브 비디오 응답 데이터 타입 정의
export interface YoutubeVideoDto {
  videoId: string;
  url: string;
  title: string;
  channelTitle: string;
  thumbnailUrl: string;
  publishedAt: string;
}

/**
 * 재난 ID와 유형별로 관련 유튜브 뉴스를 최대 10건 가져옵니다.
 * @param id 재난 ID (마커 클릭 시 전달되는 ID)
 * @param type 재난 유형 (예: "화재", "붕괴", "테러", "폭발", "산사태")
 */
export const getDisasterYoutubeNews = async (
  id: number,
  type: string
): Promise<YoutubeVideoDto[]> => {
  try {
    const response = await api.get<YoutubeVideoDto[]>(`/api/disaster/${id}/youtube`, {
      params: { type },
    });
    return response.data;
  } catch (error) {
    console.error("[YouTube API Error]:", error);
    return []; // 에러 발생 시 빈 배열 반환
  }
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

 