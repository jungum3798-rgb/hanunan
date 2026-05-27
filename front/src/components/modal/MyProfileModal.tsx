// 나의 활동 내역 조회 모달
"use client";
import React, { useState, useEffect } from 'react';
import { 
    Report, 
    FeedComment,
    deleteReport,
    updateReport,
    deleteComment,
    getAllComments,
    getCommentAuthorName,
} from '@/services/api';

interface MyProfileModalProps {
    userId: number;
    onClose: () => void;
    reportMarkers: Report[];
    reportByMarkers:  Report[];
    onSuccess: () => void;
}

const MyProfileModal = ({
    userId,
    onClose,
    reportMarkers = [],
    reportByMarkers = [],
    onSuccess
}: MyProfileModalProps) => {
    const [activeTab, setActiveTab] = useState<'REPORTMARKERS' | 'REPORTBYMAKERS' | 'COMMENT'>('REPORTMARKERS');
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editValue, setEditValue] = useState("");
    const [myComments, setMyComments] = useState<FeedComment[]>([]);

    useEffect(() => {
        getAllComments()
            .then((all) => setMyComments(all.filter((c) => c.userId === userId)))
            .catch(() => setMyComments([]));
    }, [userId]);

    const myReportMarkers = reportMarkers
        .filter(r => r.userId === userId && (r as any).status !== 'HIDDEN');
    const myrRportByMarkers = reportByMarkers
        .filter(r => r.userId === userId && (r as any).status !== 'HIDDEN');

    const onDeleteClick = async (id: number) => {
        if (!window.confirm("정말로 삭제하시겠습니까?")) return;
        try {
            if (activeTab === 'REPORTBYMAKERS') {
                await deleteReport(id);
                onSuccess();
            } else if (activeTab === 'COMMENT') {
                await deleteComment(id);
                setMyComments(prev => prev.filter(c => c.id !== id));
            } else {
                await deleteReport(id);
                onSuccess();
            }
            alert("삭제되었습니다.");
        } catch (error) {
            alert("삭제에 실패했습니다.");
        }
    };

    const onSaveEdit = async (id: number) => {
        if (!editValue.trim()) return;
        try {
            if (activeTab === 'REPORTBYMAKERS') {
                const target = reportByMarkers.find(r => r.id === id);
                const currentType = (target as any)?.type || (target as any)?.category || 'DISASTER';

                await updateReport(id, {
                    type: currentType,
                    description: editValue
                });
                
                onSuccess();
            } else if (activeTab === 'COMMENT') {
                alert("댓글 수정은 지원하지 않습니다. 삭제 후 다시 작성해 주세요.");
                return;
            } else {
                const target = reportMarkers.find(r => r.id === id);
                const currentType = (target as any)?.type || 'DISASTER';

                await updateReport(id, {
                    type: currentType,
                    description: editValue
                });

                onSuccess();
            }
            setEditingId(null);
            alert("수정되었습니다.");
        } catch (error: any) {
            alert(error.message || "수정에 실패했습니다.");
        }
    };

    const currentList = activeTab === 'REPORTMARKERS' ? myReportMarkers : activeTab === 'REPORTBYMAKERS' ? myrRportByMarkers : myComments;

    return (
        <div className="fixed inset-0 z-[110] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white w-full max-w-2xl rounded-[30px] overflow-hidden shadow-2xl text-black">
                <div className="p-6 border-b flex justify-between items-center bg-white">
                    <h2 className="text-xl font-black text-[#4C5CA4]">내 활동 내역</h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full text-gray-400">✕</button>
                </div>

                <div className="flex bg-gray-50 border-b">
                    {['REPORTMARKERS', 'REPORTBYMAKERS', 'COMMENT'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => { setActiveTab(tab as any); setEditingId(null); }}
                            className={`flex-1 py-4 font-bold text-xs ${activeTab === tab ? 'text-[#4C5CA4] border-b-2 border-[#4C5CA4] bg-white' : 'text-gray-400'}`}
                        >
                            {tab === 'REPORTMARKERS' ? `📍 시민 제보 (${myReportMarkers.length})` :
                                tab === 'REPORTBYMAKERS' ? `💬 현장 공유 (${myrRportByMarkers.length})` :
                                    `✍️ 내 댓글 (${myComments.length})`}
                        </button>
                    ))}
                </div>

                <div className="h-[500px] overflow-y-auto p-6 space-y-4 bg-white">
                    {currentList.length > 0 ? (
                        [...currentList]
                        .sort((a, b) => new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime())
                        .map((item: any) => {
                            const isEditing = editingId === item.id;
                            const displayImages = item.imageUrls || item.imageUrl || [];
                            const isCommentTab = activeTab === 'COMMENT';
                            return (
                                <div key={item.id} className={`p-5 rounded-2xl border transition-all ${isEditing ? 'border-[#4C5CA4] bg-blue-50/20' : 'border-gray-100 bg-gray-50/30'}`}>
                                    <div className="flex justify-between items-start mb-3">
                                        <span className="text-[11px] font-bold px-2 py-1 bg-white border rounded-lg text-gray-500">
                                            {isCommentTab ? item.type : (item.type || item.category)}
                                        </span>
                                        <div className="flex gap-3">
                                            {isEditing ? (
                                                <><button onClick={() => onSaveEdit(item.id)} className="text-[11px] font-bold text-blue-600">저장</button>
                                                    <button onClick={() => setEditingId(null)} className="text-[11px] font-bold text-gray-400">취소</button></>
                                            ) : (
                                                <>
                                                    {!isCommentTab && (
                                                        <button onClick={() => { setEditingId(item.id); setEditValue(item.description); }} className="text-[11px] font-bold text-gray-400 hover:text-blue-600">수정</button>
                                                    )}
                                                    <button onClick={() => onDeleteClick(item.id)} className="text-[11px] font-bold text-gray-400 hover:text-red-500">삭제</button>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {isEditing ? (
                                        <textarea
                                            value={editValue}
                                            onChange={(e) => setEditValue(e.target.value)}
                                            className="w-full p-3 text-sm border-2 border-blue-100 rounded-xl focus:outline-none focus:border-[#4C5CA4] resize-none h-24 mb-2 text-black font-medium"
                                        />
                                    ) : (
                                        <p className="text-sm text-gray-700 font-bold mb-3">
                                            {isCommentTab ? item.content : item.description}
                                        </p>
                                    )}

                                    {activeTab === 'REPORTBYMAKERS' && Array.isArray(displayImages) && displayImages.length > 0 && (
                                        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                                            {displayImages.map((url: string, i: number) => (
                                                <img key={i} src={`${process.env.NEXT_PUBLIC_API_URL}${url}`} className="h-20 w-32 object-cover rounded-xl border flex-shrink-0 shadow-sm" alt="제보사진" />
                                            ))}
                                        </div>
                                    )}
                                    <div className="mt-2 flex justify-between items-center">
                                        <p className="text-[10px] text-gray-400">
                                            {isCommentTab
                                                ? getCommentAuthorName(item)
                                                : `📍 ${item.locationName || "위치 정보 없음"}`}
                                        </p>
                                        {item.createdAt && (
                                            <p className="text-[10px] text-gray-400">{new Date(item.createdAt).toLocaleString('ko-KR')}</p>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-gray-400 font-bold space-y-2">
                            <p className="text-xl">작성된 내역이 없습니다.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MyProfileModal;
