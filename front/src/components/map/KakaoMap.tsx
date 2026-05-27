'use client';

import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import Script from 'next/script';
import { DisasterMessage, FireStation, SafetyFacility, FireMarker, DisasterAlertMarker, Report, Region, WeatherAlert } from '@/services/api';
import { getDisasterTypeUi } from '@/utils/disasterUtils';
import {
} from '@/utils/weatherMapUtils';
import { convertEPSG5186ToWGS84 } from '@/utils/weatherMapUtils';
const southKoreaGeoJson: any = require('@/assets/geojson/korea_districts.json');
import regionCodes from '@/assets/geojson/region_codes.json';
const KAKAO_SDK_URL = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${process.env.NEXT_PUBLIC_KAKAO_MAP_KEY}&autoload=false&libraries=services,clusterer`;

export interface KakaoMapHandle {
  moveToLocation: (lat: number, lng: number) => void;
}

interface KakaoMapProps {
  center: { lat: number; lng: number };
  userLocation: { lat: number; lng: number } | null;
  activeCategory: "DISASTER" | "SAFETY" | "REPORT";
  disasterData: DisasterMessage[];
  weatherAlerts: WeatherAlert[];
  RegionInfo: Region | null;
  fireStations: FireStation[];
  safetyFacilities: SafetyFacility[];
  reportMarkers: Report[];
  fireMarkers: FireMarker[];
  disasterAlertMarkers: DisasterAlertMarker[];
  onSelectItem: (item: any, type: 'DISASTER' | 'WEATHER' | 'FIRE' | 'SAFETY' | 'REPORT') => void;
  fetchLatestReports: () => void;
  fetchSafetyData: (bounds: { swLat: number; swLng: number; neLat: number; neLng: number }) => void;
}

const REPORT_TYPE: Record<string, { icon: string; label: string }> = {
  화재: { icon: '🔥', label: '화재' },
  기상: { icon: '🌧️', label: '기상' },
  기타: { icon: '⚠️', label: '기타' },
};

const KakaoMap = forwardRef<KakaoMapHandle, KakaoMapProps>((props, ref) => {
  const { center, userLocation, activeCategory, disasterData, weatherAlerts, RegionInfo, fireStations, safetyFacilities, reportMarkers, onSelectItem, fireMarkers, disasterAlertMarkers, fetchLatestReports, fetchSafetyData } = props;
  
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
    console.log("지도 드래그 이벤트 발생! 현재 바운드:", mapInstance.current.getBounds());
    if (activeCategory !== 'SAFETY' || !mapInstance.current) return;
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
        level: 6
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
      //kakao.maps.event.addListener(mapInstance.current, 'idle', triggerFetchSafetyData);
      
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

      disasterAlertMarkers.forEach(alert => {
        const stage = getFireStage(alert.createdAt);
        const { icon, color } = getDisasterTypeUi(alert.disasterType);
        const pos = new kakao.maps.LatLng(alert.latitude, alert.longitude);
        const isPulse = stage === 'active' ? 'fire-pulse' : '';
        const bgColor = stage === 'active' ? color : stage === 'cooling' ? '#FF9800' : '#757575';

        const content = document.createElement('div');
        content.className = `fire-marker-container ${isPulse}`;
        content.innerHTML = `
          <div style="cursor:pointer; width:34px; height:34px; background:${bgColor}; border:3px solid white; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:16px; box-shadow:0 4px 12px rgba(0,0,0,0.4); transition: all 0.3s;">
            ${icon}
          </div>
        `;

        content.onclick = (e) => {
          e.stopPropagation();
          const processedAlert = {
            ...alert,
            isDisasterPipeline: true,
            uniqueKey: `rt-disaster-${alert.id}`,
            msgCn: alert.messageContent,
            locationName: alert.parsedAddress || alert.rcptnRgnNm,
            disasterStage: stage,
          };
          onSelectItem(processedAlert, 'DISASTER');
        };

        const overlay = new kakao.maps.CustomOverlay({ position: pos, content, yAnchor: 0.5, zIndex: 25 });
        disasterMarkers.push(overlay);
        overlaysRef.current.push(overlay);
      });

      //기상 재난문자 폴리곤 
      if (RegionInfo) {
        const polygonColor = '#2fb533';

        const matchedRegion = regionCodes.find((item: any) => {
          return item.sido === RegionInfo.region1 && item.sgg === RegionInfo.region2;
        });
        const targetCode = matchedRegion ? matchedRegion.code : null;
        
        const targetFeature = southKoreaGeoJson.features.find((feature: any) => {
          const props = feature.properties;
          if (targetCode) {
            return props.SIGUNGU_CD === targetCode;
          }
          return props.SIGUNGU_NM === RegionInfo.region2; 
        });

        console.log("Rendering Polygon for:", RegionInfo);
        console.log("Target Feature:", targetFeature);

        if (targetFeature && targetFeature.geometry) {
        const geomType = targetFeature.geometry.type;
        const rawCoords = targetFeature.geometry.coordinates;
        const pathsToDraw: any[][] = [];

        // 1. 타입에 따른 분기 처리 
        if (geomType === 'Polygon') {
          rawCoords.forEach((ring: any) => {
            const path = ring.map((coord: any) => {
              // 수정된 EPSG:5186 변환 함수 호출 (coord[0]=X, coord[1]=Y 순서 그대로 유지)
              const wgs84 = convertEPSG5186ToWGS84(Number(coord[0]), Number(coord[1]));
              return new kakao.maps.LatLng(wgs84.latitude, wgs84.longitude);
            });
            pathsToDraw.push(path);
          });
        } else if (geomType === 'MultiPolygon') {
          rawCoords.forEach((polygon: any) => {
            polygon.forEach((ring: any) => {
              const path = ring.map((coord: any) => {
                // 수정된 EPSG:5186 변환 함수 호출
                const wgs84 = convertEPSG5186ToWGS84(Number(coord[0]), Number(coord[1]));
                return new kakao.maps.LatLng(wgs84.latitude, wgs84.longitude);
              });
              pathsToDraw.push(path);
            });
          });
        }

        // 2. 카카오 지도에 폴리곤 그리기 및 영역 맞춰 화면 이동
        if (pathsToDraw.length > 0) {
          const bounds = new kakao.maps.LatLngBounds();

          pathsToDraw.forEach((polygonPath) => {
            if (polygonPath.length > 0) {
              // 영역 확장을 위해 bounds에 좌표 추가
              polygonPath.forEach(latlng => bounds.extend(latlng));

              console.log("폴리곤 생성 성공! 첫 번째 위경도 좌표:", polygonPath[0].toString()); 
              

              const poly = new kakao.maps.Polygon({
                path: polygonPath,
                strokeWeight: 4,
                strokeColor: '#2fb533', 
                fillColor: '#2fb533',
                fillOpacity: 0.2,
                zIndex: 100,
                clickable: false,
              });
              
              poly.setMap(mapInstance.current);
              polygonsRef.current.push(poly);
            }
          });
        }
      }
      }
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

        addreportMarkers.push(overlay);
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
   
    if (activeCategory === 'SAFETY' && mapInstance.current) {
      triggerFetchSafetyData();
    }
  }, [activeCategory]);

  
  useEffect(() => {
    if (activeCategory === 'REPORT') {
      fetchLatestReports();
    }
  }, [activeCategory]);

  useEffect(() => {
    if (mapInstance.current) renderItems();
  }, [disasterData, weatherAlerts, fireStations, safetyFacilities, reportMarkers, fireMarkers, disasterAlertMarkers, activeCategory, userLocation, RegionInfo]);

  useEffect(() => {
  if (mapInstance.current) {
    const { kakao } = window as any;
    
    // 혹시 모를 중복 등록 방지를 위해 기존 리스너 삭제 후 추가
    kakao.maps.event.removeListener(mapInstance.current, 'idle', triggerFetchSafetyData);
    kakao.maps.event.addListener(mapInstance.current, 'idle', triggerFetchSafetyData);
    
    console.log("지도 idle 이벤트 리스너 등록 완료");
  }
}, [mapInstance.current])

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