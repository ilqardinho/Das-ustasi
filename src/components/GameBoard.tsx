import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Coins,
  Crown,
  Lightbulb,
  Music,
  Pause,
  Play,
  RotateCcw,
  Shuffle,
  Star,
  Timer,
  Undo2,
  Users,
  Volume2,
  VolumeX,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import {
  BONUS_CHAIN_FALLBACK_SCORE,
  BONUS_COIN_AMOUNT,
  BONUS_TIME_SEC,
  calculateLevelResult,
  calculateMatchScore,
  COMBO_WINDOW_MS,
  dealSolvableBoard,
  doTilesMatch,
  findDropTargetTile,
  findValidMoves,
  getFreeTiles,
  HINT_COST_COINS,
  isBonusSpecial,
  isTileCovered,
  isTrapSpecial,
  MAX_MISTAKES,
  MISTAKE_TIME_PENALTY_SEC,
  shuffleRemainingTiles,
  TileBoxCenter,
  TRAP_TIME_PENALTY_SEC,
} from '../game/rules';
import {
  BoardTile,
  GameScreenState,
  LevelConfig,
  MoveSnapshot,
  MultiplayerRoomState,
  PlayerProgress,
  PlayerSettings,
  TileSpecialType,
} from '../game/types';
import { sortRoomPlayersForLeaderboard } from '../game/multiplayer';
import {
  DominiEvent,
  DominiMood,
  getDominiDefeatMessage,
  getDominiMatchReaction,
  getDominiMistakeWarning,
  getDominiSpecialReaction,
  getDominiTimeWarning,
  getDominiUtilityReaction,
} from '../game/domini';
import { Translations } from '../i18n/translations';
import { MusicScene, soundEngine, triggerHaptic } from '../utils/audio';
import { prewarmDominiVoices, speakDominiMessage, stopDominiVoice } from '../utils/dominiVoice';
import { DominiMascot } from './DominiMascot';
import {
  DominoTileView,
  getTileDepth,
  TILE_EXTRUSION_X_RATIO,
  TILE_EXTRUSION_Y_RATIO,
} from './DominoTileView';
import { BurstItem, MatchBurstLayer } from './MatchBurstLayer';
import { MatchParticleCanvas } from './MatchParticleCanvas';
import { getTableBackgroundStyle } from './TableTheme';
import { VictoryCelebrationLayer } from './VictoryCelebrationLayer';

interface GameBoardProps {
  t: Translations;
  level: LevelConfig;
  seed: number;
  isDailyChallenge: boolean;
  progress: PlayerProgress;
  settings: PlayerSettings;
  hasNextLevel: boolean;
  onToggleSound: () => void;
  onUpdateSettings?: (patch: Partial<PlayerSettings>) => void;
  onSpendCoins: (amount: number) => boolean;
  onEarnCoins: (amount: number) => void;
  onAddPlayTime?: (seconds: number) => void;
  onLevelComplete: (result: {
    levelId: number;
    isDaily: boolean;
    score: number;
    stars: number;
    coinsEarned: number;
    timeSpentSec: number;
    matchesCleared: number;
  }) => void;
  onNextLevel: () => void;
  onOpenMap: () => void;
  onBackToTitle: () => void;
  onScreenStateChange: (state: GameScreenState) => void;
  multiplayerRoom?: MultiplayerRoomState | null;
  localPlayerId?: string;
  onMultiplayerProgress?: (patch: {
    score: number;
    remainingTiles: number;
    matchesCleared: number;
    mistakes: number;
    outcome: 'playing' | 'won' | 'lost';
    finishTimeSec?: number;
  }) => void;
  onMultiplayerRematch?: () => void;
  onReturnToRoomLobby?: () => void;
}

export const GameBoard: React.FC<GameBoardProps> = ({
  t,
  level,
  seed,
  isDailyChallenge,
  progress,
  settings,
  hasNextLevel,
  onToggleSound,
  onUpdateSettings,
  onSpendCoins,
  onEarnCoins,
  onAddPlayTime,
  onLevelComplete,
  onNextLevel,
  onOpenMap,
  onBackToTitle,
  onScreenStateChange,
  multiplayerRoom,
  localPlayerId,
  onMultiplayerProgress,
  onMultiplayerRematch,
  onReturnToRoomLobby,
}) => {
  const [tiles, setTiles] = useState<BoardTile[]>(() => dealSolvableBoard(level.slots, seed));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hintIds, setHintIds] = useState<[string, string] | null>(null);
  const [shakingId, setShakingId] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [comboCount, setComboCount] = useState(0);
  const [lastMatchAt, setLastMatchAt] = useState<number>(0);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [undoStack, setUndoStack] = useState<MoveSnapshot[]>([]);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(level.timeLimitSec);
  const timeRemainingRef = useRef<number | null>(level.timeLimitSec);
  const [timePenaltyFlash, setTimePenaltyFlash] = useState(false);
  const [timeDeltaText, setTimeDeltaText] = useState<string | null>(null);
  const [boardTrapShake, setBoardTrapShake] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const unflushedPlaySecRef = useRef(0);
  const onAddPlayTimeRef = useRef(onAddPlayTime);
  onAddPlayTimeRef.current = onAddPlayTime;
  const onMultiplayerProgressRef = useRef(onMultiplayerProgress);
  onMultiplayerProgressRef.current = onMultiplayerProgress;
  const isMultiplayer = Boolean(multiplayerRoom);
  const [isPaused, setIsPaused] = useState(false);
  const [outcome, setOutcome] = useState<'playing' | 'won' | 'losing' | 'lost'>('playing');
  const outcomeRef = useRef<'playing' | 'won' | 'losing' | 'lost'>('playing');
  const tilesRef = useRef<BoardTile[]>(tiles);
  const defeatTimersRef = useRef<number[]>([]);
  const rewardedCoinIdsRef = useRef<Set<string>>(new Set());
  const triggerDefeatRef = useRef<(reason: 'time' | 'mistakes') => void>(() => {});
  const [lostReason, setLostReason] = useState<'time' | 'mistakes' | null>(null);
  const [mistakes, setMistakes] = useState(0);
  const mistakesRef = useRef(0);
  const [winStats, setWinStats] = useState<{ stars: number; coinsEarned: number } | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [bursts, setBursts] = useState<BurstItem[]>([]);
  const [shuffleNonce, setShuffleNonce] = useState(1);

  interface DragState {
    tileId: string;
    startClientX: number;
    startClientY: number;
    baseCenterX: number;
    baseCenterY: number;
    dx: number;
    dy: number;
    isDragging: boolean;
    hoverTargetId: string | null;
  }
  const [dragState, setDragState] = useState<DragState | null>(null);
  const dragStateRef = useRef<DragState | null>(null);
  const dragAudioRef = useRef<{ lastX: number; lastY: number; lastAt: number }>({
    lastX: 0,
    lastY: 0,
    lastAt: 0,
  });
  const suppressClickRef = useRef(false);

  const [dominiEvent, setDominiEvent] = useState<DominiEvent | null>(null);
  const [dominiVisible, setDominiVisible] = useState(false);
  const dominiTimerRef = useRef<number | null>(null);
  const matchesCountRef = useRef(0);
  const lowTimeWarnedRef = useRef(false);

  const stageRef = useRef<HTMLDivElement | null>(null);
  const [stageSize, setStageSize] = useState({ width: 360, height: 480 });
  const [boardZoom, setBoardZoom] = useState(1);
  const boardZoomRef = useRef(1);
  const pinchStartDistRef = useRef<number | null>(null);
  const pinchStartZoomRef = useRef<number>(1);

  const clampZoom = useCallback((z: number) => {
    return Math.round(Math.min(1.65, Math.max(0.75, z)) * 100) / 100;
  }, []);

  const updateZoom = useCallback(
    (nextZoom: number, playAudio = true) => {
      const clamped = clampZoom(nextZoom);
      if (clamped !== boardZoomRef.current && playAudio) {
        soundEngine.playZoom(settings.soundEnabled, clamped > boardZoomRef.current);
      }
      boardZoomRef.current = clamped;
      setBoardZoom(clamped);
    },
    [clampZoom, settings.soundEnabled]
  );

  const showDomini = useCallback(
    (mood: DominiMood, message: string, durationMs = 2800) => {
      if (dominiTimerRef.current !== null) {
        window.clearTimeout(dominiTimerRef.current);
      }
      setDominiEvent({ id: Date.now(), mood, message });
      setDominiVisible(true);
      void speakDominiMessage({
        text: message,
        language: settings.language,
        mood,
        enabled: settings.soundEnabled,
      });
      dominiTimerRef.current = window.setTimeout(() => {
        setDominiVisible(false);
      }, durationMs);
    },
    [settings.language, settings.soundEnabled]
  );

  useEffect(() => {
    tilesRef.current = tiles;
  }, [tiles]);

  useEffect(() => {
    if (!settings.soundEnabled || isPaused || outcome === 'won') {
      stopDominiVoice();
    }
  }, [settings.soundEnabled, isPaused, outcome]);

  useEffect(() => {
    if (!settings.soundEnabled) return;
    const timer = window.setTimeout(() => {
      void prewarmDominiVoices(settings.language, MAX_MISTAKES);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [settings.language, settings.soundEnabled]);

  const clearDefeatTimers = useCallback(() => {
    for (const tid of defeatTimersRef.current) {
      window.clearTimeout(tid);
    }
    defeatTimersRef.current = [];
  }, []);

  const flushPlayTime = useCallback(() => {
    const pending = unflushedPlaySecRef.current;
    if (pending > 0) {
      unflushedPlaySecRef.current = 0;
      onAddPlayTimeRef.current?.(pending);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (dominiTimerRef.current !== null) {
        window.clearTimeout(dominiTimerRef.current);
      }
      clearDefeatTimers();
      stopDominiVoice();
      flushPlayTime();
    };
  }, [clearDefeatTimers, flushPlayTime]);

  // Reset board whenever level or seed changes
  const initBoard = useCallback(() => {
    flushPlayTime();
    clearDefeatTimers();
    stopDominiVoice();
    rewardedCoinIdsRef.current.clear();
    const freshBoard = dealSolvableBoard(level.slots, seed);
    tilesRef.current = freshBoard;
    setTiles(freshBoard);
    setSelectedId(null);
    setHintIds(null);
    setShakingId(null);
    setScore(0);
    setComboCount(0);
    setLastMatchAt(0);
    setHintsUsed(0);
    setUndoStack([]);
    setTimeRemaining(level.timeLimitSec);
    timeRemainingRef.current = level.timeLimitSec;
    setTimePenaltyFlash(false);
    setTimeDeltaText(null);
    setBoardTrapShake(false);
    setElapsedSec(0);
    setIsPaused(false);
    outcomeRef.current = 'playing';
    setOutcome('playing');
    setLostReason(null);
    setMistakes(0);
    mistakesRef.current = 0;
    setWinStats(null);
    setToastMsg(null);
    setBursts([]);
    setShuffleNonce(1);
    setDominiVisible(false);
    boardZoomRef.current = 1;
    setBoardZoom(1);
    matchesCountRef.current = 0;
    lowTimeWarnedRef.current = false;
    onScreenStateChange('playing');
  }, [level, seed, onScreenStateChange, clearDefeatTimers, flushPlayTime]);

  useEffect(() => {
    initBoard();
  }, [initBoard]);

  // Measure board stage container responsively
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const update = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setStageSize({ width: rect.width, height: rect.height });
      }
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Timer tick (1Hz discrete integer updates, pauses automatically when modal open)
  useEffect(() => {
    if ((isPaused && !isMultiplayer) || outcome !== 'playing') return;
    const timer = window.setInterval(() => {
      setElapsedSec((prev) => prev + 1);
      unflushedPlaySecRef.current += 1;
      if (unflushedPlaySecRef.current >= 5) {
        flushPlayTime();
      }
      if (!isMultiplayer) {
        setTimeRemaining((prev) => {
          if (prev === null) return null;
          if (prev <= 1) {
            timeRemainingRef.current = 0;
            window.setTimeout(() => {
              triggerDefeatRef.current('time');
            }, 0);
            return 0;
          }
          const next = prev - 1;
          timeRemainingRef.current = next;
          return next;
        });
      }
    }, 1000);
    return () => {
      window.clearInterval(timer);
      flushPlayTime();
    };
  }, [isPaused, isMultiplayer, outcome, flushPlayTime]);

  // Sync authoritative server room timer during multiplayer matches
  useEffect(() => {
    if (!multiplayerRoom || outcome !== 'playing') return;
    if (multiplayerRoom.serverRemainingSec !== null) {
      timeRemainingRef.current = multiplayerRoom.serverRemainingSec;
      setTimeRemaining(multiplayerRoom.serverRemainingSec);
      if (multiplayerRoom.serverRemainingSec <= 0) {
        triggerDefeatRef.current('time');
      }
    }
  }, [multiplayerRoom, outcome]);

  // Broadcast live multiplayer score / tile progress
  useEffect(() => {
    if (!isMultiplayer) return;
    const mappedOutcome: 'playing' | 'won' | 'lost' =
      outcome === 'won' ? 'won' : outcome === 'losing' || outcome === 'lost' ? 'lost' : 'playing';
    onMultiplayerProgressRef.current?.({
      score,
      remainingTiles: tiles.length,
      matchesCleared: matchesCountRef.current,
      mistakes,
      outcome: mappedOutcome,
      finishTimeSec: mappedOutcome === 'won' ? Math.max(1, elapsedSec) : undefined,
    });
  }, [isMultiplayer, score, tiles.length, mistakes, outcome, elapsedSec]);

  // Low-time Domini urgency alert (at <=15s) and final-10s clock ticks
  useEffect(() => {
    if (isPaused || outcome !== 'playing' || timeRemaining === null || timeRemaining <= 0) return;

    if (timeRemaining <= 15 && !lowTimeWarnedRef.current) {
      lowTimeWarnedRef.current = true;
      const warn = getDominiTimeWarning(settings.language);
      showDomini(warn.mood, warn.message, 2600);
    }

    if (timeRemaining <= 10) {
      soundEngine.playTimerTick(settings.soundEnabled, timeRemaining <= 4);
    }
  }, [
    timeRemaining,
    isPaused,
    outcome,
    settings.language,
    settings.soundEnabled,
    showDomini,
  ]);

  // Drive adaptive Candy-Crush-style interactive music (tempo, layers, filter, sparkle)
  const [musicComboActive, setMusicComboActive] = useState(0);

  useEffect(() => {
    if (comboCount <= 1 || lastMatchAt <= 0) {
      setMusicComboActive(comboCount);
      return;
    }
    setMusicComboActive(comboCount);
    const remainingWindow = Math.max(200, COMBO_WINDOW_MS - (Date.now() - lastMatchAt));
    const timer = window.setTimeout(() => {
      setMusicComboActive(1);
    }, remainingWindow);
    return () => window.clearTimeout(timer);
  }, [comboCount, lastMatchAt]);

  useEffect(() => {
    const scene: MusicScene =
      outcome === 'won'
        ? 'won'
        : outcome === 'losing' || outcome === 'lost'
        ? 'lost'
        : isPaused
        ? 'paused'
        : 'playing';
    const urgent =
      outcome === 'playing' && !isPaused && timeRemaining !== null && timeRemaining <= 15;
    const endgame =
      outcome === 'playing' &&
      tiles.length > 0 &&
      tiles.length <= Math.max(4, Math.floor(level.slots.length * 0.25));

    soundEngine.setMusicContext({
      scene,
      combo: musicComboActive,
      urgent,
      endgame,
    });
  }, [outcome, isPaused, timeRemaining, musicComboActive, tiles.length, level.slots.length]);

  // Auto-hide toast messages
  useEffect(() => {
    if (!toastMsg) return;
    const id = window.setTimeout(() => setToastMsg(null), 2200);
    return () => window.clearTimeout(id);
  }, [toastMsg]);

  // Compute board bounds in half-tile grid units
  const boardMetrics = useMemo(() => {
    const allSlots = level.slots;
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    let maxZ = 0;
    for (const s of allSlots) {
      if (s.x < minX) minX = s.x;
      if (s.x + 2 > maxX) maxX = s.x + 2;
      if (s.y < minY) minY = s.y;
      if (s.y + 2 > maxY) maxY = s.y + 2;
      if (s.z > maxZ) maxZ = s.z;
    }
    const spanX = Math.max(2, maxX - minX); // in half-units (2 units = 1 tile width)
    const spanY = Math.max(2, maxY - minY); // in half-units (2 units = 1 tile height)
    const tilesAcross = spanX / 2;
    const tilesDown = spanY / 2;

    const padX = 24;
    const padY = 28;
    const availW = Math.max(260, stageSize.width - padX);
    const availH = Math.max(260, stageSize.height - padY);

    // Domino aspect ratio ~ 1 : 1.62
    const ratio = 1.62;
    const maxWByWidth = availW / (tilesAcross + (maxZ + 1.2) * 0.06);
    const maxWByHeight = availH / ((tilesDown + (maxZ + 1.4) * 0.14) * ratio);
    const tileW = Math.max(36, Math.min(72, Math.floor(Math.min(maxWByWidth, maxWByHeight))));
    const tileH = Math.round(tileW * ratio);

    const depth = getTileDepth(tileW);
    const originShiftX = Math.round(maxZ * depth * TILE_EXTRUSION_X_RATIO);
    const originShiftY = Math.round(maxZ * depth * TILE_EXTRUSION_Y_RATIO);
    const totalW = Math.ceil(originShiftX + tilesAcross * tileW + depth * TILE_EXTRUSION_X_RATIO + 6);
    const totalH = Math.ceil(originShiftY + tilesDown * tileH + depth * TILE_EXTRUSION_Y_RATIO + 10);

    return {
      minX,
      minY,
      tileW,
      tileH,
      depth,
      originShiftX,
      originShiftY,
      totalW,
      totalH,
    };
  }, [level.slots, stageSize]);

  // Normalized tiles shifted to (0,0) origin for rendering
  const freeSet = useMemo(() => {
    const free = getFreeTiles(tiles);
    return new Set(free.map((f) => f.id));
  }, [tiles]);

  const coveredSet = useMemo(() => {
    const covered = new Set<string>();
    for (const item of tiles) {
      if (isTileCovered(item, tiles)) {
        covered.add(item.id);
      }
    }
    return covered;
  }, [tiles]);

  const validMoves = useMemo(() => findValidMoves(tiles), [tiles]);

  const specialCounts = useMemo(() => {
    let bonuses = 0;
    let traps = 0;
    for (const item of tiles) {
      if (isBonusSpecial(item.special)) bonuses++;
      else if (isTrapSpecial(item.special)) traps++;
    }
    return { bonuses, traps };
  }, [tiles]);

  const triggerBurstAtTile = useCallback(
    (
      tile: BoardTile,
      points?: number,
      comboCountValue?: number,
      isMassExplosion = false,
      special?: TileSpecialType
    ) => {
      const { depth, originShiftX, originShiftY, tileW, tileH, minX, minY } = boardMetrics;
      const nx = tile.x - minX;
      const ny = tile.y - minY;
      const left =
        originShiftX + nx * (tileW / 2) - tile.z * (depth * TILE_EXTRUSION_X_RATIO) + tileW / 2;
      const top =
        originShiftY + ny * (tileH / 2) - tile.z * (depth * TILE_EXTRUSION_Y_RATIO) + tileH / 2;

      const burstId = `${tile.id}-${Date.now()}-${Math.random()}`;
      const seedVal =
        tile.x * 31 + tile.y * 17 + tile.z * 13 + tile.top * 7 + tile.bottom * 5 + (Date.now() % 997);
      setBursts((prev) => [
        ...prev,
        {
          id: burstId,
          left,
          top,
          tileW,
          tileH,
          topPip: tile.top,
          bottomPip: tile.bottom,
          seed: seedVal,
          points,
          comboCount: comboCountValue,
          isMassExplosion,
          special,
        },
      ]);
      const cleanupId = window.setTimeout(() => {
        setBursts((prev) => prev.filter((b) => b.id !== burstId));
      }, isMassExplosion ? 1280 : 1120);
      defeatTimersRef.current.push(cleanupId);
    },
    [boardMetrics]
  );

  const triggerDefeatSequence = useCallback(
    (reason: 'time' | 'mistakes') => {
      if (outcomeRef.current !== 'playing') return;
      outcomeRef.current = 'losing';
      clearDefeatTimers();

      setOutcome('losing');
      setLostReason(reason);
      setSelectedId(null);
      setHintIds(null);
      setDragState(null);
      dragStateRef.current = null;

      // Zoom out smoothly to show the full board erupting
      updateZoom(0.75, false);

      // Pop Domini to the center of the screen zooming out and speak defeat prompt
      const defeatMsg = getDominiDefeatMessage(settings.language);
      showDomini(defeatMsg.mood, defeatMsg.message, 4600);

      // Explode all remaining dominoes across 4 cascading waves (top-down / inner-out)
      const remaining = [...tilesRef.current].sort(
        (a, b) => b.z - a.z || a.y - b.y || a.x - b.x
      );
      const waveCount = Math.min(4, Math.max(1, remaining.length));
      const chunkSize = Math.ceil(remaining.length / waveCount);

      for (let w = 0; w < waveCount; w++) {
        const waveTiles = remaining.slice(w * chunkSize, (w + 1) * chunkSize);
        if (waveTiles.length === 0) continue;

        const waveTimer = window.setTimeout(() => {
          const waveIds = new Set(waveTiles.map((item) => item.id));
          tilesRef.current = tilesRef.current.filter((item) => !waveIds.has(item.id));
          setTiles((prev) => prev.filter((item) => !waveIds.has(item.id)));

          for (const tileItem of waveTiles) {
            triggerBurstAtTile(tileItem, undefined, undefined, true);
          }
          soundEngine.playExplosionPopWave(settings.soundEnabled, w);
          triggerHaptic(
            settings.vibrationEnabled,
            w === 0 ? [45, 30, 55] : 20
          );
        }, w * 170);
        defeatTimersRef.current.push(waveTimer);
      }

      const endTimer = window.setTimeout(() => {
        if (outcomeRef.current !== 'losing') return;
        outcomeRef.current = 'lost';
        setOutcome('lost');
        onScreenStateChange('gameover');
        triggerHaptic(settings.vibrationEnabled, [60, 40, 60]);
      }, 2600);
      defeatTimersRef.current.push(endTimer);
    },
    [
      clearDefeatTimers,
      updateZoom,
      settings.language,
      settings.soundEnabled,
      settings.vibrationEnabled,
      showDomini,
      triggerBurstAtTile,
      onScreenStateChange,
    ]
  );

  triggerDefeatRef.current = triggerDefeatSequence;

  const completePairMatch = useCallback(
    (first: BoardTile, second: BoardTile) => {
      const now = Date.now();
      const nextCombo = now - lastMatchAt <= COMBO_WINDOW_MS ? comboCount + 1 : 1;
      let points = calculateMatchScore(first, second, nextCombo, Math.max(first.z, second.z));
      let nextTiles = tiles.filter((item) => item.id !== first.id && item.id !== second.id);
      let updatedTime = timeRemainingRef.current;

      const special = first.special ?? second.special;
      let specialToast: string | null = null;
      let trapTriggered = false;
      let bonusTriggered = false;
      let chainPair: { a: BoardTile; b: BoardTile } | null = null;

      if (special === 'bonus_time') {
        bonusTriggered = true;
        if (updatedTime !== null) {
          updatedTime = updatedTime + BONUS_TIME_SEC;
          timeRemainingRef.current = updatedTime;
          setTimeRemaining(updatedTime);
        }
        points += 120;
        specialToast = t.bonusTimeMsg;
      } else if (special === 'bonus_coin') {
        bonusTriggered = true;
        const coinTileId = first.special === 'bonus_coin' ? first.id : second.id;
        if (!rewardedCoinIdsRef.current.has(coinTileId)) {
          rewardedCoinIdsRef.current.add(coinTileId);
          onEarnCoins(BONUS_COIN_AMOUNT);
        }
        points += 150;
        specialToast = t.bonusCoinMsg;
      } else if (special === 'bonus_chain') {
        bonusTriggered = true;
        const extraMoves = findValidMoves(nextTiles);
        const safeExtra =
          extraMoves.find((m) => !isTrapSpecial(m.a.special) && !isTrapSpecial(m.b.special)) ??
          extraMoves[0] ??
          null;
        if (safeExtra) {
          chainPair = safeExtra;
          nextTiles = nextTiles.filter(
            (item) => item.id !== safeExtra.a.id && item.id !== safeExtra.b.id
          );
          points += calculateMatchScore(
            safeExtra.a,
            safeExtra.b,
            nextCombo,
            Math.max(safeExtra.a.z, safeExtra.b.z)
          );
        } else {
          points += BONUS_CHAIN_FALLBACK_SCORE;
        }
        specialToast = t.bonusChainMsg;
      } else if (special === 'trap_time') {
        trapTriggered = true;
        if (updatedTime !== null) {
          updatedTime = Math.max(0, updatedTime - TRAP_TIME_PENALTY_SEC);
          timeRemainingRef.current = updatedTime;
          setTimeRemaining(updatedTime);
          setTimeDeltaText(`-${TRAP_TIME_PENALTY_SEC}s`);
          setTimePenaltyFlash(true);
          window.setTimeout(() => setTimePenaltyFlash(false), 1100);
        }
        specialToast = t.trapTimeMsg;
      } else if (special === 'trap_mix') {
        trapTriggered = true;
        if (nextTiles.length >= 4) {
          nextTiles = shuffleRemainingTiles(nextTiles, seed + shuffleNonce * 409 + matchesCountRef.current);
          setShuffleNonce((n) => n + 1);
          setBoardTrapShake(true);
          window.setTimeout(() => setBoardTrapShake(false), 380);
        }
        specialToast = t.trapMixMsg;
      }

      const nextScore = score + points;

      setUndoStack((prev) => [
        ...prev.slice(-14),
        { tiles, score, comboCount, timeRemaining: timeRemainingRef.current },
      ]);
      tilesRef.current = nextTiles;
      setTiles(nextTiles);
      setSelectedId(null);
      setHintIds(null);
      setScore(nextScore);
      setComboCount(nextCombo);
      setLastMatchAt(now);

      if (specialToast) {
        setToastMsg(specialToast);
      }

      triggerBurstAtTile(first, undefined, undefined, false, first.special);
      triggerBurstAtTile(second, points, nextCombo, false, second.special);
      if (chainPair) {
        const pairToPop = chainPair;
        const chainTimer = window.setTimeout(() => {
          triggerBurstAtTile(pairToPop.a, undefined, undefined, false, 'bonus_chain');
          triggerBurstAtTile(pairToPop.b, undefined, undefined, false, 'bonus_chain');
          soundEngine.playMatch(settings.soundEnabled, nextCombo + 1);
        }, 160);
        defeatTimersRef.current.push(chainTimer);
      }

      soundEngine.playMatch(settings.soundEnabled, nextCombo);
      if (bonusTriggered) {
        soundEngine.playBonus(settings.soundEnabled);
        triggerHaptic(settings.vibrationEnabled, [18, 22, 26]);
      } else if (trapTriggered) {
        soundEngine.playTrap(settings.soundEnabled);
        triggerHaptic(settings.vibrationEnabled, [35, 25, 35]);
      } else {
        triggerHaptic(settings.vibrationEnabled, [14, 24, 18]);
      }

      if (trapTriggered && updatedTime !== null && updatedTime <= 0) {
        triggerDefeatSequence('time');
        return;
      }

      matchesCountRef.current += chainPair ? 2 : 1;
      if (special) {
        const specialReaction = getDominiSpecialReaction(
          settings.language,
          special,
          matchesCountRef.current + nextCombo
        );
        showDomini(specialReaction.mood, specialReaction.message);
      } else {
        const reaction = getDominiMatchReaction({
          language: settings.language,
          comboCount: nextCombo,
          remainingTiles: nextTiles.length,
          matchesSoFar: matchesCountRef.current,
        });
        if (reaction) {
          showDomini(reaction.mood, reaction.message);
        }
      }

      if (nextTiles.length === 0) {
        setDominiVisible(false);
        const result = calculateLevelResult({
          score: nextScore,
          parScore: level.parScore,
          baseCoinReward: level.coinReward,
          hintsUsed,
          timeRemainingSec: updatedTime,
          timeLimitSec: level.timeLimitSec,
        });
        setWinStats(result);
        outcomeRef.current = 'won';
        setOutcome('won');
        onScreenStateChange('gameover');
        soundEngine.playWin(settings.soundEnabled);
        triggerHaptic(settings.vibrationEnabled, [30, 40, 60]);
        onLevelComplete({
          levelId: level.id,
          isDaily: isDailyChallenge,
          score: nextScore,
          stars: result.stars,
          coinsEarned: result.coinsEarned,
          timeSpentSec: elapsedSec,
          matchesCleared: level.slots.length / 2,
        });
      }
    },
    [
      lastMatchAt,
      comboCount,
      score,
      tiles,
      seed,
      shuffleNonce,
      onEarnCoins,
      t.bonusTimeMsg,
      t.bonusCoinMsg,
      t.bonusChainMsg,
      t.trapTimeMsg,
      t.trapMixMsg,
      triggerBurstAtTile,
      triggerDefeatSequence,
      settings.soundEnabled,
      settings.vibrationEnabled,
      settings.language,
      showDomini,
      level,
      hintsUsed,
      onScreenStateChange,
      onLevelComplete,
      isDailyChallenge,
      elapsedSec,
    ]
  );

  const registerMistake = useCallback(
    (shakingTileId: string, clearSelection: boolean) => {
      if (outcomeRef.current !== 'playing') return;
      const nextMistakes = mistakesRef.current + 1;
      mistakesRef.current = nextMistakes;
      setMistakes(nextMistakes);
      setComboCount(0);
      setShakingId(shakingTileId);
      window.setTimeout(() => setShakingId(null), 220);

      if (clearSelection) {
        setSelectedId(null);
      }

      if (nextMistakes >= MAX_MISTAKES) {
        triggerDefeatSequence('mistakes');
        return;
      }

      if (timeRemainingRef.current !== null) {
        const penalized = Math.max(0, timeRemainingRef.current - MISTAKE_TIME_PENALTY_SEC);
        timeRemainingRef.current = penalized;
        setTimeRemaining(penalized);
        setTimeDeltaText(`-${MISTAKE_TIME_PENALTY_SEC}s`);
        setTimePenaltyFlash(true);
        window.setTimeout(() => setTimePenaltyFlash(false), 1100);

        if (penalized <= 0) {
          triggerDefeatSequence('time');
          return;
        }
      }

      soundEngine.playMismatch(settings.soundEnabled);
      triggerHaptic(settings.vibrationEnabled, [25, 25]);
      const warn = getDominiMistakeWarning(settings.language, nextMistakes, MAX_MISTAKES);
      showDomini(warn.mood, warn.message, 3200);
    },
    [
      triggerDefeatSequence,
      settings.soundEnabled,
      settings.vibrationEnabled,
      settings.language,
      showDomini,
    ]
  );

  const handleTileSelect = useCallback(
    (tile: BoardTile) => {
      if (suppressClickRef.current) {
        suppressClickRef.current = false;
        return;
      }
      if (isPaused || outcome !== 'playing') return;

      if (!freeSet.has(tile.id)) {
        soundEngine.playBlocked(settings.soundEnabled);
        triggerHaptic(settings.vibrationEnabled, 10);
        setShakingId(tile.id);
        window.setTimeout(() => setShakingId(null), 200);
        return;
      }

      if (selectedId === tile.id) {
        soundEngine.playDeselect(settings.soundEnabled);
        triggerHaptic(settings.vibrationEnabled, 8);
        setSelectedId(null);
        return;
      }

      if (!selectedId) {
        soundEngine.playSelect(settings.soundEnabled);
        triggerHaptic(settings.vibrationEnabled, 12);
        setSelectedId(tile.id);
        return;
      }

      const first = tiles.find((tItem) => tItem.id === selectedId);
      if (!first) {
        soundEngine.playSelect(settings.soundEnabled);
        triggerHaptic(settings.vibrationEnabled, 12);
        setSelectedId(tile.id);
        return;
      }

      if (doTilesMatch(first, tile)) {
        completePairMatch(first, tile);
      } else {
        registerMistake(tile.id, true);
      }
    },
    [
      isPaused,
      outcome,
      freeSet,
      selectedId,
      tiles,
      settings.soundEnabled,
      settings.vibrationEnabled,
      completePairMatch,
      registerMistake,
    ]
  );

  const getTileBoardCenter = useCallback(
    (tile: BoardTile): TileBoxCenter => {
      const { depth, originShiftX, originShiftY, tileW, tileH, minX, minY } = boardMetrics;
      const nx = tile.x - minX;
      const ny = tile.y - minY;
      const left =
        originShiftX + nx * (tileW / 2) - tile.z * (depth * TILE_EXTRUSION_X_RATIO);
      const top =
        originShiftY + ny * (tileH / 2) - tile.z * (depth * TILE_EXTRUSION_Y_RATIO);
      return {
        id: tile.id,
        cx: left + tileW / 2,
        cy: top + tileH / 2,
      };
    },
    [boardMetrics]
  );

  const handleTilePointerStart = useCallback(
    (tile: BoardTile, e: React.PointerEvent<HTMLButtonElement>) => {
      if (isPaused || outcome !== 'playing') return;
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      if (!freeSet.has(tile.id)) return;

      const center = getTileBoardCenter(tile);
      const initial: DragState = {
        tileId: tile.id,
        startClientX: e.clientX,
        startClientY: e.clientY,
        baseCenterX: center.cx,
        baseCenterY: center.cy,
        dx: 0,
        dy: 0,
        isDragging: false,
        hoverTargetId: null,
      };
      dragAudioRef.current = {
        lastX: e.clientX,
        lastY: e.clientY,
        lastAt: performance.now(),
      };
      dragStateRef.current = initial;
      setDragState(initial);
    },
    [isPaused, outcome, freeSet, getTileBoardCenter]
  );

  useEffect(() => {
    const onPointerMove = (e: PointerEvent) => {
      const curr = dragStateRef.current;
      if (!curr) return;

      const scale = boardZoomRef.current || 1;
      const dx = (e.clientX - curr.startClientX) / scale;
      const dy = (e.clientY - curr.startClientY) / scale;
      const movedEnough = curr.isDragging || Math.hypot(dx, dy) >= 6;

      if (!movedEnough) return;

      const nowMs = performance.now();
      if (!curr.isDragging) {
        soundEngine.playSelect(settings.soundEnabled);
        triggerHaptic(settings.vibrationEnabled, 10);
        dragAudioRef.current = { lastX: e.clientX, lastY: e.clientY, lastAt: nowMs };
      } else {
        const distSinceSound = Math.hypot(
          e.clientX - dragAudioRef.current.lastX,
          e.clientY - dragAudioRef.current.lastY
        );
        const dtMs = nowMs - dragAudioRef.current.lastAt;
        if (distSinceSound >= 38 && dtMs >= 65) {
          const speedNorm = Math.min(1, distSinceSound / Math.max(16, dtMs) / 1.5);
          soundEngine.playDragSlide(settings.soundEnabled, speedNorm);
          dragAudioRef.current = { lastX: e.clientX, lastY: e.clientY, lastAt: nowMs };
        }
      }

      const freeCenters: TileBoxCenter[] = tiles
        .filter((tItem) => freeSet.has(tItem.id))
        .map(getTileBoardCenter);

      const hoverTargetId = findDropTargetTile(
        curr.tileId,
        curr.baseCenterX + dx,
        curr.baseCenterY + dy,
        freeCenters,
        boardMetrics.tileW * 0.95
      );

      if (hoverTargetId && hoverTargetId !== curr.hoverTargetId) {
        const draggedTile = tiles.find((tItem) => tItem.id === curr.tileId);
        const targetTile = tiles.find((tItem) => tItem.id === hoverTargetId);
        const isMatch =
          draggedTile && targetTile ? doTilesMatch(draggedTile, targetTile) : false;
        soundEngine.playSnapHover(settings.soundEnabled, isMatch);
        triggerHaptic(settings.vibrationEnabled, 6);
      }

      const next: DragState = {
        ...curr,
        dx,
        dy,
        isDragging: true,
        hoverTargetId,
      };
      dragStateRef.current = next;
      setDragState(next);
    };

    const onPointerUpOrCancel = () => {
      const curr = dragStateRef.current;
      if (!curr) return;

      dragStateRef.current = null;
      setDragState(null);

      if (!curr.isDragging) return;

      // Prevent the browser's synthetic click from firing after a real drag gesture
      suppressClickRef.current = true;
      window.setTimeout(() => {
        suppressClickRef.current = false;
      }, 60);

      const draggedTile = tiles.find((tItem) => tItem.id === curr.tileId);
      const targetTile = curr.hoverTargetId
        ? tiles.find((tItem) => tItem.id === curr.hoverTargetId)
        : undefined;

      if (draggedTile && targetTile) {
        if (doTilesMatch(draggedTile, targetTile)) {
          completePairMatch(draggedTile, targetTile);
        } else {
          registerMistake(targetTile.id, true);
        }
      } else {
        soundEngine.playDropSettle(settings.soundEnabled);
      }
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUpOrCancel);
    window.addEventListener('pointercancel', onPointerUpOrCancel);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUpOrCancel);
      window.removeEventListener('pointercancel', onPointerUpOrCancel);
    };
  }, [
    tiles,
    freeSet,
    getTileBoardCenter,
    boardMetrics.tileW,
    completePairMatch,
    registerMistake,
    settings.soundEnabled,
    settings.vibrationEnabled,
  ]);

  const handleHint = useCallback(() => {
    if (isPaused || outcome !== 'playing') return;
    if (validMoves.length === 0) return;

    if (!onSpendCoins(HINT_COST_COINS)) {
      soundEngine.playBlocked(settings.soundEnabled);
      setToastMsg(t.notEnoughCoins);
      return;
    }

    const move = validMoves[0];
    setHintIds([move.a.id, move.b.id]);
    setSelectedId(null);
    setHintsUsed((prev) => prev + 1);
    soundEngine.playHint(settings.soundEnabled);
    triggerHaptic(settings.vibrationEnabled, 18);
  }, [
    isPaused,
    outcome,
    validMoves,
    onSpendCoins,
    settings.soundEnabled,
    settings.vibrationEnabled,
    t.notEnoughCoins,
  ]);

  const handleShuffle = useCallback(() => {
    if (isPaused || outcome !== 'playing' || tiles.length < 2) return;
    const nextTiles = shuffleRemainingTiles(tiles, seed + shuffleNonce * 313);
    setTiles(nextTiles);
    setSelectedId(null);
    setHintIds(null);
    setComboCount(0);
    setShuffleNonce((n) => n + 1);
    soundEngine.playShuffle(settings.soundEnabled);
    triggerHaptic(settings.vibrationEnabled, [15, 20, 15]);
    const r = getDominiUtilityReaction(settings.language, 'shuffle', shuffleNonce);
    showDomini(r.mood, r.message);
  }, [
    isPaused,
    outcome,
    tiles,
    seed,
    shuffleNonce,
    settings.soundEnabled,
    settings.vibrationEnabled,
    settings.language,
    showDomini,
  ]);

  const handleUndo = useCallback(() => {
    if (isPaused || outcome !== 'playing' || undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1];
    tilesRef.current = prev.tiles;
    setTiles(prev.tiles);
    setScore(prev.score);
    setComboCount(prev.comboCount);
    if (prev.timeRemaining !== undefined) {
      timeRemainingRef.current = prev.timeRemaining;
      setTimeRemaining(prev.timeRemaining);
    }
    setUndoStack((s) => s.slice(0, -1));
    setSelectedId(null);
    setHintIds(null);
    soundEngine.playDeselect(settings.soundEnabled);
  }, [isPaused, outcome, undoStack, settings.soundEnabled]);

  const handleTogglePause = useCallback(() => {
    if (outcome !== 'playing') return;
    setIsPaused((prev) => {
      const next = !prev;
      onScreenStateChange(next ? 'paused' : 'playing');
      return next;
    });
  }, [outcome, onScreenStateChange]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key.toLowerCase() === 'p') {
        handleTogglePause();
      } else if (e.key.toLowerCase() === 'r' && outcome === 'playing' && !isPaused) {
        initBoard();
      } else if (e.key.toLowerCase() === 'h' && outcome === 'playing' && !isPaused) {
        handleHint();
      } else if ((e.key === '+' || e.key === '=') && outcome === 'playing' && !isPaused) {
        updateZoom(boardZoomRef.current + 0.15);
      } else if ((e.key === '-' || e.key === '_') && outcome === 'playing' && !isPaused) {
        updateZoom(boardZoomRef.current - 0.15);
      } else if (e.key === '0' && outcome === 'playing' && !isPaused) {
        updateZoom(1);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleTogglePause, initBoard, handleHint, updateZoom, outcome, isPaused]);

  const tableStyle = getTableBackgroundStyle(progress.equippedCosmetics.tables);
  const effectColor =
    progress.equippedCosmetics.effects === 'fx_emerald'
      ? '#34D399'
      : progress.equippedCosmetics.effects === 'fx_petal'
      ? '#FB7185'
      : progress.equippedCosmetics.effects === 'fx_gold'
      ? '#FBBF24'
      : '#F8FAFC';

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  const levelDisplayName = t.levelNames[level.key] ?? `${t.levelMap} ${level.id}`;

  return (
    <div
      className="h-full w-full flex flex-col justify-between text-stone-100 relative overflow-hidden select-none"
      style={tableStyle}
    >
      {/* Top World-Matched HUD Strip (No ads during level!) */}
      <header className="relative z-20 w-full max-w-6xl mx-auto px-3 sm:px-6 py-2 flex items-center justify-between gap-2 bg-black/25 border-b border-white/10">
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={(e) => {
              e.currentTarget.blur();
              handleTogglePause();
            }}
            aria-label={t.pause}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-black/35 border border-white/15 text-stone-100 hover:bg-black/55 transition-colors cursor-pointer shrink-0"
          >
            <Pause className="w-4 h-4" />
          </button>

          <div className="min-w-0">
            <p className="text-xs text-stone-300/80 truncate">
              {isDailyChallenge ? t.dailyChallenge : `${t.stageLabel} ${level.id}`}
            </p>
            <h2 className="font-display font-bold text-sm sm:text-base text-white truncate">
              {levelDisplayName}
            </h2>
          </div>
        </div>

        {/* Center/Right Live Metrics */}
        <div className="flex items-center gap-2 sm:gap-3.5 shrink-0">
          {timeRemaining !== null && (
            <div
              data-testid="hud-timer"
              className={`relative flex items-center gap-1.5 px-2.5 py-1 rounded-xl border font-mono-num text-sm font-bold transition-colors ${
                timePenaltyFlash || timeRemaining <= 15
                  ? 'bg-rose-950/75 border-rose-400/60 text-rose-300'
                  : timeRemaining <= 28
                  ? 'bg-amber-950/60 border-amber-400/45 text-amber-300'
                  : 'bg-black/35 border-white/15 text-stone-100'
              }`}
              aria-label={`${t.time}: ${formatTime(timeRemaining)}`}
            >
              <Timer className="w-4 h-4 shrink-0" />
              <span>{formatTime(timeRemaining)}</span>
              {timePenaltyFlash && timeDeltaText && (
                <span className="ml-0.5 text-xs font-extrabold text-rose-300">
                  {timeDeltaText}
                </span>
              )}
            </div>
          )}

          <div className="text-right">
            <p className="text-[10px] uppercase tracking-wider text-stone-300/75 leading-none">
              {t.score}
            </p>
            <p
              data-testid="hud-score"
              className="font-mono-num font-bold text-base sm:text-lg text-white leading-tight"
            >
              {score}
            </p>
          </div>

          {comboCount >= 2 && (
            <div className="px-2 py-0.5 rounded-lg bg-amber-500 text-stone-950 font-mono-num font-extrabold text-xs">
              x{Math.min(5, comboCount)}
            </div>
          )}

          <div
            data-testid="hud-mistakes"
            aria-label={`${t.mistakesLabel}: ${mistakes}/${MAX_MISTAKES}`}
            className={`flex items-center gap-1 px-2 py-1 rounded-xl border font-mono-num font-bold text-xs sm:text-sm ${
              mistakes >= MAX_MISTAKES - 1
                ? 'bg-rose-950/70 border-rose-400/60 text-rose-200'
                : mistakes >= 1
                ? 'bg-amber-950/60 border-amber-400/50 text-amber-200'
                : 'bg-black/35 border-white/15 text-stone-200'
            }`}
          >
            <AlertTriangle
              className={`w-3.5 h-3.5 shrink-0 ${
                mistakes >= MAX_MISTAKES - 1
                  ? 'text-rose-400'
                  : mistakes >= 1
                  ? 'text-amber-400'
                  : 'text-stone-400'
              }`}
            />
            <span className="hidden sm:inline">{t.mistakesLabel}:</span>
            <span>
              {mistakes}/{MAX_MISTAKES}
            </span>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-black/35 border border-amber-400/30 text-amber-300">
            <Coins className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span data-testid="hud-coins" className="font-mono-num font-bold text-xs sm:text-sm">
              {progress.coins}
            </span>
          </div>

          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              onToggleSound();
            }}
            aria-label={t.soundLabel}
            className="min-h-[44px] min-w-[44px] hidden sm:flex items-center justify-center rounded-xl bg-black/35 border border-white/15 text-stone-100 hover:bg-black/55 transition-colors cursor-pointer"
          >
            {settings.soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
        </div>

        {/* Difficulty-Calibrated Countdown Progress Bar */}
        {level.timeLimitSec && timeRemaining !== null && (
          <div
            aria-hidden="true"
            className="absolute bottom-0 left-0 right-0 h-[3px] bg-white/10 overflow-hidden"
          >
            <div
              data-testid="timer-bar"
              className="h-full transition-[width,background-color] duration-300 ease-linear"
              style={{
                width: `${Math.max(
                  0,
                  Math.min(100, (timeRemaining / level.timeLimitSec) * 100)
                ).toFixed(1)}%`,
                backgroundColor:
                  timeRemaining <= 15
                    ? '#FB7185'
                    : timeRemaining <= level.timeLimitSec * 0.35
                    ? '#F59E0B'
                    : '#34D399',
              }}
            />
          </div>
        )}
      </header>

      {/* Live Multiplayer Race Strip */}
      {multiplayerRoom && (
        <div
          data-testid="mp-live-race-strip"
          className="relative z-20 w-full max-w-6xl mx-auto px-3 sm:px-6 py-1.5 bg-black/35 border-b border-white/10"
        >
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-sky-300 whitespace-nowrap shrink-0 pr-1">
              <Users className="w-3.5 h-3.5 shrink-0" />
              <span>{multiplayerRoom.code}</span>
            </span>
            {sortRoomPlayersForLeaderboard(multiplayerRoom.players).map((p, idx) => {
              const total = Math.max(1, p.totalTiles || level.slots.length);
              const clearedPct = Math.round(((total - p.remainingTiles) / total) * 100);
              const isSelf = p.id === localPlayerId;
              return (
                <div
                  key={p.id}
                  data-testid={`mp-live-player-${p.id}`}
                  className={`flex items-center gap-2 rounded-lg border px-2.5 py-1 min-w-[148px] shrink-0 ${
                    isSelf
                      ? 'bg-amber-500/15 border-amber-400/45'
                      : 'bg-black/35 border-white/10'
                  }`}
                >
                  <span className="font-mono-num text-[11px] font-bold text-amber-300">
                    #{idx + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2 text-[11px]">
                      <span className="font-semibold text-white truncate max-w-[76px]">
                        {p.name}
                      </span>
                      <span className="font-mono-num font-bold text-stone-200">
                        {p.score}
                      </span>
                    </div>
                    <div className="mt-0.5 h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          p.status === 'won'
                            ? 'bg-emerald-400'
                            : p.status === 'lost'
                            ? 'bg-rose-400'
                            : 'bg-sky-400'
                        }`}
                        style={{ width: `${Math.max(4, Math.min(100, clearedPct))}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Board Stage (supports zoom in / zoom out & panning when zoomed) */}
      <main
        ref={stageRef}
        onWheel={(e) => {
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            const delta = e.deltaY < 0 ? 0.1 : -0.1;
            updateZoom(boardZoomRef.current + delta, false);
          }
        }}
        onTouchStart={(e) => {
          if (e.touches.length === 2) {
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            pinchStartDistRef.current = Math.hypot(dx, dy);
            pinchStartZoomRef.current = boardZoomRef.current;
          }
        }}
        onTouchMove={(e) => {
          if (e.touches.length === 2 && pinchStartDistRef.current) {
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            const dist = Math.hypot(dx, dy);
            const ratio = dist / pinchStartDistRef.current;
            updateZoom(pinchStartZoomRef.current * ratio, false);
          }
        }}
        onTouchEnd={() => {
          pinchStartDistRef.current = null;
        }}
        className="relative z-10 flex-1 w-full overflow-auto"
      >
        {/* Toast feedback */}
        {toastMsg && (
          <div
            role="status"
            className="fixed top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl bg-stone-900/95 border border-amber-400/40 text-amber-200 text-xs sm:text-sm font-medium shadow-lg"
          >
            {toastMsg}
          </div>
        )}

        <div className="min-w-full min-h-full flex items-center justify-center p-3 sm:p-6">
          {/* Scaled footprint wrapper so scrollbars / centering work cleanly at every zoom */}
          <div
            className={`relative shrink-0 transition-[width,height] ease-out ${
              outcome === 'losing' ? 'duration-500' : 'duration-150'
            }`}
            style={{
              width: boardMetrics.totalW * boardZoom,
              height: boardMetrics.totalH * boardZoom,
            }}
          >
            {/* Centered Layered Domino Board (isolated stacking context) */}
            <div
              data-testid="domino-board"
              data-zoom={boardZoom.toFixed(2)}
              className={`relative z-0 isolate shrink-0 transition-transform ease-out ${
                outcome === 'losing' ? 'duration-500' : 'duration-150'
              } ${boardTrapShake ? 'animate-board-trap-shake' : ''}`}
              style={{
                width: boardMetrics.totalW,
                height: boardMetrics.totalH,
                transform: `scale(${boardZoom})`,
                transformOrigin: 'top left',
              }}
            >
          {tiles.map((tile) => {
            const normalizedTile: BoardTile = {
              ...tile,
              x: tile.x - boardMetrics.minX,
              y: tile.y - boardMetrics.minY,
            };
            const isHinted = hintIds ? hintIds[0] === tile.id || hintIds[1] === tile.id : false;
            const isThisDragging = Boolean(dragState?.isDragging && dragState.tileId === tile.id);
            const draggedTileObj =
              dragState?.isDragging
                ? tiles.find((item) => item.id === dragState.tileId)
                : undefined;
            const hoverMatches =
              draggedTileObj && dragState?.hoverTargetId
                ? (() => {
                    const targetObj = tiles.find((item) => item.id === dragState.hoverTargetId);
                    return targetObj ? doTilesMatch(draggedTileObj, targetObj) : false;
                  })()
                : false;

            let dropTargetState: 'match' | 'mismatch' | null = null;
            if (isThisDragging && dragState?.hoverTargetId) {
              dropTargetState = hoverMatches ? 'match' : 'mismatch';
            } else if (dragState?.isDragging && dragState.hoverTargetId === tile.id) {
              dropTargetState = hoverMatches ? 'match' : 'mismatch';
            }

            const dragTiltDeg = isThisDragging && dragState
              ? Math.max(-10, Math.min(10, dragState.dx * 0.08))
              : 0;

            return (
              <DominoTileView
                key={tile.id}
                tile={normalizedTile}
                width={boardMetrics.tileW}
                height={boardMetrics.tileH}
                originShiftX={boardMetrics.originShiftX}
                originShiftY={boardMetrics.originShiftY}
                isFree={freeSet.has(tile.id)}
                isCovered={coveredSet.has(tile.id)}
                isSelected={selectedId === tile.id}
                isHinted={isHinted}
                isShaking={shakingId === tile.id}
                isDragging={isThisDragging}
                dragOffset={isThisDragging && dragState ? { dx: dragState.dx, dy: dragState.dy } : undefined}
                dragTiltDeg={dragTiltDeg}
                dropTargetState={dropTargetState}
                tileTheme={progress.equippedCosmetics.tiles}
                showNumbersAid={settings.showNumbersAid}
                highlightFreeTiles={settings.highlightFreeTiles}
                onSelect={() => handleTileSelect(tile)}
                onPointerStart={(_, e) => handleTilePointerStart(tile, e)}
              />
            );
          })}

          {/* Candy Crush-style Match Celebration Bursts & Colored Pip Bubbles */}
          <MatchBurstLayer
            bursts={bursts}
            tileTheme={progress.equippedCosmetics.tiles}
            effectColor={effectColor}
          />
          <MatchParticleCanvas
            bursts={bursts}
            width={boardMetrics.totalW}
            height={boardMetrics.totalH}
            tileTheme={progress.equippedCosmetics.tiles}
            effectColor={effectColor}
          />
            </div>
          </div>
        </div>

        {/* Final 5-Second Non-Blocking Countdown in Top-Left Corner */}
        {outcome === 'playing' &&
          !isPaused &&
          timeRemaining !== null &&
          timeRemaining >= 1 &&
          timeRemaining <= 5 && (
            <div
              data-testid="final-countdown"
              aria-hidden="true"
              className="pointer-events-none fixed left-3.5 sm:left-6 top-[74px] sm:top-[84px] z-30 flex items-center justify-start"
            >
              <span
                key={timeRemaining}
                className="animate-countdown-pop origin-top-left font-display font-black text-[72px] sm:text-[92px] leading-none text-rose-400/95 select-none"
                style={{
                  textShadow:
                    '0 8px 26px rgba(0, 0, 0, 0.92), 0 0 40px rgba(244, 63, 94, 0.8), 0 2px 6px rgba(0, 0, 0, 0.95)',
                  WebkitTextStroke: '2px rgba(255, 241, 242, 0.9)',
                }}
              >
                {timeRemaining}
              </span>
            </div>
          )}

        {/* No-Moves Recovery Overlay */}
        {outcome === 'playing' && !isPaused && validMoves.length === 0 && tiles.length > 0 && (
          <div className="fixed inset-0 z-40 bg-black/55 flex items-center justify-center p-4">
            <div className="w-full max-w-sm rounded-2xl bg-stone-900 border border-amber-400/40 p-5 text-center shadow-2xl">
              <h3 className="font-display font-bold text-xl text-white">
                {t.noMovesTitle}
              </h3>
              <p className="mt-2 text-sm text-stone-300">{t.noMovesDesc}</p>
              <div className="mt-5 flex flex-col gap-2.5">
                <button
                  type="button"
                  onClick={handleShuffle}
                  className="w-full min-h-[48px] px-5 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-sm flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Shuffle className="w-4 h-4" />
                  <span>{t.shuffleFree}</span>
                </button>
                <button
                  type="button"
                  onClick={initBoard}
                  className="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 font-semibold text-sm cursor-pointer"
                >
                  {t.restart}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Pinned Board Zoom In / Zoom Out Controls */}
      <div
        data-testid="zoom-controls"
        className="fixed bottom-[94px] sm:bottom-[78px] left-3 sm:left-6 z-20 flex items-center gap-1 rounded-xl bg-black/45 border border-white/15 p-1 shadow-lg"
      >
        <button
          type="button"
          data-testid="zoom-out-btn"
          onClick={() => updateZoom(boardZoom - 0.15)}
          disabled={boardZoom <= 0.75}
          aria-label={t.zoomOut}
          className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-lg text-stone-100 hover:bg-white/15 disabled:opacity-35 transition-colors cursor-pointer"
        >
          <ZoomOut className="w-4 h-4" />
        </button>

        <button
          type="button"
          data-testid="zoom-reset-btn"
          onClick={() => updateZoom(1)}
          aria-label={t.zoomReset}
          className="min-h-[38px] px-2 rounded-lg font-mono-num font-bold text-xs text-stone-200 hover:bg-white/15 transition-colors cursor-pointer"
        >
          {Math.round(boardZoom * 100)}%
        </button>

        <button
          type="button"
          data-testid="zoom-in-btn"
          onClick={() => updateZoom(boardZoom + 0.15)}
          disabled={boardZoom >= 1.65}
          aria-label={t.zoomIn}
          className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-lg text-stone-100 hover:bg-white/15 disabled:opacity-35 transition-colors cursor-pointer"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
      </div>

      {/* Domini Mascot Peeking from Top-Right Screen Edge (or Spotlight on Defeat) */}
      <DominiMascot
        event={dominiEvent}
        visible={dominiVisible && (outcome === 'playing' || outcome === 'losing') && !isPaused}
        soundEnabled={settings.soundEnabled}
        spotlight={outcome === 'losing'}
        onTap={() => {
          if (dominiEvent && dominiVisible) {
            void speakDominiMessage({
              text: dominiEvent.message,
              language: settings.language,
              mood: dominiEvent.mood,
              enabled: settings.soundEnabled,
            });
            return;
          }
          const r = getDominiUtilityReaction(
            settings.language,
            'tap',
            matchesCountRef.current + 1
          );
          showDomini(r.mood, r.message);
          soundEngine.playSelect(settings.soundEnabled);
        }}
      />

      {/* Compact Bottom Thumb Action Dock */}
      <footer className="relative z-20 w-full max-w-3xl mx-auto px-3 sm:px-6 pb-3 pt-1">
        <div className="rounded-2xl bg-black/35 border border-white/10 px-2.5 py-1.5 flex flex-col sm:flex-row items-center justify-between gap-1.5 sm:gap-2">
          <div className="w-full sm:w-auto flex items-center justify-between sm:justify-start gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={handleHint}
              disabled={validMoves.length === 0}
              className="min-h-[44px] flex-1 sm:flex-initial px-2.5 sm:px-3 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-amber-200 text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 disabled:opacity-40 transition-colors cursor-pointer whitespace-nowrap"
            >
              <Lightbulb className="w-4 h-4 text-amber-300 shrink-0" />
              <span>{t.hint}</span>
              <span className="font-mono-num text-xs text-amber-300">({HINT_COST_COINS})</span>
            </button>

            <button
              type="button"
              onClick={handleShuffle}
              className="min-h-[44px] flex-1 sm:flex-initial px-2.5 sm:px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-stone-100 text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
            >
              <Shuffle className="w-4 h-4 shrink-0" />
              <span>{t.shuffle}</span>
            </button>

            <button
              type="button"
              onClick={handleUndo}
              disabled={undoStack.length === 0}
              aria-label={t.undo}
              className="min-h-[44px] min-w-[44px] px-2.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-stone-100 text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 disabled:opacity-35 transition-colors cursor-pointer whitespace-nowrap"
            >
              <Undo2 className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">{t.undo}</span>
            </button>

            {!isMultiplayer && (
              <button
                type="button"
                onClick={initBoard}
                aria-label={t.restart}
                className="min-h-[44px] min-w-[44px] px-2.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-stone-100 text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
              >
                <RotateCcw className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline">{t.restart}</span>
              </button>
            )}
          </div>

          {/* Live Board Counters */}
          <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-stone-200/90 font-mono-num sm:pr-1 shrink-0">
            <span data-testid="moves-count">
              {t.movesLeft}: {validMoves.length}
            </span>
            <span aria-hidden="true" className="text-stone-500">·</span>
            <span data-testid="tiles-count">
              {t.tilesLeft}: {tiles.length}
            </span>
            {(specialCounts.bonuses > 0 || specialCounts.traps > 0) && (
              <>
                <span aria-hidden="true" className="text-stone-500">·</span>
                <span data-testid="bonus-count" className="text-emerald-300 font-semibold">
                  {t.bonusLabel}: {specialCounts.bonuses}
                </span>
                <span aria-hidden="true" className="text-stone-500">·</span>
                <span data-testid="trap-count" className="text-rose-300 font-semibold">
                  {t.trapLabel}: {specialCounts.traps}
                </span>
              </>
            )}
          </div>
        </div>
      </footer>

      {/* Pause Modal */}
      {isPaused && outcome === 'playing' && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t.pausedTitle}
          className="fixed inset-0 z-[100] bg-black/70 flex items-center justify-center p-4"
        >
          <div className="w-full max-w-sm rounded-3xl bg-stone-900 border border-white/15 p-6 text-center shadow-2xl">
            <h2 className="font-display font-bold text-2xl text-white">{t.pausedTitle}</h2>
            <p className="mt-1 text-sm text-stone-400">{levelDisplayName}</p>
            {onUpdateSettings && (
              <div className="mt-4 rounded-xl bg-black/35 border border-white/10 px-3.5 py-2.5 text-left">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="flex items-center gap-2 text-xs font-semibold text-stone-200">
                    <Music className="w-4 h-4 text-amber-300 shrink-0" />
                    <span>{t.musicLabel}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateSettings({
                        musicEnabled: !settings.musicEnabled,
                        musicVolume:
                          !settings.musicEnabled && settings.musicVolume <= 0
                            ? 0.45
                            : settings.musicVolume,
                      })
                    }
                    className={`min-h-[30px] px-2.5 rounded-lg text-xs font-bold cursor-pointer ${
                      settings.musicEnabled && settings.musicVolume > 0
                        ? 'bg-amber-500 text-stone-950'
                        : 'bg-stone-800 text-stone-300'
                    }`}
                  >
                    {Math.round((settings.musicEnabled ? settings.musicVolume : 0) * 100)}%
                  </button>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={Math.round((settings.musicEnabled ? settings.musicVolume : 0) * 100)}
                  onChange={(e) => {
                    const pct = Number(e.target.value);
                    const nextVol = Math.max(0, Math.min(1, pct / 100));
                    onUpdateSettings({
                      musicEnabled: nextVol > 0,
                      musicVolume: nextVol,
                    });
                  }}
                  aria-label={t.musicVolumeLabel}
                  className="w-full h-1.5 rounded-lg accent-amber-500 cursor-pointer"
                />
              </div>
            )}
            <div className="mt-5 flex flex-col gap-2.5">
              <button
                type="button"
                onClick={handleTogglePause}
                className="w-full min-h-[48px] rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-base flex items-center justify-center gap-2 cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>{t.resume}</span>
              </button>
              {!isMultiplayer && (
                <button
                  type="button"
                  onClick={initBoard}
                  className="w-full min-h-[46px] rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-100 font-semibold text-sm cursor-pointer"
                >
                  {t.restart}
                </button>
              )}
              {isMultiplayer ? (
                <button
                  type="button"
                  onClick={onReturnToRoomLobby ?? onBackToTitle}
                  className="w-full min-h-[46px] rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-100 font-semibold text-sm cursor-pointer"
                >
                  {t.mpReturnToRoom}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onOpenMap}
                  className="w-full min-h-[46px] rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-100 font-semibold text-sm cursor-pointer"
                >
                  {t.backToMap}
                </button>
              )}
              <button
                type="button"
                onClick={onBackToTitle}
                className="w-full min-h-[44px] rounded-xl bg-transparent hover:bg-stone-800 text-stone-300 font-medium text-sm cursor-pointer"
              >
                {t.backToTitle}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Victory Modal */}
      {outcome === 'won' && winStats && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t.levelComplete}
          data-testid="victory-overlay"
          className="fixed inset-0 z-[100] bg-black/75 flex items-center justify-center p-4"
        >
          <VictoryCelebrationLayer />
          <div className="animate-victory-modal relative z-[102] w-full max-w-sm rounded-3xl bg-stone-900 border border-amber-400/40 p-6 text-center shadow-2xl">
            <div
              data-testid="victory-stars-row"
              aria-label={`${t.starsLabel}: ${winStats.stars}/3`}
              className="flex items-center justify-center gap-2.5 mb-3"
            >
              {[1, 2, 3].map((idx) => {
                const earned = idx <= winStats.stars;
                return (
                  <Star
                    key={idx}
                    data-earned={earned ? 'true' : 'false'}
                    style={earned ? { animationDelay: `${120 + (idx - 1) * 160}ms` } : undefined}
                    className={`w-10 h-10 ${
                      earned
                        ? 'animate-victory-star text-amber-400 fill-amber-400 drop-shadow-[0_0_12px_rgba(251,191,36,0.72)]'
                        : 'text-stone-700'
                    }`}
                  />
                );
              })}
            </div>
            <h2 className="font-display font-extrabold text-2xl text-white">
              {t.levelComplete}
            </h2>
            <p className="mt-1 text-sm text-stone-400">{levelDisplayName}</p>

            <div className="mt-5 grid grid-cols-2 gap-3 text-left">
              <div className="animate-victory-score rounded-xl bg-stone-800/80 border border-amber-400/20 p-3">
                <p className="text-xs text-stone-400">{t.score}</p>
                <p
                  data-testid="victory-final-score"
                  className="font-mono-num font-bold text-xl text-white"
                >
                  {score}
                </p>
              </div>
              <div
                style={{ animationDelay: '260ms' }}
                className="animate-victory-score rounded-xl bg-stone-800/80 border border-amber-400/20 p-3"
              >
                <p className="text-xs text-stone-400">{t.coins}</p>
                <p className="font-mono-num font-bold text-xl text-amber-400">
                  +{winStats.coinsEarned}
                </p>
              </div>
            </div>

            {multiplayerRoom && (
              <div
                data-testid="mp-victory-leaderboard"
                className="mt-4 rounded-2xl bg-stone-800/70 border border-white/10 p-3 text-left"
              >
                <p className="text-xs font-bold text-amber-300 mb-2 flex items-center gap-1.5">
                  <Crown className="w-3.5 h-3.5 shrink-0" />
                  <span>{t.mpLeaderboardTitle}</span>
                </p>
                <div className="flex flex-col gap-1.5 max-h-36 overflow-y-auto">
                  {sortRoomPlayersForLeaderboard(multiplayerRoom.players).map((p, idx) => (
                    <div
                      key={p.id}
                      className={`flex items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-xs ${
                        p.id === localPlayerId ? 'bg-amber-500/20 text-white' : 'bg-black/25 text-stone-200'
                      }`}
                    >
                      <span className="truncate font-semibold">
                        #{idx + 1} {p.name}
                      </span>
                      <span className="font-mono-num shrink-0">
                        {p.score} ·{' '}
                        {p.status === 'won'
                          ? t.mpStatusWon
                          : p.status === 'lost'
                          ? t.mpStatusLost
                          : t.mpStatusPlaying}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-6 flex flex-col gap-2.5">
              {multiplayerRoom ? (
                <>
                  <button
                    type="button"
                    data-start="true"
                    onClick={
                      multiplayerRoom.hostId === localPlayerId
                        ? onMultiplayerRematch ?? onReturnToRoomLobby
                        : onReturnToRoomLobby
                    }
                    className="w-full min-h-[48px] rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-base cursor-pointer"
                  >
                    {t.mpReturnToRoom}
                  </button>
                  <button
                    type="button"
                    onClick={onBackToTitle}
                    className="w-full min-h-[46px] rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-100 font-semibold text-sm cursor-pointer"
                  >
                    {t.backToTitle}
                  </button>
                </>
              ) : (
                <>
                  {hasNextLevel && !isDailyChallenge ? (
                    <button
                      type="button"
                      data-start="true"
                      onClick={onNextLevel}
                      className="w-full min-h-[48px] rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-base cursor-pointer"
                    >
                      {t.nextLevel}
                    </button>
                  ) : (
                    <button
                      type="button"
                      data-start="true"
                      onClick={initBoard}
                      className="w-full min-h-[48px] rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-base cursor-pointer"
                    >
                      {t.playAgain}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={onOpenMap}
                    className="w-full min-h-[46px] rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-100 font-semibold text-sm cursor-pointer"
                  >
                    {t.backToMap}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Time Up / Mistakes Limit Defeat Modal */}
      {outcome === 'lost' && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={lostReason === 'mistakes' ? t.mistakesLimitTitle : t.levelFailed}
          className="fixed inset-0 z-[100] bg-black/75 flex items-center justify-center p-4"
        >
          <div className="w-full max-w-sm rounded-3xl bg-stone-900 border border-rose-500/40 p-6 text-center shadow-2xl">
            <div
              data-testid="defeat-domini-callout"
              className="mx-auto mb-3 inline-flex items-center gap-2 rounded-xl border border-rose-400/50 bg-rose-950/75 px-3.5 py-1.5 text-xs sm:text-sm font-display font-bold text-rose-200 shadow-inner"
            >
              <span>Domini:</span>
              <span>{getDominiDefeatMessage(settings.language).message}</span>
            </div>
            <h2 className="font-display font-extrabold text-2xl text-white">
              {lostReason === 'mistakes' ? t.mistakesLimitTitle : t.levelFailed}
            </h2>
            <p className="mt-2 text-sm text-stone-300">
              {lostReason === 'mistakes' ? t.mistakesLimitDesc : t.timeUp}
            </p>

            <div className="mt-5 grid grid-cols-2 gap-3 text-left">
              <div className="rounded-xl bg-stone-800/80 p-3">
                <p className="text-xs text-stone-400">{t.score}</p>
                <p className="font-mono-num font-bold text-xl text-white">{score}</p>
              </div>
              <div className="rounded-xl bg-stone-800/80 p-3">
                <p className="text-xs text-stone-400">
                  {lostReason === 'mistakes' ? t.mistakesLabel : t.tilesLeft}
                </p>
                <p className="font-mono-num font-bold text-xl text-rose-400">
                  {lostReason === 'mistakes' ? `${mistakes}/${MAX_MISTAKES}` : tiles.length}
                </p>
              </div>
            </div>

            {multiplayerRoom && (
              <div
                data-testid="mp-defeat-leaderboard"
                className="mt-4 rounded-2xl bg-stone-800/70 border border-white/10 p-3 text-left"
              >
                <p className="text-xs font-bold text-amber-300 mb-2 flex items-center gap-1.5">
                  <Crown className="w-3.5 h-3.5 shrink-0" />
                  <span>{t.mpLeaderboardTitle}</span>
                </p>
                <div className="flex flex-col gap-1.5 max-h-36 overflow-y-auto">
                  {sortRoomPlayersForLeaderboard(multiplayerRoom.players).map((p, idx) => (
                    <div
                      key={p.id}
                      className={`flex items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-xs ${
                        p.id === localPlayerId ? 'bg-amber-500/20 text-white' : 'bg-black/25 text-stone-200'
                      }`}
                    >
                      <span className="truncate font-semibold">
                        #{idx + 1} {p.name}
                      </span>
                      <span className="font-mono-num shrink-0">
                        {p.score} ·{' '}
                        {p.status === 'won'
                          ? t.mpStatusWon
                          : p.status === 'lost'
                          ? t.mpStatusLost
                          : t.mpStatusPlaying}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-6 flex flex-col gap-2.5">
              {multiplayerRoom ? (
                <>
                  <button
                    type="button"
                    data-start="true"
                    onClick={
                      multiplayerRoom.hostId === localPlayerId
                        ? onMultiplayerRematch ?? onReturnToRoomLobby
                        : onReturnToRoomLobby
                    }
                    className="w-full min-h-[48px] rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-base cursor-pointer"
                  >
                    {t.mpReturnToRoom}
                  </button>
                  <button
                    type="button"
                    onClick={onBackToTitle}
                    className="w-full min-h-[46px] rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-100 font-semibold text-sm cursor-pointer"
                  >
                    {t.backToTitle}
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    data-start="true"
                    onClick={initBoard}
                    className="w-full min-h-[48px] rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-base cursor-pointer"
                  >
                    {t.playAgain}
                  </button>
                  <button
                    type="button"
                    onClick={onOpenMap}
                    className="w-full min-h-[46px] rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-100 font-semibold text-sm cursor-pointer"
                  >
                    {t.backToMap}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
