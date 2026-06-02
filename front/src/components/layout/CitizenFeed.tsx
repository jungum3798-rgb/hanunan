// 시민 댓글 피드

import React, { useState, useEffect, useCallback } from 'react';
import { ReportComment } from '../../services/api';
import {
  CommentMapType,
  createCommentViaWebSocket,
  deleteCommentViaWebSocket,
} from '../../services/commentWebSocket';


interface CitizenFeedProps {
  activeCategory: 'DISASTER' | 'SAFETY' | 'REPORT';
  currentUserId: number;
  isLoggedIn: boolean;
  onLoginRequired: () => void;
  comments: ReportComment[];
}


export default function CitizenFeed({
  activeCategory,
  currentUserId,
  isLoggedIn,
  onLoginRequired,
  comments,
}: CitizenFeedProps) {
  //const [comments, setComments] = useState<FeedComment[]>([]);
  const [commentInput, setCommentInput] = useState('');
  const [isMounted, setIsMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // const loadComments = useCallback(async () => {
  //   setIsLoading(true);
  //   try {
  //     const data = await getCommentsByType(activeCategory);
  //     setComments(data);
  //   } catch (e) {
  //     console.error('댓글 조회 실패', e);
  //     setComments([]);
  //   } finally {
  //     setIsLoading(false);
  //   }
  // }, [activeCategory]);

  // useEffect(() => {
  //   setIsMounted(true);
  // }, []);

  // const categoryPlaceholder: Record<CommentMapType, string> = {
  //   DISASTER: '재난 상황에 대한 의견을 남겨주세요...',
  //   SAFETY: '안전시설에 대한 의견을 남겨주세요...',
  //   REPORT: '시민 제보에 대한 의견을 남겨주세요...',
  // };

  const CATEGORY_LABEL: Record<CommentMapType, string> = {
    DISASTER: '재난',
    SAFETY: '안전시설',
    REPORT: '시민 제보',
  };

const PLACEHOLDER: Record<CommentMapType, string> = {
  DISASTER: '재난 현장 상황을 공유하세요...',
  SAFETY: '안전시설 관련 정보를 공유하세요...',
  REPORT: '제보에 대한 의견을 남겨주세요...',
};

  // useEffect(() => {
  //   loadComments();
  // }, [loadComments]);

  const handleAddComment = async () => {
    if (!commentInput.trim()) return;

    if (!isLoggedIn) {
      onLoginRequired();
      return;
    }

    setIsSubmitting(true);

    try {
      // const savedComment = await createComment(activeCategory, commentInput.trim());
      // setComments((prev) => [savedComment, ...prev]);
      // setCommentInput('');
      await createCommentViaWebSocket(activeCategory, commentInput.trim());
      setCommentInput('');
    } catch (e) {
      console.error('댓글 등록 실패', e);
      alert('댓글 등록 중 오류가 발생했습니다. 로그인 상태를 확인해 주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: number) => {
    if (!window.confirm('댓글을 삭제하시겠습니까?')) return;

    if (!isLoggedIn) {
      onLoginRequired();
      return;
    }

    try {
      // await deleteComment(commentId);
      // setComments((prev) => prev.filter((c) => c.id !== commentId));
      await deleteCommentViaWebSocket(commentId);
    } catch (e) {
      console.error('댓글 삭제 실패', e);
      alert('댓글 삭제 중 오류가 발생했습니다.');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAddComment();
    }
  };

  return (
    <section className="flex-1 flex flex-col bg-white rounded-[30px] shadow-lg border border-[#3954AA]/10 overflow-hidden">
      <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-[#3954AA]/5">
        <span className="font-black text-[#3954AA] text-xs italic tracking-tighter">CITIZEN FEED</span>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-[#3954AA]/70 uppercase tracking-widest">
            {CATEGORY_LABEL[activeCategory]}
          </span>
          <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#F8FAFC]">
        {isLoading ? (
          <div className="h-full flex items-center justify-center text-gray-400 text-sm">
            댓글을 불러오는 중...
          </div>
        ) : comments.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-400 text-sm gap-2 px-4 text-center">
            <p className="font-bold">아직 댓글이 없습니다.</p>
            <p className="text-xs">첫 번째 현장 정보를 공유해 보세요.</p>
          </div>
        ) : (
          comments.map((comment) => {
            const isMyComment = isLoggedIn && comment.userId === currentUserId;
            return (
              <div
                key={comment.id}
                className={`p-4 rounded-2xl text-[13px] shadow-sm relative group/item transition-all ${
                  isMyComment
                    ? 'bg-orange-50 border-2 border-orange-400'
                    : 'bg-white border border-gray-100'
                }`}
              >
                {isMyComment && (
                  <button
                    onClick={() => handleDeleteComment(comment.id)}
                    className="absolute top-3 right-3 text-gray-400 hover:text-red-500 transition-colors"
                    title="삭제"
                  >
                    <span className="text-[10px]">✕</span>
                  </button>
                )}

                <div className="flex justify-between items-center mb-1">
                  <span className={`font-black ${isMyComment ? 'text-orange-600' : 'text-[#3954AA]'}`}>
                        {comment.nickname} {isMyComment && "(나)"}
                  </span>
                  <span className="text-[10px] text-gray-400 mr-4">
                    {isMounted && comment.createdAt
                      ? new Date(comment.createdAt).toLocaleString('ko-KR', {
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: true,
                        })
                      : ''}
                  </span>
                </div>
                <p className="text-gray-700 leading-snug pr-4">{comment.content}</p>
              </div>
            );
          })
        )}
      </div>

      <div className="p-4 bg-white border-t border-gray-100">
        <div className="flex flex-col gap-2">
          <textarea
            value={commentInput}
            onChange={(e) => setCommentInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isLoggedIn
                ? PLACEHOLDER[activeCategory]
                : '로그인 후 댓글을 남길 수 있습니다.'
            }
            disabled={!isLoggedIn || isSubmitting}
            className="w-full text-black p-3 bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:border-[#3954AA] resize-none h-16 disabled:opacity-50"
          />
          <button
            onClick={handleAddComment}
            disabled={!isLoggedIn || isSubmitting || !commentInput.trim()}
            className="w-full py-2 bg-[#3954AA] text-white text-xs font-bold rounded-lg hover:bg-[#2D438A] transition-all disabled:bg-gray-300 shadow-md"
          >
            {isSubmitting ? '등록 중...' : '댓글 등록'}
          </button>
        </div>
      </div>
    </section>
  );
}