'use client';

import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import Script from 'next/script';
import { DisasterMessage, WeatherAlert, FireStation, SafetyFacility, FireMarker, Report } from '@/services/api';

const KAKAO_SDK_URL = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${process.env.NEXT_PUBLIC_KAKAO_MAP_KEY}&autoload=false&libraries=services,clusterer`;

export interface KakaoMapHandle {
  moveToLocation: (lat: number, lng: number) => void;
}

interface KakaoMapProps {
  center: { lat: number; lng: number };
  activeCategory: "DISASTER" | "SAFETY" | "REPORT";
  disasterData: DisasterMessage[];
  weatherAlerts: WeatherAlert[];
  fireStations: FireStation[];
  safetyFacilities: SafetyFacility[];
  reportMarkers: Report[];
  fireMarkers: FireMarker[];
  onSelectItem: (item: any, type: 'DISASTER' | 'WEATHER' | 'FIRE' | 'SAFETY' | 'REPORT') => void;
  fetchLatestReports: () => void;
  fetchSafetyData: (bounds: { swLat: number; swLng: number; neLat: number; neLng: number }) => void;
}

const REPORT_TYPE: Record<string, { icon: string; label: string }> = {
  화재: { icon: '🔥', label: '화재' },
  기상: { icon: '🌧️', label: '기상' }
};

const KakaoMap = forwardRef<KakaoMapHandle, KakaoMapProps>((props, ref) => {
  const { center, activeCategory, disasterData, weatherAlerts, fireStations, safetyFacilities, reportMarkers, onSelectItem, fireMarkers, fetchLatestReports, fetchSafetyData } = props;
  
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const overlaysRef = useRef<any[]>([]);
  const polygonsRef = useRef<any[]>([]);
  const myLocationOverlayRef = useRef<any>(null);
  
  // 부모 컴포넌트에서 호출할 수 있도록 함수 노출
  useImperativeHandle(ref, () => ({
    moveToLocation: (lat: number, lng: number) => {
      if (mapInstance.current) {
        const { kakao } = window as any;
        const moveLatLon = new kakao.maps.LatLng(lat, lng);
        mapInstance.current.panTo(moveLatLon); // 부드럽게 이동
      }
    }
  }));

  // 시설별 클러스터러 관리
  const disasterClusterer = useRef<any>(null);
  const shelterClusterer = useRef<any>(null);   
  const aedClusterer = useRef<any>(null);       
  const fireWaterClusterer = useRef<any>(null);   
  const rescueBoxClusterer = useRef<any>(null);
  const reportClusterer = useRef<any>(null);


  // 시간 기반 화재 단계 판별 함수
  const getFireStage = (createdAt: string) => {
    const now = new Date();
    const created = new Date(createdAt);
    const diffHours = (now.getTime() - created.getTime()) / (1000 * 60 * 60);

    if (diffHours <= 2) return 'active';     // 0~2시간: 진행 중 (빨강 + 깜빡임)
    if (diffHours <= 6) return 'cooling';    // 2~6시간: 정리 중 (주황)
    if (diffHours <= 12) return 'ended';     // 6~12시간: 종료 추정 (회색)
    return 'deleted';                        // 12시간 이상: 삭제
  };

  // 안전시설 데이터 로드
  const triggerFetchSafetyData = () => {
    if (!mapInstance.current) return;
    const bounds = mapInstance.current.getBounds();
    const swLatLng = bounds.getSouthWest();
    const neLatLng = bounds.getNorthEast();

    // 내부에서 결국 부모의 fetchSafetyData를 실행
    fetchSafetyData({
      swLat: swLatLng.getLat(),
      swLng: swLatLng.getLng(),
      neLat: neLatLng.getLat(),
      neLng: neLatLng.getLng()
    });
  };

  const handleMoveToCurrentLocation = () => {
    const { kakao } = window as any;
    if (navigator.geolocation && mapInstance.current) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const locPosition = new kakao.maps.LatLng(pos.coords.latitude, pos.coords.longitude);
          mapInstance.current.panTo(locPosition);
          if (myLocationOverlayRef.current) myLocationOverlayRef.current.setMap(null);
          const content = `<div style="width:18px; height:18px; background:#4C5CA4; border:3px solid white; border-radius:50%; box-shadow:0 0 10px rgba(76,92,164,0.5);"></div>`;
          myLocationOverlayRef.current = new kakao.maps.CustomOverlay({
            position: locPosition,
            content,
            yAnchor: 0.5,
          });
          myLocationOverlayRef.current.setMap(mapInstance.current);
          setTimeout(triggerFetchSafetyData, 300);  // 현위치로 이동했을 때도 주변 안전시설 데이터를 새로 고치도록 트리거
        },
        () => alert("위치 정보를 가져올 수 없습니다.")
      );
    }
  };

  const initMap = () => {
    const { kakao } = window as any;
    kakao.maps.load(() => {
      if (!mapRef.current) return;
      mapInstance.current = new kakao.maps.Map(mapRef.current, {
        center: new kakao.maps.LatLng(center.lat, center.lng),
        level: 5
      });

      const createClusterer = (color: string) => new kakao.maps.MarkerClusterer({
        map: mapInstance.current,
        averageCenter: true,
        minLevel: 6,
        styles: [{
          width: '40px', height: '40px', background: color,
          borderRadius: '20px', color: '#fff', textAlign: 'center',
          lineHeight: '40px', fontSize: '12px', fontWeight: 'bold'
        }]
      });

      disasterClusterer.current = createClusterer('rgba(255, 75, 75, 0.9)');
      aedClusterer.current = createClusterer('rgba(255, 152, 0, 0.9)');   
      shelterClusterer.current = createClusterer('rgba(10, 177, 54, 0.9)'); 
      fireWaterClusterer.current = createClusterer('rgba(31, 121, 255, 0.9)'); 
      rescueBoxClusterer.current = createClusterer('rgba(207, 46, 29, 0.9)');
      reportClusterer.current = createClusterer('rgba(255, 138, 0, 0.9)');

      handleMoveToCurrentLocation();
      kakao.maps.event.addListener(mapInstance.current, 'click', () => onSelectItem(null, activeCategory));
      
      //사용자가 드래그/확대하여 지도가 완전히 멈췄을 때 실시간 바운즈 안전시설 데이터 요청 연동
      // kakao.maps.event.addListener(mapInstance.current, 'idle', () => {
      //   if (!mapInstance.current) return;
      //   const bounds = mapInstance.current.getBounds();
      //   const swLatLng = bounds.getSouthWest();
      //   const neLatLng = bounds.getNorthEast();

      //   // 부모 컴포넌트(DashboardPage)가 공급해 준 API 호출 함수 실행 
      //   fetchSafetyData({
      //     swLat: swLatLng.getLat(),
      //     swLng: swLatLng.getLng(),
      //     neLat: neLatLng.getLat(),
      //     neLng: neLatLng.getLng()
      //   });
      // });
      // 사용자가 드래그/확대하여 지도가 완전히 멈췄을 때 작동
      kakao.maps.event.addListener(mapInstance.current, 'idle', triggerFetchSafetyData);
      
      // 지도 생성 완료 직후, 최초 1회 강제로 주변 안전시설 데이터를 불러오기
      triggerFetchSafetyData();
      renderItems();
    });
  };

  const renderItems = () => {
    const { kakao } = window as any;
    if (!mapInstance.current) return;

    // 1. 기존 폴리곤 및 오버레이 제거
    [...overlaysRef.current, ...polygonsRef.current].forEach(item => item.setMap(null));
    overlaysRef.current = [];
    polygonsRef.current = [];

    // 2. 모든 클러스터러 비우기
    [disasterClusterer, shelterClusterer, aedClusterer, fireWaterClusterer, rescueBoxClusterer, reportClusterer]
      .forEach(ref => ref.current?.clear());

    // 3. 클러스터러 바구니용 순수 Marker 배열 생성
    const disasterMarkers: any[] = [];
    const shelterMarkers: any[] = []; //SHELTER
    const aedMarkers: any[] = []; //AED
    const fireWaterMarkers: any[] = []; //FIRE_WATER
    const rescueBoxMarkers: any[] = []; //RESCUE_BOX
    const addreportMarkers: any[] = [];

    if (activeCategory === 'DISASTER') {
      // 일반 재난문자 데이터
      disasterData.forEach(data => {
        const pos = new kakao.maps.LatLng(data.latitude, data.longitude);
        const content = document.createElement('div');
        content.innerHTML = `<div style="cursor:pointer; width:30px; height:30px; background:white; border-radius:50%; border:3px solid #FF4B4B; display:flex; align-items:center; justify-content:center; font-size:14px; box-shadow:0 2px 8px rgba(0,0,0,0.3);">⚠️</div>`;
        content.onclick = (e) => { e.stopPropagation(); onSelectItem(data, 'DISASTER'); };
        
        const overlay = new kakao.maps.CustomOverlay({ position: pos, content, yAnchor: 0.5, zIndex: 10 });
        disasterMarkers.push(overlay);
        overlaysRef.current.push(overlay);
      });

      fireMarkers.forEach(fire => {
        const stage = getFireStage(fire.createdAt);
        const pos = new kakao.maps.LatLng(fire.latitude, fire.longitude);

        const color = stage === 'active' ? '#FF4B4B' : stage === 'cooling' ? '#FF9800' : '#757575';
        const isPulse = stage === 'active' ? 'fire-pulse' : '';

        const content = document.createElement('div');
        content.className = `fire-marker-container ${isPulse}`;
        content.innerHTML = `
          <div style="cursor:pointer; width:34px; height:34px; background:${color}; border:3px solid white; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:18px; box-shadow:0 4px 12px rgba(0,0,0,0.4); transition: all 0.3s;">
            🔥
          </div>
        `;
          
        content.onclick = (e) => { 
          e.stopPropagation(); 
          const processedFire = {
            ...fire,
            isFirePipeline: true,
            uniqueKey: `rt-fire-${fire.id}`,
            msgCn: fire.messageContent,
            locationName: fire.parsedAddress || fire.rcptnRgnNm,
            fireStage: stage
          };
          onSelectItem(processedFire, 'DISASTER'); 
        };

        const overlay = new kakao.maps.CustomOverlay({ position: pos, content, yAnchor: 0.5, zIndex: 20 });
        disasterMarkers.push(overlay);
        overlaysRef.current.push(overlay);
      });

      weatherAlerts.forEach(alert => {
        try {
          const alertColor = alert.severity === 'HIGH' ? '#FF0000' : alert.severity === 'MID' ? '#FF9800' : '#FFD700';
          const path = JSON.parse(alert.boundaryGeojson).coordinates[0].map((c: any) => new kakao.maps.LatLng(c[1], c[0]));
          const poly = new kakao.maps.Polygon({
            path, strokeWeight: 3, strokeColor: alertColor, fillColor: alertColor, fillOpacity: 0.15, clickable: true
          });
          kakao.maps.event.addListener(poly, 'click', () => {
            kakao.maps.event.preventMap();
            onSelectItem(alert, 'WEATHER');
          });
          poly.setMap(mapInstance.current);
          polygonsRef.current.push(poly);
        } catch (e) {}
      });

      fireStations.forEach(station => {
        try {
          const path = JSON.parse(station.boundaryGeojson).coordinates[0].map((c: any) => new kakao.maps.LatLng(c[1], c[0]));
          const poly = new kakao.maps.Polygon({
            path, strokeWeight: 3, strokeColor: '#3954AA', fillColor: '#3954AA', fillOpacity: 0.05, strokeStyle: 'dashed', clickable: true
          });
          kakao.maps.event.addListener(poly, 'click', () => {
            kakao.maps.event.preventMap();
            onSelectItem(station, 'FIRE');
          });
          poly.setMap(mapInstance.current);
          polygonsRef.current.push(poly);
        } catch (e) {}
      });
    }

    if (activeCategory === 'SAFETY') {
      safetyFacilities?.forEach((facility) => {
        const targetLat = facility.latitude ?? (facility as any).centerLatitude ?? (facility as any).lat;
        const targetLng = facility.longitude ?? (facility as any).centerLongitude ?? (facility as any).lng;

        if (targetLat === undefined || targetLat === null || targetLng === undefined || targetLng === null) return; 

  
        const pos = new kakao.maps.LatLng(Number(targetLat), Number(targetLng));

        let icon = '⚡'; // 기본값 (AED 등)
        if (facility.type === 'FIRE_WATER') icon = '🧯'; // 소방용수
        else if (facility.type === 'SHELTER') icon = '🏠'; // 쉼터/대피소
        else if (facility.type === 'RESCUE_BOX') icon = '🧰'; // 인명구조함 
        
        let lable = '제세동기'; // 기본값 (AED 등)
        if (facility.type === 'FIRE_WATER') lable = '소방용수'; // 소방용수
        else if (facility.type === 'SHELTER') lable = '대피소'; // 쉼터/대피소
        else if (facility.type === 'RESCUE_BOX') lable = '인명구조함'; // 인명구조함 

        const content = document.createElement('div');
        content.innerHTML = `
          <div style="cursor:pointer; background:white; color:#333; padding:5px 10px; border:2px solid #4C5CA4; border-radius:20px; font-weight:bold; font-size:12px; display:flex; align-items:center; gap:4px; box-shadow:0 2px 6px rgba(0,0,0,0.15);">
            <span style="font-size:14px;">${icon}</span>
            <span>${lable}</span>
          </div>
        `;
        content.onclick = (e) => { 
          e.stopPropagation(); 
          onSelectItem(facility, 'SAFETY'); 
        };
        
        const overlay = new kakao.maps.CustomOverlay({ 
          position: pos, 
          content, 
          yAnchor: 1 
        });
        if (facility.type === 'SHELTER') {
          shelterMarkers.push(overlay);
        } else if (facility.type === 'AED') {
          aedMarkers.push(overlay);
        } else if (facility.type === 'FIRE_WATER') {
          fireWaterMarkers.push(overlay); 
        } else if (facility.type === 'RESCUE_BOX') {
          rescueBoxMarkers.push(overlay); 
        } 
        overlaysRef.current.push(overlay); 
      });
    }

    if (activeCategory === 'REPORT') {
      reportMarkers.forEach((report) => {
        
        const targetLat = report.pinLatitude ?? (report as any).latitude ?? (report as any).centerLatitude ?? (report as any).lat;
        const targetLng = report.pinLongitude ?? (report as any).longitude ?? (report as any).centerLongitude ?? (report as any).lng;

        if (targetLat === undefined || targetLat === null || targetLng === undefined || targetLng === null) return; 

  
        const pos = new kakao.maps.LatLng(Number(targetLat), Number(targetLng));
        const { icon, label } = REPORT_TYPE[report.type];
        
        const content = document.createElement('div');
        content.innerHTML = `
          <div style="cursor:pointer; background:white; padding:5px 12px; border-radius:20px; border:2px solid #FF8A00; box-shadow:0 2px 8px rgba(0,0,0,0.2); display:flex; align-items:center; gap:5px;">
            <span style="font-size:14px;">${icon}</span>
            <span style="font-size:12px; font-weight:bold; color:#333;">${label} 제보</span>
          </div>
        `;
        content.onclick = (e) => { 
          e.stopPropagation(); 
          onSelectItem(report, 'REPORT'); 
        };
        
        const overlay = new kakao.maps.CustomOverlay({ position: pos, content, yAnchor: 1.2, zIndex: 30 });

        addreportMarkers.push(overlay);//-
        overlaysRef.current.push(overlay);
      });
    }

    // 4. 각 클러스터러에 유효 마커 주입
    disasterClusterer.current?.addMarkers(disasterMarkers);
    shelterClusterer.current?.addMarkers(shelterMarkers);
    aedClusterer.current?.addMarkers(aedMarkers);
    fireWaterClusterer.current?.addMarkers(fireWaterMarkers);
    rescueBoxClusterer.current?.addMarkers(rescueBoxMarkers);
    reportClusterer.current?.addMarkers(addreportMarkers);
  };

  useEffect(() => {
    if (activeCategory === 'REPORT') {
      fetchLatestReports();
    }
    //  탭 카테고리가 'SAFETY'로 전환될 때 현재 지도 좌표 기준의 데이터를 강제로 1회 당겨오기
    if (activeCategory === 'SAFETY' && mapInstance.current) {
      triggerFetchSafetyData();
    }
  }, [activeCategory, fetchLatestReports]);

  useEffect(() => {
    if (mapInstance.current) renderItems();
  }, [disasterData, weatherAlerts, fireStations, safetyFacilities, reportMarkers, fireMarkers, activeCategory]);

  return (
    <div className="relative w-full h-full">
      <Script src={KAKAO_SDK_URL} strategy="afterInteractive" onLoad={initMap} />
      
      {/* 화재 마커 애니메이션 스타일 */}
      <style>{`
        .kakao_scale, .kakao_copyright, [style*="z-index: 1; margin: 0px 6px;"] { display: none !important; }
        
        @keyframes pulse-red {
          0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(255, 75, 75, 0.7); }
          70% { transform: scale(1.1); box-shadow: 0 0 0 15px rgba(255, 75, 75, 0); }
          100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(255, 75, 75, 0); }
        }
        .fire-pulse {
          animation: pulse-red 2s infinite;
          border-radius: 50%;
        }
      `}</style>
      
      <button
        onClick={(e) => { e.stopPropagation(); handleMoveToCurrentLocation(); }}
        className="absolute bottom-6 right-6 z-[20] bg-white p-3 rounded-full shadow-xl border border-gray-100 hover:bg-gray-50 active:scale-95 transition-all"
        title="현위치로 이동"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#4C5CA4" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
          <circle cx="12" cy="10" r="3"></circle>
        </svg>
      </button>
      <div ref={mapRef} className="absolute inset-0 w-full h-full" />
    </div>
  );
});

KakaoMap.displayName = 'KakaoMap';
export default KakaoMap;