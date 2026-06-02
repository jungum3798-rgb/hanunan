import { useEffect, useRef } from 'react';
import { ReportComment, getSidebarComments } from '@/services/api';
import {
  CommentMapType,
  CommentWsEvent,
  connectCommentWebSocket,
  disconnectCommentWebSocket,
  mapWsEventToComment,
  reconnectCommentWebSocket,
  subscribeCommentTopic,
  unsubscribeCommentTopic,
} from '@/services/commentWebSocket';

interface UseCommentWebSocketProps {
  activeCategory: CommentMapType;
  setComments: React.Dispatch<React.SetStateAction<ReportComment[]>>;
  isLoggedIn: boolean;
}

export function useCommentWebSocket({
  activeCategory,
  setComments,
  isLoggedIn,
}: UseCommentWebSocketProps) {
  const activeCategoryRef = useRef(activeCategory);
  activeCategoryRef.current = activeCategory;
  const isFirstLoginEffect = useRef(true);

  const handleMessage = (event: CommentWsEvent) => {
    if (event.type !== activeCategoryRef.current) return;

    setComments((prev) => {
      if (event.action === 'CREATE') {
        const newComment = mapWsEventToComment(event);
        if (prev.some((comment) => comment.id === newComment.id)) {
          return prev;
        }
        return [newComment, ...prev];
      }

      if (event.action === 'DELETE') {
        return prev.filter((comment) => comment.id !== event.id);
      }

      return prev;
    });
  };

  useEffect(() => {
    let cancelled = false;

    const loadComments = async () => {
      try {
        const comments = await getSidebarComments(activeCategory);
        if (!cancelled) {
          setComments(Array.isArray(comments) ? comments : []);
        }
      } catch (error) {
        console.error('댓글 목록 조회 실패:', error);
        if (!cancelled) {
          setComments([]);
        }
      }
    };

    loadComments();

    return () => {
      cancelled = true;
    };
  }, [activeCategory, setComments]);

  useEffect(() => {
    let cancelled = false;

    const setupSubscription = async () => {
      try {
        await connectCommentWebSocket();
        if (cancelled) return;

        await subscribeCommentTopic(activeCategory, handleMessage);
      } catch (error) {
        console.error('댓글 WebSocket 구독 실패:', error);
      }
    };

    setupSubscription();

    return () => {
      cancelled = true;
      unsubscribeCommentTopic();
    };
  }, [activeCategory, setComments]);

  useEffect(() => {
    if (isFirstLoginEffect.current) {
      isFirstLoginEffect.current = false;
      return;
    }

    let cancelled = false;

    const reconnect = async () => {
      try {
        await reconnectCommentWebSocket();
        if (cancelled) return;

        await subscribeCommentTopic(activeCategoryRef.current, handleMessage);
      } catch (error) {
        console.error('로그인 상태 변경 후 WebSocket 재연결 실패:', error);
      }
    };

    reconnect();

    return () => {
      cancelled = true;
    };
  }, [isLoggedIn]);

  useEffect(() => {
    return () => {
      disconnectCommentWebSocket();
    };
  }, []);
}