// 하단 패널 관련 함수 로직 - 백엔드 파이프라인 최적화 완료본

import { useState, useMemo } from 'react';
import { getDistance, sortItemsByDistance } from "@/utils/mapUtils";
import { 
    getFireStationStats, 
    getSidebarComments, 
    FireMarker,
    Report 
} from '@/services/api';

interface UseInfoPanelProps {
    activeCategory: 'DISASTER' | 'SAFETY' | 'REPORT';
    disasters: any[];
    weatherAlerts: any[];
    fireStations: any[];
    safetyFacilities: any[];
    reportMarkers: Report[];
    fireMarkers: FireMarker[]; 
    userLocation: { lat: number, lng: number } | null;
    setSelectedItem: React.Dispatch<React.SetStateAction<any>>;
}

export const useInfoPanel = ({
    activeCategory,
    disasters,
    weatherAlerts,
    fireStations,
    safetyFacilities,
    reportMarkers,
    userLocation,
    fireMarkers,
    setSelectedItem
}: UseInfoPanelProps) => {

    const [itemType, setItemType] = useState<'DISASTER' | 'WEATHER' | 'FIRE' | 'SAFETY' | 'REPORT' | null>(null);
    const [fireStats, setFireStats] = useState<any>(null);
    const [comments, setComments] = useState<any[]>([]);
    
    //카테고리별 정렬 배열 
    const sortedItems = useMemo(() => {
        let itemsToDisplay: any[] = [];

        if (activeCategory === 'DISASTER') {
            // 일반 재난문자 매핑
            const disasterItems = disasters.map(d => ({
                ...d,
                uniqueKey: `disaster-${d.id}`,
                contentType: 'DISASTER' 
            }));

            // 백엔드 실시간 화재 마커 매핑
            const realTimeFireItems = fireMarkers.map(f => ({
                ...f,
                uniqueKey: `rt-fire-${f.id}`,
                contentType: 'DISASTER', // 재난 카테고리에 내포
                isFirePipeline: true,    // 화재 데이터 판별용 플래그
                // 리스트 및 요약 UI 호환을 위해 백엔드 필드명을 프론트 규격으로 단일화
                msgCn: f.messageContent,
                crtDt: f.createdAt,
                locationName: f.parsedAddress || f.rcptnRgnNm
            }));

            const weatherItems = weatherAlerts.map(w => ({
                ...w,
                uniqueKey: `weather-${w.id}`,
                contentType: 'WEATHER' 
            }));

            const fireItems = fireStations.map(f => ({
                ...f,
                uniqueKey: `fire-${f.id}`,
                contentType: 'FIRE',
                name: f.frstCetrNm,
                latitude: f.centerLatitude,
                longitude: f.centerLongitude
            }));

            itemsToDisplay = [...disasterItems, ...realTimeFireItems, ...weatherItems, ...fireItems];
        }
        else if (activeCategory === 'SAFETY') {
            itemsToDisplay = safetyFacilities.map(s => ({ 
                ...s, 
                uniqueKey: `safety-${s.id}`,
                contentType: 'SAFETY' // 데이터 속성 보장을 위한 명시
            }));
        }
        else if (activeCategory === 'REPORT') {
            itemsToDisplay = reportMarkers.map(report => ({ 
                ...report, 
                uniqueKey: `report-${report.id}`,
                contentType: 'REPORT'
            }));
        }

        // 반경 10km 내 필터링 레이어
        const filteredItems = userLocation
            ? itemsToDisplay.filter(item => {
                const lat = item.latitude ?? item.centerLatitude ?? item.pinLatitude ?? item.lat;
                const lng = item.longitude ?? item.centerLongitude ?? item.pinLongitude ?? item.lng;
                
                if (lat === undefined || lng === undefined) return false;
                
                const dist = getDistance(userLocation.lat, userLocation.lng, lat, lng);
                
                return dist <= 10;
            })
            : itemsToDisplay;

        return sortItemsByDistance(filteredItems, userLocation);

    }, [activeCategory, disasters, weatherAlerts, fireStations, safetyFacilities, reportMarkers, userLocation, fireMarkers]);
    
    const handleSelectItem = async (item: any, type: 'DISASTER' | 'WEATHER' | 'FIRE' | 'SAFETY' | 'REPORT') => {
        if (!item) {
            setSelectedItem(null);
            setItemType(null);
            setFireStats(null);
            setComments([]);
            return;
        }
        // 실시간 화재 데이터 및 일반 제보 데이터 식별값 유실 방지 보정 로직
        let processedItem: any = { ...item };
        
        if (type === 'DISASTER' && (item.isFirePipeline || item.uniqueKey?.startsWith('rt-fire'))) {
            processedItem = {
                ...item,
                id: item.id, // 백엔드 기본 PK 준수 보장
                isFirePipeline: true, 
                msgCn: item.messageContent || item.msgCn, 
                parsedAddress: item.parsedAddress || item.locationName || item.rcptnRgnNm, 
                aiSummary: item.aiSummary 
            };
        }

        setSelectedItem(processedItem);
        setItemType(type);

        const targetId = processedItem.id;

        if (!targetId) {
            console.warn("선택된 아이템의 식별자(ID)가 누락되어 비동기 데이터를 가져올 수 없습니다:", processedItem);
            return;
        }

        // 1. 소방서 상세 통계 로딩 (출동 건수 데이터셋 등)
        if (type === 'FIRE') {
            try {
                const stats = await getFireStationStats(targetId);
                setFireStats(stats);
            } catch (e) { 
                console.error("소방서 통계 데이터 로딩 실패:", e); 
                setFireStats(null);
            }
        } else {
            setFireStats(null);
        }

        if (type === 'REPORT') {
            const targetLat = item.pinLatitude ?? item.latitude ?? item.lat;
            const targetLng = item.pinLongitude ?? item.longitude ?? item.lng;

            if (targetLat && targetLng) {
                try {
                    // 카카오 맵 Geocoder 서비스 호출을 위한 프로미스 래핑
                    const addressString = await new Promise<string>((resolve) => {
                        const { kakao } = window as any;
                        if (!kakao || !kakao.maps || !kakao.maps.services) {
                            resolve("주소 정보 없음");
                            return;
                        }
                        
                        const geocoder = new kakao.maps.services.Geocoder();
                        geocoder.coord2Address(Number(targetLng), Number(targetLat), (result: any, status: any) => {
                            if (status === kakao.maps.services.Status.OK) {
                                // 도로명 주소가 있으면 도로명, 없으면 지번 주소 사용
                                const addr = result[0].road_address?.address_name || result[0].address.address_name;
                                resolve(addr);
                            } else {
                                resolve("주소를 찾을 수 없음");
                            }
                        });
                    });

                    // 변환된 주소를 아이템 객체에 강제로 매핑
                    processedItem.parsedAddress = addressString;
                } catch (error) {
                    console.error("제보 마커 주소 변환 실패:", error);
                    processedItem.parsedAddress = "주소 변환 실패";
                }
            }
        }

        // 2. 해당 마커 하부에 연결된 사이드바 댓글 피드 로딩
        try {
            const filteredComments = await getSidebarComments(targetId, type);
            setComments(Array.isArray(filteredComments) ? filteredComments : []);
        } catch (e) { 
            console.error("댓글 피드 조회 백엔드 통신 실패:", e);
            setComments([]); 
        }

    };

    return {
        setSelectedItem, 
        itemType,
        fireStats, 
        comments,
        setComments,
        sortedItems,
        handleSelectItem
    };
};