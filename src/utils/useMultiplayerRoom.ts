import { useCallback, useEffect, useRef, useState } from 'react';
import {
  getOrCreateClientPlayerId,
  loadSavedPlayerName,
  savePlayerName,
} from '../game/multiplayer';
import { MultiplayerRoomState, RoomCategoryFilter } from '../game/types';

export type RoomSocketStatus = 'disconnected' | 'connecting' | 'connected';

interface UseMultiplayerRoomOptions {
  avatarId: string;
  onCoinsCharged?: (amount: number) => void;
  onRoomStarted?: (room: MultiplayerRoomState) => void;
}

export function useMultiplayerRoom({
  avatarId,
  onCoinsCharged,
  onRoomStarted,
}: UseMultiplayerRoomOptions) {
  const [playerId] = useState<string>(() => getOrCreateClientPlayerId());
  const [playerName, setPlayerNameState] = useState<string>(() => loadSavedPlayerName('Usta'));
  const [room, setRoom] = useState<MultiplayerRoomState | null>(null);
  const [socketStatus, setSocketStatus] = useState<RoomSocketStatus>('disconnected');
  const [errorCode, setErrorCode] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const pendingQueueRef = useRef<string[]>([]);
  const activeRoomCodeRef = useRef<string | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const intentionalCloseRef = useRef(false);
  const playerNameRef = useRef(playerName);
  const avatarIdRef = useRef(avatarId);
  const onCoinsChargedRef = useRef(onCoinsCharged);
  const onRoomStartedRef = useRef(onRoomStarted);

  playerNameRef.current = playerName;
  avatarIdRef.current = avatarId;
  onCoinsChargedRef.current = onCoinsCharged;
  onRoomStartedRef.current = onRoomStarted;

  const ensureSocket = useCallback(() => {
    if (typeof window === 'undefined') return;
    const existing = wsRef.current;
    if (
      existing &&
      (existing.readyState === WebSocket.OPEN || existing.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    intentionalCloseRef.current = false;
    setSocketStatus('connecting');
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${proto}//${window.location.host}/ws/rooms`);
    wsRef.current = ws;

    ws.onopen = () => {
      setSocketStatus('connected');
      setErrorCode(null);

      // Re-sync existing room membership on reconnect
      if (activeRoomCodeRef.current) {
        ws.send(
          JSON.stringify({
            type: 'room:join',
            code: activeRoomCodeRef.current,
            playerId,
            playerName: playerNameRef.current,
            avatarId: avatarIdRef.current,
          })
        );
      }

      while (pendingQueueRef.current.length > 0 && ws.readyState === WebSocket.OPEN) {
        const msg = pendingQueueRef.current.shift();
        if (msg) ws.send(msg);
      }
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(String(event.data)) as Record<string, unknown>;
        const type = typeof data.type === 'string' ? data.type : '';

        if (type === 'room:created') {
          const nextRoom = data.room as MultiplayerRoomState;
          const charged = typeof data.chargedCoins === 'number' ? data.chargedCoins : 0;
          activeRoomCodeRef.current = nextRoom.code;
          setRoom(nextRoom);
          setErrorCode(null);
          if (charged > 0) {
            onCoinsChargedRef.current?.(charged);
          }
          return;
        }

        if (type === 'room:joined') {
          const nextRoom = data.room as MultiplayerRoomState;
          activeRoomCodeRef.current = nextRoom.code;
          setRoom(nextRoom);
          setErrorCode(null);
          if (nextRoom.status === 'playing') {
            onRoomStartedRef.current?.(nextRoom);
          }
          return;
        }

        if (type === 'room:started') {
          const nextRoom = data.room as MultiplayerRoomState;
          activeRoomCodeRef.current = nextRoom.code;
          setRoom(nextRoom);
          setErrorCode(null);
          onRoomStartedRef.current?.(nextRoom);
          return;
        }

        if (type === 'room:state') {
          const nextRoom = data.room as MultiplayerRoomState;
          activeRoomCodeRef.current = nextRoom.code;
          setRoom(nextRoom);
          return;
        }

        if (type === 'room:error') {
          const code = typeof data.code === 'string' ? data.code : 'UNKNOWN';
          setErrorCode(code);
          if (code === 'ROOM_NOT_FOUND') {
            activeRoomCodeRef.current = null;
            setRoom(null);
          }
        }
      } catch {
        // Ignore malformed server payload
      }
    };

    ws.onclose = () => {
      if (wsRef.current === ws) {
        wsRef.current = null;
      }
      setSocketStatus('disconnected');
      if (!intentionalCloseRef.current && activeRoomCodeRef.current) {
        if (reconnectTimerRef.current !== null) {
          window.clearTimeout(reconnectTimerRef.current);
        }
        reconnectTimerRef.current = window.setTimeout(() => {
          ensureSocket();
        }, 1200);
      }
    };
  }, [playerId]);

  useEffect(() => {
    return () => {
      intentionalCloseRef.current = true;
      if (reconnectTimerRef.current !== null) {
        window.clearTimeout(reconnectTimerRef.current);
      }
      wsRef.current?.close();
    };
  }, []);

  const sendPayload = useCallback(
    (payload: Record<string, unknown>) => {
      const encoded = JSON.stringify(payload);
      const ws = wsRef.current;
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(encoded);
      } else {
        pendingQueueRef.current.push(encoded);
        ensureSocket();
      }
    },
    [ensureSocket]
  );

  const clearError = useCallback(() => setErrorCode(null), []);

  const updatePlayerName = useCallback(
    (nextName: string) => {
      const saved = savePlayerName(nextName) || 'Usta';
      setPlayerNameState(saved);
      if (activeRoomCodeRef.current) {
        sendPayload({
          type: 'room:set_name',
          code: activeRoomCodeRef.current,
          playerId,
          name: saved,
        });
      }
    },
    [playerId, sendPayload]
  );

  const createRoom = useCallback(
    (params: {
      category: RoomCategoryFilter;
      levelId: number;
      timeLimitSec: number;
      clientCoins: number;
      customName?: string;
    }) => {
      const cleanName = savePlayerName(params.customName ?? playerNameRef.current) || 'Usta';
      setPlayerNameState(cleanName);
      setErrorCode(null);
      ensureSocket();
      sendPayload({
        type: 'room:create',
        playerId,
        playerName: cleanName,
        avatarId: avatarIdRef.current,
        category: params.category,
        levelId: params.levelId,
        timeLimitSec: params.timeLimitSec,
        clientCoins: params.clientCoins,
      });
    },
    [ensureSocket, playerId, sendPayload]
  );

  const joinRoom = useCallback(
    (code: string, customName?: string) => {
      const cleanCode = code.trim().toUpperCase();
      if (!cleanCode) return;
      const cleanName = savePlayerName(customName ?? playerNameRef.current) || 'Usta';
      setPlayerNameState(cleanName);
      setErrorCode(null);
      activeRoomCodeRef.current = cleanCode;
      ensureSocket();
      sendPayload({
        type: 'room:join',
        code: cleanCode,
        playerId,
        playerName: cleanName,
        avatarId: avatarIdRef.current,
      });
    },
    [ensureSocket, playerId, sendPayload]
  );

  const updateRoomConfig = useCallback(
    (patch: { category?: RoomCategoryFilter; levelId?: number; timeLimitSec?: number }) => {
      if (!activeRoomCodeRef.current) return;
      sendPayload({
        type: 'room:update_config',
        code: activeRoomCodeRef.current,
        playerId,
        ...patch,
      });
    },
    [playerId, sendPayload]
  );

  const toggleReady = useCallback(
    (ready: boolean) => {
      if (!activeRoomCodeRef.current) return;
      sendPayload({
        type: 'room:toggle_ready',
        code: activeRoomCodeRef.current,
        playerId,
        ready,
      });
    },
    [playerId, sendPayload]
  );

  const startRoomGame = useCallback(() => {
    if (!activeRoomCodeRef.current) return;
    sendPayload({
      type: 'room:start',
      code: activeRoomCodeRef.current,
      playerId,
    });
  }, [playerId, sendPayload]);

  const reportProgress = useCallback(
    (progressPatch: {
      score: number;
      remainingTiles: number;
      matchesCleared: number;
      mistakes: number;
      outcome: 'playing' | 'won' | 'lost';
      finishTimeSec?: number;
    }) => {
      if (!activeRoomCodeRef.current) return;
      sendPayload({
        type: 'room:progress',
        code: activeRoomCodeRef.current,
        playerId,
        ...progressPatch,
      });
    },
    [playerId, sendPayload]
  );

  const requestRematch = useCallback(() => {
    if (!activeRoomCodeRef.current) return;
    sendPayload({
      type: 'room:rematch',
      code: activeRoomCodeRef.current,
      playerId,
    });
  }, [playerId, sendPayload]);

  const leaveRoom = useCallback(() => {
    const code = activeRoomCodeRef.current;
    activeRoomCodeRef.current = null;
    setRoom(null);
    setErrorCode(null);
    if (code && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'room:leave',
          code,
          playerId,
        })
      );
    }
  }, [playerId]);

  return {
    playerId,
    playerName,
    room,
    socketStatus,
    errorCode,
    clearError,
    updatePlayerName,
    createRoom,
    joinRoom,
    updateRoomConfig,
    toggleReady,
    startRoomGame,
    reportProgress,
    requestRematch,
    leaveRoom,
  };
}
