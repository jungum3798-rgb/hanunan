"use client";
import React, { useState, useEffect } from 'react';
import { 
  Report, 
  deleteReport, 
  toggleLikeReport,  
  flagReport,        
  updateReport, 
  getReports,
  getMyLikedReports         
} from '@/services/api';

interface ReportListModalProps {
  isOpen: boolean;
  onClose: () => void;
  setIsCreateModalOpen: (open: boolean) => void;
  reportByMarkers: Report[];
  allReports: Report[];
  setAllReports: React.Dispatch<React.SetStateAction<Report[]>>;
  currentUserId: number | null;
  selectedItem: any;
  itemType: 'DISASTER' | 'WEATHER' | 'FIRE' | 'SAFETY' | 'REPORT' | null;
  onSuccess: () => void;
}

const ReportListModal = ({
  isOpen,
  onClose,
  setIsCreateModalOpen,
  reportByMarkers,
  allReports = [],
  setAllReports,
  currentUserId,
  selectedItem,
  itemType,
  onSuccess
}: ReportListModalProps) => {
  const [sortBy, setSortBy] = useState<'LATEST' | 'POPULAR'>('LATEST');
  const [editingReportId, setEditingReportId] = useState<number | null>(null);
  const [editDescription, setEditDescription] = useState('');
  const [myLikedReports, setMyLikedReports] = useState<Report[]>([]);

  //제보리스트를 열 떄 한번 더 동기화 실행
  const refreshReportsList = async () => {
    try {
      const fetchedReports = await getReports();
      setAllReports(fetchedReports);
    } catch (err) {
      console.error("타임라인 동기화 실패:", err);
    }
  };

  const refreshMyLikedReports = async () => {
    const data = await getMyLikedReports();
    setMyLikedReports(data);
  };
  
  useEffect(() => {
    onSuccess();
    refreshMyLikedReports();
  }, [isOpen]);


  if (!isOpen) return null;

  const getSafeCategory = (): 'FIRE' | 'WEATHER' | 'DISASTER' | 'SAFETY' => {
    const rawCategory = selectedItem?.category || selectedItem?.alertType || itemType;
    if (rawCategory === 'FIRE' || rawCategory === '화재') return 'FIRE';
    if (rawCategory === 'WEATHER' || rawCategory === '기상') return 'WEATHER';
    if (rawCategory === 'SAFETY' || rawCategory === '안전') return 'SAFETY';
    return 'DISASTER';
  };

  
  const handleDeletReportByMarkers= async (reportId: number) => {
    if (!currentUserId) return alert("로그인 후 이용 가능합니다.");

    if (!window.confirm("이 현장 제보를 정말 삭제하시겠습니까?")) return;
    
    try {
      const success = await deleteReport(reportId);
      if (success) {
        await refreshReportsList(); 
        alert("삭제되었습니다.");
      }
    } catch (e: any) {
      alert(e.message || "본인의 제보만 삭제할 수 있습니다.");
    }
  };

  const handleLikeReportByMarkers = async (reportId: number, isResolved: boolean) => {
    if (!currentUserId) return alert("로그인이 필요합니다.");
    if (isResolved) return; 
    
    try {
      const isNowLiked: boolean = await toggleLikeReport(reportId);
      
      await refreshReportsList(); 
      await refreshMyLikedReports();

      } catch (error) {
        console.error("좋아요 처리 실패:", error);
        alert("좋아요 처리 중 오류가 발생했습니다.");
      }
  };

  const handleFlagReportByMarkers = async (reportId: number) => {
    if (!currentUserId) return alert("로그인이 필요합니다.");
    if (!window.confirm("🚨 이 제보를 허위 제보로 신고하시겠습니까? 관리자 확인 후 처리됩니다.")) return;
    
    try {
      await flagReport(reportId);
      alert("신고가 정상 접수되었습니다.");
      await refreshReportsList(); 
    } catch (e: any) {
      alert(e.message || "신고 처리 중 오류가 발생했습니다.");
    }
  };

  const handleEditClick = (report: Report) => {
    setEditingReportId(report.id);
    setEditDescription(report.description);
  };

  const cancelEdit = () => {
    setEditingReportId(null);
    setEditDescription('');
  };

  const handleUpdateReportByMarkers = async (reportId: number) => {
    if (!editDescription.trim()) return alert("내용을 입력해 주세요.");
    
    const targetReport = allReports.find(r => r.id === reportId);
    const currentType = (targetReport as any)?.type || (targetReport as any)?.category || getSafeCategory();

    try {
      await updateReport(reportId, {
        type: currentType,
        description: editDescription
      });

      alert("제보가 수정되었습니다.");
      setEditingReportId(null);
      setEditDescription('');
      await refreshReportsList();
    } catch (e: any) {
      alert(e.message || "수정 중 오류가 발생했습니다.");
    }
  };

  const visibleReports = reportByMarkers.filter(r => {
    return (r as any).status !== 'HIDDEN';
  });

  return (
    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-6 backdrop-blur-sm">
      <div className="bg-[#F0F2F5] rounded-[40px] w-full max-w-3xl h-[80vh] flex flex-col overflow-hidden relative border-4 border-[#3954AA] shadow-2xl">

        {/* 헤더 */}
        <div className="flex justify-between items-center p-8 bg-white border-b border-gray-200 shadow-sm">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsCreateModalOpen(true)} 
              className="px-6 py-2.5 bg-[#3954AA] text-white font-black rounded-xl shadow-md hover:bg-[#2D438A] transition-all text-sm flex items-center gap-2"
            >
              <span className="text-lg">＋</span> 현장 제보 추가
            </button>
            <h2 className="text-2xl font-black text-[#3954AA] italic">CITIZEN TIMELINE</h2>
          </div>
          <button onClick={onClose} className="text-4xl text-black hover:text-gray-500 font-light">✕</button>
        </div>

        {/* 정렬 바 */}
        <div className="px-8 py-3 bg-white border-b border-gray-100 flex gap-2 justify-end">
          <button
            onClick={() => setSortBy('LATEST')}
            className={`px-4 py-1.5 text-xs font-black rounded-lg transition-all ${
              sortBy === 'LATEST' ? 'bg-[#3954AA] text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            최신순
          </button>
          <button
            onClick={() => setSortBy('POPULAR')}
            className={`px-4 py-1.5 text-xs font-black rounded-lg transition-all ${
              sortBy === 'POPULAR' ? 'bg-[#3954AA] text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            인기순
          </button>
        </div>

        {/* 리스트 영역 */}
        <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-[#F0F2F5]">
          {visibleReports.length === 0 ? (
            <div className="text-center py-24 bg-white rounded-[30px] border-2 border-dashed border-gray-200">
              <p className="text-gray-400 font-black text-base">이 사고와 관련된 실시간 현장 제보가 없습니다.</p>
            </div>
          ) : (
            [...visibleReports]
              .sort((a, b) => {
                if (sortBy === 'POPULAR') return (b.likeCount || 0) - (a.likeCount || 0);
                return new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime();
              })
              .map((report) => {
                const isMyReport = report.userId === currentUserId;
                const isEditing = editingReportId === report.id;
                
                const isResolved = (report as any).status === 'RESOLVED';
                const displayImages = (report as any).imageUrls || [];

                return (
                  <div 
                    key={report.id} 
                    className={`relative overflow-hidden bg-white rounded-[30px] p-8 border border-gray-200 shadow-sm transition-all duration-200 ${
                      isResolved ? 'bg-gray-50 border-gray-300' : 'hover:shadow-md'
                    }`}
                  >
                    
                    {/* RESOLVED 안내 배너 */}
                    {isResolved && (
                      <div className="absolute top-0 left-0 right-0 bg-gray-300/60 border-b border-gray-300 px-8 py-2 z-20 flex items-center gap-1.5 backdrop-blur-sm">
                        <span className="text-sm">✅</span>
                        <span className="text-[11px] font-black text-gray-600 tracking-tight">
                          신고에 대한 해결중인 시민제보입니다.
                        </span>
                      </div>
                    )}
                    
                    {/* 조작계 */}
                    <div className={`absolute right-8 flex flex-col items-center w-16 z-30 ${isResolved ? 'top-14' : 'top-8'}`}>
                      <div className="flex flex-col items-center mb-3">
                        <button
                          disabled={isResolved}
                          onClick={() => handleLikeReportByMarkers(report.id, isResolved)}
                          className={`w-11 h-11 flex items-center justify-center rounded-full border border-gray-100 shadow-sm transition-transform ${
                            isResolved ? 'bg-gray-200 opacity-50 cursor-not-allowed' : 'bg-gray-50 active:scale-125'
                          }`}
                        >
                          <span className="text-xl">
                            {myLikedReports.some(likedReport => likedReport.id === report.id) ? '❤️' : '🤍'}
                          </span>
                        </button>
                        <span className={`text-xs font-black mt-0.5 ${isResolved ? 'text-gray-400' : 'text-[#E91E63]'}`}>
                          {report.likeCount || 0}
                        </span>
                      </div>

                      {!isMyReport && !isResolved && (
                        <button onClick={() => handleFlagReportByMarkers(report.id)} className="flex flex-col items-center group/report">
                          <div className="w-9 h-9 flex items-center justify-center bg-gray-50 rounded-full border border-gray-100 shadow-sm group-hover/report:bg-red-50 transition-colors">
                            <span className="text-sm">🚨</span>
                          </div>
                          <span className="text-[9px] font-black text-gray-400 mt-0.5 tracking-tighter">신고</span>
                        </button>
                      )}
                    </div>

                    {/* 본문 콘텐츠 */}
                    <div className={`transition-all pr-16 ${isResolved ? 'mt-8 grayscale opacity-50 select-none' : ''}`}>
                      <div className="mb-4">
                        <div className="flex items-center gap-2">
                          <p className={`font-black text-lg ${isMyReport ? 'text-orange-600' : 'text-[#3954AA]'}`}>
                            {report.nickname || `시민 제보자(${report.userId})`}
                          </p>
                          {isMyReport && (
                            <span className="bg-orange-100 text-orange-600 text-[10px] font-black px-2 py-0.5 rounded-md border border-orange-200">
                              내 제보
                            </span>
                          )}
                          {report.gpsVerified && (
                            <span className="bg-emerald-100 text-emerald-700 text-[10px] font-black px-2 py-0.5 rounded-md border border-emerald-200">
                              ✓ 위치 인증됨
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 font-medium mt-0.5">
                          ⏰ {report.createdAt ? new Date(report.createdAt).toLocaleString('ko-KR') : '시간 정보 없음'}
                        </p>
                      </div>

                      {isEditing ? (
                        <div className="space-y-3 mb-4">
                          <textarea
                            value={editDescription}
                            onChange={(e) => setEditDescription(e.target.value)}
                            className="w-full p-4 border-2 border-orange-300 rounded-2xl focus:outline-none focus:border-orange-500 bg-white text-black text-base font-medium resize-none h-28 shadow-inner"
                          />
                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={() => handleUpdateReportByMarkers(report.id)}
                              className="px-4 py-2 bg-orange-500 text-white rounded-xl text-xs font-black shadow-md hover:bg-orange-600"
                            >
                              변경 내용 저장
                            </button>
                            <button onClick={cancelEdit} className="px-4 py-2 bg-gray-200 text-gray-600 rounded-xl text-xs font-black hover:bg-gray-300">
                              취소
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-gray-800 text-base leading-relaxed mb-4 font-semibold whitespace-pre-wrap">
                          {report.description}
                        </p>
                      )}

                      {/* 이미지 피드 */}
                      {Array.isArray(displayImages) && displayImages.length > 0 && (
                        <div className="flex gap-3 overflow-x-auto pb-2 pt-1 scrollbar-thin">
                          {displayImages.map((url: string, i: number) => (
                            <div key={i} className="relative h-32 w-48 flex-shrink-0 rounded-xl overflow-hidden border border-gray-100 shadow-sm">
                              <img src={`${process.env.NEXT_PUBLIC_API_URL}${url}`} className="h-full w-full object-cover" alt="현장 증거 사진" />
                            </div>
                          ))}
                        </div>
                      )}

                      {/* 하단 제어계 */}
                      {isMyReport && !isEditing && !isResolved && (
                        <div className="mt-4 flex gap-2 items-center text-[11px] font-black tracking-wide">
                          <button onClick={() => handleEditClick(report)} className="text-blue-500 hover:text-blue-700 hover:underline">
                            내용 수정
                          </button>
                          <span className="text-gray-200">|</span>
                          <button onClick={() => handleDeletReportByMarkers(report.id)} className="text-red-400 hover:text-red-600 hover:underline">
                            제보 삭제
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
          )}
        </div>
      </div>
    </div>
  );
};

export default ReportListModal;