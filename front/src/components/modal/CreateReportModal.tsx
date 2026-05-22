"use client";
import React, { useState, useRef, useEffect } from 'react';
import { createReport, Report } from '@/services/api';

interface CreateReportModalProps {
  isOpen: boolean;
  setIsCreateModalOpen: (open: boolean) => void;
  setIsReportModalOpen: (open: boolean) => void;
  currentUserId: number | null; 
  selectedItem: any;
  itemType: 'DISASTER' | 'WEATHER' | 'FIRE' | 'SAFETY' | 'REPORT';
  onSuccess: () => void;
}

const CreateReportModal = ({
  isOpen,
  setIsCreateModalOpen,
  setIsReportModalOpen,
  currentUserId,
  selectedItem,
  itemType,
  onSuccess
}: CreateReportModalProps) => {

  const [newDescription, setNewDescription] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]); 
  const [previews, setPreviews] = useState<string[]>([]);      
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    onSuccess();
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + selectedFiles.length > 3) {
      alert("사진은 최대 3장까지 업로드 가능합니다.");
      return;
    }
    setSelectedFiles(prev => [...prev, ...files]);
    
    const newPreviews = files.map(file => URL.createObjectURL(file));
    setPreviews(prev => [...prev, ...newPreviews]);
  };

  const removeImage = (index: number) => {
    URL.revokeObjectURL(previews[index]); // 메모리 누수 방지
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const clearPreviews = () => {
    previews.forEach(url => URL.revokeObjectURL(url));
    setPreviews([]);
    setSelectedFiles([]);
    setNewDescription('');
  };

  const handleCreateReport = async () => {
    
    if (!currentUserId) {
      alert('로그인 세션이 만료되었습니다. 다시 로그인해 주세요.');
      return;
    }
    if (!newDescription.trim()) { 
      alert('현장 내용을 입력해 주세요.'); 
      return; 
    }
    if (!selectedItem) { 
      alert('연동할 대상 마커 정보가 누락되었습니다.'); 
      return; 
    }

    setIsSubmitting(true);

    if (!navigator.geolocation) {
      alert("이 브라우저는 위치 정보를 지원하지 않습니다.");
      setIsSubmitting(false);
      return;
    }

    // 디바이스 GPS 기반 실시간 위치 트래킹 시작
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const reportData = {
          type: itemType,
          description: newDescription,
          pinLatitude: Number(selectedItem.latitude || selectedItem.lat || selectedItem.centerLatitude),
          pinLongitude: Number(selectedItem.longitude || selectedItem.lng || selectedItem.centerLongitude),
          userLatitude: pos.coords.latitude,
          userLongitude: pos.coords.longitude,
          userAccuracyMeters: 5,
          images: selectedFiles,
        };

        try {
         
          const savedReport = await createReport(reportData);
          
          if (!isMountedRef.current) return; //모달이 닫혔다면 상태 변경 스킵

          onSuccess();
          
          clearPreviews();
          setIsCreateModalOpen(false);
          setIsReportModalOpen(true); // 작성 완료 후 리스트 레이어로 자연스러운 복귀 처리
          
          // 백엔드 비즈니스 로직에 따른 인증 여부 얼럿 분기
          alert(savedReport.gpsVerified ? "🎉 반경 내 위치 인증 완료! 제보가 등록되었습니다." : "제보가 성공적으로 접수되었습니다.");
        } catch (e: any) {
          const backendMessage = e.response?.data?.message;

          /*디버깅용 주석으로 삭제X
          if (backendMessage) console.error("현장 제보 전송 실패:",backendMessage);
          else console.error("현장 제보 전송 실패:",e);*/
          if (isMountedRef.current) {
            setIsSubmitting(false); 
            if (backendMessage) {
              alert(backendMessage); 
            } else {
              alert(e.message || "제보 등록 중 서버 오류가 발생했습니다.");
            }
          }
        }
      },
      (geoError) => {
        if (isMountedRef.current) {
          setIsSubmitting(false);
        }

        console.warn("GPS 호출 인가 거부 또는 타임아웃:", geoError);
        alert("실시간 현장 제보의 신뢰성 검증을 위해 브라우저 위치 정보(GPS) 권한 허용이 필수적입니다. 주소창의 권한 설정을 확인해 주세요.");
      },
      { 
        enableHighAccuracy: false, // 데스크톱/노트북 환경 타임아웃 주범을 해제하여 성공률을 대폭 높입니다.
        timeout: 7000,              // 모바일 기기 위성 신호 대기를 고려해 7초로 여유 확보
        maximumAge: 10000           // 10초 이내에 측정된 캐시 위치가 있다면 바로 활용 (반응 속도 향상)
      }
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[110] flex items-center justify-center p-6 backdrop-blur-sm">
      <div className="bg-[#E4E9F2] rounded-[30px] w-full max-w-2xl p-10 relative shadow-2xl border-4 border-[#3954AA] animate-slide-up">
        {!isSubmitting && (
          <button
            onClick={() => {
              setIsCreateModalOpen(false);
              clearPreviews();
            }}
            className="absolute top-6 right-6 text-3xl text-black hover:text-gray-600 transition-colors"
          >
            ✕
          </button>
        )}
        
        <div className="space-y-6">
          <div>
            <h3 className="text-2xl font-black text-[#3954AA] italic mb-4">
              <span className="text-red-500">📍</span> FIELD REPORT FORM
            </h3>
            <label className="text-sm font-black text-[#3954AA] uppercase tracking-wider block mb-2">1. DESCRIPTION</label>
            <textarea
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              className="w-full text-black opacity-100 text-lg rounded-2xl h-40 p-6 border-2 border-gray-100 bg-white focus:outline-none focus:border-[#3954AA] shadow-sm resize-none font-medium placeholder:text-gray-300"
              placeholder="선택한 마커 주변의 실제 현장 상황이나 추가 피해 소식을 상세히 공유해 주세요."
            />
          </div>

          <div>
            <label className="text-sm font-black text-[#3954AA] uppercase tracking-wider block mb-2">
              2. ATTACH IMAGES ({previews.length}/3)
            </label>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              accept="image/*" 
              multiple 
              className="hidden" 
            />
            <div className="grid grid-cols-4 gap-4">
              {previews.map((src, idx) => (
                <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border-2 border-white shadow-md bg-gray-100">
                  <img src={src} alt="preview" className="w-full h-full object-cover" />
                  <button 
                    onClick={() => removeImage(idx)} 
                    className="absolute top-1 right-1 bg-black/60 text-white w-6 h-6 rounded-full text-xs flex items-center justify-center hover:bg-black/80 transition-colors font-bold"
                  >
                    ✕
                  </button>
                </div>
              ))}
              {previews.length < 3 && (
                <div 
                  onClick={() => fileInputRef.current?.click()} 
                  className="aspect-square bg-white rounded-xl flex flex-col items-center justify-center border-2 border-dashed border-[#3954AA]/40 cursor-pointer hover:bg-white/80 hover:border-[#3954AA] transition-all shadow-sm group"
                >
                  <span className="text-[#3954AA] text-3xl font-light group-hover:scale-110 transition-transform">＋</span>
                  <span className="text-xs text-[#3954AA]/60 font-bold mt-1">사진 추가</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <button
              onClick={handleCreateReport}
              disabled={isSubmitting}
              className={`w-full py-4 font-black rounded-xl text-lg shadow-lg transition-all transform active:scale-[0.98] ${
                isSubmitting
                  ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                  : 'bg-[#3954AA] text-white hover:bg-[#2e4388] hover:scale-[1.01]'
              }`}
            >
              {isSubmitting ? "🛰️ 현장 검증 및 업로드 중..." : "SUBMIT FIELD REPORT"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateReportModal;