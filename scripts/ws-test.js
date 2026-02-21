#!/usr/bin/env node
const WebSocket = require('ws');

const WS_URL = process.env.WS_URL || 'ws://localhost:4000/api/ws';
const ROOM_ID = 'test-room-' + Date.now().toString(36).slice(0,6);

function makeId() {
  return 'u_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2,6);
}

function createClient(name) {
  return new Promise((resolve) => {
    const id = makeId();
    const ws = new WebSocket(WS_URL);
    ws.on('open', () => {
      console.log(`[client ${name}] open, sending JOIN_ROOM id=${id}`);
      const join = { type: 'JOIN_ROOM', payload: { roomId: ROOM_ID, user: { id, name, sessionId: id } } };
      ws.send(JSON.stringify(join));
      resolve({ ws, id, name });
    });
    ws.on('message', (msg) => {
      try {
        const parsed = JSON.parse(msg.toString());
        console.log(`[client ${name}] <-`, parsed.type, parsed.payload ? Object.keys(parsed.payload) : '');
      } catch (e) {
        console.log(`[client ${name}] <- raw`, msg.toString());
      }
    });
    ws.on('close', () => {
      console.log(`[client ${name}] closed`);
    });
    ws.on('error', (err) => {
      console.error(`[client ${name}] error`, err.message);
    });
  });
}

(async () => {
  console.log('WS test connecting to', WS_URL, 'room:', ROOM_ID);
  const a = await createClient('A');
  const b = await createClient('B');
  const c = await createClient('C');

  // after 2s, B leaves
  setTimeout(() => {
    console.log('[test] B leaving (sending LEAVE_ROOM)');
    const leave = { type: 'LEAVE_ROOM', payload: { roomId: ROOM_ID, userId: b.id } };
    b.ws.send(JSON.stringify(leave));
    // close ws
    b.ws.close();
  }, 2000);

  // after 4s, C is kicked by A (simulate admin)
  setTimeout(() => {
    console.log('[test] A kicking C');
    const kick = { type: 'KICK_USER', payload: { roomId: ROOM_ID, userId: a.id, targetUserId: c.id } };
    a.ws.send(JSON.stringify(kick));
  }, 4000);

  // after 6s, A leaves
  setTimeout(() => {
    console.log('[test] A leaving');
    const leave = { type: 'LEAVE_ROOM', payload: { roomId: ROOM_ID, userId: a.id } };
    a.ws.send(JSON.stringify(leave));
    a.ws.close();
  }, 6000);

  // after 8s, close C's socket if still open
  setTimeout(() => {
    try {
      if (c.ws && c.ws.readyState === WebSocket.OPEN) c.ws.close();
    } catch (e) {}
    console.log('[test] finished');
    process.exit(0);
  }, 8000);
})();

