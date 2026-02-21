import type { RoomState, VotingRoundSummary, VotingState } from '../src/app/core/models/room-state';
import type { User } from '../src/app/core/models/user';

declare namespace Party {
  interface Connection {
    id: string;
    send(message: string): void;
  }

  interface Room {
    id: string;
    getConnections(): Iterable<Connection>;
  }

  interface Server {
    room: Room;
    onConnect?(conn: Connection): void;
    onClose?(conn: Connection): void;
    onMessage?(message: string | ArrayBuffer | ArrayBufferView, sender: Connection): void;
  }
}

type ConnectionMeta = { userId?: string; sessionId?: string };

const DEFAULT_CARD_MODEL = {
  id: 'fibonacci',
  name: 'Fibonacci',
  cards: ['0', '1', '2', '3', '5', '8', '13', '21', '34', '55', '89', '?', '☕'],
  isPreset: true,
};

export default class CarteadoPartyServer implements Party.Server {
  constructor(readonly room: Party.Room) {}

  private state: RoomState | null = null;
  private clients = new Map<string, ConnectionMeta>();

  onConnect(conn: Party.Connection) {
    this.clients.set(conn.id, {});
  }

  onClose(conn: Party.Connection) {
    const meta = this.clients.get(conn.id);
    if (meta?.userId && this.state) {
      this.state.users = this.state.users.filter((u) => u.id !== meta.userId);
      this.state.updatedAt = Date.now();
      this.broadcast({ type: 'USER_LEFT', payload: { userId: meta.userId } });
      this.ensureAdminExists(this.state);
      this.broadcast({ type: 'ROOM_STATE_UPDATED', payload: { room: this.state } });
    }
    this.clients.delete(conn.id);
  }

  onMessage(message: string | ArrayBuffer | ArrayBufferView, sender: Party.Connection) {
    try {
      const raw = typeof message === 'string' ? message : this.decodeMessage(message);
      const parsed = JSON.parse(raw);
      this.handleMessage(sender, parsed);
    } catch (_) {
      sender.send(JSON.stringify({ type: 'ERROR', payload: { code: 'INVALID_JSON', message: 'Invalid JSON' } }));
    }
  }

  private decodeMessage(message: ArrayBuffer | ArrayBufferView): string {
    if (message instanceof ArrayBuffer) return new TextDecoder().decode(new Uint8Array(message));
    return new TextDecoder().decode(new Uint8Array(message.buffer, message.byteOffset, message.byteLength));
  }

  private broadcast(data: unknown) {
    const serialized = JSON.stringify(data);
    for (const conn of this.room.getConnections()) conn.send(serialized);
  }

  private createRoom(creator: User): RoomState {
    const voting: VotingState = { isActive: false, isRevealed: false, votes: {} };
    return {
      roomId: this.room.id,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      createdBy: creator.id,
      users: [creator],
      voting,
      settings: { cardModel: DEFAULT_CARD_MODEL, ticketId: '' },
    };
  }

  private isAdmin(room: RoomState, userId: string): boolean {
    const user = room.users.find((u) => u.id === userId);
    return !!user && (user.role === 'admin' || user.role === 'admin_spectator');
  }

  private ensureAdminExists(room: RoomState): void {
    const hasAdmin = room.users.some((u) => u.role === 'admin' || u.role === 'admin_spectator');
    if (!hasAdmin && room.users.length > 0) {
      const first = room.users[0];
      const newRole = first.role === 'spectator' ? 'admin_spectator' : 'admin';
      room.users = room.users.map((u, i) => (i === 0 ? { ...u, role: newRole as any } : u));
    }
  }

  private getTeamRoleLabel(user: User): string {
    const role = user.teamRole;
    if (!role) return 'Unspecified';
    if (role === 'other') {
      const custom = String(user.teamRoleCustom ?? '').trim();
      return custom || 'Other';
    }
    const labels: Record<string, string> = {
      frontend: 'Frontend',
      backend: 'Backend',
      staff: 'Staff',
      engineer: 'Engineer',
      qa: 'QA',
      fullstack: 'Fullstack',
    };
    return labels[role] || 'Unspecified';
  }

  private computeVotingSummary(room: RoomState): VotingRoundSummary | null {
    const model = room.settings?.cardModel;
    const votes = room.voting.votes;
    if (!room.voting.isRevealed || !votes || !model) return null;
    const cardValues = model.cardValues;
    const values: number[] = [];
    const perUser: VotingRoundSummary['perUser'] = [];
    const roleBuckets = new Map<string, { role: string; values: number[]; totalVotes: number; votesWithValue: number; votesIgnored: number }>();

    for (const user of room.users) {
      const card = votes[user.id];
      if (card == null) continue;
      let val = 0;
      if (cardValues && cardValues[card] != null) val = cardValues[card];
      else {
        const n = parseInt(String(card), 10);
        if (!isNaN(n)) val = n;
      }
      const contributes = val > 0;
      if (contributes) values.push(val);
      perUser.push({
        userId: user.id,
        userName: user.name,
        role: this.getTeamRoleLabel(user),
        card,
        numericValue: val,
        contributes,
      });

      const role = this.getTeamRoleLabel(user);
      const bucket = roleBuckets.get(role) ?? { role, values: [], totalVotes: 0, votesWithValue: 0, votesIgnored: 0 };
      bucket.totalVotes += 1;
      if (contributes) {
        bucket.values.push(val);
        bucket.votesWithValue += 1;
      } else {
        bucket.votesIgnored += 1;
      }
      roleBuckets.set(role, bucket);
    }

    if (perUser.length === 0) return null;

    const votesWithValue = values.length;
    const votesIgnored = perUser.length - votesWithValue;
    const sum = values.reduce((a, b) => a + b, 0);
    const average = votesWithValue > 0 ? Math.round((sum / votesWithValue) * 10) / 10 : 0;
    const min = values.length > 0 ? Math.min(...values) : 0;
    const max = values.length > 0 ? Math.max(...values) : 0;
    const perRole = Array.from(roleBuckets.values()).map((bucket) => {
      const sumByRole = bucket.values.reduce((a, b) => a + b, 0);
      const averageByRole = bucket.votesWithValue > 0 ? Math.round((sumByRole / bucket.votesWithValue) * 10) / 10 : 0;
      const minByRole = bucket.values.length > 0 ? Math.min(...bucket.values) : 0;
      const maxByRole = bucket.values.length > 0 ? Math.max(...bucket.values) : 0;
      return {
        role: bucket.role,
        average: averageByRole,
        min: minByRole,
        max: maxByRole,
        totalVotes: bucket.totalVotes,
        votesWithValue: bucket.votesWithValue,
        votesIgnored: bucket.votesIgnored,
      };
    });

    return {
      roundNumber: 0,
      timestamp: Date.now(),
      ticketId: room.settings?.ticketId?.trim() || '',
      average,
      min,
      max,
      sum,
      totalVotes: perUser.length,
      votesWithValue,
      votesIgnored,
      perUser,
      perRole,
    };
  }

  private handleMessage(sender: Party.Connection, ev: any) {
    const type = ev?.type;
    const payload = ev?.payload;

    switch (type) {
      case 'JOIN_ROOM': {
        const roomId = payload?.roomId;
        const user = payload?.user;
        const allowCreate = !!payload?.allowCreate;
        if (!user) {
          sender.send(JSON.stringify({ type: 'ERROR', payload: { code: 'INVALID_JOIN', message: 'user required' } }));
          return;
        }
        if (roomId && roomId !== this.room.id) {
          sender.send(JSON.stringify({ type: 'ERROR', payload: { code: 'INVALID_ROOM', message: 'Room id mismatch' } }));
          return;
        }
        const userObj: User = {
          id: user.id,
          name: user.name,
          role: 'voter',
          joinedAt: Date.now(),
          isConnected: true,
          teamRole: user.teamRole,
          teamRoleCustom: user.teamRoleCustom,
          sessionId: user.sessionId,
        };

        if (!this.state) {
          if (!allowCreate) {
            sender.send(JSON.stringify({ type: 'ERROR', payload: { code: 'ROOM_NOT_FOUND', message: 'Room not found' } }));
            return;
          }
          userObj.role = 'admin';
          this.state = this.createRoom(userObj);
        } else {
          if (this.state.users.some((u) => u.name === userObj.name)) {
            userObj.name = `${userObj.name}-${Math.random().toString(36).slice(2, 4)}`;
          }
          this.state.users.push(userObj);
          this.state.updatedAt = Date.now();
        }

        this.clients.set(sender.id, { userId: userObj.id, sessionId: userObj.sessionId || '' });
        sender.send(JSON.stringify({ type: 'ROOM_JOINED', payload: { room: this.state, sessionId: userObj.sessionId || '' } }));
        this.broadcast({ type: 'USER_JOINED', payload: { user: userObj } });
        break;
      }

      case 'LEAVE_ROOM': {
        const userId = payload?.userId;
        if (!this.state || !userId) return;
        this.state.users = this.state.users.filter((u) => u.id !== userId);
        this.state.updatedAt = Date.now();
        this.broadcast({ type: 'USER_LEFT', payload: { userId } });
        this.ensureAdminExists(this.state);
        this.broadcast({ type: 'ROOM_STATE_UPDATED', payload: { room: this.state } });
        break;
      }

      case 'CAST_VOTE': {
        const { userId, vote } = payload || {};
        if (!this.state || !userId) return;
        if (this.state.voting.isRevealed) {
          sender.send(JSON.stringify({ type: 'ERROR', payload: { code: 'VOTES_REVEALED', message: 'Cannot change vote while votes are revealed' } }));
          return;
        }
        this.state.voting.votes[userId] = vote ?? null;
        this.state.updatedAt = Date.now();
        this.broadcast({ type: 'VOTE_CAST', payload: { userId, vote } });
        break;
      }

      case 'REVEAL_VOTES': {
        const userId = payload?.userId;
        if (!this.state || !userId) return;
        if (!this.isAdmin(this.state, userId)) {
          sender.send(JSON.stringify({ type: 'ERROR', payload: { code: 'FORBIDDEN', message: 'Only admin can reveal votes' } }));
          return;
        }
        this.state.voting.isRevealed = true;
        this.state.updatedAt = Date.now();
        this.broadcast({ type: 'VOTES_REVEALED', payload: { votes: this.state.voting.votes } });
        break;
      }

      case 'RESET_VOTING': {
        const userId = payload?.userId;
        if (!this.state || !userId) return;
        if (!this.isAdmin(this.state, userId)) {
          sender.send(JSON.stringify({ type: 'ERROR', payload: { code: 'FORBIDDEN', message: 'Only admin can reset voting' } }));
          return;
        }
        if (this.state.voting.isRevealed) {
          const summary = this.computeVotingSummary(this.state);
          if (summary) {
            this.state.settings = this.state.settings || {};
            const history = this.state.settings.votingHistory || [];
            summary.roundNumber = history.length + 1;
            this.state.settings.votingHistory = [...history, summary];
          }
        }
        this.state.settings = this.state.settings || {};
        this.state.settings.ticketId = '';
        this.state.voting = { isActive: false, isRevealed: false, votes: {} };
        this.state.updatedAt = Date.now();
        this.broadcast({ type: 'VOTING_RESET', payload: {} });
        this.broadcast({ type: 'ROOM_STATE_UPDATED', payload: { room: this.state } });
        break;
      }

      case 'SET_TICKET_ID': {
        const { userId, ticketId } = payload || {};
        if (!this.state || !userId) return;
        if (!this.isAdmin(this.state, userId)) {
          sender.send(JSON.stringify({ type: 'ERROR', payload: { code: 'FORBIDDEN', message: 'Only admin can set ticket id' } }));
          return;
        }
        this.state.settings = this.state.settings || {};
        this.state.settings.ticketId = String(ticketId ?? '').trim();
        this.state.updatedAt = Date.now();
        this.broadcast({ type: 'ROOM_STATE_UPDATED', payload: { room: this.state } });
        break;
      }

      case 'KICK_USER': {
        const { userId, targetUserId } = payload || {};
        if (!this.state || !userId || !targetUserId) return;
        if (!this.isAdmin(this.state, userId)) {
          sender.send(JSON.stringify({ type: 'ERROR', payload: { code: 'FORBIDDEN', message: 'Only admin can kick users' } }));
          return;
        }
        this.state.users = this.state.users.filter((u) => u.id !== targetUserId);
        this.state.updatedAt = Date.now();
        this.broadcast({ type: 'USER_KICKED', payload: { userId: targetUserId } });
        this.broadcast({ type: 'ROOM_STATE_UPDATED', payload: { room: this.state } });
        break;
      }

      case 'UPDATE_ROLE': {
        const { userId, targetUserId, role } = payload || {};
        if (!this.state || !userId || !targetUserId || !role) return;
        const isSelfChange = userId === targetUserId;
        const targetUser = this.state.users.find((u) => u.id === targetUserId);
        if (isSelfChange) {
          const allowedSelfRoles = ['spectator', 'voter', 'admin_spectator'];
          const canSelfAdmin = role === 'admin' && targetUser?.role === 'admin_spectator';
          if (!allowedSelfRoles.includes(role) && !canSelfAdmin) {
            sender.send(JSON.stringify({ type: 'ERROR', payload: { code: 'FORBIDDEN', message: 'Only admin can change roles' } }));
            return;
          }
        } else if (!this.isAdmin(this.state, userId)) {
          sender.send(JSON.stringify({ type: 'ERROR', payload: { code: 'FORBIDDEN', message: 'Only admin can change roles' } }));
          return;
        }

        if (role === 'admin') {
          this.state.users = this.state.users.map((u) => {
            if (u.id === targetUserId) return { ...u, role: 'admin' };
            if (u.role === 'admin') return { ...u, role: 'voter' };
            if (u.role === 'admin_spectator') return { ...u, role: 'spectator' };
            return u;
          });
        } else if (role === 'admin_spectator') {
          this.state.users = this.state.users.map((u) => (u.id === targetUserId ? { ...u, role: 'admin_spectator' } : u));
        } else {
          this.state.users = this.state.users.map((u) => (u.id === targetUserId ? { ...u, role } : u));
        }
        this.state.updatedAt = Date.now();
        this.broadcast({ type: 'USER_ROLE_UPDATED', payload: { userId: targetUserId, role } });
        this.broadcast({ type: 'ROOM_STATE_UPDATED', payload: { room: this.state } });
        break;
      }

      case 'SET_CARD_MODEL': {
        const { userId, cardModel } = payload || {};
        if (!this.state || !userId) return;
        if (!this.isAdmin(this.state, userId)) {
          sender.send(JSON.stringify({ type: 'ERROR', payload: { code: 'FORBIDDEN', message: 'Only admin can set card model' } }));
          return;
        }
        if (!cardModel || !cardModel.id || !cardModel.name || !Array.isArray(cardModel.cards) || cardModel.cards.length < 2) {
          sender.send(JSON.stringify({ type: 'ERROR', payload: { code: 'INVALID_MODEL', message: 'Invalid card model' } }));
          return;
        }
        this.state.settings = this.state.settings || {};
        const model: any = { id: cardModel.id, name: cardModel.name, cards: [...cardModel.cards], isPreset: cardModel.isPreset };
        if (cardModel.cardValues && typeof cardModel.cardValues === 'object' && Object.keys(cardModel.cardValues).length > 0) {
          model.cardValues = { ...cardModel.cardValues };
        }
        this.state.settings.cardModel = model;
        this.state.updatedAt = Date.now();
        this.broadcast({ type: 'ROOM_STATE_UPDATED', payload: { room: this.state } });
        break;
      }

      case 'PING':
        sender.send(JSON.stringify({ type: 'PONG', payload: { timestamp: Date.now() } }));
        break;

      default:
        sender.send(JSON.stringify({ type: 'ERROR', payload: { code: 'UNKNOWN_EVENT', message: 'Unknown event type' } }));
    }
  }
}
