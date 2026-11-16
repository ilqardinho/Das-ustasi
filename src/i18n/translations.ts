import { LanguageCode } from '../game/types';

export const LANGUAGE_LABELS: Record<LanguageCode, string> = {
  az: 'Azərbaycan',
  en: 'English',
  tr: 'Türkçe',
  ru: 'Русский',
};

export interface Translations {
  appTitle: string;
  appSubtitle: string;
  playNow: string;
  continueLevel: string;
  levelMap: string;
  stageLabel: string;
  dailyChallenge: string;
  dailyRewards: string;
  shop: string;
  settings: string;
  score: string;
  coins: string;
  combo: string;
  time: string;
  movesLeft: string;
  tilesLeft: string;
  hint: string;
  shuffle: string;
  undo: string;
  restart: string;
  pause: string;
  resume: string;
  backToMap: string;
  backToTitle: string;
  nextLevel: string;
  playAgain: string;
  levelComplete: string;
  levelFailed: string;
  timeUp: string;
  mistakesLabel: string;
  mistakesLimitTitle: string;
  mistakesLimitDesc: string;
  zoomIn: string;
  zoomOut: string;
  zoomReset: string;
  noMovesTitle: string;
  noMovesDesc: string;
  shuffleFree: string;
  pausedTitle: string;
  rulesShort: string;
  controlsHint: string;
  notEnoughCoins: string;
  dailyCompleted: string;
  dailyReady: string;
  claimReward: string;
  claimed: string;
  dayLabel: string;
  streakTitle: string;
  streakDesc: string;
  offlineReady: string;
  timedMode: string;
  classicMode: string;
  difficultyEasy: string;
  difficultyMedium: string;
  difficultyHard: string;
  difficultyMaster: string;
  lockedStage: string;
  starsLabel: string;
  bestScore: string;
  futureModesTitle: string;
  weeklyTournament: string;
  weeklyTournamentDesc: string;
  friendsMultiplayer: string;
  friendsMultiplayerDesc: string;
  phase2Badge: string;
  mpTitle: string;
  mpSubtitle: string;
  mpCreateTab: string;
  mpJoinTab: string;
  mpPlayerName: string;
  mpCategoryLabel: string;
  mpCategoryAll: string;
  mpStageLabel: string;
  mpTimeLabel: string;
  mpCreateFeeInfo: string;
  mpCreateBtn: string;
  mpNotEnoughCoinsRoom: string;
  mpJoinCodeLabel: string;
  mpJoinCodePlaceholder: string;
  mpJoinBtn: string;
  mpRoomNotFound: string;
  mpRoomCode: string;
  mpInviteLink: string;
  mpCopyLink: string;
  mpCopied: string;
  mpPlayersTitle: string;
  mpHostBadge: string;
  mpReadyLabel: string;
  mpWaitingLabel: string;
  mpReadyToggleBtn: string;
  mpUnreadyToggleBtn: string;
  mpStartMatchBtn: string;
  mpLeaveRoomBtn: string;
  mpWaitingHostHint: string;
  mpShareHint: string;
  mpLiveRaceTitle: string;
  mpStatusPlaying: string;
  mpStatusWon: string;
  mpStatusLost: string;
  mpLeaderboardTitle: string;
  mpReturnToRoom: string;
  mpOfflineLabel: string;
  adBannerSlotTitle: string;
  adBannerSlotDesc: string;
  shopTiles: string;
  shopTables: string;
  shopEffects: string;
  shopAvatars: string;
  shopCoins: string;
  equipped: string;
  equip: string;
  buy: string;
  owned: string;
  iapNoticeTitle: string;
  iapNoticeDesc: string;
  restorePurchases: string;
  restorePurchasesNote: string;
  rewardedAdTitle: string;
  rewardedAdDesc: string;
  fairPlayNote: string;
  soundLabel: string;
  musicLabel: string;
  musicVolumeLabel: string;
  musicMuteToggle: string;
  vibrationLabel: string;
  numbersAidLabel: string;
  highlightFreeLabel: string;
  languageLabel: string;
  dominiVoiceLabel: string;
  dominiVoiceTestBtn: string;
  statsTitle: string;
  statsTotalPlayTime: string;
  statsTotalStars: string;
  statsFastestWin: string;
  bonusLabel: string;
  trapLabel: string;
  bonusTimeMsg: string;
  bonusCoinMsg: string;
  bonusChainMsg: string;
  trapTimeMsg: string;
  trapMixMsg: string;
  legalTitle: string;
  privacyPolicy: string;
  privacyPolicyBody: string;
  termsOfService: string;
  termsOfServiceBody: string;
  deleteAccount: string;
  deleteAccountDesc: string;
  deleteAccountBtn: string;
  deleteAccountConfirm: string;
  cancel: string;
  confirm: string;
  dataDeletedToast: string;
  close: string;
  levelNames: Record<string, string>;
  shopItems: Record<string, { name: string; desc: string }>;
}

const az: Translations = {
  appTitle: 'Daş Ustası',
  appSubtitle: 'Klassik Domino Tapmacası',
  playNow: 'Oyuna Başla',
  continueLevel: 'Davam Et · Mərhələ',
  levelMap: 'Mərhələlər',
  stageLabel: 'Mərhələ',
  dailyChallenge: 'Gündəlik Tapşırıq',
  dailyRewards: 'Gündəlik Mükafat',
  shop: 'Mağaza',
  settings: 'Ayarlar',
  score: 'Xal',
  coins: 'Sikkə',
  combo: 'Seriya',
  time: 'Vaxt',
  movesLeft: 'Gediş',
  tilesLeft: 'Daş',
  hint: 'İpucu',
  shuffle: 'Qarışdır',
  undo: 'Geri',
  restart: 'Yenidən',
  pause: 'Fasilə',
  resume: 'Davam Et',
  backToMap: 'Mərhələ Xəritəsi',
  backToTitle: 'Ana Ekran',
  nextLevel: 'Növbəti Mərhələ',
  playAgain: 'Yenidən Oyna',
  levelComplete: 'Mərhələ Tamamlandı!',
  levelFailed: 'Vaxt Bitdi',
  timeUp: 'Verilən vaxt başa çatdı. Bir də sınayın!',
  mistakesLabel: 'Səhv',
  mistakesLimitTitle: '3 Səhv Haqqınız Bitdi',
  mistakesLimitDesc: 'Üç dəfə yanlış daş seçdiyiniz üçün oyun bitdi. Yenidən cəhd edin!',
  zoomIn: 'Yaxınlaşdır',
  zoomOut: 'Uzaqlaşdır',
  zoomReset: 'Ölçünü Sıfırla',
  noMovesTitle: 'Mümkün gediş qalmadı',
  noMovesDesc: 'Qalan daşları pulsuz qarışdıraraq oyuna davam edə bilərsiniz.',
  shuffleFree: 'Daşları Qarışdır',
  pausedTitle: 'Oyun Dayandırıldı',
  rulesShort: 'Üstü açıq və ən azı bir yanı boş olan eyni domino daşlarını cütləşdirin.',
  controlsHint: 'Daşlara toxunun və ya sürüşdürün · P Fasilə · R Yenidən',
  notEnoughCoins: 'Kifayət qədər sikkə yoxdur (25 sikkə lazımdır).',
  dailyCompleted: 'Bugünkü tapşırıq tamamlandı',
  dailyReady: 'Bugünkü xüsusi oyun hazırdır',
  claimReward: 'Mükafatı Al',
  claimed: 'Alındı',
  dayLabel: 'Gün',
  streakTitle: '7 Günlük Giriş Mükafatı',
  streakDesc: 'Hər gün daxil olub əlavə sikkə qazanın və mağazada yeni dizaynlar açın.',
  offlineReady: 'İnternetsiz işləyir',
  timedMode: 'Vaxt Limitli',
  classicMode: 'Rahat Rejim',
  difficultyEasy: 'Asan',
  difficultyMedium: 'Orta',
  difficultyHard: 'Çətin',
  difficultyMaster: 'Usta',
  lockedStage: 'Əvvəlki mərhələni tamamlayın',
  starsLabel: 'Ulduz',
  bestScore: 'Rekord',
  futureModesTitle: 'Yaxınlaşan Yeniliklər',
  weeklyTournament: 'Həftəlik Turnirlər',
  weeklyTournamentDesc: 'Ümumi liderlər cədvəli və həftəlik reytinq yarışları əlavə olunacaq.',
  friendsMultiplayer: 'Dostlarla Otaq',
  friendsMultiplayerDesc: 'Ortaq otaq aç, link göndər və dostlarınla eyni anda yarış.',
  phase2Badge: 'Tezliklə',
  mpTitle: 'Ortaq Otaq · Dostlarla Oyun',
  mpSubtitle: 'Kateqoriya, mərhələ və vaxt seç, linki göndər və eyni anda yarış.',
  mpCreateTab: 'Otaq Aç (50 Sikkə)',
  mpJoinTab: 'Otağa Qoşul',
  mpPlayerName: 'Oyunçu Adınız',
  mpCategoryLabel: 'Kateqoriya',
  mpCategoryAll: 'Hamısı',
  mpStageLabel: 'Mərhələ Seçimi',
  mpTimeLabel: 'Vaxt Seçimi',
  mpCreateFeeInfo: 'Otaq açmaq 50 sikkədir. Linklə qoşulan dostlar üçün pulsuzdur.',
  mpCreateBtn: 'Otaq Aç · 50 Sikkə',
  mpNotEnoughCoinsRoom: 'Otaq açmaq üçün ən azı 50 sikkə lazımdır.',
  mpJoinCodeLabel: 'Otaq Kodu',
  mpJoinCodePlaceholder: 'Məs: DM8K4P',
  mpJoinBtn: 'Otağa Qoşul (Pulsuz)',
  mpRoomNotFound: 'Bu kodla aktiv otaq tapılmadı.',
  mpRoomCode: 'Otaq Kodu',
  mpInviteLink: 'Dəvət Linki',
  mpCopyLink: 'Linki Kopyala',
  mpCopied: 'Kopyalandı!',
  mpPlayersTitle: 'Otaqdakı Oyunçular',
  mpHostBadge: 'Otaq Sahibi',
  mpReadyLabel: 'Hazırdır',
  mpWaitingLabel: 'Gözləyir',
  mpReadyToggleBtn: 'Hazıram',
  mpUnreadyToggleBtn: 'Gözləyirəm',
  mpStartMatchBtn: 'Oyunu Başlat',
  mpLeaveRoomBtn: 'Otaqdan Çıx',
  mpWaitingHostHint: 'Otaq sahibinin oyunu başlatmasını gözləyin...',
  mpShareHint: 'Dəvət linkini dostlarına göndər — qoşulduqdan sonra eyni anda başlayın.',
  mpLiveRaceTitle: 'Canlı Otaq Yarışı',
  mpStatusPlaying: 'Oynayır',
  mpStatusWon: 'Bitirdi',
  mpStatusLost: 'Uduzdu',
  mpLeaderboardTitle: 'Ortaq Otaq Nəticələri',
  mpReturnToRoom: 'Otağa Qayıt',
  mpOfflineLabel: 'Oflayn',
  adBannerSlotTitle: 'Tərəfdaşlıq Sahəsi (Tezliklə)',
  adBannerSlotDesc: 'Yalnız menyu və xəritə ekranları üçün nəzərdə tutulub. Oyun zamanı reklam göstərilmir.',
  shopTiles: 'Daşlar',
  shopTables: 'Masalar',
  shopEffects: 'Effektlər',
  shopAvatars: 'Avatarlar',
  shopCoins: 'Sikkələr',
  equipped: 'Seçilib',
  equip: 'Seç',
  buy: 'Al',
  owned: 'Alınıb',
  iapNoticeTitle: 'Rəsmi Mağaza Ödənişləri (Tezliklə)',
  iapNoticeDesc: 'iOS App Store və Google Play ödəniş sistemləri növbəti yeniləmədə qoşulacaq. Bütün əşyalar yalnız görünüş üçündür və oyunda üstünlük vermir.',
  restorePurchases: 'Alışları Bərpa Et',
  restorePurchasesNote: 'Növbəti yeniləmədə iOS və Android hesabınızdakı əvvəlki alışlar bərpa ediləcək.',
  rewardedAdTitle: 'Mükafatlı Video (Tezliklə)',
  rewardedAdDesc: 'İstəyə bağlı video izləyib +50 sikkə qazanmaq imkanı növbəti yeniləmədə açılacaq.',
  fairPlayNote: 'Ədalətli Oyun: Alışlar heç vaxt yarış üstünlüyü vermir.',
  soundLabel: 'Səs və Danışıq',
  musicLabel: 'Arxa Fon Musiqisi',
  musicVolumeLabel: 'Musiqi Səs Səviyyəsi',
  musicMuteToggle: 'Musiqini aç və ya bağla',
  vibrationLabel: 'Vibrasiya',
  numbersAidLabel: 'Kiçik Rəqəm Köməkçisi',
  highlightFreeLabel: 'Açıq Daşları Vurğula',
  languageLabel: 'Oyun Dili',
  dominiVoiceLabel: 'Domini Səsi (Qadın Səsi)',
  dominiVoiceTestBtn: 'Səsi Dinlə',
  statsTitle: 'Statistika',
  statsTotalPlayTime: 'Ümumi Oyun Müddəti',
  statsTotalStars: 'Qazanılan Ulduzlar',
  statsFastestWin: 'Ən Sürətli Qələbə',
  bonusLabel: 'Bonus',
  trapLabel: 'Tələ',
  bonusTimeMsg: '+12s Vaxt Bonusu!',
  bonusCoinMsg: '+25 Sikkə Bonusu!',
  bonusChainMsg: 'Zəncirvari Bonus Partlayışı!',
  trapTimeMsg: 'Tələ! -7s Vaxt İtirdin!',
  trapMixMsg: 'Tələ! Daşlar qarışdı!',
  legalTitle: 'Hüquqi Məlumat və Hesab',
  privacyPolicy: 'Məxfilik Siyasəti',
  privacyPolicyBody: 'Daş Ustası oyununda bütün irəliləyişiniz (sikkələr, mərhələ ulduzları və seçilmiş dizaynlar) yalnız cihazınızın yaddaşında saxlanılır. Şəxsi məlumatlar üçüncü tərəflərə ötürülmür və oyun internetsiz tam işləyir.',
  termsOfService: 'İstifadə Şərtləri',
  termsOfServiceBody: 'Oyun daxilində qazanılan sikkələr və bəzək əşyaları yalnız əyləncə məqsədi daşıyır. Rəsmi mağaza alışları gələcək yeniləmədə qiymətlər əvvəlcədən aydın göstərilməklə əlavə olunacaq.',
  deleteAccount: 'Hesab və Məlumatların Silinməsi',
  deleteAccountDesc: 'Cihazda saxlanılan bütün irəliləyişi, sikkələri, ulduzları və ayarları birdəfəlik silə bilərsiniz.',
  deleteAccountBtn: 'Bütün Məlumatları Sil',
  deleteAccountConfirm: 'Bütün oyun irəliləyişiniz və sikkələriniz sıfırlanacaq. Əminsiniz?',
  cancel: 'Ləğv Et',
  confirm: 'Təsdiqlə',
  dataDeletedToast: 'Bütün yerli məlumatlar silindi.',
  close: 'Bağla',
  levelNames: {
    level_1: 'Başlanğıc Meydanı',
    level_2: 'İçərişəhər Tağları',
    level_3: 'Qız Qalası',
    level_4: 'Xəzər Dalğası',
    level_5: 'Alov Qüllələri',
    level_6: 'Şəki Şəbəkəsi',
    level_7: 'Qobustan Qayaları',
    level_8: 'Xalça Naxışı',
    level_9: 'Şirvanşahlar Sarayı',
    level_10: 'Gəncə Qapısı',
    level_11: 'Xarıbülbül',
    level_12: 'Usta Taxtı',
    daily_challenge: 'Gündəlik Tapşırıq',
  },
  shopItems: {
    tile_ivory: { name: 'Klassik Fil Sümüyü', desc: 'Ənənəvi isti ağ domino daşları' },
    tile_obsidian: { name: 'Gecə Obsidiyanı', desc: 'Tünd qrafit üzərində qızılı nöqtələr' },
    tile_amber: { name: 'Kəhrəba Qızılı', desc: 'Bal rəngli parlaq mərmər səth' },
    tile_jade: { name: 'Zümrüd Çini', desc: 'Sərin yaşıl keramik daşlar' },
    table_emerald: { name: 'Xəzər Zümrüdü', desc: 'Dərin yaşıl mahud stolüstü örtük' },
    table_walnut: { name: 'Qoz Ağacı Məclisi', desc: 'İsti taxta naxışlı masa fonu' },
    table_indigo: { name: 'Bakı Gecəsi', desc: 'Sakit tünd göy məxmər fon' },
    table_terracotta: { name: 'Qala Həyəti', desc: 'Daş və isti gil tonları' },
    fx_classic: { name: 'Sadə Parıltı', desc: 'Təmiz və sürətli yoxolma effekti' },
    fx_gold: { name: 'Qızıl Qığılcım', desc: 'Cütləşmə zamanı isti qızılı dalğa' },
    fx_emerald: { name: 'Zümrüd Halqası', desc: 'Parlaq yaşıl enerji halqası' },
    fx_petal: { name: 'Naxış Partlayışı', desc: 'Rəngli həndəsi zərrəciklər' },
    avatar_1: { name: 'Mərmər Ustası', desc: 'Klassik qızılı nişan' },
    avatar_2: { name: 'Qala Qoruyucusu', desc: 'Tarixi daş qüllə rəmzi' },
    avatar_3: { name: 'Şəbəkə Sənətkarı', desc: 'Həndəsi naxış emblemi' },
    avatar_4: { name: 'Xəzər Kapitanı', desc: 'Dalğa və ulduz nişanı' },
  },
};

const en: Translations = {
  appTitle: 'Stone Master',
  appSubtitle: 'Domino Mahjong Puzzle',
  playNow: 'Play Now',
  continueLevel: 'Continue · Stage',
  levelMap: 'Stages',
  stageLabel: 'Stage',
  dailyChallenge: 'Daily Challenge',
  dailyRewards: 'Daily Rewards',
  shop: 'Shop',
  settings: 'Settings',
  score: 'Score',
  coins: 'Coins',
  combo: 'Combo',
  time: 'Time',
  movesLeft: 'Moves',
  tilesLeft: 'Tiles',
  hint: 'Hint',
  shuffle: 'Shuffle',
  undo: 'Undo',
  restart: 'Restart',
  pause: 'Pause',
  resume: 'Resume',
  backToMap: 'Stage Map',
  backToTitle: 'Title Screen',
  nextLevel: 'Next Stage',
  playAgain: 'Play Again',
  levelComplete: 'Stage Cleared!',
  levelFailed: 'Time Up',
  timeUp: 'The timer ran out. Try again!',
  mistakesLabel: 'Mistakes',
  mistakesLimitTitle: 'Mistake Limit Reached',
  mistakesLimitDesc: 'You made 3 wrong matches. Try again!',
  zoomIn: 'Zoom In',
  zoomOut: 'Zoom Out',
  zoomReset: 'Reset Zoom',
  noMovesTitle: 'No Moves Available',
  noMovesDesc: 'Shuffle the remaining tiles for free to keep playing.',
  shuffleFree: 'Shuffle Tiles',
  pausedTitle: 'Game Paused',
  rulesShort: 'Match identical uncovered domino tiles that have at least one free side.',
  controlsHint: 'Click or drag free tiles · P Pause · R Restart',
  notEnoughCoins: 'Not enough coins (25 coins required).',
  dailyCompleted: 'Today’s challenge cleared',
  dailyReady: 'Today’s board is ready',
  claimReward: 'Claim Reward',
  claimed: 'Claimed',
  dayLabel: 'Day',
  streakTitle: '7-Day Login Rewards',
  streakDesc: 'Check in daily to earn bonus coins for cosmetic themes.',
  offlineReady: 'Playable Offline',
  timedMode: 'Timed',
  classicMode: 'Relaxed',
  difficultyEasy: 'Easy',
  difficultyMedium: 'Medium',
  difficultyHard: 'Hard',
  difficultyMaster: 'Master',
  lockedStage: 'Complete previous stage first',
  starsLabel: 'Stars',
  bestScore: 'Best',
  futureModesTitle: 'Coming in Phase 2',
  weeklyTournament: 'Weekly Tournaments',
  weeklyTournamentDesc: 'Global leaderboards and weekly ranked brackets arrive in Phase 2.',
  friendsMultiplayer: 'Play with Friends',
  friendsMultiplayerDesc: 'Create a shared room, send an invite link, and race friends live.',
  phase2Badge: 'Phase 2',
  mpTitle: 'Shared Room · Play with Friends',
  mpSubtitle: 'Pick category, stage, and timer, send the link, and play simultaneously.',
  mpCreateTab: 'Create Room (50 Coins)',
  mpJoinTab: 'Join Room',
  mpPlayerName: 'Your Name',
  mpCategoryLabel: 'Category',
  mpCategoryAll: 'All',
  mpStageLabel: 'Select Stage',
  mpTimeLabel: 'Time Limit',
  mpCreateFeeInfo: 'Opening a room costs 50 coins. Joining via invite link is free.',
  mpCreateBtn: 'Create Room · 50 Coins',
  mpNotEnoughCoinsRoom: 'At least 50 coins are required to create a room.',
  mpJoinCodeLabel: 'Room Code',
  mpJoinCodePlaceholder: 'e.g. DM8K4P',
  mpJoinBtn: 'Join Room (Free)',
  mpRoomNotFound: 'No active room found with that code.',
  mpRoomCode: 'Room Code',
  mpInviteLink: 'Invite Link',
  mpCopyLink: 'Copy Link',
  mpCopied: 'Copied!',
  mpPlayersTitle: 'Players in Room',
  mpHostBadge: 'Host',
  mpReadyLabel: 'Ready',
  mpWaitingLabel: 'Waiting',
  mpReadyToggleBtn: 'Mark Ready',
  mpUnreadyToggleBtn: 'Waiting',
  mpStartMatchBtn: 'Start Match',
  mpLeaveRoomBtn: 'Leave Room',
  mpWaitingHostHint: 'Waiting for host to start the match...',
  mpShareHint: 'Send this link to friends — once joined, race on the exact same board.',
  mpLiveRaceTitle: 'Live Room Race',
  mpStatusPlaying: 'Playing',
  mpStatusWon: 'Finished',
  mpStatusLost: 'Defeated',
  mpLeaderboardTitle: 'Shared Room Standings',
  mpReturnToRoom: 'Return to Room',
  mpOfflineLabel: 'Offline',
  adBannerSlotTitle: 'Banner Ad Placement (Phase 2)',
  adBannerSlotDesc: 'Ad SDKs are reserved for menu and map screens only. Never shown during a level.',
  shopTiles: 'Tiles',
  shopTables: 'Tables',
  shopEffects: 'Effects',
  shopAvatars: 'Avatars',
  shopCoins: 'Coin Packs',
  equipped: 'Equipped',
  equip: 'Equip',
  buy: 'Buy',
  owned: 'Owned',
  iapNoticeTitle: 'Official Store Billing (Phase 2)',
  iapNoticeDesc: 'iOS App Store and Google Play purchases will integrate in Phase 2. Real purchases are not simulated in this prototype. All purchases are cosmetic only.',
  restorePurchases: 'Restore Purchases',
  restorePurchasesNote: 'Restores eligible iOS/Android store purchases in Phase 2.',
  rewardedAdTitle: 'Rewarded Video (Phase 2)',
  rewardedAdDesc: 'Optional rewarded ads (+50 coins shown upfront) will launch with the Ad SDK.',
  fairPlayNote: 'Fair Play: Paid items are purely cosmetic and never give an unfair advantage.',
  soundLabel: 'Sound Effects',
  musicLabel: 'Background Music',
  musicVolumeLabel: 'Music Volume',
  musicMuteToggle: 'Toggle background music',
  vibrationLabel: 'Vibration',
  numbersAidLabel: 'Corner Number Aid',
  highlightFreeLabel: 'Highlight Free Tiles',
  languageLabel: 'Language',
  dominiVoiceLabel: 'Domini Voice (Female)',
  dominiVoiceTestBtn: 'Test Voice',
  statsTitle: 'Statistics',
  statsTotalPlayTime: 'Total Play Time',
  statsTotalStars: 'Total Stars Earned',
  statsFastestWin: 'Fastest Victory',
  bonusLabel: 'Bonus',
  trapLabel: 'Trap',
  bonusTimeMsg: '+12s Time Bonus!',
  bonusCoinMsg: '+25 Coin Bonus!',
  bonusChainMsg: 'Chain Bonus Blast!',
  trapTimeMsg: 'Trap! -7s Time Lost!',
  trapMixMsg: 'Trap! Tiles Scrambled!',
  legalTitle: 'Legal & Account Data',
  privacyPolicy: 'Privacy Policy',
  privacyPolicyBody: 'In this Stone Master prototype, all game progress (coins, stage stars, and cosmetics) is stored locally on your device. No personal data is transmitted externally. Core gameplay works fully offline even if ad services are unavailable.',
  termsOfService: 'Terms of Service',
  termsOfServiceBody: 'In-game coins and cosmetic items are for entertainment only. Official in-app purchases in future updates will clearly display prices prior to confirmation.',
  deleteAccount: 'Account & Data Deletion',
  deleteAccountDesc: 'Permanently erase all locally saved progress, coins, stars, and settings.',
  deleteAccountBtn: 'Delete All Data',
  deleteAccountConfirm: 'All progress and coins will be reset. Continue?',
  cancel: 'Cancel',
  confirm: 'Confirm',
  dataDeletedToast: 'All local data has been deleted.',
  close: 'Close',
  levelNames: {
    level_1: 'Starter Courtyard',
    level_2: 'Old City Arches',
    level_3: 'Maiden Tower',
    level_4: 'Caspian Wave',
    level_5: 'Flame Towers',
    level_6: 'Sheki Lattice',
    level_7: 'Gobustan Rocks',
    level_8: 'Carpet Motif',
    level_9: 'Shirvanshahs Palace',
    level_10: 'Ganja Gate',
    level_11: 'Khari Bulbul',
    level_12: 'Master’s Throne',
    daily_challenge: 'Daily Challenge',
  },
  shopItems: {
    tile_ivory: { name: 'Classic Ivory', desc: 'Warm traditional ivory dominoes' },
    tile_obsidian: { name: 'Midnight Obsidian', desc: 'Deep graphite tiles with gold pips' },
    tile_amber: { name: 'Amber Marble', desc: 'Honey-toned polished stone' },
    tile_jade: { name: 'Jade Porcelain', desc: 'Cool emerald ceramic finish' },
    table_emerald: { name: 'Caspian Emerald', desc: 'Rich green felt tabletop' },
    table_walnut: { name: 'Walnut Majlis', desc: 'Warm carved wood surface' },
    table_indigo: { name: 'Baku Night', desc: 'Deep velvet indigo cloth' },
    table_terracotta: { name: 'Fortress Courtyard', desc: 'Warm limestone and clay tones' },
    fx_classic: { name: 'Clean Spark', desc: 'Crisp minimalist match pop' },
    fx_gold: { name: 'Golden Flare', desc: 'Warm saffron shimmer burst' },
    fx_emerald: { name: 'Emerald Ring', desc: 'Vibrant jade ripple pulse' },
    fx_petal: { name: 'Mosaic Burst', desc: 'Geometric celebration particles' },
    avatar_1: { name: 'Master Crafter', desc: 'Classic golden emblem' },
    avatar_2: { name: 'Tower Guardian', desc: 'Stone fortress crest' },
    avatar_3: { name: 'Lattice Artisan', desc: 'Geometric shabaka crest' },
    avatar_4: { name: 'Caspian Voyager', desc: 'Wave and compass crest' },
  },
};

const tr: Translations = {
  ...en,
  appTitle: 'Taş Ustası',
  appSubtitle: 'Domino Mahjong Bulmacası',
  playNow: 'Oyuna Başla',
  continueLevel: 'Devam Et · Aşama',
  levelMap: 'Aşamalar',
  stageLabel: 'Aşama',
  dailyChallenge: 'Günlük Görev',
  dailyRewards: 'Günlük Ödül',
  shop: 'Mağaza',
  settings: 'Ayarlar',
  score: 'Puan',
  coins: 'Altın',
  combo: 'Kombo',
  time: 'Süre',
  movesLeft: 'Hamle',
  tilesLeft: 'Taş',
  hint: 'İpucu',
  shuffle: 'Karıştır',
  undo: 'Geri Al',
  restart: 'Yeniden',
  pause: 'Duraklat',
  resume: 'Devam Et',
  backToMap: 'Aşama Haritası',
  backToTitle: 'Ana Ekran',
  nextLevel: 'Sonraki Aşama',
  playAgain: 'Tekrar Oyna',
  levelComplete: 'Aşama Tamamlandı!',
  levelFailed: 'Süre Doldu',
  mistakesLabel: 'Hata',
  mistakesLimitTitle: '3 Hata Limiti Doldu',
  mistakesLimitDesc: '3 yanlış eşleştirme yaptığınız için aşama bitti. Tekrar deneyin!',
  zoomIn: 'Yakınlaştır',
  zoomOut: 'Uzaklaştır',
  zoomReset: 'Yakınlaştırmayı Sıfırla',
  noMovesTitle: 'Uygun Hamle Kalmadı',
  noMovesDesc: 'Kalan taşları ücretsiz karıştırarak oyuna devam edebilirsiniz.',
  shuffleFree: 'Taşları Karıştır',
  pausedTitle: 'Oyun Duraklatıldı',
  rulesShort: 'Üstü açık ve en az bir yanı boş olan eş domino taşlarını eşleştirin.',
  soundLabel: 'Ses Efektleri',
  musicLabel: 'Arka Plan Müziği',
  musicVolumeLabel: 'Müzik Ses Düzeyi',
  musicMuteToggle: 'Müziği aç veya kapat',
  vibrationLabel: 'Titreşim',
  numbersAidLabel: 'Küçük Sayı Yardımı',
  highlightFreeLabel: 'Açık Taşları Vurgula',
  languageLabel: 'Oyun Dili',
  dominiVoiceLabel: 'Domini Sesi (Kadın)',
  dominiVoiceTestBtn: 'Sesi Dinle',
  statsTitle: 'İstatistikler',
  statsTotalPlayTime: 'Toplam Oyun Süresi',
  statsTotalStars: 'Kazanılan Yıldızlar',
  statsFastestWin: 'En Hızlı Zafer',
  bonusLabel: 'Bonus',
  trapLabel: 'Tuzak',
  bonusTimeMsg: '+12s Süre Bonusu!',
  bonusCoinMsg: '+25 Altın Bonusu!',
  bonusChainMsg: 'Zincir Bonus Patlaması!',
  trapTimeMsg: 'Tuzak! -7s Süre Kaybı!',
  trapMixMsg: 'Tuzak! Taşlar Karıştı!',
  friendsMultiplayer: 'Arkadaşlarla Oda',
  friendsMultiplayerDesc: 'Ortak oda kur, link gönder ve arkadaşlarınla aynı anda yarış.',
  mpTitle: 'Ortak Oda · Arkadaşlarla Oyna',
  mpSubtitle: 'Kategori, aşama ve süre seç, link gönder ve aynı anda oyna.',
  mpCreateTab: 'Oda Aç (50 Altın)',
  mpJoinTab: 'Odaya Katıl',
  mpPlayerName: 'Oyuncu Adın',
  mpCategoryLabel: 'Kategori',
  mpCategoryAll: 'Tümü',
  mpStageLabel: 'Aşama Seçimi',
  mpTimeLabel: 'Süre Seçimi',
  mpCreateFeeInfo: 'Oda açmak 50 altındır. Davet linkiyle katılmak ücretsizdir.',
  mpCreateBtn: 'Oda Aç · 50 Altın',
  mpNotEnoughCoinsRoom: 'Oda açmak için en az 50 altın gerekir.',
  mpJoinCodeLabel: 'Oda Kodu',
  mpJoinCodePlaceholder: 'Örn: DM8K4P',
  mpJoinBtn: 'Odaya Katıl (Ücretsiz)',
  mpRoomNotFound: 'Bu kodla aktif bir oda bulunamadı.',
  mpRoomCode: 'Oda Kodu',
  mpInviteLink: 'Davet Linki',
  mpCopyLink: 'Linki Kopyala',
  mpCopied: 'Kopyalandı!',
  mpPlayersTitle: 'Odadaki Oyuncular',
  mpHostBadge: 'Oda Sahibi',
  mpReadyLabel: 'Hazır',
  mpWaitingLabel: 'Bekliyor',
  mpReadyToggleBtn: 'Hazırım',
  mpUnreadyToggleBtn: 'Bekliyorum',
  mpStartMatchBtn: 'Oyunu Başlat',
  mpLeaveRoomBtn: 'Odadan Çık',
  mpWaitingHostHint: 'Oda sahibinin oyunu başlatması bekleniyor...',
  mpShareHint: 'Bu linki arkadaşlarına gönder — katıldıklarında aynı tahtada yarışın.',
  mpLiveRaceTitle: 'Canlı Oda Yarışı',
  mpStatusPlaying: 'Oynuyor',
  mpStatusWon: 'Bitirdi',
  mpStatusLost: 'Kaybetti',
  mpLeaderboardTitle: 'Ortak Oda Sonuçları',
  mpReturnToRoom: 'Odaya Dön',
  mpOfflineLabel: 'Çevrimdışı',
  close: 'Kapat',
};

const ru: Translations = {
  ...en,
  appTitle: 'Мастер Камня',
  appSubtitle: 'Домино Маджонг',
  playNow: 'Играть',
  continueLevel: 'Продолжить · Этап',
  levelMap: 'Карта этапов',
  stageLabel: 'Этап',
  dailyChallenge: 'Ежедневный вызов',
  dailyRewards: 'Награды за вход',
  shop: 'Магазин',
  settings: 'Настройки',
  score: 'Счёт',
  coins: 'Монеты',
  combo: 'Комбо',
  time: 'Время',
  movesLeft: 'Ходы',
  tilesLeft: 'Кости',
  hint: 'Подсказка',
  shuffle: 'Перемешать',
  undo: 'Отмена',
  restart: 'Заново',
  pause: 'Пауза',
  resume: 'Продолжить',
  backToMap: 'Карта этапов',
  backToTitle: 'Главный экран',
  nextLevel: 'Следующий этап',
  playAgain: 'Играть снова',
  levelComplete: 'Этап пройден!',
  levelFailed: 'Время вышло',
  mistakesLabel: 'Ошибки',
  mistakesLimitTitle: 'Лимит 3 ошибки',
  mistakesLimitDesc: 'Вы допустили 3 неверных совпадения. Попробуйте ещё раз!',
  zoomIn: 'Приблизить',
  zoomOut: 'Отдалить',
  zoomReset: 'Сбросить масштаб',
  noMovesTitle: 'Нет доступных ходов',
  noMovesDesc: 'Перемешайте оставшиеся кости бесплатно, чтобы продолжить.',
  shuffleFree: 'Перемешать кости',
  pausedTitle: 'Пауза',
  rulesShort: 'Соединяйте одинаковые открытые кости домино хотя бы с одной свободной стороной.',
  soundLabel: 'Звук',
  musicLabel: 'Фоновая музыка',
  musicVolumeLabel: 'Громкость музыки',
  musicMuteToggle: 'Включить или выключить музыку',
  vibrationLabel: 'Вибрация',
  numbersAidLabel: 'Подсказка цифр',
  highlightFreeLabel: 'Подсвечивать доступные',
  languageLabel: 'Язык игры',
  dominiVoiceLabel: 'Голос Домини (Женский)',
  dominiVoiceTestBtn: 'Прослушать',
  statsTitle: 'Статистика',
  statsTotalPlayTime: 'Общее время игры',
  statsTotalStars: 'Всего звёзд',
  statsFastestWin: 'Быстрейшая победа',
  bonusLabel: 'Бонус',
  trapLabel: 'Ловушка',
  bonusTimeMsg: '+12с Бонус Времени!',
  bonusCoinMsg: '+25 Бонус Монет!',
  bonusChainMsg: 'Цепной Бонус-Взрыв!',
  trapTimeMsg: 'Ловушка! -7с Времени!',
  trapMixMsg: 'Ловушка! Кости перемешаны!',
  friendsMultiplayer: 'Комната с друзьями',
  friendsMultiplayerDesc: 'Создайте общую комнату, отправьте ссылку и играйте одновременно.',
  mpTitle: 'Общая комната · С друзьями',
  mpSubtitle: 'Выберите категорию, этап и таймер, отправьте ссылку и играйте вместе.',
  mpCreateTab: 'Создать (50 монет)',
  mpJoinTab: 'Войти в комнату',
  mpPlayerName: 'Ваше имя',
  mpCategoryLabel: 'Категория',
  mpCategoryAll: 'Все',
  mpStageLabel: 'Выбор этапа',
  mpTimeLabel: 'Выбор времени',
  mpCreateFeeInfo: 'Открытие комнаты стоит 50 монет. Вход по ссылке бесплатный.',
  mpCreateBtn: 'Открыть комнату · 50 монет',
  mpNotEnoughCoinsRoom: 'Для создания комнаты нужно минимум 50 монет.',
  mpJoinCodeLabel: 'Код комнаты',
  mpJoinCodePlaceholder: 'Напр: DM8K4P',
  mpJoinBtn: 'Войти (Бесплатно)',
  mpRoomNotFound: 'Активная комната с таким кодом не найдена.',
  mpRoomCode: 'Код комнаты',
  mpInviteLink: 'Ссылка-приглашение',
  mpCopyLink: 'Копировать',
  mpCopied: 'Скопировано!',
  mpPlayersTitle: 'Игроки в комнате',
  mpHostBadge: 'Создатель',
  mpReadyLabel: 'Готов',
  mpWaitingLabel: 'Ожидание',
  mpReadyToggleBtn: 'Готов',
  mpUnreadyToggleBtn: 'Ожидаю',
  mpStartMatchBtn: 'Начать игру',
  mpLeaveRoomBtn: 'Покинуть',
  mpWaitingHostHint: 'Ожидание запуска игры создателем комнаты...',
  mpShareHint: 'Отправьте ссылку друзьям — после входа играйте на одной доске.',
  mpLiveRaceTitle: 'Гонка в комнате',
  mpStatusPlaying: 'Играет',
  mpStatusWon: 'Финиш',
  mpStatusLost: 'Проиграл',
  mpLeaderboardTitle: 'Результаты комнаты',
  mpReturnToRoom: 'В комнату',
  mpOfflineLabel: 'Не в сети',
  close: 'Закрыть',
};

export const TRANSLATIONS: Record<LanguageCode, Translations> = {
  az,
  en,
  tr,
  ru,
};
