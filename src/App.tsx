import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DailyRewardsScreen } from './components/DailyRewardsModal';
import { GameBoard } from './components/GameBoard';
import { LevelMap } from './components/LevelMap';
import { MenuAmbientCanvas } from './components/MenuAmbientCanvas';
import { MultiplayerScreen } from './components/MultiplayerModal';
import { SettingsScreen } from './components/SettingsModal';
import { ShopScreen } from './components/ShopModal';
import { getTableBackgroundStyle } from './components/TableTheme';
import { TitleScreen } from './components/TitleScreen';
import { DAILY_LOGIN_REWARDS } from './data/shop';
import { getDailyChallengeLevel, getLevelSeed, LEVELS } from './game/levels';
import { extractRoomCodeFromLocation } from './game/multiplayer';
import { AppView, GameScreenState, PlayerProgress, PlayerSettings, ShopItem } from './game/types';
import { TRANSLATIONS } from './i18n/translations';
import { soundEngine } from './utils/audio';
import {
  getTodayIso,
  loadProgress,
  loadSettings,
  resetAllLocalData,
  saveProgress,
  saveSettings,
} from './utils/storage';
import { useMultiplayerRoom } from './utils/useMultiplayerRoom';

export default function App() {
  const [progress, setProgress] = useState<PlayerProgress>(() => loadProgress());
  const [settings, setSettings] = useState<PlayerSettings>(() => loadSettings());
  const [inviteRoomCode, setInviteRoomCode] = useState<string | null>(() =>
    extractRoomCodeFromLocation()
  );

  const [view, setView] = useState<AppView>(() => {
    if (typeof window !== 'undefined') {
      if (extractRoomCodeFromLocation()) {
        return 'multiplayer';
      }
      const params = new URLSearchParams(window.location.search);
      if (params.get('autostart') === '1') {
        return 'playing';
      }
    }
    return 'title';
  });

  const [activeLevelId, setActiveLevelId] = useState<number>(() =>
    Math.min(loadProgress().highestUnlockedLevel, LEVELS.length)
  );
  const [isDailyMode, setIsDailyMode] = useState(false);

  const todayIso = getTodayIso();
  const t = TRANSLATIONS[settings.language] ?? TRANSLATIONS.az;

  // Sync <html lang>
  useEffect(() => {
    document.documentElement.lang = settings.language;
  }, [settings.language]);

  const setBodyState = useCallback((state: GameScreenState) => {
    document.body.dataset.state = state;
  }, []);

  useEffect(() => {
    if (view !== 'playing') {
      setBodyState('title');
      soundEngine.setMusicContext({
        scene: 'menu',
        combo: 0,
        urgent: false,
        endgame: false,
      });
    }
  }, [view, setBodyState]);

  // Sync background music settings to Web Audio engine
  useEffect(() => {
    soundEngine.setMusicSettings({
      enabled: settings.musicEnabled,
      volume: settings.musicVolume,
    });
  }, [settings.musicEnabled, settings.musicVolume]);

  // Play subtle transition chime when switching screens
  const prevViewRef = useRef<AppView | null>(null);
  useEffect(() => {
    if (prevViewRef.current === null) {
      prevViewRef.current = view;
      return;
    }
    if (prevViewRef.current !== view) {
      soundEngine.playMenuTransition(
        settings.soundEnabled,
        view === 'title' ? 'back' : 'forward'
      );
      prevViewRef.current = view;
    }
  }, [view, settings.soundEnabled]);

  // Tactile click feedback across menu/modal buttons (excluding domino tiles & voice preview buttons)
  useEffect(() => {
    const onDocumentClick = (e: MouseEvent) => {
      if (!settings.soundEnabled) return;
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (target.closest('[data-tile-id]')) return;
      if (
        target.closest('[data-testid="menu-domini-speak-btn"]') ||
        target.closest('[data-testid="settings-voice-test-btn"]')
      ) {
        return;
      }
      const interactive = target.closest(
        'button:not(:disabled), [role="button"]:not([aria-disabled="true"])'
      );
      if (interactive) {
        soundEngine.unlock();
        soundEngine.playMenuClick(true);
      }
    };
    document.addEventListener('click', onDocumentClick, true);
    return () => document.removeEventListener('click', onDocumentClick, true);
  }, [settings.soundEnabled]);

  const persistProgress = useCallback((updater: (prev: PlayerProgress) => PlayerProgress) => {
    setProgress((prev) => {
      const next = updater(prev);
      saveProgress(next);
      return next;
    });
  }, []);

  const handleUpdateSettings = useCallback((patch: Partial<PlayerSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      saveSettings(next);
      return next;
    });
  }, []);

  const handleChargeRoomFee = useCallback(
    (amount: number) => {
      if (amount <= 0) return;
      persistProgress((prev) => ({
        ...prev,
        coins: Math.max(0, prev.coins - amount),
      }));
    },
    [persistProgress]
  );

  const mp = useMultiplayerRoom({
    avatarId: progress.equippedCosmetics.avatars,
    onCoinsCharged: handleChargeRoomFee,
    onRoomStarted: () => {
      setIsDailyMode(false);
      setView('playing');
    },
  });

  // Auto-join invited room link (?room=CODE)
  useEffect(() => {
    if (inviteRoomCode && !mp.room) {
      mp.joinRoom(inviteRoomCode);
      setInviteRoomCode(null);
    }
  }, [inviteRoomCode, mp]);

  // If host triggers rematch and room transitions back to waiting, return players to lobby
  useEffect(() => {
    if (mp.room?.status === 'waiting' && view === 'playing') {
      setView('multiplayer');
    }
  }, [mp.room?.status, view]);

  const handleStartContinue = useCallback(() => {
    soundEngine.unlock();
    const targetLevel = Math.min(progress.highestUnlockedLevel, LEVELS.length);
    setActiveLevelId(targetLevel);
    setIsDailyMode(false);
    setView('playing');
  }, [progress.highestUnlockedLevel]);

  // Title Screen Enter/Space keyboard handshake
  useEffect(() => {
    if (view !== 'title') return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        const activeTag = document.activeElement?.tagName;
        if (activeTag === 'BUTTON' || activeTag === 'A') return;
        e.preventDefault();
        handleStartContinue();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [view, handleStartContinue]);

  const handleSelectLevel = useCallback((levelId: number) => {
    setActiveLevelId(levelId);
    setIsDailyMode(false);
    setView('playing');
  }, []);

  const handleStartDaily = useCallback(() => {
    setIsDailyMode(true);
    setView('playing');
  }, []);

  const handleSpendCoins = useCallback(
    (amount: number) => {
      if (progress.coins < amount) return false;
      persistProgress((prev) => ({
        ...prev,
        coins: Math.max(0, prev.coins - amount),
      }));
      return true;
    },
    [progress.coins, persistProgress]
  );

  const handleEarnCoins = useCallback(
    (amount: number) => {
      if (amount <= 0) return;
      persistProgress((prev) => ({
        ...prev,
        coins: prev.coins + amount,
      }));
    },
    [persistProgress]
  );

  const handleAddPlayTime = useCallback(
    (seconds: number) => {
      const clean = Math.max(0, Math.round(seconds));
      if (clean <= 0) return;
      persistProgress((prev) => ({
        ...prev,
        totalPlayTimeSec: (prev.totalPlayTimeSec ?? 0) + clean,
      }));
    },
    [persistProgress]
  );

  const handleLevelComplete = useCallback(
    (result: {
      levelId: number;
      isDaily: boolean;
      score: number;
      stars: number;
      coinsEarned: number;
      timeSpentSec: number;
      matchesCleared: number;
    }) => {
      persistProgress((prev) => {
        const winSec = Math.max(1, Math.round(result.timeSpentSec));
        const nextFastestWin =
          prev.fastestWinSec != null
            ? Math.min(prev.fastestWinSec, winSec)
            : winSec;

        if (result.isDaily) {
          const firstDailyClear = prev.dailyChallengeCompletedDate !== todayIso;
          const bonusCoins = firstDailyClear ? result.coinsEarned : 35;
          return {
            ...prev,
            coins: prev.coins + bonusCoins,
            dailyChallengeCompletedDate: todayIso,
            totalMatchesCleared: prev.totalMatchesCleared + result.matchesCleared,
            totalLevelsWon: prev.totalLevelsWon + 1,
            fastestWinSec: nextFastestWin,
          };
        }

        const existing = prev.levelRecords[result.levelId];
        const nextStars = Math.max(existing?.stars ?? 0, result.stars);
        const nextBestScore = Math.max(existing?.bestScore ?? 0, result.score);
        const nextBestTime =
          existing?.bestTimeSec != null
            ? Math.min(existing.bestTimeSec, result.timeSpentSec)
            : result.timeSpentSec;

        const nextUnlocked = Math.min(
          LEVELS.length,
          Math.max(prev.highestUnlockedLevel, result.levelId + 1)
        );

        return {
          ...prev,
          coins: prev.coins + result.coinsEarned,
          highestUnlockedLevel: nextUnlocked,
          levelRecords: {
            ...prev.levelRecords,
            [result.levelId]: {
              stars: nextStars,
              bestScore: nextBestScore,
              bestTimeSec: nextBestTime,
            },
          },
          totalMatchesCleared: prev.totalMatchesCleared + result.matchesCleared,
          totalLevelsWon: prev.totalLevelsWon + 1,
          fastestWinSec: nextFastestWin,
        };
      });
    },
    [persistProgress, todayIso]
  );

  const handleBuyOrEquip = useCallback(
    (item: ShopItem) => {
      persistProgress((prev) => {
        const owned = prev.unlockedCosmetics.includes(item.id);
        if (owned) {
          return {
            ...prev,
            equippedCosmetics: {
              ...prev.equippedCosmetics,
              [item.category]: item.id,
            },
          };
        }
        if (prev.coins < item.price) return prev;
        return {
          ...prev,
          coins: prev.coins - item.price,
          unlockedCosmetics: [...prev.unlockedCosmetics, item.id],
          equippedCosmetics: {
            ...prev.equippedCosmetics,
            [item.category]: item.id,
          },
        };
      });
    },
    [persistProgress]
  );

  const canClaimDailyReward = progress.lastLoginClaimDate !== todayIso;
  const dailyChallengeDone = progress.dailyChallengeCompletedDate === todayIso;

  const handleClaimDailyReward = useCallback(() => {
    if (!canClaimDailyReward) return;
    const idx = progress.dailyLoginStreak % DAILY_LOGIN_REWARDS.length;
    const reward = DAILY_LOGIN_REWARDS[idx];
    persistProgress((prev) => ({
      ...prev,
      coins: prev.coins + reward,
      dailyLoginStreak: prev.dailyLoginStreak + 1,
      lastLoginClaimDate: todayIso,
    }));
  }, [canClaimDailyReward, progress.dailyLoginStreak, persistProgress, todayIso]);

  const handleResetAllData = useCallback(() => {
    const fresh = resetAllLocalData();
    setProgress(fresh.progress);
    setSettings(fresh.settings);
    setActiveLevelId(1);
    setIsDailyMode(false);
  }, []);

  const dailyLevelData = useMemo(() => getDailyChallengeLevel(todayIso), [todayIso]);

  const activeMultiplayerRoom =
    mp.room && (mp.room.status === 'playing' || mp.room.status === 'finished')
      ? mp.room
      : null;

  const mpLevelId = activeMultiplayerRoom?.levelId ?? null;
  const mpTimeLimitSec = activeMultiplayerRoom?.timeLimitSec ?? null;

  const activeLevelConfig = useMemo(() => {
    if (mpLevelId !== null) {
      const base = LEVELS.find((l) => l.id === mpLevelId) ?? LEVELS[0];
      return {
        ...base,
        timeLimitSec: mpTimeLimitSec ?? base.timeLimitSec,
      };
    }
    if (isDailyMode) {
      return dailyLevelData.config;
    }
    return LEVELS.find((l) => l.id === activeLevelId) ?? LEVELS[0];
  }, [mpLevelId, mpTimeLimitSec, isDailyMode, dailyLevelData, activeLevelId]);

  const activeSeed = activeMultiplayerRoom
    ? activeMultiplayerRoom.seed
    : isDailyMode
    ? dailyLevelData.seed
    : getLevelSeed(activeLevelConfig.id);

  if (view === 'playing') {
    return (
      <GameBoard
        t={t}
        level={activeLevelConfig}
        seed={activeSeed}
        isDailyChallenge={isDailyMode}
        progress={progress}
        settings={settings}
        hasNextLevel={activeLevelConfig.id < LEVELS.length}
        multiplayerRoom={activeMultiplayerRoom}
        localPlayerId={mp.playerId}
        onMultiplayerProgress={mp.reportProgress}
        onMultiplayerRematch={mp.requestRematch}
        onReturnToRoomLobby={() => setView('multiplayer')}
        onToggleSound={() =>
          handleUpdateSettings({ soundEnabled: !settings.soundEnabled })
        }
        onUpdateSettings={handleUpdateSettings}
        onSpendCoins={handleSpendCoins}
        onEarnCoins={handleEarnCoins}
        onAddPlayTime={handleAddPlayTime}
        onLevelComplete={handleLevelComplete}
        onNextLevel={() => {
          const nextId = Math.min(LEVELS.length, activeLevelConfig.id + 1);
          setActiveLevelId(nextId);
          setIsDailyMode(false);
        }}
        onOpenMap={() => {
          if (mp.room) mp.leaveRoom();
          setView('map');
        }}
        onBackToTitle={() => {
          if (mp.room) mp.leaveRoom();
          setView('title');
        }}
        onScreenStateChange={setBodyState}
      />
    );
  }

  const menuTableStyle = getTableBackgroundStyle(progress.equippedCosmetics.tables);

  let menuViewNode: React.ReactNode;
  if (view === 'multiplayer') {
    menuViewNode = (
      <MultiplayerScreen
        t={t}
        progress={progress}
        playerId={mp.playerId}
        playerName={mp.playerName}
        room={mp.room}
        socketStatus={mp.socketStatus}
        errorCode={mp.errorCode}
        initialJoinCode={inviteRoomCode}
        onUpdatePlayerName={mp.updatePlayerName}
        onCreateRoom={mp.createRoom}
        onJoinRoom={mp.joinRoom}
        onUpdateRoomConfig={mp.updateRoomConfig}
        onToggleReady={mp.toggleReady}
        onStartMatch={mp.startRoomGame}
        onLeaveRoom={mp.leaveRoom}
        onClearError={mp.clearError}
        onBack={() => setView('title')}
      />
    );
  } else if (view === 'map') {
    menuViewNode = (
      <LevelMap
        t={t}
        progress={progress}
        dailyDone={dailyChallengeDone}
        onSelectLevel={handleSelectLevel}
        onStartDaily={handleStartDaily}
        onOpenMultiplayer={() => setView('multiplayer')}
        onBack={() => setView('title')}
      />
    );
  } else if (view === 'shop') {
    menuViewNode = (
      <ShopScreen
        t={t}
        progress={progress}
        onBuyOrEquip={handleBuyOrEquip}
        onBack={() => setView('title')}
      />
    );
  } else if (view === 'daily') {
    menuViewNode = (
      <DailyRewardsScreen
        t={t}
        progress={progress}
        canClaimToday={canClaimDailyReward}
        onClaimToday={handleClaimDailyReward}
        onBack={() => setView('title')}
      />
    );
  } else if (view === 'settings') {
    menuViewNode = (
      <SettingsScreen
        t={t}
        progress={progress}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
        onResetAllData={handleResetAllData}
        onBack={() => setView('title')}
      />
    );
  } else {
    menuViewNode = (
      <TitleScreen
        t={t}
        progress={progress}
        settings={settings}
        canClaimDailyReward={canClaimDailyReward}
        dailyChallengeDone={dailyChallengeDone}
        onStartContinue={handleStartContinue}
        onOpenMap={() => setView('map')}
        onOpenDailyChallenge={handleStartDaily}
        onOpenDailyRewards={() => setView('daily')}
        onOpenShop={() => setView('shop')}
        onOpenSettings={() => setView('settings')}
        onOpenMultiplayer={() => setView('multiplayer')}
        onToggleMusic={() =>
          handleUpdateSettings({
            musicEnabled: !settings.musicEnabled,
            musicVolume:
              !settings.musicEnabled && settings.musicVolume <= 0
                ? 0.45
                : settings.musicVolume,
          })
        }
      />
    );
  }

  return (
    <div
      className="min-h-full w-full relative overflow-x-hidden"
      style={menuTableStyle}
    >
      <MenuAmbientCanvas tableId={progress.equippedCosmetics.tables} />
      <div className="relative z-10 min-h-full w-full">
        {menuViewNode}
      </div>
    </div>
  );
}
