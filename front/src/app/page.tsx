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
import { getFireStage } from "@utils/fireUtils";
import {
    getDisasterMessages,
    getWeatherAlerts,
    getFireStations,
    getSidebarComments,
    DisasterMessage,
    WeatherAlert,
    FireStation,
    fetchFireMarkers, 
    FireMarker, 
    Report,
    getReports, 
    createReport, 
    updateReport, 
    deleteReport, 
    toggleLikeReport, 
    flagReport,
    SafetyFacility,
    getSafetyFacilities
} from '@/services/api';


export default function DashboardPage() {
    const [isMounted, setIsMounted] = useState(false);

    const [disasters, setDisasters] = useState<DisasterMessage[]>([]);
    const [weatherAlerts, setWeatherAlerts] = useState<WeatherAlert[]>([]);
    const [fireStations, setFireStations] = useState<FireStation[]>([]);

    const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
    const [isReportModalOpen, setIsReportModalOpen] = useState(false); // 💡 모달 제어 기준 상태 변수
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

    const [fireMarkers, setFireMarkers] = useState<FireMarker[]>([]); 

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
                console.error("초기 레포트 데이터 로딩 실패:", err);
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
            console.error("레포트 목록 갱신 실패:", error);
        }
    };

    const reportMarkers = useMemo(() => {
    return allReports.filter(report => report.type==='화재' || report.type === '기상');
    }, [allReports]);

    const reportByMarkers = useMemo(() => {
        if (!selectedItem) return [];

        const targetLat = Number(selectedItem.latitude || selectedItem.lat || selectedItem.centerLatitude || selectedItem.pinLatitude);
        const targetLng = Number(selectedItem.longitude || selectedItem.lng || selectedItem.centerLongitude || selectedItem.pinLongitude);

        if (!targetLat || !targetLng) return [];

        return allReports.filter(report => {
            if (report.type === '화재' || report.type === '기상') return false;

            const reportLat = Number(report.pinLatitude ?? (report as any).latitude ?? (report as any).centerLatitude ?? (report as any).lat);
            const reportLng = Number(report.pinLongitude ?? (report as any).longitude ?? (report as any).centerLongitude ?? (report as any).lng);

            if (!reportLat || !reportLng) return false;

            if(targetLat!==reportLat||targetLng!==reportLng) return false;

            return true;
        });
    }, [allReports, selectedItem]);


    //FireMarkers GET
    useEffect(() => {
        const loadFireData = async () => {
            try {
                const data = await fetchFireMarkers();
                setFireMarkers(data);
            } catch (error) {
                console.error("화재 마커 로드 에러:", error);
            }
        };

        loadFireData();
        const interval = setInterval(loadFireData, 60000); // 1분마다 주기적 갱신
        return () => clearInterval(interval);
    }, []);

    //FireMarkers 필터링
    const filteredFireMarkers = useMemo(() => {
        return fireMarkers.filter(fire => getFireStage(fire.createdAt) !== 'deleted');
    }, [fireMarkers]);

    const { 
        activeCategory, 
        handleCategoryChange, 
    } = useCategory();

    const infoPanelProps = {
        activeCategory,
        disasters,
        weatherAlerts,
        fireStations,
        safetyFacilities,
        reportMarkers,
        userLocation,
        fireMarkers: filteredFireMarkers,
        setSelectedItem
    };

    const { 
        itemType,
        fireStats, 
        comments,
        setComments,
        sortedItems,
        handleSelectItem: originalHandleSelectItem,
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
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                },
                (err) => {
                    console.warn("사용자 현재 GPS 좌표를 가져올 수 없습니다. 기본 기동 좌표를 사용합니다.", err);
                },
                { enableHighAccuracy: true, timeout: 5000 }
            );
        }
    }, []);

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
            getWeatherAlerts(),
            getFireStations(),
            getSidebarComments(),
            fetchFireMarkers() 
        ])
        .then(([d, w, f, c, fireM]) => {
            setDisasters(d);
            setWeatherAlerts(w);
            setFireStations(f);
            setComments(c);
            setFireMarkers(fireM);
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
                    comments={comments}
                    setComments={setComments}   
                    currentUserId={currentUserId ?? 0}
                    selectedItem={selectedItem}
                    itemType={itemType}         
                />
            </aside>

            {/* --- 우측 가시화 공간 공간 (지도 + 상세 인포 판넬) --- */}
            <div className="flex-1 flex flex-col gap-6 h-full">
                <section className="flex-1 bg-white rounded-[40px] shadow-xl overflow-hidden relative border-4 border-white">
                    <KakaoMap 
                        ref={mapRef}
                        center={position} 
                        activeCategory={activeCategory} 
                        disasterData={disasters} 
                        weatherAlerts={weatherAlerts} 
                        fireStations={fireStations} 
                        safetyFacilities={safetyFacilities}
                        reportMarkers={reportMarkers}
                        fireMarkers={filteredFireMarkers} 
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
                    userLocation={userLocation}
                    setSelectedItem={setSelectedItem}
                    handleSelectItem={handleItemFocus}
                    getDistance={getDistance}
                    setIsReportModalOpen={setIsReportModalOpen}
                    fireMarkers={filteredFireMarkers} 
                />
            </div>
        
            {/* --- [다이얼로그 레이어 모달 컴포넌트 스위치 모음] --- */}
            
            {/* 1. 재난/사고별 정보공유창 제보 타임라인 리스트 모달 */}
            <ReportListModal
                isOpen={isReportModalOpen} // 💡 [수정] 오타 교정 완료 (isReportOpen -> isReportModalOpen)
                onClose={() => setIsReportModalOpen(false)}
                setIsCreateModalOpen={setIsCreateModalOpen}
                reportByMarkers={reportByMarkers}
                allReports={allReports} 
                setAllReports={setAllReports} 
                currentUserId={currentUserId} 
                selectedItem={selectedItem}
                itemType={itemType as any} 
                onSuccess={fetchLatestReports}
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
                    sidebarComments={comments}
                    reportByMarkers={reportByMarkers}
                    setSidebarComments={setComments}
                    onSuccess={fetchLatestReports}
                />
            )}
        </main>
    );
}