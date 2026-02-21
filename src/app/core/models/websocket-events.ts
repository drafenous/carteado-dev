import { CardModel } from './card-model';
import { RoomState } from './room-state';
import { User } from './user';

// Client -> Server
export type ClientEvent =
  | { type: 'JOIN_ROOM'; payload: { roomId: string; user: Partial<User> } }
  | { type: 'LEAVE_ROOM'; payload: { roomId: string; userId: string } }
  | { type: 'RECONNECT'; payload: { roomId: string; userId: string; sessionId: string } }
  | { type: 'CAST_VOTE'; payload: { roomId: string; userId: string; vote: string | null } }
  | { type: 'REVEAL_VOTES'; payload: { roomId: string; userId: string } }
  | { type: 'RESET_VOTING'; payload: { roomId: string; userId: string } }
  | { type: 'KICK_USER'; payload: { roomId: string; userId: string; targetUserId: string } }
  | { type: 'UPDATE_ROLE'; payload: { roomId: string; userId: string; targetUserId: string; role: 'admin' | 'admin_spectator' | 'voter' | 'spectator' } }
  | { type: 'UPDATE_USERNAME'; payload: { roomId: string; userId: string; newName: string } }
  | { type: 'SET_CARD_MODEL'; payload: { roomId: string; userId: string; cardModel: CardModel } }
  | { type: 'SET_TICKET_ID'; payload: { roomId: string; userId: string; ticketId: string } };

// Server -> Client
export type ServerEvent =
  | { type: 'ROOM_JOINED'; payload: { room: RoomState; sessionId: string } }
  | { type: 'USER_JOINED'; payload: { user: User } }
  | { type: 'USER_LEFT'; payload: { userId: string } }
  | { type: 'RECONNECTED'; payload: { room: RoomState; sessionId: string } }
  | { type: 'VOTE_CAST'; payload: { userId: string; vote: string | null } }
  | { type: 'VOTES_REVEALED'; payload: { votes: Record<string, string | null> } }
  | { type: 'VOTING_RESET'; payload: {} }
  | { type: 'ROOM_STATE_UPDATED'; payload: { room: RoomState } }
  | { type: 'USER_ROLE_UPDATED'; payload: { userId: string; role: 'admin' | 'admin_spectator' | 'voter' | 'spectator' } }
  | { type: 'USER_KICKED'; payload: { userId: string } }
  | { type: 'USER_NAME_UPDATED'; payload: { userId: string; newName: string } }
  | { type: 'ERROR'; payload: { code: string; message: string } }
  | { type: 'PONG'; payload: { timestamp: number } };

