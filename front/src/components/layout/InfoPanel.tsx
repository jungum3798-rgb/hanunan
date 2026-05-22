// 하단 패널 컴포넌트 - 실시간 데이터 및 제보 파이프라인 보정본

import React from 'react';
import { getFireStage } from "@/utils/fireUtils";

interface InfoPanelProps {
  selectedItem: any;
  itemType: 'DISASTER' | 'WEATHER' | 'FIRE' | 'SAFETY' | 'REPORT' | null;
  fireStats: any;
  activeCategory: 'DISASTER' | 'SAFETY' | 'REPORT';
  sortedItems: any[];
  userLocation: { lat: number; lng: number } | null;
  setSelectedItem: (item: any) => void;
  handleSelectItem: (
    item: any, 
    type: 'DISASTER' | 'WEATHER' | 'FIRE' | 'SAFETY' | 'REPORT'
  ) => void | Promise<void>;
  getDistance: (lat1: number, lng1: number, lat2: number, lng2: number) => number;
  setIsReportModalOpen: (open: boolean) => void;
  fireMarkers: any[];
}

const InfoPanel: React.FC<InfoPanelProps> = ({
  selectedItem,
  itemType,
  fireStats,
  activeCategory,
  sortedItems,
  userLocation,
  setSelectedItem,
  handleSelectItem,
  getDistance,
  setIsReportModalOpen,
  fireMarkers,
}) => {

  // 실시간 화재 데이터 데이터 파이프라인 여부 식별 가드
  const isFirePipeline = selectedItem?.isFirePipeline || selectedItem?.uniqueKey?.startsWith('rt-fire');
  
  const isSelectedSafety = selectedItem?.type && ['FIRE_WATER', 'SHELTER', 'RESCUE_BOX', 'AED'].includes(selectedItem.type);

  let selectedSafetyLabel = '제세동기';
  let selectedSafetyIcon = '⚡'; 

  if (selectedItem?.type === 'FIRE_WATER') {
    selectedSafetyLabel = '소방용수';
    selectedSafetyIcon = '🧯';
  } else if (selectedItem?.type === 'SHELTER') {
    selectedSafetyLabel = '대피소';
    selectedSafetyIcon = '🏢';
  } else if (selectedItem?.type === 'RESCUE_BOX') {
    selectedSafetyLabel = '인명구조함';
    selectedSafetyIcon = '🧰';
  }

  return (
    <section className="h-[300px] bg-[#4C5CA4] rounded-[40px] p-8 text-white shadow-2xl relative overflow-hidden">
      {selectedItem ? (
        /* --- [1. 상세 정보 카드 모드] --- */
        <div className="h-full flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-3xl font-black">
              {isFirePipeline ? (
                <div className="flex items-center gap-3">
                  <span className="text-[#FFB800]">🔥 실시간 화재 감지</span>
                  <span className={`text-sm px-3 py-1 rounded-full border ${
                    selectedItem.fireStage === 'cooling' ? 'bg-orange-500 border-orange-300' :
                    selectedItem.fireStage === 'resolved' ? 'bg-gray-500 border-gray-300' :
                    'bg-red-500 border-red-300' // 'active' 또는 기본값
                  }`}>
                    {selectedItem.fireStage === 'cooling' ? '진화중' : 
                     selectedItem.fireStage === 'resolved' ? '종료추정' : '진행중'}
                  </span>
                </div>
              ) : itemType === 'FIRE' ? (
                `${selectedItem.frstCetrNm || '소방서'} 정보`
              ) : itemType === 'SAFETY' ? (
                <span className="flex items-center gap-2">
                  <span>{selectedSafetyIcon}</span>
                  <span>{selectedSafetyLabel}</span>
                  <span className="text-2xl font-bold ml-1">{selectedItem.name || '안전 시설 상세'}</span>
                </span>
              ) : itemType === 'REPORT' ? (
                `시민 제보  ${selectedItem.type || '현장 제보'}`
              ) : (
                selectedItem.category || selectedItem.alertType || '상세 정보'
              )}
            </h2>
            <button 
              onClick={() => setSelectedItem(null)} 
              className="text-2xl hover:opacity-50 transition-opacity p-1"
            >
              ✕
            </button>
          </div>

          <div className="grid grid-cols-3 gap-8 flex-1 overflow-hidden">
            {/* 왼쪽 컬럼: 위치 및 발생 컨텍스트 */}
            <div className="bg-black/10 rounded-2xl p-6 border border-white/5 overflow-y-auto custom-scrollbar">
              <p className="text-sm opacity-50 mb-2 uppercase tracking-widest font-bold">
                {isFirePipeline ? 'Report Content' : (itemType === 'FIRE' ? 'Station Info' : 'Location Info')}
              </p>
              
              <div className="space-y-2">
                {isFirePipeline ? (
                  <>
                    <p className="text-lg font-bold text-white">
                      주소: {selectedItem.parsedAddress || selectedItem.locationName || '위치 분석 중...'}
                    </p>
                    <p className="text-sm font-medium text-[#69CCFE] mb-2">
                      📍 수신 지역: {selectedItem.rcptnRgnNm || '지역 정보 없음'}
                    </p>
                    <p className="text-md leading-relaxed italic opacity-90 border-t border-white/10 pt-2">
                      내용: "{selectedItem.msgCn || selectedItem.messageContent}"
                    </p>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[#FFB800]">🕒</span>
                      <span className="text-xs font-bold text-[#FFB800]">
                        발생일자: {
                          selectedItem?.crtDt || selectedItem?.createdAt 
                            ? new Date(selectedItem.crtDt || selectedItem.createdAt).toLocaleString('ko-KR', {
                                year: 'numeric', month: '2-digit', day: '2-digit',
                                hour: '2-digit', minute: '2-digit', hour12: true
                              })
                            : "정보 없음"
                        }
                      </span>
                    </div>
                  </>
                ) : itemType === 'FIRE' ? (
                  <div className="space-y-1">
                    <p className="text-xl font-bold italic">관할 코드: {selectedItem.frstCntrid || '정보 없음'}</p>
                    <p className="text-md opacity-80">위치: {selectedItem.address || '주소 데이터가 존재하지 않습니다.'}</p>
                    {fireStats?.ocrnYmd && <p className="text-sm opacity-60 italic">동기화 기준일: {fireStats.ocrnYmd}</p>}
                  </div>
                ) : itemType === 'REPORT' ? (
                  <div className="space-y-1">
                    <p className="text-base opacity-80 uppercase tracking-wider font-bold text-[#69CCFE] border-t border-white/5 flex items-center gap-1">
                      📍  제보 위치
                    </p>
                    <p className="text-sme font-bold text-white leading-relaxed">
                      {selectedItem.parsedAddress || '등록된 주소 정보가 없습니다.'}
                    </p>
                    <p className="text-base opacity-80 uppercase tracking-wider font-bold text-[#69CCFE] border-t border-white/5 flex items-center gap-1">
                     📋 제보 내용
                    </p>
                    <p className="text-sm font-bold text-white leading-relaxed">
                      {selectedItem.description || selectedItem.content || "상세 제보 내용이 비어있습니다."}
                    </p>
                    <p className="text-base opacity-80 uppercase tracking-wider font-bold text-[#69CCFE] border-t border-white/5 flex items-center gap-1">
                     🕒 제보 등록
                    </p>
                    <p className="text-sm font-bold text-white leading-relaxed ">
                      {selectedItem.createdAt ? new Date(selectedItem.createdAt).toLocaleString() : '방금 전'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {itemType === 'SAFETY' ? (
                      <div className="space-y-3">
                        <p className="text-base opacity-80 uppercase tracking-wider font-bold text-[#69CCFE] flex items-center gap-1">
                          📍  상세 위치
                        </p>
                       <p className="text-sm font-bold text-white leading-relaxed ">
                          {selectedItem.address || '등록된 주소 정보가 없습니다.'}
                        </p>
                        {selectedItem.phone && (
                          <>
                            <p className="text-base opacity-80 uppercase tracking-wider font-bold text-[#69CCFE] border-t border-white/5 flex items-center gap-1">
                              📞 관리처
                            </p>
                            <p className="text-sm font-bold text-white leading-relaxed ">
                              {selectedItem.phone}
                            </p>
                        </>
                      )}
                      </div>
                    ) : (
                      <p className="text-lg leading-relaxed italic">
                        "{selectedItem.originalText || selectedItem.msgCn}"
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* 중간 컬럼: AI 요약 정보 레이어 */}
            <div className="bg-white/10 rounded-2xl p-6 border border-white/10 overflow-y-auto custom-scrollbar">
              <p className="text-sm text-[#69CCFE] mb-2 uppercase tracking-widest font-bold">✨ AI Analysis</p>
              
              {isFirePipeline ? (
                <div className="space-y-3">
                  <p className="text-base font-bold text-white leading-relaxed italic">
                    {selectedItem.aiSummary ? `"${selectedItem.aiSummary}"` : "실시간 화재 속보를 기반으로 AI 핵심 요약을 컴파일 중입니다..."}
                  </p>
                  <div className="pt-2 border-t border-white/10">
                    <p className="text-xs text-[#69CCFE] animate-pulse">● 실시간 스트리밍 분석 작동 중</p>
                  </div>
                </div>
              ) : itemType === 'FIRE' ? (
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center bg-white/5 p-3 rounded-xl border border-white/10 flex flex-col justify-center">
                    <p className="text-xs opacity-60 mb-1">🔥 당일 화재 접수</p>
                    <p className="text-2xl font-black">{fireStats?.fireRcptMnb ?? 0}건</p>
                  </div>
                  <div className="text-center bg-red-500/20 p-3 rounded-xl border border-red-400/30 flex flex-col justify-center">
                    <p className="text-xs text-red-300 font-bold mb-1">🚒 실시간 출동건</p>
                    <p className="text-2xl font-black text-red-100">{fireStats?.fireProgMnb ?? 0}건</p>
                  </div>
                </div>
              ) : (
                <p className="text-base font-medium opacity-90 leading-relaxed italic">
                  {selectedItem.aiSummary ? `"${selectedItem.aiSummary}"` : "선택된 인프라에 대한 AI 안전 가이드라인 분석이 준비되었습니다."}
                </p>
              )}
            </div>

            {/* 오른쪽 컬럼: 인터랙티브 액션 패널 */}
            <div
              className="cursor-pointer group h-full"
              onClick={() => setIsReportModalOpen(true)}
            >
              <div className="text-center bg-white/5 p-3 rounded-xl border border-white/10 flex flex-col items-center justify-center h-full hover:bg-white/10 transition-all gap-1">
                <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center mb-2 group-hover:bg-[#69CCFE]/20 transition-colors">
                  <span className="text-2xl">📢</span>
                </div>
                <p className="text-sm font-bold text-white group-hover:scale-105 transition-transform">
                    시민 안전 제보 및 공유
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* --- [2. 내 주변 위험 요소 리스트 모드] --- */
        <div className="h-full overflow-y-auto custom-scrollbar p-2">
          <h2 className="text-3xl font-black mb-4 px-4 sticky top-0 bg-[#4C5CA4] py-2 z-10">
            📍 내 주변 {activeCategory === 'SAFETY' ? '안전 시설' : activeCategory === 'REPORT' ? '시민 제보' : '재난'}
          </h2>

          <div className="grid grid-cols-1 gap-3 px-4">
            {sortedItems.length > 0 ? (
              sortedItems.map((d) => {
                // 백엔드 엔티티 다형성을 고려한 안전 위경도 추출 구조화 
                const targetLat = d.latitude ?? d.centerLatitude ?? d.pinLatitude ?? d.lat;
                const targetLng = d.longitude ?? d.centerLongitude ?? d.pinLongitude ?? d.lng;

                const itemFireStage = d.isFirePipeline 
                  ? getFireStage(d.created_at || d.createdAt) 
                  : 'active';

                  const isItemSafety = d.type && ['FIRE_WATER', 'SHELTER', 'RESCUE_BOX', 'AED'].includes(d.type);
                  let itemSafetyLabel = '제세동기';
                  if (d.type === 'FIRE_WATER') itemSafetyLabel = '소방용수';
                  else if (d.type === 'SHELTER') itemSafetyLabel = '대피소';
                  else if (d.type === 'RESCUE_BOX') itemSafetyLabel = '인명구조함';

                return (
                  <div
                    key={d.uniqueKey}
                    onClick={() => {
                      // 훅의 아키텍처와 동일하게 명시적 타입 검증 분기 처리
                      const resolvedType = d.contentType || (d.userId || d.uniqueKey?.startsWith('report') ? 'REPORT' : isItemSafety ? 'SAFETY' : 'DISASTER');
                      handleSelectItem(d, resolvedType);
                    }}
                    className={`cursor-pointer p-4 rounded-xl border transition-all ${
                      d.contentType === 'REPORT' || d.userId ? 'bg-blue-500/10 border-blue-500/30 hover:bg-blue-500/20' : 
                      d.isFirePipeline ? (
                        itemFireStage === 'active' ? 'bg-red-600/30 border-red-500/60 animate-pulse' : 
                        itemFireStage === 'cooling' ? 'bg-orange-500/20 border-orange-500/40' : 
                        'bg-gray-500/20 border-gray-500/40'
                      ) : 'bg-white/10 border-white/10 hover:bg-white/20'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        d.contentType === 'REPORT' || d.userId ? 'bg-[#69CCFE] text-white' : 
                        d.isFirePipeline ? (
                          itemFireStage === 'active' ? 'bg-red-500 text-white' : 
                          itemFireStage === 'cooling' ? 'bg-orange-500 text-white' : 'bg-gray-400 text-black'
                        ) : 'bg-[#69CCFE] text-[#4C5CA4]'
                      }`}>
                        {d.contentType === 'REPORT' || d.userId ? '시민 제보' : (
                            d.isFirePipeline ? (
                              itemFireStage === 'active' ? '🔥 진행중' : 
                              itemFireStage === 'cooling' ? '🚒 진화중' : '✅ 종료추정'
                            ) : (isItemSafety ? itemSafetyLabel : (d.category || d.alertType || '기타'))
                        )}
                      </span>
                      
                      <span className="text-xs font-bold opacity-70">
                        {userLocation && targetLat !== undefined && targetLng !== undefined 
                          ? `${getDistance(userLocation.lat, userLocation.lng, targetLat, targetLng).toFixed(1)}km` 
                          : '- km'}
                      </span>
                    </div>
                    
                    <p className="text-sm font-medium leading-relaxed truncate">
                      {d.isFirePipeline ?(
                         `[감지] ${d.msgCn || d.messageContent}` 
                        ) : isItemSafety ? (
                          `${d.name || '시설명 정보 없음'}`
                        ) : ( (d.frstCetrNm || d.originalText || d.name || d.description || d.content || '내용 없음')
                        )}
                    </p>
                  </div>
                );
              })
            ) : (
              <div className="h-[150px] flex flex-col items-center justify-center text-white/40 gap-2">
                <p className="text-sm font-medium tracking-tight">지정된 10km 반경 내에 등록된 정보가 없습니다.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
};

export default InfoPanel;