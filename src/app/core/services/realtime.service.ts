import { Injectable, NgZone } from '@angular/core';
import { Observable, Subject, BehaviorSubject, timer } from 'rxjs';
import { ClientEvent, ServerEvent } from '../models/websocket-events';

@Injectable({ providedIn: 'root' })
export class RealtimeService {
  private ws: WebSocket | null = null;

  constructor(private ngZone: NgZone) {}
  private message$ = new Subject<ServerEvent>();
  private status$ = new BehaviorSubject<'disconnected' | 'connecting' | 'connected'>('disconnected');
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private heartbeatIntervalRef: any = null;

  public get messages(): Observable<ServerEvent> {
    return this.message$.asObservable();
  }

  public get status(): Observable<'disconnected' | 'connecting' | 'connected'> {
    return this.status$.asObservable();
  }

  connect(wsUrl: string): void {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.status$.next('connecting');
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
      this.status$.next('connected');
      this.startHeartbeat();
    };

    this.    ws.onmessage = (ev) => {
      try {
        const parsed = JSON.parse(ev.data) as ServerEvent;
        this.ngZone.run(() => this.message$.next(parsed));
      } catch (e) {
        console.error('Invalid message', e);
      }
    };

    this.ws.onclose = () => {
      this.status$.next('disconnected');
      this.stopHeartbeat();
      this.handleReconnect(wsUrl);
    };

    this.ws.onerror = () => {
      // Let onclose handle reconnection
    };
  }

  disconnect(): void {
    this.stopHeartbeat();
    if (this.ws) {
      try {
        this.ws.close();
      } catch {}
    }
    this.ws = null;
    this.status$.next('disconnected');
  }

  send(event: ClientEvent): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('WebSocket not connected');
      return;
    }
    this.ws.send(JSON.stringify(event));
  }

  private handleReconnect(wsUrl: string) {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) return;
    this.reconnectAttempts++;
    const delay = Math.min(30000, 1000 * 2 ** (this.reconnectAttempts - 1));
    timer(delay).subscribe(() => this.connect(wsUrl));
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatIntervalRef = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.send({ type: 'PING', payload: { timestamp: Date.now() } } as any);
      }
    }, 30000);
  }

  private stopHeartbeat() {
    if (this.heartbeatIntervalRef) {
      clearInterval(this.heartbeatIntervalRef);
      this.heartbeatIntervalRef = null;
    }
  }
}

