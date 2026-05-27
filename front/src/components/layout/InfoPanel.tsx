// 하단 패널 컴포넌트 - 실시간 데이터 및 제보 파이프라인 보정본

import React,{useState,useEffect} from 'react';
import { getFireStage } from "@/utils/fireUtils";
import { getDisasterTypeUi, formatPipelineBadge, getPipelineStageLabel } from "@/utils/disasterUtils";
import { getWeatherAlertLevelUiClasses } from "@/utils/weatherMapUtils";
import {NewsArticle, getDisasterNews} from '@/services/api';

interface InfoPanelProps {
  selectedItem: any;
  itemType: 'DISASTER' | 'WEATHER' | 'FIRE' | 'SAFETY' | 'REPORT' | null;
  fireStats: any;
  activeCategory: 'DISASTER' | 'SAFETY' | 'REPORT';
  sortedItems: any[];
  sortedFireDisasterItems: any[];
  sortedWeatherDisasterItems: any[];
  userLocation: { lat: number; lng: number } | null;
  setSelectedItem: (item: any) => void;
  handleSelectItem: (
    item: any, 
    type: 'DISASTER' | 'WEATHER' | 'FIRE' | 'SAFETY' | 'REPORT'
  ) => void | Promise<void>;
  getDistance: (lat1: number, lng1: number, lat2: number, lng2: number) => number;
  setIsReportModalOpen: (open: boolean) => void;
  fireMarkers: any[];
  news: NewsArticle[];
}

const InfoPanel: React.FC<InfoPanelProps> = ({
  selectedItem,
  itemType,
  fireStats,
  activeCategory,
  sortedItems,
  sortedFireDisasterItems,
  sortedWeatherDisasterItems,
  userLocation,
  setSelectedItem,
  handleSelectItem,
  getDistance,
  setIsReportModalOpen,
  fireMarkers,
  news
}) => {

  // 실시간 화재/기타 재난 데이터 파이프라인 여부 식별 가드
  const isFirePipeline = selectedItem?.isFirePipeline || selectedItem?.uniqueKey?.startsWith('rt-fire');
  const isDisasterPipeline = selectedItem?.isDisasterPipeline || selectedItem?.uniqueKey?.startsWith('rt-disaster');
  const disasterTypeUi = isDisasterPipeline ? getDisasterTypeUi(selectedItem?.disasterType) : null;
  const fireTypeUi = isFirePipeline ? getDisasterTypeUi('화재') : null;
  const selectedPipelineStage = (isFirePipeline || isDisasterPipeline)
    ? getFireStage(selectedItem?.createdAt || selectedItem?.crtDt || '')
    : 'active';
  
  const isSelectedSafety = selectedItem?.type && ['FIRE_WATER', 'SHELTER', 'RESCUE_BOX', 'AED'].includes(selectedItem.type);

  let selectedSafetyLabel = '제세동기';
  let selectedSafetyIcon = '⚡'; 

  if (selectedItem?.type === 'FIRE_WATER') {
    selectedSafetyLabel = '소방용수';
    selectedSafetyIcon = '🧯';
  } else if (selectedItem?.type === 'SHELTER') {
    selectedSafetyLabel = '대피소';
    selectedSafetyIcon = '🏢';
  } else   if (selectedItem?.type === 'RESCUE_BOX') {
    selectedSafetyLabel = '인명구조함';
    selectedSafetyIcon = '🧰';
  }

  const renderDisasterListItem = (d: any) => {
    const isWeather = d.isWeatherAlert === true;

    const targetLat = isWeather ? null : (d.latitude ?? d.centerLatitude ?? d.pinLatitude ?? d.lat);
    const targetLng = isWeather ? null : (d.longitude ?? d.centerLongitude ?? d.pinLongitude ?? d.lng);

    const itemPipelineStage = (d.isFirePipeline || d.isDisasterPipeline)
      ? getFireStage(d.created_at || d.createdAt)
      : 'active';
    const weatherLevelStyle = d.isWeatherAlert
      ? getWeatherAlertLevelUiClasses(d.alertLevel) //색상 설정
      : null;

    const isItemSafety = d.type && ['FIRE_WATER', 'SHELTER', 'RESCUE_BOX', 'AED'].includes(d.type);
    let itemSafetyLabel = '제세동기';
    if (d.type === 'FIRE_WATER') itemSafetyLabel = '소방용수';
    else if (d.type === 'SHELTER') itemSafetyLabel = '대피소';
    else if (d.type === 'RESCUE_BOX') itemSafetyLabel = '인명구조함';

    return (
      <div
        key={d.uniqueKey}
        onClick={() => {
          const resolvedType =
            d.contentType === 'WEATHER' ? 'WEATHER'
            : d.userId || d.uniqueKey?.startsWith('report') ? 'REPORT'
            : isItemSafety ? 'SAFETY'
            : d.contentType === 'FIRE' ? 'FIRE'
            : d.contentType || 'DISASTER';
          handleSelectItem(d, resolvedType);
        }}
        className={`cursor-pointer p-4 rounded-xl border transition-all ${
          d.contentType === 'REPORT' || d.userId ? 'bg-blue-500/10 border-blue-500/30 hover:bg-blue-500/20' :
          d.isWeatherAlert && weatherLevelStyle
            ? `${weatherLevelStyle.container} hover:opacity-90`
            : d.isFirePipeline || d.isDisasterPipeline ? (
            itemPipelineStage === 'active' ? 'bg-red-600/30 border-red-500/60 animate-pulse' :
            itemPipelineStage === 'cooling' ? 'bg-orange-500/20 border-orange-500/40' :
            'bg-gray-500/20 border-gray-500/40'
          ) : 'bg-white/10 border-white/10 hover:bg-white/20'
        }`}
      >
        <div className="flex justify-between items-start mb-1">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
            d.isWeatherAlert && weatherLevelStyle
              ? weatherLevelStyle.badge
              : d.contentType === 'REPORT' || d.userId ? 'bg-[#69CCFE] text-white' :
            d.isFirePipeline || d.isDisasterPipeline ? (
              itemPipelineStage === 'active' ? 'bg-red-500 text-white' :
              itemPipelineStage === 'cooling' ? 'bg-orange-500 text-white' : 'bg-gray-400 text-black'
            ) : 'bg-[#69CCFE] text-[#4C5CA4]'
          }`}>
            {d.isWeatherAlert ? (
              `🌦️ ${d.dstSeNm || d.category}${d.alertLevel ? ` · ${d.alertLevel}` : ''}`
            ) : d.contentType === 'REPORT' || d.userId ? '시민 제보' : (
                d.isFirePipeline ? (
                  formatPipelineBadge('화재', itemPipelineStage)
                ) : d.isDisasterPipeline ? (
                  formatPipelineBadge(d.disasterType || '재난', itemPipelineStage)
                ) : (isItemSafety ? itemSafetyLabel : (d.category || d.alertType || '기타'))
            )}
          </span>

          <span className="text-xs font-bold opacity-70 shrink-0 ml-2">
            {d.isWeatherAlert && d.createdAt ? (
              new Date(d.createdAt).toLocaleString('ko-KR', {
                month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: true,
              })
            ) : userLocation && targetLat !== undefined && targetLng !== undefined
              ? `${getDistance(userLocation.lat, userLocation.lng, targetLat, targetLng).toFixed(1)}km`
              : '- km'}
          </span>
        </div>

        <p className="text-sm font-medium leading-relaxed truncate">
          {d.isWeatherAlert ? (
            `[기상] ${d.messageContent || d.msgCn || d.originalText || '내용 없음'}`
          ) : d.isFirePipeline || d.isDisasterPipeline ? (
             `[감지] ${d.msgCn || d.messageContent}`
            ) : isItemSafety ? (
              `${d.name || '시설명 정보 없음'}`
            ) : ( (d.frstCetrNm || d.originalText || d.name || d.description || d.content || '내용 없음')
            )}
        </p>
      </div>
    );
  };

  const renderEmptyList = (message: string) => (
    <div className="h-[120px] flex flex-col items-center justify-center text-white/40 gap-2">
      <p className="text-sm font-medium tracking-tight text-center px-2">{message}</p>
    </div>
  );

  return (
    <section className="h-[300px] bg-[#4C5CA4] rounded-[40px] p-8 text-white shadow-2xl relative overflow-hidden">
      {selectedItem ? (
        /* --- [1. 상세 정보 카드 모드] --- */
        <div className="h-full flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-3xl font-black">
              {isFirePipeline && fireTypeUi ? (
                <div className="flex items-center gap-3">
                  <span className="text-[#FFB800]">
                    {fireTypeUi.icon} 실시간 {fireTypeUi.label} 감지
                  </span>
                  <span className={`text-sm px-3 py-1 rounded-full border ${
                    selectedPipelineStage === 'cooling' ? 'bg-orange-500 border-orange-300' :
                    selectedPipelineStage === 'active' ? 'bg-red-500 border-red-300' :
                    'bg-gray-500 border-gray-300'
                  }`}>
                    {getPipelineStageLabel(selectedPipelineStage)}
                  </span>
                  {selectedItem.alertLevel && (
                    <span className="text-sm px-3 py-1 rounded-full border bg-white/10 border-white/20">
                      {selectedItem.alertLevel}
                    </span>
                  )}
                </div>
              ) : isDisasterPipeline && disasterTypeUi ? (
                <div className="flex items-center gap-3">
                  <span className="text-[#FFB800]">
                    {disasterTypeUi.icon} 실시간 {disasterTypeUi.label} 감지
                  </span>
                  {selectedItem.alertLevel && (
                    <span className="text-sm px-3 py-1 rounded-full border bg-white/10 border-white/20">
                      {selectedItem.alertLevel}
                    </span>
                  )}
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
              ) : itemType === 'WEATHER' ? (
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-[#FFB800]">
                    🌦️ 실시간 {selectedItem.dstSeNm || selectedItem.category || '기상'} 감지
                  </span>
                  {selectedItem.alertLevel && (
                    <span className={`text-sm px-3 py-1 rounded-full font-bold ${
                      getWeatherAlertLevelUiClasses(selectedItem.alertLevel).badge
                    }`}>
                      {selectedItem.alertLevel}
                    </span>
                  )}
                </div>
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
                {isFirePipeline || isDisasterPipeline ? 'Report Content' : (itemType === 'FIRE' ? 'Station Info' : 'Location Info')}
              </p>
              
              <div className="space-y-2">
                {isFirePipeline || isDisasterPipeline ? (
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
                ) : itemType === 'WEATHER' ? (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-[#69CCFE]">
                      📍 수신 지역: {selectedItem.rcptnRgnNm || '지역 정보 없음'}
                    </p>
                    <p className="text-md leading-relaxed italic opacity-90 border-t border-white/10 pt-2">
                      "{selectedItem.messageContent || selectedItem.msgCn || selectedItem.originalText}"
                    </p>
                    <p className="text-xs opacity-60">
                      {selectedItem.createdAt
                        ? new Date(selectedItem.createdAt).toLocaleString('ko-KR')
                        : '발송 시각 정보 없음'}
                    </p>
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
              
              {isFirePipeline || isDisasterPipeline ? (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-white/50 uppercase tracking-wider px-1">관련 뉴스 속보</h4>
                  {news && news.length > 0 ? (
                    <div className="space-y-2">
                      {news.slice(0, 3).map((item, idx) => (
                        <a 
                          key={idx} 
                          href={item.naverLink || item.link} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="group block p-3 bg-white/5 border border-white/10 rounded-lg hover:bg-red-900/20 hover:border-red-500/30 transition-all"
                        >
                          <p className="text-sm font-medium text-white group-hover:text-red-200 transition-colors truncate">
                            {item.title.replace(/<[^>]*>?/g, '')}
                          </p>
                          <p className="text-[10px] text-white/40 mt-1">{item.pubDate}</p>
                        </a>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 border border-dashed border-white/10 rounded-lg text-center">
                      <p className="text-xs text-white/40">기사를 수집 중입니다. (약 10분 소요)</p>
                    </div>
                  )}
                </div>
                          ) : (
                <p className="text-base font-medium opacity-90 leading-relaxed italic">
                  {selectedItem.aiSummary ? `"${selectedItem.aiSummary}"` : "선택된 인프라에 대한 AI 안전 가이드라인 분석이 준비중입니다."}
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
        <div className="h-full flex flex-col overflow-hidden p-2">
          <h2 className="text-3xl font-black mb-4 px-4 shrink-0">
            📍 내 주변 {activeCategory === 'SAFETY' ? '안전 시설' : activeCategory === 'REPORT' ? '시민 제보' : '재난'}
          </h2>

          {activeCategory === 'DISASTER' ? (
            <div className="flex-1 grid grid-cols-2 gap-4 px-4 min-h-0">
              {/*  화재 재난  */}
              <div className="flex flex-col min-h-0 border-r border-white/10 pr-4">
                <h3 className="text-xl font-black mb-3 shrink-0 flex items-center gap-2">
                  <span>🚨 긴급 사고</span>
                  <span className="text-xs font-bold opacity-60 ml-auto">거리순</span>
                </h3>
                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 min-h-0">
                  {sortedFireDisasterItems.length > 0
                    ? sortedFireDisasterItems.map(renderDisasterListItem)
                    : renderEmptyList('10km 반경 내 화재·기타 재난 정보가 없습니다.')}
                </div>
              </div>

              {/* 기상 재난  */}
              <div className="flex flex-col min-h-0 pl-0">
                <h3 className="text-xl font-black mb-3 shrink-0 flex items-center gap-2">
                  <span>🌦️</span>
                  <span>기상 재난</span>
                  <span className="text-xs font-bold opacity-60 ml-auto">최신순</span>
                </h3>
                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 min-h-0">
                  {sortedWeatherDisasterItems.length > 0
                    ? sortedWeatherDisasterItems.map(renderDisasterListItem)
                    : renderEmptyList('등록된 기상 재난 정보가 없습니다.')}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0">
              <div className="grid grid-cols-1 gap-3 px-4">
                {sortedItems.length > 0 ? (
                  sortedItems.map(renderDisasterListItem)
                ) : (
                  renderEmptyList('지정된 10km 반경 내에 등록된 정보가 없습니다.')
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
};

export default InfoPanel;