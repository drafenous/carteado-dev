import { Injectable } from '@angular/core';
import { BehaviorSubject, Subscription } from 'rxjs';
import { RealtimeService } from './realtime.service';
import { RoomState } from '../models/room-state';
import { ServerEvent, ClientEvent } from '../models/websocket-events';
import { User } from '../models/user';
import { CardModel } from '../models/card-model';
import { Router } from '@angular/router';

@Injectable({ providedIn: 'root' })
export class RoomStoreService {
  private room$ = new BehaviorSubject<RoomState | null>(null);
  private revealTick$ = new BehaviorSubject<number>(0);
  private sub: Subscription | null = null;
  private statusSub: Subscription | null = null;
  private statusMonitorSub: Subscription | null = null;
  private currentRoomId: string | null = null;
  private currentUserId: string | null = null;
  private wsUrl = '';

  constructor(private realtime: RealtimeService, private router: Router) {}

  private resolveWsUrl(): string {
    // SSR: don't attempt to access window
    if (typeof window === 'undefined') return '';

    // 1) Allow an explicit runtime override (useful for Vercel env injected into the page)
    //    Set window.__WS_URL__ = "wss://realtime.example.com" in the hosting HTML if needed.
    const runtimeOverride = (window as any).__WS_URL__ as string | undefined;
    if (runtimeOverride && runtimeOverride.length > 0) {
      const trimmed = runtimeOverride.trim();
      const normalized = trimmed
        .replace(/^https:\/\//, 'wss://')
        .replace(/^http:\/\//, 'ws://');
      return normalized;
    }

    // 2) If running on localhost, prefer local POC server
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') {
      const url = `ws://${host}:4000/api/ws`;
      // Helpful debug log to see which URL the client will try to connect to
      // (printed in browser console)
      // eslint-disable-next-line no-console
      console.debug('[RoomStore] resolved WS URL:', url);
      return url;
    }

    // 3) Default to a ws URL derived from the current origin (production)
    const origin = window.location.origin.replace(/^http/, 'ws');
    const url = `${origin}/api/ws`;
    // eslint-disable-next-line no-console
    console.debug('[RoomStore] resolved WS URL:', url);
    return url;
  }

  public get roomState$() {
    return this.room$.asObservable();
  }

  public get revealSignal$() {
    return this.revealTick$.asObservable();
  }

  connect(roomId: string, user: Partial<User>) {
    const baseUrl = this.wsUrl || this.resolveWsUrl();
    const url = baseUrl
      .replace('{roomId}', encodeURIComponent(roomId))
      .replace(':roomId', encodeURIComponent(roomId));
    if (url) {
      this.realtime.connect(url);
      // subscribe to messages
      this.sub = this.realtime.messages.subscribe((ev) => this.handleServerEvent(ev));

      // wait for the WS to be connected before sending JOIN to avoid "WebSocket not connected" warnings
      this.statusSub = this.realtime.status.subscribe((s) => {
        if (s === 'connected') {
          try {
            const join: ClientEvent = { type: 'JOIN_ROOM', payload: { roomId, user } } as any;
            // helpful debug
            // eslint-disable-next-line no-console
            console.debug('[RoomStore] sending JOIN_ROOM', { roomId, user });
            this.realtime.send(join);
          } finally {
            // cleanup status subscription after first connected
            if (this.statusSub) {
              this.statusSub.unsubscribe();
              this.statusSub = null;
            }
          }
        }
      });
      // store current identifiers so we can update UI when connection is lost or user leaves
      this.currentRoomId = roomId;
      this.currentUserId = (user && (user as any).id) || null;

      // monitor ongoing connection status to remove player locally if connection is lost
      this.statusMonitorSub = this.realtime.status.subscribe((s) => {
        if (s === 'disconnected' && this.currentRoomId && this.currentUserId) {
          // remove player locally so UI reflects disconnection immediately
          const room = this.room$.value;
          if (room && room.roomId === this.currentRoomId) {
            room.users = room.users.filter((u) => u.id !== this.currentUserId);
            this.room$.next({ ...room, updatedAt: Date.now() });
            // eslint-disable-next-line no-console
            console.debug('[RoomStore] removed local user on disconnect', { roomId: this.currentRoomId, userId: this.currentUserId });
          }
        }
      });
    } else {
      // SSR or no URL resolved — skip opening WS connection
      console.warn('Realtime connection skipped (no ws url)');
    }
  }

  disconnect(roomId: string, userId: string) {
    // optimistically remove the player locally so UI updates immediately
    try {
      const room = this.room$.value;
      if (room && room.roomId === roomId) {
        room.users = room.users.filter((u) => u.id !== userId);
        this.room$.next({ ...room, updatedAt: Date.now() });
      }
    } catch (e) {}

    const leave: ClientEvent = { type: 'LEAVE_ROOM', payload: { roomId, userId } } as any;
    this.realtime.send(leave);
    // clear stored ids and cleanup subscriptions
    this.currentRoomId = null;
    this.currentUserId = null;
    this.cleanup();
  }

  sendVote(roomId: string, userId: string, vote: string | null) {
    const ev: ClientEvent = { type: 'CAST_VOTE', payload: { roomId, userId, vote } } as any;
    this.realtime.send(ev);
  }

  sendKick(roomId: string, userId: string, targetUserId: string) {
    const ev: ClientEvent = { type: 'KICK_USER', payload: { roomId, userId, targetUserId } } as any;
    this.realtime.send(ev);
  }

  updateRole(roomId: string, userId: string, targetUserId: string, role: 'admin' | 'admin_spectator' | 'voter' | 'spectator') {
    const ev: ClientEvent = { type: 'UPDATE_ROLE', payload: { roomId, userId, targetUserId, role } } as any;
    this.realtime.send(ev);
  }
  revealVotes(roomId: string, userId: string) {
    const ev: ClientEvent = { type: 'REVEAL_VOTES', payload: { roomId, userId } } as any;
    this.realtime.send(ev);
  }
  resetVoting(roomId: string, userId: string) {
    const ev: ClientEvent = { type: 'RESET_VOTING', payload: { roomId, userId } } as any;
    this.realtime.send(ev);
  }

  sendSetCardModel(roomId: string, userId: string, cardModel: CardModel) {
    const ev: ClientEvent = { type: 'SET_CARD_MODEL', payload: { roomId, userId, cardModel } } as any;
    this.realtime.send(ev);
  }

  setTicketId(roomId: string, userId: string, ticketId: string) {
    const ev: ClientEvent = { type: 'SET_TICKET_ID', payload: { roomId, userId, ticketId } } as any;
    this.realtime.send(ev);
  }

  private handleServerEvent(ev: ServerEvent) {
    switch (ev.type) {
      case 'ROOM_JOINED':
      case 'RECONNECTED':
      case 'ROOM_STATE_UPDATED': {
        // sanitize incoming room state to avoid duplicate users with the same id
        const incoming = ev.payload.room as RoomState;
        if (incoming && Array.isArray(incoming.users)) {
          const deduped = Array.from(new Map(incoming.users.map((u) => [u.id, u])).values());
          incoming.users = deduped;
        }
        this.room$.next(incoming);
        break;
      }
      
      case 'USER_JOINED': {
        const room = this.room$.value;
        if (!room) return;
        // avoid adding duplicate users (same id) - replace if present
        const incomingUser: User = ev.payload.user;
        const existingIdx = room.users.findIndex((u) => u.id === incomingUser.id);
        if (existingIdx >= 0) {
          room.users[existingIdx] = incomingUser;
        } else {
          room.users = [...room.users, incomingUser];
        }
        this.room$.next({ ...room, updatedAt: Date.now() });
        break;
      }
      case 'USER_LEFT': {
        const room = this.room$.value;
        if (!room) return;
        room.users = room.users.filter((u) => u.id !== ev.payload.userId);
        this.room$.next({ ...room, updatedAt: Date.now() });
        break;
      }
      case 'USER_KICKED': {
        const room = this.room$.value;
        if (!room) return;
        const payload: any = ev.payload || {};
        const kickedId = payload.targetUserId ?? payload.userId ?? (payload.user && payload.user.id) ?? null;
        if (!kickedId) break;
        room.users = room.users.filter((u) => u.id !== kickedId);
        this.room$.next({ ...room, updatedAt: Date.now() });
        // if the current client was kicked, redirect to homepage
        if (this.currentUserId && kickedId === this.currentUserId) {
          try {
            if (typeof window !== 'undefined') this.router.navigate(['/']);
          } catch (e) {}
        }
        break;
      }
      case 'VOTE_CAST': {
        const room = this.room$.value;
        if (!room) return;
        room.voting.votes[ev.payload.userId] = ev.payload.vote ?? null;
        this.room$.next({ ...room, updatedAt: Date.now() });
        break;
      }
      case 'VOTES_REVEALED': {
        const room = this.room$.value;
        if (!room) return;
        const payloadVotes = (ev.payload as { votes?: Record<string, string | null> })?.votes;
        if (payloadVotes && typeof payloadVotes === 'object') {
          room.voting.votes = { ...payloadVotes };
        }
        room.voting.isRevealed = true;
        this.room$.next({ ...room, updatedAt: Date.now() });
        this.revealTick$.next(this.revealTick$.value + 1);
        break;
      }
      case 'VOTING_RESET': {
        const room = this.room$.value;
        if (!room) return;
        room.voting = { isActive: false, isRevealed: false, votes: {} };
        this.room$.next({ ...room, updatedAt: Date.now() });
        break;
      }
      default:
        break;
    }
  }

  private cleanup() {
    if (this.sub) {
      this.sub.unsubscribe();
      this.sub = null;
    }
    if (this.statusSub) {
      this.statusSub.unsubscribe();
      this.statusSub = null;
    }
    if (this.statusMonitorSub) {
      this.statusMonitorSub.unsubscribe();
      this.statusMonitorSub = null;
    }
    this.realtime.disconnect();
    this.room$.next(null);
  }
}

