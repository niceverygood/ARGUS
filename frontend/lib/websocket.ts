import { WebSocketMessage, WebSocketMessageType } from '@/types';
import { WS_URL } from './constants';

type MessageCallback = (data: unknown) => void;

/**
 * WebSocket 클라이언트 클래스
 */
class WebSocketClient {
  private ws: WebSocket | null = null;
  private url: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 1000;
  private listeners: Map<WebSocketMessageType, Set<MessageCallback>> = new Map();
  private connectionListeners: Set<(connected: boolean) => void> = new Set();
  private isIntentionalClose = false;

  constructor(url: string) {
    this.url = url;
  }

  /**
   * WebSocket 연결
   */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      // 서버 사이드에서는 WebSocket 사용 불가
      if (typeof window === 'undefined') {
        resolve();
        return;
      }

      if (this.ws?.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }

      this.isIntentionalClose = false;
      
      try {
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
          console.log('[WS] Connected');
          this.reconnectAttempts = 0;
          this.notifyConnectionListeners(true);
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data);
            this.notifyListeners(message.type, message.data);
          } catch (error) {
            console.error('[WS] Failed to parse message:', error);
          }
        };

        this.ws.onclose = () => {
          console.log('[WS] Connection closed');
          this.notifyConnectionListeners(false);
          
          if (!this.isIntentionalClose) {
            this.attemptReconnect();
          }
        };

        this.ws.onerror = (error) => {
          console.error('[WS] Error:', error);
          // Don't reject, just resolve - WebSocket is optional
          resolve();
        };
      } catch (error) {
        console.error('[WS] Connection failed:', error);
        resolve(); // Don't break the app if WebSocket fails
      }
    });
  }

  /**
   * WebSocket 연결 해제
   */
  disconnect(): void {
    this.isIntentionalClose = true;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  /**
   * 재연결 시도
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('[WS] Max reconnect attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * this.reconnectAttempts;
    
    console.log(`[WS] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
    
    setTimeout(() => {
      this.connect().catch((error) => {
        console.error('[WS] Reconnect failed:', error);
      });
    }, delay);
  }

  /**
   * 메시지 타입별 리스너 등록
   */
  subscribe(type: WebSocketMessageType, callback: MessageCallback): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(callback);

    // 구독 해제 함수 반환
    return () => {
      this.listeners.get(type)?.delete(callback);
    };
  }

  /**
   * 연결 상태 리스너 등록
   */
  onConnectionChange(callback: (connected: boolean) => void): () => void {
    this.connectionListeners.add(callback);
    return () => {
      this.connectionListeners.delete(callback);
    };
  }

  /**
   * 리스너들에게 메시지 전달
   */
  private notifyListeners(type: WebSocketMessageType, data: unknown): void {
    this.listeners.get(type)?.forEach((callback) => {
      try {
        callback(data);
      } catch (error) {
        console.error('[WS] Listener error:', error);
      }
    });
  }

  /**
   * 연결 상태 변경 알림
   */
  private notifyConnectionListeners(connected: boolean): void {
    this.connectionListeners.forEach((callback) => {
      try {
        callback(connected);
      } catch (error) {
        console.error('[WS] Connection listener error:', error);
      }
    });
  }

  /**
   * 연결 상태 확인
   */
  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

// 싱글톤 인스턴스
export const wsClient = new WebSocketClient(WS_URL);

