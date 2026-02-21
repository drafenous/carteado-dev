import { Server as HttpServer } from 'http';
import WebSocket, { WebSocketServer } from 'ws';
import { RoomState, VotingState, VotingRoundSummary } from '../app/core/models/room-state';
import { User } from '../app/core/models/user';

type WS = WebSocket & { id?: string; sessionId?: string; userId?: string; roomId?: string };

const rooms = new Map<string, RoomState>();
const clients = new Map<string, WS>();

const DEFAULT_CARD_MODEL = {
  id: 'fibonacci',
  name: 'Fibonacci',
  cards: ['0', '1', '2', '3', '5', '8', '13', '21', '34', '55', '89', '?', '☕'],
  isPreset: true,
};

function createRoom(roomId: string, creator: User): RoomState {
  const voting: VotingState = { isActive: false, isRevealed: false, votes: {} };
  const room: RoomState = {
    roomId,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    createdBy: creator.id,
    users: [creator],
    voting,
    settings: { cardModel: DEFAULT_CARD_MODEL, ticketId: '' },
  };
  rooms.set(roomId, room);
  return room;
}

function broadcastToRoom(roomId: string, data: any) {
  for (const ws of clients.values()) {
    if (ws.roomId === roomId && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data));
    }
  }
}

function isAdmin(room: RoomState, userId: string): boolean {
  const user = room.users.find((u) => u.id === userId);
  return !!user && (user.role === 'admin' || user.role === 'admin_spectator');
}

/** When admin leaves, promote the last remaining user to admin. */
function ensureAdminExists(room: RoomState): void {
  const hasAdmin = room.users.some((u) => u.role === 'admin' || u.role === 'admin_spectator');
  if (!hasAdmin && room.users.length > 0) {
    const first = room.users[0];
    const newRole = first.role === 'spectator' ? 'admin_spectator' : 'admin';
    room.users = room.users.map((u, i) => (i === 0 ? { ...u, role: newRole as any } : u));
  }
}

function getTeamRoleLabel(user: User): string {
  const role = user.teamRole;
  if (!role) return 'Unspecified';
  if (role === 'other') {
    const custom = String(user.teamRoleCustom ?? '').trim();
    return custom || 'Other';
  }
  const labels: Record<string, string> = {
    frontend: 'Frontend',
    backend: 'Backend',
    fullstack: 'Fullstack',
    qa: 'QA',
    devops: 'DevOps',
    techlead: 'Tech Lead',
    engineer: 'Engineer',
    staff: 'Staff',
  };
  return labels[role] || 'Unspecified';
}

function computeVotingSummary(room: RoomState): VotingRoundSummary | null {
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
    if (cardValues && cardValues[card] != null) {
      val = cardValues[card];
    } else {
      const n = parseInt(String(card), 10);
      if (!isNaN(n)) val = n;
    }
    const contributes = val > 0;
    if (contributes) values.push(val);
    perUser.push({
      userId: user.id,
      userName: user.name,
      role: getTeamRoleLabel(user),
      card,
      numericValue: val,
      contributes,
    });

    const role = getTeamRoleLabel(user);
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
  const average = votesWithValue > 0
    ? Math.round((sum / votesWithValue) * 10) / 10
    : 0;
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

function attachWebsocketServer(server: HttpServer) {
  const wss = new WebSocketServer({ server, path: '/api/ws' });

  wss.on('connection', (ws: WS) => {
    ws.id = `c_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,6)}`;
    clients.set(ws.id, ws);

    ws.on('message', (msg) => {
      try {
        const parsed = JSON.parse(msg.toString());
        handleMessage(ws, parsed);
      } catch (e) {
        ws.send(JSON.stringify({ type: 'ERROR', payload: { code: 'INVALID_JSON', message: 'Invalid JSON' } }));
      }
    });

    ws.on('close', () => {
      // Remove the user from the room and destroy the room if empty
      if (ws.roomId && ws.userId) {
        const room = rooms.get(ws.roomId);
        if (room) {
          room.users = room.users.filter((u) => u.id !== ws.userId);
          room.updatedAt = Date.now();
          broadcastToRoom(ws.roomId, { type: 'USER_LEFT', payload: { userId: ws.userId } });
          if (room.users.length === 0) {
            rooms.delete(ws.roomId);
            // eslint-disable-next-line no-console
            console.log(`Room ${ws.roomId} destroyed (no users)`);
          } else {
            ensureAdminExists(room);
            rooms.set(ws.roomId, room);
            broadcastToRoom(ws.roomId, { type: 'ROOM_STATE_UPDATED', payload: { room } });
          }
        }
      }
      clients.delete(ws.id || '');
    });
  });
}

function handleMessage(ws: WS, ev: any) {
  const type = ev.type;
  const payload = ev.payload;
  switch (type) {
    case 'JOIN_ROOM': {
      const { roomId, user, allowCreate } = payload;
      if (!roomId || !user) {
        ws.send(JSON.stringify({ type: 'ERROR', payload: { code: 'INVALID_JOIN', message: 'roomId and user required' } }));
        return;
      }
      let room = rooms.get(roomId);
      if (!room && !allowCreate) {
        ws.send(JSON.stringify({ type: 'ERROR', payload: { code: 'ROOM_NOT_FOUND', message: 'Room not found' } }));
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
      if (!room) {
        // creator becomes admin
        userObj.role = 'admin';
        room = createRoom(roomId, userObj);
      } else {
        if (!room.settings?.cardModel) {
          room.settings = room.settings || {};
          room.settings.cardModel = DEFAULT_CARD_MODEL;
        }
        // ensure unique name
        if (room.users.some((u) => u.name === userObj.name)) {
          // append suffix to name
          userObj.name = `${userObj.name}-${Math.random().toString(36).slice(2,4)}`;
        }
        room.users.push(userObj);
      }
      ws.roomId = roomId;
      ws.userId = userObj.id;
      ws.sessionId = userObj.sessionId || '';

      // send ROOM_JOINED snapshot to this client
      ws.send(JSON.stringify({ type: 'ROOM_JOINED', payload: { room, sessionId: ws.sessionId || '' } }));
      // notify others
      broadcastToRoom(roomId, { type: 'USER_JOINED', payload: { user: userObj } });
      break;
    }
    case 'LEAVE_ROOM': {
      const { roomId, userId } = payload;
      const room = rooms.get(roomId);
      if (!room) return;
      room.users = room.users.filter((u) => u.id !== userId);
      room.updatedAt = Date.now();
      broadcastToRoom(roomId, { type: 'USER_LEFT', payload: { userId } });
      if (room.users.length === 0) {
        rooms.delete(roomId);
        // eslint-disable-next-line no-console
        console.log(`Room ${roomId} destroyed (last user left)`);
      } else {
        ensureAdminExists(room);
        rooms.set(roomId, room);
        broadcastToRoom(roomId, { type: 'ROOM_STATE_UPDATED', payload: { room } });
      }
      break;
    }
    case 'CAST_VOTE': {
      const { roomId, userId, vote } = payload;
      const room = rooms.get(roomId);
      if (!room) return;
      if (room.voting.isRevealed) {
        ws.send(JSON.stringify({ type: 'ERROR', payload: { code: 'VOTES_REVEALED', message: 'Cannot change vote while votes are revealed' } }));
        return;
      }
      room.voting.votes[userId] = vote ?? null;
      room.updatedAt = Date.now();
      broadcastToRoom(roomId, { type: 'VOTE_CAST', payload: { userId, vote } });
      break;
    }
    case 'REVEAL_VOTES': {
      const { roomId, userId } = payload;
      const room = rooms.get(roomId);
      if (!room) return;
      if (!isAdmin(room, userId)) {
        ws.send(JSON.stringify({ type: 'ERROR', payload: { code: 'FORBIDDEN', message: 'Only admin can reveal votes' } }));
        return;
      }
      room.voting.isRevealed = true;
      room.updatedAt = Date.now();
      broadcastToRoom(roomId, { type: 'VOTES_REVEALED', payload: { votes: room.voting.votes } });
      break;
    }
    case 'RESET_VOTING': {
      const { roomId, userId } = payload;
      const room = rooms.get(roomId);
      if (!room) return;
      if (!isAdmin(room, userId)) {
        ws.send(JSON.stringify({ type: 'ERROR', payload: { code: 'FORBIDDEN', message: 'Only admin can reset voting' } }));
        return;
      }
      if (room.voting.isRevealed) {
        const summary = computeVotingSummary(room);
        if (summary) {
          room.settings = room.settings || {};
          const history = room.settings.votingHistory || [];
          summary.roundNumber = history.length + 1;
          room.settings.votingHistory = [...history, summary];
        }
      }
      room.settings = room.settings || {};
      room.settings.ticketId = '';
      room.voting = { isActive: false, isRevealed: false, votes: {} };
      room.updatedAt = Date.now();
      broadcastToRoom(roomId, { type: 'VOTING_RESET', payload: {} });
      broadcastToRoom(roomId, { type: 'ROOM_STATE_UPDATED', payload: { room } });
      break;
    }
    case 'SET_TICKET_ID': {
      const { roomId, userId, ticketId } = payload;
      const room = rooms.get(roomId);
      if (!room) return;
      if (!isAdmin(room, userId)) {
        ws.send(JSON.stringify({ type: 'ERROR', payload: { code: 'FORBIDDEN', message: 'Only admin can set ticket id' } }));
        return;
      }
      room.settings = room.settings || {};
      room.settings.ticketId = String(ticketId ?? '').trim();
      room.updatedAt = Date.now();
      broadcastToRoom(roomId, { type: 'ROOM_STATE_UPDATED', payload: { room } });
      break;
    }
    case 'KICK_USER': {
      const { roomId, userId, targetUserId } = payload;
      const room = rooms.get(roomId);
      if (!room) return;
      if (!isAdmin(room, userId)) {
        ws.send(JSON.stringify({ type: 'ERROR', payload: { code: 'FORBIDDEN', message: 'Only admin can kick users' } }));
        return;
      }
      room.users = room.users.filter((u) => u.id !== targetUserId);
      room.updatedAt = Date.now();
      broadcastToRoom(roomId, { type: 'USER_KICKED', payload: { userId: targetUserId } });
      if (room.users.length === 0) {
        rooms.delete(roomId);
        // eslint-disable-next-line no-console
        console.log(`Room ${roomId} destroyed (last user kicked)`);
      } else {
        rooms.set(roomId, room);
      }
      break;
    }
    case 'UPDATE_ROLE': {
      const { roomId, userId, targetUserId, role } = payload;
      const room = rooms.get(roomId);
      if (!room) return;
      const isSelfChange = userId === targetUserId;
      const targetUser = room.users.find((u) => u.id === targetUserId);
      // Allow self-change for spectator/voter/admin_spectator; admin requires current user to be admin_spectator
      if (isSelfChange) {
        const allowedSelfRoles = ['spectator', 'voter', 'admin_spectator'];
        const canSelfAdmin = role === 'admin' && targetUser?.role === 'admin_spectator';
        if (!allowedSelfRoles.includes(role) && !canSelfAdmin) {
          ws.send(JSON.stringify({ type: 'ERROR', payload: { code: 'FORBIDDEN', message: 'Only admin can change roles' } }));
          return;
        }
      } else if (!isAdmin(room, userId)) {
        ws.send(JSON.stringify({ type: 'ERROR', payload: { code: 'FORBIDDEN', message: 'Only admin can change roles' } }));
        return;
      }
      // enforce single admin
      if (role === 'admin') {
        // promote target first, then demote any other admin
        room.users = room.users.map((u) => {
          if (u.id === targetUserId) return { ...u, role: 'admin' };
          if (u.role === 'admin') return { ...u, role: 'voter' };
          if (u.role === 'admin_spectator') return { ...u, role: 'spectator' };
          return u;
        });
      } else if (role === 'admin_spectator') {
        room.users = room.users.map((u) => (u.id === targetUserId ? { ...u, role: 'admin_spectator' } : u));
      } else {
        room.users = room.users.map((u) => (u.id === targetUserId ? { ...u, role } : u));
      }
      room.updatedAt = Date.now();
      broadcastToRoom(roomId, { type: 'USER_ROLE_UPDATED', payload: { userId: targetUserId, role } });
      broadcastToRoom(roomId, { type: 'ROOM_STATE_UPDATED', payload: { room } });
      break;
    }
    case 'SET_CARD_MODEL': {
      const { roomId, userId, cardModel } = payload;
      const room = rooms.get(roomId);
      if (!room) return;
      if (!isAdmin(room, userId)) {
        ws.send(JSON.stringify({ type: 'ERROR', payload: { code: 'FORBIDDEN', message: 'Only admin can set card model' } }));
        return;
      }
      if (!cardModel || !cardModel.id || !cardModel.name || !Array.isArray(cardModel.cards) || cardModel.cards.length < 2) {
        ws.send(JSON.stringify({ type: 'ERROR', payload: { code: 'INVALID_MODEL', message: 'Invalid card model' } }));
        return;
      }
      room.settings = room.settings || {};
      const model: any = { id: cardModel.id, name: cardModel.name, cards: [...cardModel.cards], isPreset: cardModel.isPreset };
      if (cardModel.cardValues && typeof cardModel.cardValues === 'object' && Object.keys(cardModel.cardValues).length > 0) {
        model.cardValues = { ...cardModel.cardValues };
      }
      room.settings.cardModel = model;
      room.updatedAt = Date.now();
      broadcastToRoom(roomId, { type: 'ROOM_STATE_UPDATED', payload: { room } });
      break;
    }
    case 'PING': {
      ws.send(JSON.stringify({ type: 'PONG', payload: { timestamp: Date.now() } }));
      break;
    }
    default:
      ws.send(JSON.stringify({ type: 'ERROR', payload: { code: 'UNKNOWN_EVENT', message: 'Unknown event type' } }));
  }
}

export { attachWebsocketServer };

