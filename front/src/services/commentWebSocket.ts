import { Client, StompSubscription } from '@stomp/stompjs';
import { ReportComment } from './api';

export type CommentMapType = 'DISASTER' | 'SAFETY' | 'REPORT';

export interface CommentWsEvent {
  action: 'CREATE' | 'DELETE';
  id: number;
  type: string;
  content?: string | null;
  userId?: number | null;
  userName?: string | null;
  createdAt?: string | null;
}

type MessageHandler = (event: CommentWsEvent) => void;

let client: Client | null = null;
let currentSubscription: StompSubscription | null = null;
let messageHandler: MessageHandler | null = null;
let connectPromise: Promise<void> | null = null;

export function getWebSocketUrl(): string {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081';
  return apiUrl.replace(/^https?/, (protocol) => (protocol === 'https' ? 'wss' : 'ws')) + '/ws';
}

function getAuthHeader(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function ensureConnected(): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('브라우저 환경에서만 WebSocket을 사용할 수 있습니다.'));
  }

  if (client?.connected) {
    return Promise.resolve();
  }

  if (connectPromise) {
    return connectPromise;
  }

  connectPromise = new Promise((resolve, reject) => {
    if (client) {
      client.deactivate();
      client = null;
    }

    client = new Client({
      brokerURL: getWebSocketUrl(),
      connectHeaders: getAuthHeader(),
      reconnectDelay: 5000,
      onConnect: () => {
        connectPromise = null;
        resolve();
      },
      onStompError: (frame) => {
        connectPromise = null;
        reject(new Error(frame.headers['message'] || 'WebSocket 연결에 실패했습니다.'));
      },
      onWebSocketClose: () => {
        connectPromise = null;
      },
    });

    client.activate();
  });

  return connectPromise;
}

export function mapWsEventToComment(event: CommentWsEvent): ReportComment {
  return {
    id: event.id,
    reportId: 0,
    userId: event.userId ?? 0,
    nickname: event.userName ?? '익명',
    content: event.content ?? '',
    imageUrl: null,
    createdAt: event.createdAt ?? new Date().toISOString(),
    targetId: 0,
    targetType: (event.type as CommentMapType) ?? 'DISASTER',
  };
}

export async function connectCommentWebSocket(): Promise<void> {
  await ensureConnected();
}

export async function subscribeCommentTopic(
  type: CommentMapType,
  onMessage: MessageHandler,
): Promise<void> {
  await ensureConnected();

  if (!client?.connected) {
    throw new Error('WebSocket이 연결되지 않았습니다.');
  }

  if (currentSubscription) {
    currentSubscription.unsubscribe();
    currentSubscription = null;
  }

  messageHandler = onMessage;

  currentSubscription = client.subscribe(`/topic/comments/${type}`, (message) => {
    try {
      const event = JSON.parse(message.body) as CommentWsEvent;
      messageHandler?.(event);
    } catch (error) {
      console.error('댓글 WebSocket 메시지 파싱 실패:', error);
    }
  });
}

export async function createCommentViaWebSocket(
  type: CommentMapType,
  content: string,
): Promise<void> {
  const token = localStorage.getItem('token');
  if (!token) {
    throw new Error('로그인이 필요합니다.');
  }

  await ensureConnected();

  if (!client?.connected) {
    throw new Error('WebSocket이 연결되지 않았습니다.');
  }

  client.publish({
    destination: '/app/comments.create',
    body: JSON.stringify({ type, content }),
  });
}

export async function deleteCommentViaWebSocket(commentId: number): Promise<void> {
  const token = localStorage.getItem('token');
  if (!token) {
    throw new Error('로그인이 필요합니다.');
  }

  await ensureConnected();

  if (!client?.connected) {
    throw new Error('WebSocket이 연결되지 않았습니다.');
  }

  client.publish({
    destination: '/app/comments.delete',
    body: JSON.stringify({ commentId }),
  });
}

export function unsubscribeCommentTopic(): void {
  if (currentSubscription) {
    currentSubscription.unsubscribe();
    currentSubscription = null;
  }
  messageHandler = null;
}

export function disconnectCommentWebSocket(): void {
  unsubscribeCommentTopic();

  if (client) {
    client.deactivate();
    client = null;
  }

  connectPromise = null;
}

export async function reconnectCommentWebSocket(): Promise<void> {
  disconnectCommentWebSocket();
  await connectCommentWebSocket();
}