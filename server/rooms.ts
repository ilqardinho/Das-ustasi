import http from 'http';
import crypto from 'crypto';
import { WebSocketServer, WebSocket } from 'ws';
import { LEVELS } from '../src/game/levels.ts';
import { ROOM_CREATE_COST_COINS, ROOM_TIME_OPTIONS_SEC } from '../src/game/multiplayer.ts';
import type {
  MultiplayerRoomState,
  RoomCategoryFilter,
  RoomPlayerState,
} from '../src/game/types.ts';

interface InternalRoom extends MultiplayerRoomState {
  endsAt: number | null;
  sockets: Map<string, WebSocket>;
  lastActivityAt: number;
}

interface SocketMeta {
  roomCode: string | null;
  playerId: string | null;
}

const VALID_CATEGORIES = new Set<RoomCategoryFilter>(['all', 'easy', 'medium', 'hard', 'master']);
const VALID_TIME_OPTIONS = new Set<number>(ROOM_TIME_OPTIONS_SEC);
const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export class RoomManager {
  private rooms = new Map<string, InternalRoom>();
  private socketMeta = new WeakMap<WebSocket, SocketMeta>();
  private tickInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.tickInterval = setInterval(() => {
      this.tickRooms();
    }, 1000);
  }

  public dispose(): void {
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
    this.rooms.clear();
  }

  public getRoomSnapshot(code: string): MultiplayerRoomState | null {
    const clean = code.trim().toUpperCase();
    const room = this.rooms.get(clean);
    return room ? this.serializeRoom(room) : null;
  }

  private generateRoomCode(): string {
    for (let attempt = 0; attempt < 20; attempt++) {
      const bytes = crypto.randomBytes(6);
      let code = '';
      for (let i = 0; i < 6; i++) {
        code += ROOM_CODE_ALPHABET[bytes[i] % ROOM_CODE_ALPHABET.length];
      }
      if (!this.rooms.has(code)) return code;
    }
    return `DM${Date.now().toString(36).toUpperCase().slice(-4)}`;
  }

  private sanitizeCategory(raw: unknown): RoomCategoryFilter {
    if (typeof raw === 'string' && VALID_CATEGORIES.has(raw as RoomCategoryFilter)) {
      return raw as RoomCategoryFilter;
    }
    return 'all';
  }

  private sanitizeLevel(rawLevelId: unknown, category: RoomCategoryFilter) {
    const id = typeof rawLevelId === 'number' ? Math.round(rawLevelId) : 1;
    const pool =
      category === 'all' ? LEVELS : LEVELS.filter((l) => l.difficulty === category);
    const matching = pool.find((l) => l.id === id);
    return matching ?? pool[0] ?? LEVELS[0];
  }

  private sanitizeTimeLimit(raw: unknown): number {
    const n = typeof raw === 'number' ? Math.round(raw) : 120;
    if (VALID_TIME_OPTIONS.has(n)) return n;
    return Math.max(30, Math.min(600, n));
  }

  private sanitizeName(raw: unknown): string {
    if (typeof raw !== 'string') return 'Usta';
    const trimmed = raw.trim().slice(0, 24);
    return trimmed.length > 0 ? trimmed : 'Usta';
  }

  private serializeRoom(room: InternalRoom): MultiplayerRoomState {
    return {
      code: room.code,
      hostId: room.hostId,
      category: room.category,
      levelId: room.levelId,
      timeLimitSec: room.timeLimitSec,
      seed: room.seed,
      totalTiles: room.totalTiles,
      entryCostCoins: room.entryCostCoins,
      status: room.status,
      createdAt: room.createdAt,
      startedAt: room.startedAt,
      serverRemainingSec: room.serverRemainingSec,
      players: room.players.map((p) => ({ ...p })),
    };
  }

  private send(ws: WebSocket, payload: Record<string, unknown>): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(payload));
    }
  }

  private broadcast(room: InternalRoom, payload: Record<string, unknown>): void {
    const encoded = JSON.stringify(payload);
    for (const sock of room.sockets.values()) {
      if (sock.readyState === WebSocket.OPEN) {
        sock.send(encoded);
      }
    }
  }

  private detachFromPreviousRoom(ws: WebSocket, nextCode?: string): void {
    const meta = this.socketMeta.get(ws);
    if (!meta || !meta.roomCode || !meta.playerId) return;
    if (nextCode && meta.roomCode === nextCode) return;

    const prevRoom = this.rooms.get(meta.roomCode);
    if (!prevRoom) return;

    if (prevRoom.sockets.get(meta.playerId) === ws) {
      prevRoom.sockets.delete(meta.playerId);
      const player = prevRoom.players.find((p) => p.id === meta.playerId);
      if (player) {
        player.connected = false;
      }
      prevRoom.lastActivityAt = Date.now();
      this.broadcast(prevRoom, { type: 'room:state', room: this.serializeRoom(prevRoom) });
    }
  }

  public handleSocketConnection(ws: WebSocket): void {
    this.socketMeta.set(ws, { roomCode: null, playerId: null });

    ws.on('message', (raw) => {
      let msg: Record<string, unknown>;
      try {
        msg = JSON.parse(String(raw)) as Record<string, unknown>;
      } catch {
        this.send(ws, { type: 'room:error', code: 'BAD_JSON', message: 'Invalid JSON payload' });
        return;
      }

      const type = typeof msg.type === 'string' ? msg.type : '';
      switch (type) {
        case 'room:create':
          this.onCreateRoom(ws, msg);
          break;
        case 'room:join':
          this.onJoinRoom(ws, msg);
          break;
        case 'room:update_config':
          this.onUpdateConfig(ws, msg);
          break;
        case 'room:toggle_ready':
          this.onToggleReady(ws, msg);
          break;
        case 'room:set_name':
          this.onSetName(ws, msg);
          break;
        case 'room:start':
          this.onStartRoom(ws, msg);
          break;
        case 'room:progress':
          this.onPlayerProgress(ws, msg);
          break;
        case 'room:rematch':
          this.onRematch(ws, msg);
          break;
        case 'room:leave':
          this.onLeaveRoom(ws, msg);
          break;
        default:
          break;
      }
    });

    ws.on('close', () => {
      const meta = this.socketMeta.get(ws);
      if (!meta || !meta.roomCode || !meta.playerId) return;
      const room = this.rooms.get(meta.roomCode);
      if (!room) return;
      if (room.sockets.get(meta.playerId) === ws) {
        room.sockets.delete(meta.playerId);
        const player = room.players.find((p) => p.id === meta.playerId);
        if (player) {
          player.connected = false;
        }
        room.lastActivityAt = Date.now();
        this.broadcast(room, { type: 'room:state', room: this.serializeRoom(room) });
      }
    });
  }

  private onCreateRoom(ws: WebSocket, msg: Record<string, unknown>): void {
    const playerId = typeof msg.playerId === 'string' && msg.playerId ? msg.playerId : '';
    if (!playerId) {
      this.send(ws, { type: 'room:error', code: 'INVALID_PLAYER', message: 'Missing playerId' });
      return;
    }

    const clientCoins = typeof msg.clientCoins === 'number' ? Math.floor(msg.clientCoins) : 0;
    if (clientCoins < ROOM_CREATE_COST_COINS) {
      this.send(ws, {
        type: 'room:error',
        code: 'INSUFFICIENT_COINS',
        message: `Need ${ROOM_CREATE_COST_COINS} coins`,
      });
      return;
    }

    this.detachFromPreviousRoom(ws);

    const category = this.sanitizeCategory(msg.category);
    const level = this.sanitizeLevel(msg.levelId, category);
    const timeLimitSec = this.sanitizeTimeLimit(msg.timeLimitSec);
    const playerName = this.sanitizeName(msg.playerName);
    const avatarId = typeof msg.avatarId === 'string' && msg.avatarId ? msg.avatarId : 'avatar_1';

    const code = this.generateRoomCode();
    const now = Date.now();
    const hostPlayer: RoomPlayerState = {
      id: playerId,
      name: playerName,
      avatarId,
      isHost: true,
      connected: true,
      ready: true,
      score: 0,
      remainingTiles: level.slots.length,
      totalTiles: level.slots.length,
      matchesCleared: 0,
      mistakes: 0,
      status: 'waiting',
      finishTimeSec: null,
      joinedAt: now,
    };

    const room: InternalRoom = {
      code,
      hostId: playerId,
      category,
      levelId: level.id,
      timeLimitSec,
      seed: Math.floor(10000 + Math.random() * 899999),
      totalTiles: level.slots.length,
      entryCostCoins: ROOM_CREATE_COST_COINS,
      status: 'waiting',
      createdAt: now,
      startedAt: null,
      serverRemainingSec: null,
      endsAt: null,
      lastActivityAt: now,
      players: [hostPlayer],
      sockets: new Map([[playerId, ws]]),
    };

    this.rooms.set(code, room);
    this.socketMeta.set(ws, { roomCode: code, playerId });

    const snapshot = this.serializeRoom(room);
    this.send(ws, { type: 'room:created', room: snapshot, chargedCoins: ROOM_CREATE_COST_COINS });
    this.send(ws, { type: 'room:state', room: snapshot });
  }

  private onJoinRoom(ws: WebSocket, msg: Record<string, unknown>): void {
    const rawCode = typeof msg.code === 'string' ? msg.code.trim().toUpperCase() : '';
    const playerId = typeof msg.playerId === 'string' && msg.playerId ? msg.playerId : '';
    if (!rawCode || !playerId) {
      this.send(ws, { type: 'room:error', code: 'INVALID_JOIN', message: 'Invalid room or player' });
      return;
    }

    const room = this.rooms.get(rawCode);
    if (!room) {
      this.send(ws, { type: 'room:error', code: 'ROOM_NOT_FOUND', message: 'Room not found' });
      return;
    }

    this.detachFromPreviousRoom(ws, rawCode);

    const playerName = this.sanitizeName(msg.playerName);
    const avatarId = typeof msg.avatarId === 'string' && msg.avatarId ? msg.avatarId : 'avatar_1';
    const existing = room.players.find((p) => p.id === playerId);

    if (existing) {
      existing.connected = true;
      existing.name = playerName;
      existing.avatarId = avatarId;
    } else {
      room.players.push({
        id: playerId,
        name: playerName,
        avatarId,
        isHost: playerId === room.hostId,
        connected: true,
        ready: room.status === 'playing',
        score: 0,
        remainingTiles: room.totalTiles,
        totalTiles: room.totalTiles,
        matchesCleared: 0,
        mistakes: 0,
        status: room.status === 'playing' ? 'playing' : 'waiting',
        finishTimeSec: null,
        joinedAt: Date.now(),
      });
    }

    room.sockets.set(playerId, ws);
    room.lastActivityAt = Date.now();
    this.socketMeta.set(ws, { roomCode: room.code, playerId });

    const snapshot = this.serializeRoom(room);
    this.send(ws, { type: 'room:joined', room: snapshot });
    this.broadcast(room, { type: 'room:state', room: snapshot });
  }

  private onUpdateConfig(ws: WebSocket, msg: Record<string, unknown>): void {
    const meta = this.socketMeta.get(ws);
    const code = typeof msg.code === 'string' ? msg.code.trim().toUpperCase() : meta?.roomCode;
    const playerId = typeof msg.playerId === 'string' ? msg.playerId : meta?.playerId;
    if (!code || !playerId) return;

    const room = this.rooms.get(code);
    if (!room || room.hostId !== playerId || room.status !== 'waiting') return;

    const category =
      msg.category !== undefined ? this.sanitizeCategory(msg.category) : room.category;
    const level = this.sanitizeLevel(
      msg.levelId !== undefined ? msg.levelId : room.levelId,
      category
    );
    const timeLimitSec =
      msg.timeLimitSec !== undefined
        ? this.sanitizeTimeLimit(msg.timeLimitSec)
        : room.timeLimitSec;

    room.category = category;
    room.levelId = level.id;
    room.totalTiles = level.slots.length;
    room.timeLimitSec = timeLimitSec;
    room.lastActivityAt = Date.now();

    for (const p of room.players) {
      p.totalTiles = room.totalTiles;
      p.remainingTiles = room.totalTiles;
    }

    this.broadcast(room, { type: 'room:state', room: this.serializeRoom(room) });
  }

  private onToggleReady(ws: WebSocket, msg: Record<string, unknown>): void {
    const meta = this.socketMeta.get(ws);
    const code = typeof msg.code === 'string' ? msg.code.trim().toUpperCase() : meta?.roomCode;
    const playerId = typeof msg.playerId === 'string' ? msg.playerId : meta?.playerId;
    if (!code || !playerId) return;

    const room = this.rooms.get(code);
    if (!room || room.status !== 'waiting') return;

    const player = room.players.find((p) => p.id === playerId);
    if (!player) return;

    player.ready = typeof msg.ready === 'boolean' ? msg.ready : !player.ready;
    room.lastActivityAt = Date.now();
    this.broadcast(room, { type: 'room:state', room: this.serializeRoom(room) });
  }

  private onSetName(ws: WebSocket, msg: Record<string, unknown>): void {
    const meta = this.socketMeta.get(ws);
    const code = typeof msg.code === 'string' ? msg.code.trim().toUpperCase() : meta?.roomCode;
    const playerId = typeof msg.playerId === 'string' ? msg.playerId : meta?.playerId;
    if (!code || !playerId) return;

    const room = this.rooms.get(code);
    if (!room) return;

    const player = room.players.find((p) => p.id === playerId);
    if (!player) return;

    player.name = this.sanitizeName(msg.name);
    room.lastActivityAt = Date.now();
    this.broadcast(room, { type: 'room:state', room: this.serializeRoom(room) });
  }

  private onStartRoom(ws: WebSocket, msg: Record<string, unknown>): void {
    const meta = this.socketMeta.get(ws);
    const code = typeof msg.code === 'string' ? msg.code.trim().toUpperCase() : meta?.roomCode;
    const playerId = typeof msg.playerId === 'string' ? msg.playerId : meta?.playerId;
    if (!code || !playerId) return;

    const room = this.rooms.get(code);
    if (!room || room.hostId !== playerId) return;

    const now = Date.now();
    room.status = 'playing';
    room.startedAt = now;
    room.endsAt = now + room.timeLimitSec * 1000;
    room.serverRemainingSec = room.timeLimitSec;
    room.seed = Math.floor(10000 + Math.random() * 899999);
    room.lastActivityAt = now;

    for (const p of room.players) {
      p.score = 0;
      p.remainingTiles = room.totalTiles;
      p.totalTiles = room.totalTiles;
      p.matchesCleared = 0;
      p.mistakes = 0;
      p.status = 'playing';
      p.finishTimeSec = null;
    }

    const snapshot = this.serializeRoom(room);
    this.broadcast(room, { type: 'room:started', room: snapshot });
    this.broadcast(room, { type: 'room:state', room: snapshot });
  }

  private onPlayerProgress(ws: WebSocket, msg: Record<string, unknown>): void {
    const meta = this.socketMeta.get(ws);
    const code = typeof msg.code === 'string' ? msg.code.trim().toUpperCase() : meta?.roomCode;
    const playerId = typeof msg.playerId === 'string' ? msg.playerId : meta?.playerId;
    if (!code || !playerId) return;

    const room = this.rooms.get(code);
    if (!room || room.status === 'waiting') return;

    const player = room.players.find((p) => p.id === playerId);
    if (!player) return;

    if (typeof msg.score === 'number' && Number.isFinite(msg.score)) {
      player.score = Math.max(0, Math.round(msg.score));
    }
    if (typeof msg.remainingTiles === 'number' && Number.isFinite(msg.remainingTiles)) {
      player.remainingTiles = Math.max(0, Math.min(room.totalTiles, Math.round(msg.remainingTiles)));
    }
    if (typeof msg.matchesCleared === 'number' && Number.isFinite(msg.matchesCleared)) {
      player.matchesCleared = Math.max(0, Math.round(msg.matchesCleared));
    }
    if (typeof msg.mistakes === 'number' && Number.isFinite(msg.mistakes)) {
      player.mistakes = Math.max(0, Math.round(msg.mistakes));
    }

    if (msg.outcome === 'won') {
      player.status = 'won';
      player.remainingTiles = 0;
      if (player.finishTimeSec === null) {
        const elapsed =
          typeof msg.finishTimeSec === 'number' && Number.isFinite(msg.finishTimeSec)
            ? Math.max(1, Math.round(msg.finishTimeSec))
            : room.startedAt
            ? Math.max(1, Math.round((Date.now() - room.startedAt) / 1000))
            : 1;
        player.finishTimeSec = elapsed;
      }
    } else if (msg.outcome === 'lost') {
      if (player.status !== 'won') {
        player.status = 'lost';
      }
    }

    const connectedPlayers = room.players.filter((p) => p.connected);
    const activeGroup = connectedPlayers.length > 0 ? connectedPlayers : room.players;
    const everyoneDone =
      activeGroup.length > 0 &&
      activeGroup.every((p) => p.status === 'won' || p.status === 'lost');

    if (everyoneDone && room.status === 'playing') {
      room.status = 'finished';
      room.endsAt = null;
    }

    room.lastActivityAt = Date.now();
    this.broadcast(room, { type: 'room:state', room: this.serializeRoom(room) });
  }

  private onRematch(ws: WebSocket, msg: Record<string, unknown>): void {
    const meta = this.socketMeta.get(ws);
    const code = typeof msg.code === 'string' ? msg.code.trim().toUpperCase() : meta?.roomCode;
    const playerId = typeof msg.playerId === 'string' ? msg.playerId : meta?.playerId;
    if (!code || !playerId) return;

    const room = this.rooms.get(code);
    if (!room || room.hostId !== playerId) return;

    room.status = 'waiting';
    room.startedAt = null;
    room.endsAt = null;
    room.serverRemainingSec = null;
    room.seed = Math.floor(10000 + Math.random() * 899999);
    room.lastActivityAt = Date.now();

    for (const p of room.players) {
      p.ready = p.id === room.hostId;
      p.score = 0;
      p.remainingTiles = room.totalTiles;
      p.matchesCleared = 0;
      p.mistakes = 0;
      p.status = 'waiting';
      p.finishTimeSec = null;
    }

    this.broadcast(room, { type: 'room:state', room: this.serializeRoom(room) });
  }

  private onLeaveRoom(ws: WebSocket, msg: Record<string, unknown>): void {
    const meta = this.socketMeta.get(ws);
    const code = typeof msg.code === 'string' ? msg.code.trim().toUpperCase() : meta?.roomCode;
    const playerId = typeof msg.playerId === 'string' ? msg.playerId : meta?.playerId;
    if (!code || !playerId) return;

    const room = this.rooms.get(code);
    if (!room) return;

    room.sockets.delete(playerId);
    room.players = room.players.filter((p) => p.id !== playerId);
    this.socketMeta.set(ws, { roomCode: null, playerId: null });

    if (room.players.length === 0) {
      this.rooms.delete(code);
      return;
    }

    if (room.hostId === playerId) {
      const nextHost = room.players.find((p) => p.connected) ?? room.players[0];
      if (nextHost) {
        room.hostId = nextHost.id;
        for (const p of room.players) {
          p.isHost = p.id === nextHost.id;
        }
      }
    }

    room.lastActivityAt = Date.now();
    this.broadcast(room, { type: 'room:state', room: this.serializeRoom(room) });
  }

  private tickRooms(): void {
    const now = Date.now();
    for (const [code, room] of this.rooms.entries()) {
      // Expire idle rooms after 2 hours with no active sockets
      if (room.sockets.size === 0 && now - room.lastActivityAt > 2 * 60 * 60 * 1000) {
        this.rooms.delete(code);
        continue;
      }

      if (room.status === 'playing' && room.endsAt !== null) {
        const remaining = Math.max(0, Math.ceil((room.endsAt - now) / 1000));
        if (remaining !== room.serverRemainingSec) {
          room.serverRemainingSec = remaining;
          if (remaining <= 0) {
            for (const p of room.players) {
              if (p.status === 'playing') {
                p.status = 'lost';
              }
            }
            room.status = 'finished';
            room.endsAt = null;
          }
          this.broadcast(room, { type: 'room:state', room: this.serializeRoom(room) });
        }
      }
    }
  }
}

export function attachRoomWebSocketServer(httpServer: http.Server): RoomManager {
  const manager = new RoomManager();
  const wss = new WebSocketServer({ noServer: true });

  wss.on('connection', (ws) => {
    manager.handleSocketConnection(ws);
  });

  httpServer.on('upgrade', (request, socket, head) => {
    try {
      const url = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`);
      if (url.pathname === '/ws/rooms') {
        wss.handleUpgrade(request, socket, head, (ws) => {
          wss.emit('connection', ws, request);
        });
      }
    } catch {
      // Ignore malformed upgrade URLs
    }
  });

  return manager;
}
