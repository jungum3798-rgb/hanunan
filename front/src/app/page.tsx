"use client";
import { useEffect, useState, useRef, useMemo } from 'react';

import KakaoMap from "@/components/map/KakaoMap";

import MyProfileModal from "@/components/modal/MyProfileModal";
import CreateReportModal from "@/components/modal/CreateReportModal";
import ReportWriteModal from "@/components/modal/ReportWriteModal";
import ReportListModal from "@/components/modal/ReportListModal";
import LoginModal from "@/components/auth/LoginModal";

import TopBar from "@/components/layout/TopBar";
import InfoPanel from "@/components/layout/InfoPanel";
import CitizenFeed from "@/components/layout/CitizenFeed";
import CategoryNav from "@/components/layout/CategoryNav";

import { getDistance } from "@/utils/mapUtils";

import { useInfoPanel } from "@hooks/useInfoPanel";
import { useCategory } from "@hooks/useCategory";
//import { useGeocodedWeatherAlerts } from "@hooks/useGeocodedWeatherAlerts";
import { getFireStage } from "@utils/fireUtils";
import {
    getDisasterMessages,
    getWeatherAlertsByLocation,
    getFireStations,
    DisasterMessage,
    WeatherAlert,
    FireStation,
    connectSse,
    FireMarker,
    DisasterAlertMarker,
    Report,
    getReports, 
    createReport, 
    updateReport, 
    deleteReport, 
    toggleLikeReport, 
    flagReport,
    SafetyFacility,
    getSafetyFacilities,
    Region
} from '@/services/api';


export default function DashboardPage() {
    const [isMounted, setIsMounted] = useState(false);

    const [disasters, setDisasters] = useState<DisasterMessage[]>([]);
    const [weatherAlerts, setWeatherAlerts] = useState<WeatherAlert[]>([]);
    const [regionInfo, setRegionInfo] = useState<Region | null>(null); //기상재난문자 유저 주소
    const [fireStations, setFireStations] = useState<FireStation[]>([]);

    const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
    const [isReportModalOpen, setIsReportModalOpen] = useState(false); 
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [isReportWriteModalOpen, setIsReportWriteModalOpen] = useState(false);

    const [likedReportIds, setLikedReportIds] = useState<number[]>([]);
    
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [userName, setUserName] = useState<string | null>(null);
    
    // 💡 백엔드 본인 확인 및 삭제 인가를 위해 세션 데이터 ID 동적 추적 관리
    const [currentUserId, setCurrentUserId] = useState<number | null>(null);

    const [position] = useState({ lat: 35.143, lng: 126.924 });
    const [userLocation, setUserLocation] = useState<{ lat: number, lng: number } | null>(null);
    //const geocodedWeatherAlerts = useGeocodedWeatherAlerts(weatherAlerts, userLocation);

    const [fireMarkers, setFireMarkers] = useState<FireMarker[]>([]);
    const [disasterAlertMarkers, setDisasterAlertMarkers] = useState<DisasterAlertMarker[]>([]);

    const mapRef = useRef<any>(null); 

    const [selectedItem, setSelectedItem] = useState<any | null>(null);

    const [allReports, setAllReports] = useState<Report[]>([]);

    const [safetyFacilities, setSafetyFacilities] = useState<SafetyFacility[]>([]);

    useEffect(() => {
        if (!isMounted) return;

        const initData = async () => {
            try {
                const reportsData = await getReports();
                setAllReports(reportsData);
            } catch (err) {
                console.log("만료 토큰 차단 완료 (getReports)");
            }
        };
        initData();
    }, [isMounted]);

    const fetchSafetyData = async (bounds: { swLat: number; swLng: number; neLat: number; neLng: number }) => {
            try {
                let typesParam: string | undefined = undefined;

                if (activeCategory !== 'SAFETY') return; 

                const safetyData = await getSafetyFacilities({
                    swLat: bounds.swLat,
                    swLng: bounds.swLng,
                    neLat: bounds.neLat,
                    neLng: bounds.neLng,
                    types: typesParam // undefined로 넘어가면 전체 조회로 작동
                });

                setSafetyFacilities(safetyData);
                console.log(`[안전시설 전체조회] 화면 내 데이터 ${safetyData.length}건 갱신 완료`);
            } catch (err) {
                console.error("안전시설 전체 데이터 갱신 실패:", err);
            }
        };

    const fetchLatestReports = async () => {
        try {
            const data = await getReports(); 
            setAllReports(data); 
        } catch (error) {
            console.log("만료 토큰 차단 완료 (getReports)");
        }
    };

    const reportMarkers = useMemo(() => {
    return allReports.filter(report => report.type==='화재' || report.type === '기상' || report.type === '기타');
    }, [allReports]);

    const reportByMarkers = useMemo(() => {
        if (!selectedItem) return [];

        const targetLat = Number(selectedItem.latitude || selectedItem.lat || selectedItem.centerLatitude || selectedItem.pinLatitude);
        const targetLng = Number(selectedItem.longitude || selectedItem.lng || selectedItem.centerLongitude || selectedItem.pinLongitude);

        if (!targetLat || !targetLng) return [];

        return allReports.filter(report => {
            if (report.type === '화재' || report.type === '기상' || report.type === '기타') return false;

            const reportLat = Number(report.pinLatitude ?? (report as any).latitude ?? (report as any).centerLatitude ?? (report as any).lat);
            const reportLng = Number(report.pinLongitude ?? (report as any).longitude ?? (report as any).centerLongitude ?? (report as any).lng);

            if (!reportLat || !reportLng) return false;

            if(targetLat!==reportLat||targetLng!==reportLng) return false;

            return true;
        });
    }, [allReports, selectedItem]);


    // SSE — 화재·기타 재난 마커 실시간 수신
    useEffect(() => {
        const prependUnique = <T extends { id: number }>(prev: T[], item: T) =>
            prev.some((m) => m.id === item.id) ? prev : [item, ...prev];

        const es = connectSse(
            (initialFireMarkers, initialDisasterMarkers) => {
                setFireMarkers(initialFireMarkers);
                setDisasterAlertMarkers(initialDisasterMarkers);
            },
            (newMarker) => {
                setFireMarkers((prev) => prependUnique(prev, newMarker));
            },
            (newMarker) => {
                setDisasterAlertMarkers((prev) => prependUnique(prev, newMarker));
            },
        );

        return () => es.close();
    }, []);

    //FireMarkers 필터링
    const filteredFireMarkers = useMemo(() => {
        return fireMarkers.filter(fire => getFireStage(fire.createdAt) !== 'deleted');
    }, [fireMarkers]);

    const filteredDisasterAlertMarkers = useMemo(() => {
        return disasterAlertMarkers.filter(alert => getFireStage(alert.createdAt) !== 'deleted');
    }, [disasterAlertMarkers]);

    const { 
        activeCategory, 
        handleCategoryChange, 
    } = useCategory();

    const infoPanelProps = {
        activeCategory,
        disasters,
        weatherAlerts: weatherAlerts,
        fireStations,
        safetyFacilities,
        reportMarkers,
        userLocation,
        fireMarkers: filteredFireMarkers,
        disasterAlertMarkers: filteredDisasterAlertMarkers,
        setSelectedItem,
        selectedItem
    };

    const { 
        itemType,
        fireStats, 
        sortedItems,
        sortedFireDisasterItems,
        sortedWeatherDisasterItems,
        handleSelectItem: originalHandleSelectItem,
        news
    } = useInfoPanel(infoPanelProps);

    const handleItemFocus = async (item: any, type: any) => {
        if (!item) return; 
        const lat = item.latitude || item.lat || item.centerLatitude || item.pinLatitude;
        const lng = item.longitude || item.lng || item.centerLongitude || item.pinLongitude;

        if (lat && lng && mapRef.current) {
            console.log("지도 중심점 이동 대상 좌표:", lat, lng); 
            mapRef.current.moveToLocation(lat, lng);
        } else {
            console.warn("위치 식별 좌표 정보가 유실된 아이템입니다:", item);
        }

        await originalHandleSelectItem(item, type);
    };
    
    // --- [동작: 사용자 브라우저 기반 현재 GPS 위치 트래킹] ---
    useEffect(() => {
        if (!navigator.geolocation) return;

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
            },
            (err) => {
                console.warn("사용자 현재 GPS 좌표를 가져올 수 없습니다.", err);
            },
            { enableHighAccuracy: true, timeout: 10_000, maximumAge: 0 },
        );
    }, []);

    // --- [동작: GPS 위치 확인되면 지도 중심을 사용자 위치로 이동] ---
    const hasCenteredOnUser = useRef(false);
    useEffect(() => {
        if (!userLocation || hasCenteredOnUser.current || !mapRef.current) return;
        mapRef.current.moveToLocation(userLocation.lat, userLocation.lng);
        hasCenteredOnUser.current = true;
    }, [userLocation]);

    // 기상 재난문자 호출
    useEffect(() => {
        if (!userLocation) return;

        const loadWeatherAlerts = async () => {
            try {
                console.log("기상 재난문자 호출")
                const response = await getWeatherAlertsByLocation(
                    userLocation.lat,
                    userLocation.lng,
                );
                if (response) {
                    // 데이터가 정상적으로 왔을때
                    setRegionInfo(response.region);
                    setWeatherAlerts(response.alerts ?? []); 
                } else {
                    // 응답이 비어있을 때 초기화
                    setRegionInfo(null);
                    setWeatherAlerts([]);
                }
                } catch (err) {
                    console.error("기상 재난문자 조회 실패:", err);
                    // 에러 발생 시 초기화
                    setRegionInfo(null);
                    setWeatherAlerts([]);
                }
        };

        loadWeatherAlerts();
        // 1분마다 주기적으로 API를 재호출하는 인터벌 구동 
        const interval = setInterval(loadWeatherAlerts, 60000); 

        //유저 위치가 바뀌거나 페이지를 나갈 때 기존 인터벌을 깔끔하게 초기화
        return () => clearInterval(interval);
    }, [userLocation?.lat, userLocation?.lng]); //userLocation에서 변경, 좌표 숫자가 같더라도 객체 참조값이 바뀌어 호출되는 문제 해결

    useEffect(() => {
        const savedUser = localStorage.getItem('user');
        if (savedUser) {
            try {
                const parsed = JSON.parse(savedUser);
                setUserName(parsed.nickname);
                setIsLoggedIn(true);
                if (parsed.id) {
                    setCurrentUserId(Number(parsed.id));
                }
            } catch (e) {
                console.error("유저 세션 복구 정보 파싱 실패", e);
            }
        }
    }, []);

    useEffect(() => {
        setIsMounted(true);

        Promise.all([
            getDisasterMessages(),
            getFireStations(),
        ])
        .then(([d, f]) => {
            setDisasters(d);
            setFireStations(f);
        })
        .catch((err) => {
            console.error("대시보드 통합 초기 데이터 갱신 중 크래시 발생:", err);
        });
    }, []);


    if (!isMounted) return null;

    return (
        <main className="flex h-[100dvh] w-full bg-[#F0F2F5] p-6 gap-6 overflow-hidden relative">
            
            <TopBar 
                isMounted={isMounted}
                userName={userName}
                setIsReportWriteModalOpen={setIsReportWriteModalOpen}
                setIsProfileModalOpen={setIsProfileModalOpen}
                setIsLoginModalOpen={setIsLoginModalOpen}
            />
            
            <LoginModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} />

            {/* --- 왼쪽 메인 제어 사이드바 영역 --- */}
            <aside className="w-80 flex flex-col gap-6 h-full">
                <h1 className="text-4xl font-black text-[#3954AA] italic select-none">한눈에 안전</h1>

                <CategoryNav 
                    activeCategory={activeCategory} 
                    handleCategoryChange={handleCategoryChange} 
                />

                <CitizenFeed 
                    activeCategory={activeCategory}
                    currentUserId={currentUserId ?? 0}
                    isLoggedIn={isLoggedIn}
                    onLoginRequired={() => setIsLoginModalOpen(true)}
                />
            </aside>
            {/* --- 우측 가시화 공간 공간 (지도 + 상세 인포 판넬) --- */}
            <div className="flex-1 flex flex-col gap-6 h-full">
                <section className="flex-1 bg-white rounded-[40px] shadow-xl overflow-hidden relative border-4 border-white">
                    <KakaoMap 
                        ref={mapRef}
                        center={position}
                        userLocation={userLocation}
                        activeCategory={activeCategory} 
                        disasterData={disasters} 
                        RegionInfo={regionInfo} //기상 재난문자 역지오코딩된 유저 주소값
                        weatherAlerts={weatherAlerts} //기상 재난문자 배열
                        fireStations={fireStations} 
                        safetyFacilities={safetyFacilities}
                        reportMarkers={reportMarkers}
                        fireMarkers={filteredFireMarkers}
                        disasterAlertMarkers={filteredDisasterAlertMarkers}
                        onSelectItem={handleItemFocus} 
                        fetchLatestReports={fetchLatestReports}
                        fetchSafetyData={fetchSafetyData}
                    />
                </section>

                <InfoPanel 
                    selectedItem={selectedItem}
                    itemType={itemType}
                    fireStats={fireStats}
                    activeCategory={activeCategory}
                    sortedItems={sortedItems}
                    sortedFireDisasterItems={sortedFireDisasterItems}
                    sortedWeatherDisasterItems={sortedWeatherDisasterItems}
                    userLocation={userLocation}
                    setSelectedItem={setSelectedItem}
                    handleSelectItem={handleItemFocus}
                    getDistance={getDistance}
                    setIsReportModalOpen={setIsReportModalOpen}
                    fireMarkers={filteredFireMarkers}
                    news={news}
                />
            </div>
        
            {/* --- [다이얼로그 레이어 모달 컴포넌트 스위치 모음] --- */}
            
            {/* 1. 재난/사고별 정보공유창 제보 타임라인 리스트 모달 */}
            <ReportListModal
                isOpen={isReportModalOpen} 
                onClose={() => setIsReportModalOpen(false)}
                setIsCreateModalOpen={setIsCreateModalOpen}
                reportByMarkers={reportByMarkers}
                allReports={allReports} 
                setAllReports={setAllReports} 
                currentUserId={currentUserId} 
                selectedItem={selectedItem}
                itemType={itemType as any} 
                onSuccess={fetchLatestReports}
                setIsLoginModalOpen={setIsLoginModalOpen}
                userName={userName}
            />

            {/* 2. 일반 지도 제보 마커 등록 모달 */}
            <ReportWriteModal
                isOpen={isReportWriteModalOpen}
                onClose={() => setIsReportWriteModalOpen(false)}
                currentUserId={currentUserId}   
                onSuccess={fetchLatestReports}
            />
            
            {/* 3. 재난 마커 하부 연동형 실시간 현장 시민 제보 등록 모달 */}
            {isCreateModalOpen && itemType && (
            <CreateReportModal 
                isOpen={isCreateModalOpen}
                setIsCreateModalOpen={setIsCreateModalOpen}
                setIsReportModalOpen={setIsReportModalOpen}
                currentUserId={currentUserId ?? 0}   
                selectedItem={selectedItem} 
                itemType={itemType}      
                onSuccess={fetchLatestReports}
            />
            )}

            {/* 4. 마이페이지 제보 내역 및 활동 대시보드 관리 모달 */}
            {isProfileModalOpen && isMounted && userName && currentUserId !== null && (
                <MyProfileModal
                    userId={currentUserId}
                    onClose={() => setIsProfileModalOpen(false)}
                    reportMarkers={reportMarkers}
                    reportByMarkers={reportByMarkers}
                    onSuccess={fetchLatestReports}
                />
            )}
        </main>
    );
}