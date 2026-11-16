import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Check,
  Clock,
  Coins,
  Copy,
  Crown,
  Link2,
  Play,
  Users,
} from 'lucide-react';
import { LEVELS } from '../game/levels';
import {
  buildRoomInviteUrl,
  getLevelsForCategory,
  ROOM_CREATE_COST_COINS,
  ROOM_TIME_OPTIONS_SEC,
} from '../game/multiplayer';
import { formatStatsDuration } from '../game/stats';
import {
  MultiplayerRoomState,
  PlayerProgress,
  RoomCategoryFilter,
} from '../game/types';
import { Translations } from '../i18n/translations';
import { RoomSocketStatus } from '../utils/useMultiplayerRoom';
import { AvatarEmblem, getTableBackgroundStyle } from './TableTheme';

interface MultiplayerScreenProps {
  t: Translations;
  progress: PlayerProgress;
  playerId: string;
  playerName: string;
  room: MultiplayerRoomState | null;
  socketStatus: RoomSocketStatus;
  errorCode: string | null;
  initialJoinCode?: string | null;
  onUpdatePlayerName: (name: string) => void;
  onCreateRoom: (params: {
    category: RoomCategoryFilter;
    levelId: number;
    timeLimitSec: number;
    clientCoins: number;
    customName?: string;
  }) => void;
  onJoinRoom: (code: string, customName?: string) => void;
  onUpdateRoomConfig: (patch: {
    category?: RoomCategoryFilter;
    levelId?: number;
    timeLimitSec?: number;
  }) => void;
  onToggleReady: (ready: boolean) => void;
  onStartMatch: () => void;
  onLeaveRoom: () => void;
  onClearError: () => void;
  onBack: () => void;
}

const CATEGORIES: RoomCategoryFilter[] = ['all', 'easy', 'medium', 'hard', 'master'];

export const MultiplayerScreen: React.FC<MultiplayerScreenProps> = ({
  t,
  progress,
  playerId,
  playerName,
  room,
  socketStatus,
  errorCode,
  initialJoinCode,
  onUpdatePlayerName,
  onCreateRoom,
  onJoinRoom,
  onUpdateRoomConfig,
  onToggleReady,
  onStartMatch,
  onLeaveRoom,
  onClearError,
  onBack,
}) => {
  const tableStyle = getTableBackgroundStyle(progress.equippedCosmetics.tables);
  const [tab, setTab] = useState<'create' | 'join'>(initialJoinCode ? 'join' : 'create');
  const [nameDraft, setNameDraft] = useState(playerName);
  const [category, setCategory] = useState<RoomCategoryFilter>('all');
  const [selectedLevelId, setSelectedLevelId] = useState<number>(1);
  const [selectedTimeSec, setSelectedTimeSec] = useState<number>(120);
  const [joinCodeInput, setJoinCodeInput] = useState<string>(initialJoinCode ?? '');
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    setNameDraft(playerName);
  }, [playerName]);

  useEffect(() => {
    if (initialJoinCode) {
      setTab('join');
      setJoinCodeInput(initialJoinCode.toUpperCase());
    }
  }, [initialJoinCode]);

  const categoryLevels = useMemo(() => getLevelsForCategory(category), [category]);

  useEffect(() => {
    if (!categoryLevels.some((l) => l.id === selectedLevelId)) {
      if (categoryLevels[0]) {
        setSelectedLevelId(categoryLevels[0].id);
      }
    }
  }, [categoryLevels, selectedLevelId]);

  const getCategoryLabel = (cat: RoomCategoryFilter) => {
    if (cat === 'all') return t.mpCategoryAll;
    if (cat === 'easy') return t.difficultyEasy;
    if (cat === 'medium') return t.difficultyMedium;
    if (cat === 'hard') return t.difficultyHard;
    return t.difficultyMaster;
  };

  const canAffordCreate = progress.coins >= ROOM_CREATE_COST_COINS;

  const activeCategory: RoomCategoryFilter = room ? room.category : category;
  const activeCategoryLevels = useMemo(
    () => getLevelsForCategory(activeCategory),
    [activeCategory]
  );

  const isHost = room ? room.hostId === playerId : false;
  const localRoomPlayer = room?.players.find((p) => p.id === playerId) ?? null;
  const inviteUrl = room ? buildRoomInviteUrl(room.code) : '';
  const currentRoomLevel = room
    ? LEVELS.find((l) => l.id === room.levelId) ?? LEVELS[0]
    : LEVELS.find((l) => l.id === selectedLevelId) ?? LEVELS[0];

  const handleCopyInviteLink = async () => {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopiedLink(true);
      window.setTimeout(() => setCopiedLink(false), 2200);
    } catch {
      const input = document.querySelector<HTMLInputElement>('[data-testid="mp-invite-link"]');
      if (input) {
        input.select();
        setCopiedLink(true);
        window.setTimeout(() => setCopiedLink(false), 2200);
      }
    }
  };

  const renderErrorBanner = () => {
    if (!errorCode) return null;
    const msg =
      errorCode === 'ROOM_NOT_FOUND'
        ? t.mpRoomNotFound
        : errorCode === 'INSUFFICIENT_COINS'
        ? t.mpNotEnoughCoinsRoom
        : errorCode;

    return (
      <div
        role="alert"
        data-testid="mp-error-banner"
        className="rounded-xl bg-rose-950/75 border border-rose-400/50 px-4 py-2.5 text-sm text-rose-100"
      >
        {msg}
      </div>
    );
  };

  return (
    <div className="min-h-full w-full text-stone-100 flex flex-col" style={tableStyle}>
      {/* Sticky Header */}
      <header className="sticky top-0 z-20 bg-black/65 border-b border-white/10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => {
                if (room) onLeaveRoom();
                onBack();
              }}
              aria-label={t.backToTitle}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/15 text-white cursor-pointer shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="font-display font-bold text-lg sm:text-xl text-white truncate">
              {t.mpTitle}
            </h1>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div
              data-testid="mp-coin-balance"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/40 border border-amber-400/30 text-amber-300"
            >
              <Coins className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="font-mono-num font-bold text-sm">{progress.coins}</span>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-5 flex flex-col gap-5">
        {renderErrorBanner()}

        {/* Shared Nickname Field */}
        <section className="rounded-2xl bg-black/40 border border-white/15 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <AvatarEmblem avatarId={progress.equippedCosmetics.avatars} size={42} />
            <div className="min-w-0">
              <label
                htmlFor="mp-player-name"
                className="block text-xs font-semibold text-stone-300"
              >
                {t.mpPlayerName}
              </label>
              <p className="text-xs text-stone-400 truncate">{t.mpSubtitle}</p>
            </div>
          </div>

          <input
            id="mp-player-name"
            data-testid="mp-player-name-input"
            type="text"
            maxLength={24}
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            onBlur={() => {
              const trimmed = nameDraft.trim() || 'Usta';
              setNameDraft(trimmed);
              onUpdatePlayerName(trimmed);
            }}
            className="w-full sm:w-56 min-h-[44px] rounded-xl bg-stone-950/75 border border-white/15 px-3.5 py-2 text-sm font-semibold text-white focus:outline-none focus:border-amber-400"
          />
        </section>

        {/* Not yet in a room: Create / Join tabs */}
        {!room && (
          <section className="rounded-2xl bg-black/40 border border-white/15 p-4 sm:p-5 flex flex-col gap-5">
            {/* Segmented Mode Selector */}
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-black/45 border border-white/10 rounded-xl">
              <button
                type="button"
                data-testid="mp-tab-create"
                onClick={() => {
                  onClearError();
                  setTab('create');
                }}
                className={`min-h-[44px] px-3 py-2 rounded-lg text-sm font-bold transition-colors cursor-pointer whitespace-nowrap ${
                  tab === 'create'
                    ? 'bg-amber-500 text-stone-950'
                    : 'text-stone-300 hover:text-white'
                }`}
              >
                {t.mpCreateTab}
              </button>
              <button
                type="button"
                data-testid="mp-tab-join"
                onClick={() => {
                  onClearError();
                  setTab('join');
                }}
                className={`min-h-[44px] px-3 py-2 rounded-lg text-sm font-bold transition-colors cursor-pointer whitespace-nowrap ${
                  tab === 'join'
                    ? 'bg-amber-500 text-stone-950'
                    : 'text-stone-300 hover:text-white'
                }`}
              >
                {t.mpJoinTab}
              </button>
            </div>

            {tab === 'create' ? (
              <div className="flex flex-col gap-5">
                {/* Category Filter */}
                <div>
                  <p className="text-xs font-semibold text-stone-300 mb-2">
                    {t.mpCategoryLabel}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {CATEGORIES.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        data-testid={`mp-cat-${cat}`}
                        onClick={() => setCategory(cat)}
                        className={`min-h-[40px] px-3.5 py-2 rounded-xl border text-xs sm:text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                          category === cat
                            ? 'bg-amber-500 border-amber-400 text-stone-950'
                            : 'bg-black/35 border-white/15 text-stone-200 hover:bg-black/55'
                        }`}
                      >
                        {getCategoryLabel(cat)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Stage Selector */}
                <div>
                  <p className="text-xs font-semibold text-stone-300 mb-2">
                    {t.mpStageLabel}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-64 overflow-y-auto pr-1">
                    {categoryLevels.map((lvl) => {
                      const active = selectedLevelId === lvl.id;
                      const stageName = t.levelNames[lvl.key] ?? `${t.stageLabel} ${lvl.id}`;
                      return (
                        <button
                          key={lvl.id}
                          type="button"
                          data-testid={`mp-stage-${lvl.id}`}
                          onClick={() => setSelectedLevelId(lvl.id)}
                          className={`text-left rounded-xl border p-3 transition-colors cursor-pointer ${
                            active
                              ? 'bg-amber-500/20 border-amber-400 text-white'
                              : 'bg-black/30 border-white/10 text-stone-200 hover:bg-black/50'
                          }`}
                        >
                          <p className="text-xs text-stone-300/80">
                            {lvl.id}. {getCategoryLabel(lvl.difficulty)} · {lvl.slots.length} {t.tilesLeft}
                          </p>
                          <p className="font-display font-bold text-sm mt-0.5 truncate">
                            {stageName}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Time Limit Selector */}
                <div>
                  <p className="text-xs font-semibold text-stone-300 mb-2">
                    {t.mpTimeLabel}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {ROOM_TIME_OPTIONS_SEC.map((sec) => (
                      <button
                        key={sec}
                        type="button"
                        data-testid={`mp-time-${sec}`}
                        onClick={() => setSelectedTimeSec(sec)}
                        className={`min-h-[42px] px-3.5 py-2 rounded-xl border font-mono-num text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                          selectedTimeSec === sec
                            ? 'bg-emerald-500 border-emerald-400 text-stone-950'
                            : 'bg-black/35 border-white/15 text-stone-200 hover:bg-black/55'
                        }`}
                      >
                        <Clock className="w-3.5 h-3.5 shrink-0" />
                        <span>{formatStatsDuration(sec)}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Paid Room Fee Info & Create CTA */}
                <div className="pt-2 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="text-xs sm:text-sm text-stone-300">
                    <p>{t.mpCreateFeeInfo}</p>
                    {!canAffordCreate && (
                      <p className="mt-1 text-rose-300 font-semibold">
                        {t.mpNotEnoughCoinsRoom}
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    data-testid="mp-create-room-btn"
                    disabled={!canAffordCreate}
                    onClick={() =>
                      onCreateRoom({
                        category,
                        levelId: selectedLevelId,
                        timeLimitSec: selectedTimeSec,
                        clientCoins: progress.coins,
                        customName: nameDraft.trim() || 'Usta',
                      })
                    }
                    className="min-h-[48px] px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-stone-950 font-display font-bold text-sm sm:text-base flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <Coins className="w-4 h-4 shrink-0" />
                    <span>{t.mpCreateBtn}</span>
                  </button>
                </div>
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!joinCodeInput.trim()) return;
                  onJoinRoom(joinCodeInput.trim(), nameDraft.trim() || 'Usta');
                }}
                className="flex flex-col gap-4"
              >
                <div>
                  <label
                    htmlFor="mp-join-code"
                    className="block text-xs font-semibold text-stone-300 mb-2"
                  >
                    {t.mpJoinCodeLabel}
                  </label>
                  <div className="flex flex-col sm:flex-row gap-2.5">
                    <input
                      id="mp-join-code"
                      data-testid="mp-join-code-input"
                      type="text"
                      maxLength={10}
                      placeholder={t.mpJoinCodePlaceholder}
                      value={joinCodeInput}
                      onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                      className="flex-1 min-h-[48px] rounded-xl bg-stone-950/75 border border-white/15 px-4 py-2.5 font-mono-num font-bold text-base tracking-widest text-white uppercase focus:outline-none focus:border-amber-400"
                    />
                    <button
                      type="submit"
                      data-testid="mp-join-submit-btn"
                      disabled={!joinCodeInput.trim()}
                      className="min-h-[48px] px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-stone-950 font-display font-bold text-sm sm:text-base cursor-pointer whitespace-nowrap"
                    >
                      {t.mpJoinBtn}
                    </button>
                  </div>
                </div>
              </form>
            )}
          </section>
        )}

        {/* Active Room Lobby */}
        {room && (
          <div className="flex flex-col gap-4">
            {/* Room Code + Invite Link Sharing Box */}
            <section className="rounded-2xl bg-black/40 border border-amber-400/35 p-4 sm:p-5 flex flex-col gap-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs text-stone-300">{t.mpRoomCode}</p>
                  <p
                    data-testid="mp-room-code"
                    className="font-mono-num text-2xl sm:text-3xl font-extrabold tracking-widest text-amber-300"
                  >
                    {room.code}
                  </p>
                </div>

                <div className="text-right text-xs sm:text-sm text-stone-200">
                  <p className="font-display font-bold text-white">
                    {t.levelNames[currentRoomLevel.key] ?? `${t.stageLabel} ${room.levelId}`}
                  </p>
                  <p className="text-stone-300 font-mono-num">
                    {getCategoryLabel(room.category)} · {room.totalTiles} {t.tilesLeft} ·{' '}
                    {formatStatsDuration(room.timeLimitSec)}
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-stone-300 flex items-center gap-1.5">
                  <Link2 className="w-3.5 h-3.5 text-sky-300 shrink-0" />
                  <span>{t.mpInviteLink}</span>
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    readOnly
                    data-testid="mp-invite-link"
                    value={inviteUrl}
                    onClick={(e) => e.currentTarget.select()}
                    className="flex-1 min-h-[44px] rounded-xl bg-stone-950/75 border border-white/15 px-3.5 py-2 font-mono-num text-xs sm:text-sm text-sky-200 focus:outline-none"
                  />
                  <button
                    type="button"
                    data-testid="mp-copy-link-btn"
                    onClick={handleCopyInviteLink}
                    className="min-h-[44px] px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-stone-950 font-bold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                  >
                    {copiedLink ? (
                      <>
                        <Check className="w-4 h-4 shrink-0" />
                        <span>{t.mpCopied}</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 shrink-0" />
                        <span>{t.mpCopyLink}</span>
                      </>
                    )}
                  </button>
                </div>
                <p className="text-xs text-stone-300/80">{t.mpShareHint}</p>
              </div>
            </section>

            {/* Host Live Config Tweaks (while waiting) */}
            {isHost && room.status === 'waiting' && (
              <section className="rounded-2xl bg-black/35 border border-white/15 p-4 flex flex-col gap-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold text-stone-300 mr-1">
                    {t.mpCategoryLabel}:
                  </span>
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => onUpdateRoomConfig({ category: cat })}
                      className={`min-h-[36px] px-3 py-1 rounded-lg border text-xs font-semibold cursor-pointer whitespace-nowrap ${
                        room.category === cat
                          ? 'bg-amber-500 border-amber-400 text-stone-950'
                          : 'bg-black/30 border-white/15 text-stone-200 hover:bg-black/50'
                      }`}
                    >
                      {getCategoryLabel(cat)}
                    </button>
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold text-stone-300 mr-1">
                    {t.mpStageLabel}:
                  </span>
                  {activeCategoryLevels.map((lvl) => (
                    <button
                      key={lvl.id}
                      type="button"
                      onClick={() => onUpdateRoomConfig({ levelId: lvl.id })}
                      className={`min-h-[36px] px-3 py-1 rounded-lg border text-xs font-semibold cursor-pointer whitespace-nowrap ${
                        room.levelId === lvl.id
                          ? 'bg-amber-500/30 border-amber-400 text-amber-200'
                          : 'bg-black/30 border-white/15 text-stone-300 hover:bg-black/50'
                      }`}
                    >
                      {lvl.id}. {t.levelNames[lvl.key] ?? lvl.id}
                    </button>
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold text-stone-300 mr-1">
                    {t.mpTimeLabel}:
                  </span>
                  {ROOM_TIME_OPTIONS_SEC.map((sec) => (
                    <button
                      key={sec}
                      type="button"
                      onClick={() => onUpdateRoomConfig({ timeLimitSec: sec })}
                      className={`min-h-[36px] px-3 py-1 rounded-lg border font-mono-num text-xs font-bold cursor-pointer whitespace-nowrap ${
                        room.timeLimitSec === sec
                          ? 'bg-emerald-500 border-emerald-400 text-stone-950'
                          : 'bg-black/30 border-white/15 text-stone-200 hover:bg-black/50'
                      }`}
                    >
                      {formatStatsDuration(sec)}
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* Players List */}
            <section className="rounded-2xl bg-black/40 border border-white/15 p-4 sm:p-5 flex flex-col gap-3">
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-display font-bold text-base text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-emerald-300 shrink-0" />
                  <span>
                    {t.mpPlayersTitle} ({room.players.length})
                  </span>
                </h2>
                {socketStatus !== 'connected' && (
                  <span className="text-xs text-amber-300 font-medium">
                    {t.mpOfflineLabel}
                  </span>
                )}
              </div>

              <div data-testid="mp-players-list" className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {room.players.map((p) => (
                  <div
                    key={p.id}
                    data-testid={`mp-player-row-${p.id}`}
                    className={`rounded-xl border px-3.5 py-2.5 flex items-center justify-between gap-3 ${
                      p.id === playerId
                        ? 'bg-amber-500/10 border-amber-400/40'
                        : 'bg-black/30 border-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <AvatarEmblem avatarId={p.avatarId} size={36} />
                      <div className="min-w-0">
                        <p className="font-semibold text-sm text-white truncate flex items-center gap-1.5">
                          <span>{p.name}</span>
                          {p.isHost && <Crown className="w-3.5 h-3.5 text-amber-300 shrink-0" />}
                        </p>
                        <p className="text-xs text-stone-400 truncate">
                          {p.isHost ? t.mpHostBadge : p.connected ? (p.ready ? t.mpReadyLabel : t.mpWaitingLabel) : t.mpOfflineLabel}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`text-xs font-bold whitespace-nowrap ${
                        !p.connected
                          ? 'text-stone-500'
                          : p.ready || p.isHost
                          ? 'text-emerald-300'
                          : 'text-amber-300'
                      }`}
                    >
                      {!p.connected
                        ? t.mpOfflineLabel
                        : p.ready || p.isHost
                        ? t.mpReadyLabel
                        : t.mpWaitingLabel}
                    </span>
                  </div>
                ))}
              </div>

              {/* Lobby Controls */}
              <div className="pt-3 border-t border-white/10 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <button
                  type="button"
                  data-testid="mp-leave-room-btn"
                  onClick={onLeaveRoom}
                  className="min-h-[44px] px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-stone-200 text-sm font-semibold cursor-pointer whitespace-nowrap"
                >
                  {t.mpLeaveRoomBtn}
                </button>

                {isHost ? (
                  <button
                    type="button"
                    data-testid="mp-start-match-btn"
                    onClick={onStartMatch}
                    className="min-h-[48px] px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-display font-bold text-base flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
                  >
                    <Play className="w-4 h-4 fill-current shrink-0" />
                    <span>{t.mpStartMatchBtn}</span>
                  </button>
                ) : (
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                    <span className="text-xs text-stone-300 text-center sm:text-right">
                      {t.mpWaitingHostHint}
                    </span>
                    <button
                      type="button"
                      data-testid="mp-ready-btn"
                      onClick={() => onToggleReady(!(localRoomPlayer?.ready ?? false))}
                      className={`min-h-[44px] px-5 py-2 rounded-xl font-bold text-sm cursor-pointer whitespace-nowrap ${
                        localRoomPlayer?.ready
                          ? 'bg-emerald-500 text-stone-950'
                          : 'bg-amber-500 text-stone-950'
                      }`}
                    >
                      {localRoomPlayer?.ready ? t.mpReadyToggleBtn : t.mpUnreadyToggleBtn}
                    </button>
                  </div>
                )}
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
};
