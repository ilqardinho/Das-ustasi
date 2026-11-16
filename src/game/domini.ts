import { LanguageCode, TileSpecialType } from './types';

export type DominiMood = 'happy' | 'hype' | 'endgame' | 'oops' | 'warning' | 'sad';

export interface DominiEvent {
  id: number;
  mood: DominiMood;
  message: string;
}

const MESSAGES: Record<
  LanguageCode,
  {
    firstMatch: string[];
    combo2: string[];
    combo3: string[];
    combo4Plus: string[];
    endgame8: string[];
    endgame4: string[];
    finalPair: string[];
    shuffle: string[];
    oops: string[];
    tapGreet: string[];
    bonus: string[];
    trap: string[];
  }
> = {
  az: {
    firstMatch: ['Əlaaa!', 'Qəşəəəng!'],
    combo2: ['Supeeeerr!', 'Bax beləə!', 'Əlaaa!'],
    combo3: ['Möhtəşəəəm!', 'Braaavoo!', 'Supeeeerr!'],
    combo4Plus: ['Əfsaaanə!', 'Halaldıı!', 'Boom!'],
    endgame8: ['Az qaldıı!', 'Haydıı!'],
    endgame4: ['Sonuncu!', 'Bax beləə!'],
    finalPair: ['Bəliii!', 'Bitiiir!'],
    shuffle: ['Qarışdı!', 'Yenidən!'],
    oops: ['Ayyy!', 'Heyiiif!', 'Tüüüh!'],
    tapGreet: ['Salaaam!', 'Haydıı!'],
    bonus: ['Bonuuus!', 'Bombadıı!', 'Qəniməəət!'],
    trap: ['Tələəə!', 'Vayyy!', 'Ayyy!'],
  },
  en: {
    firstMatch: ['Gooood!', 'Sweeeet!'],
    combo2: ['Supeeeerr!', 'Niice!', 'Boom!'],
    combo3: ['Amaaazing!', 'Braaavoo!', 'Supeeeerr!'],
    combo4Plus: ['Legeend!', 'Unreaaal!', 'Yeeesss!'],
    endgame8: ['Almoost!', "C'mon!"],
    endgame4: ['Clooose!', 'Finish!'],
    finalPair: ['Yeeesss!', 'Laaast!'],
    shuffle: ['Shuffled!', 'Fresh!'],
    oops: ['Ohhh no!', 'Aaah!', 'Oops!'],
    tapGreet: ['Heyyy!', 'Let’s go!'],
    bonus: ['Bonuuus!', 'Jackpooot!', 'Boooost!'],
    trap: ['Traaap!', 'Uh-ooh!', 'Yikes!'],
  },
  tr: {
    firstMatch: ['Harikaaa!', 'Güzeeel!'],
    combo2: ['Süpeeeer!', 'İşte buu!', 'Harikaaa!'],
    combo3: ['Muhteeşem!', 'Braaavoo!', 'Süpeeeer!'],
    combo4Plus: ['Efsaaane!', 'Helaaal!', 'Boom!'],
    endgame8: ['Az kaldıı!', 'Haydiii!'],
    endgame4: ['Sonlaaar!', 'İşte buu!'],
    finalPair: ['Eveeeet!', 'Bitiiir!'],
    shuffle: ['Karıştı!', 'Yeniden!'],
    oops: ['Vaaay!', 'Tüüüh!', 'Ayyy!'],
    tapGreet: ['Selaaam!', 'Haydiii!'],
    bonus: ['Bonuuus!', 'Harikaaa!', 'Süpeeeer!'],
    trap: ['Tuzaaak!', 'Vaaay!', 'Ayyy!'],
  },
  ru: {
    firstMatch: ['Клааасс!', 'Отличноо!'],
    combo2: ['Супееер!', 'Вот тааак!', 'Клааасс!'],
    combo3: ['Браааво!', 'Огооо!', 'Супееер!'],
    combo4Plus: ['Легеенда!', 'Мооощь!', 'Даааа!'],
    endgame8: ['Почтиии!', 'Давааай!'],
    endgame4: ['Фииниш!', 'Вот тааак!'],
    finalPair: ['Даааа!', 'Жмиии!'],
    shuffle: ['Свежааак!', 'Снова!'],
    oops: ['Эээх!', 'Увыыы!', 'Оййй!'],
    tapGreet: ['Привееет!', 'Давааай!'],
    bonus: ['Бонууус!', 'Супееер!', 'Клааасс!'],
    trap: ['Ловуушка!', 'Эээх!', 'Оййй!'],
  },
};

function pickBySeed(list: string[], seed: number): string {
  return list[Math.abs(seed) % list.length];
}

export function getDominiMatchReaction(params: {
  language: LanguageCode;
  comboCount: number;
  remainingTiles: number;
  matchesSoFar: number;
}): { mood: DominiMood; message: string } | null {
  const { language, comboCount, remainingTiles, matchesSoFar } = params;
  const dict = MESSAGES[language] ?? MESSAGES.az;

  if (remainingTiles === 0) {
    return null;
  }

  // Endgame priority near the finish!
  if (remainingTiles === 2) {
    return {
      mood: 'endgame',
      message: pickBySeed(dict.finalPair, matchesSoFar),
    };
  }
  if (remainingTiles <= 4) {
    return {
      mood: 'endgame',
      message: pickBySeed(dict.endgame4, matchesSoFar),
    };
  }
  if (remainingTiles <= 8 && (remainingTiles === 8 || remainingTiles === 6)) {
    return {
      mood: 'endgame',
      message: pickBySeed(dict.endgame8, matchesSoFar),
    };
  }

  // Combo excitement
  if (comboCount >= 4) {
    return {
      mood: 'hype',
      message: pickBySeed(dict.combo4Plus, matchesSoFar + comboCount),
    };
  }
  if (comboCount === 3) {
    return {
      mood: 'hype',
      message: pickBySeed(dict.combo3, matchesSoFar),
    };
  }
  if (comboCount === 2) {
    return {
      mood: 'happy',
      message: pickBySeed(dict.combo2, matchesSoFar),
    };
  }

  // First match or periodic encouragement
  if (matchesSoFar === 1 || matchesSoFar % 3 === 0) {
    return {
      mood: 'happy',
      message: pickBySeed(dict.firstMatch, matchesSoFar),
    };
  }

  return null;
}

export function getDominiSpecialReaction(
  language: LanguageCode,
  special: TileSpecialType,
  seed: number
): { mood: DominiMood; message: string } {
  const dict = MESSAGES[language] ?? MESSAGES.az;
  if (special === 'trap_time' || special === 'trap_mix') {
    return { mood: 'oops', message: pickBySeed(dict.trap, seed) };
  }
  return { mood: 'hype', message: pickBySeed(dict.bonus, seed) };
}

export function getDominiUtilityReaction(
  language: LanguageCode,
  kind: 'shuffle' | 'oops' | 'tap',
  seed: number
): { mood: DominiMood; message: string } {
  const dict = MESSAGES[language] ?? MESSAGES.az;
  if (kind === 'shuffle') {
    return { mood: 'happy', message: pickBySeed(dict.shuffle, seed) };
  }
  if (kind === 'oops') {
    return { mood: 'oops', message: pickBySeed(dict.oops, seed) };
  }
  return { mood: 'happy', message: pickBySeed(dict.tapGreet, seed) };
}

export function getDominiMistakeWarning(
  language: LanguageCode,
  mistakes: number,
  maxMistakes: number
): { mood: DominiMood; message: string } {
  const remaining = Math.max(0, maxMistakes - mistakes);
  const isFinalChance = remaining <= 1;

  if (language === 'en') {
    return isFinalChance
      ? { mood: 'warning', message: 'Ouch! Last 1 chance!' }
      : { mood: 'oops', message: `Oops! Last ${remaining} chances!` };
  }
  if (language === 'tr') {
    return isFinalChance
      ? { mood: 'warning', message: 'Tüh! Son 1 şans!' }
      : { mood: 'oops', message: `Ah! Son ${remaining} şans!` };
  }
  if (language === 'ru') {
    return isFinalChance
      ? { mood: 'warning', message: 'Увы! Последний 1 шанс!' }
      : { mood: 'oops', message: `Эх! Осталось ${remaining} шанса!` };
  }
  return isFinalChance
    ? { mood: 'warning', message: 'Heyif! Son 1 şans!' }
    : { mood: 'oops', message: `Ayyy! Son ${remaining} şans!` };
}

export function getDominiTimeWarning(language: LanguageCode): {
  mood: DominiMood;
  message: string;
} {
  if (language === 'en') {
    return { mood: 'warning', message: 'Hurry!!' };
  }
  if (language === 'tr') {
    return { mood: 'warning', message: 'Acele et!!' };
  }
  if (language === 'ru') {
    return { mood: 'warning', message: 'Быстрее!!' };
  }
  return { mood: 'warning', message: 'Tələs!!' };
}

const SPOKEN_OVERRIDES: Record<string, string> = {
  'Əlaaa!': 'Əla!',
  'Qəşəəəng!': 'Qəşəng!',
  'Supeeeerr!': 'Super!',
  'Bax beləə!': 'Bax belə!',
  'Möhtəşəəəm!': 'Möhtəşəm!',
  'Braaavoo!': 'Bravo!',
  'Əfsaaanə!': 'Əfsanə!',
  'Halaldıı!': 'Halaldı!',
  'Az qaldıı!': 'Az qaldı!',
  'Haydıı!': 'Haydı!',
  'Bəliii!': 'Bəli!',
  'Bitiiir!': 'Bitir!',
  'Ayyy!': 'Ay!',
  'Heyiiif!': 'Heyif!',
  'Tüüüh!': 'Tüh!',
  'Salaaam!': 'Salam!',
  'Bonuuus!': 'Bonus!',
  'Bombadıı!': 'Bombadı!',
  'Qəniməəət!': 'Qənimət!',
  'Tələəə!': 'Tələ!',
  'Vayyy!': 'Vay!',
  'Tələs!!': 'Tələs!',
  'Gooood!': 'Good!',
  'Sweeeet!': 'Sweet!',
  'Niice!': 'Nice!',
  'Amaaazing!': 'Amazing!',
  'Legeend!': 'Legend!',
  'Unreaaal!': 'Unreal!',
  'Yeeesss!': 'Yes!',
  'Almoost!': 'Almost!',
  'Clooose!': 'Close!',
  'Laaast!': 'Last!',
  'Ohhh no!': 'Oh no!',
  'Aaah!': 'Ah!',
  'Heyyy!': 'Hey!',
  'Jackpooot!': 'Jackpot!',
  'Boooost!': 'Boost!',
  'Traaap!': 'Trap!',
  'Uh-ooh!': 'Uh-oh!',
  'Hurry!!': 'Hurry!',
  'Harikaaa!': 'Harika!',
  'Güzeeel!': 'Güzel!',
  'Süpeeeer!': 'Süper!',
  'İşte buu!': 'İşte bu!',
  'Muhteeşem!': 'Muhteşem!',
  'Efsaaane!': 'Efsane!',
  'Helaaal!': 'Helal!',
  'Az kaldıı!': 'Az kaldı!',
  'Haydiii!': 'Haydi!',
  'Sonlaaar!': 'Sonlar!',
  'Eveeeet!': 'Evet!',
  'Vaaay!': 'Vay!',
  'Selaaam!': 'Selam!',
  'Tuzaaak!': 'Tuzak!',
  'Acele et!!': 'Acele et!',
  'Клааасс!': 'Класс!',
  'Отличноо!': 'Отлично!',
  'Супееер!': 'Супер!',
  'Вот тааак!': 'Вот так!',
  'Браааво!': 'Браво!',
  'Огооо!': 'Ого!',
  'Легеенда!': 'Легенда!',
  'Мооощь!': 'Мощь!',
  'Даааа!': 'Да!',
  'Почтиии!': 'Почти!',
  'Давааай!': 'Давай!',
  'Фииниш!': 'Финиш!',
  'Жмиии!': 'Жми!',
  'Свежааак!': 'Свежак!',
  'Эээх!': 'Эх!',
  'Увыыы!': 'Увы!',
  'Оййй!': 'Ой!',
  'Привееет!': 'Привет!',
  'Бонууус!': 'Бонус!',
  'Ловуушка!': 'Ловушка!',
  'Быстрее!!': 'Быстрее!',
};

/**
 * Normalizes elongated expressive UI exclamations (e.g. "Qəşəəəng!", "Tələs!!")
 * into clean orthographic words so TTS never stutters or spells out repeated letters.
 */
export function getSpokenDominiText(message: string, language: LanguageCode): string {
  const trimmed = message.trim();
  if (!trimmed) return '';
  const mapped = SPOKEN_OVERRIDES[trimmed];
  if (mapped) return mapped;

  let cleaned = trimmed.replace(/!{2,}/g, '!').replace(/\s+/g, ' ');
  if (language !== 'en') {
    // Collapse 3+ consecutive identical characters to 1 in phonetic languages (az/tr/ru)
    cleaned = cleaned.replace(/([\p{L}])\1{2,}/gu, '$1');
  }
  return cleaned;
}

export function getDominiDefeatMessage(language: LanguageCode): {
  mood: DominiMood;
  message: string;
} {
  if (language === 'en') {
    return { mood: 'sad', message: 'You lost! Try again!' };
  }
  if (language === 'tr') {
    return { mood: 'sad', message: 'Kaybettin! Bir daha dene!' };
  }
  if (language === 'ru') {
    return { mood: 'sad', message: 'Проигрыш! Попробуй ещё раз!' };
  }
  return { mood: 'sad', message: 'Uduzdun! Bir də yoxla!' };
}

export function getDominiMenuGreeting(language: LanguageCode): {
  mood: DominiMood;
  message: string;
} {
  if (language === 'en') {
    return { mood: 'happy', message: 'Hey Master! Ready to clear the board?' };
  }
  if (language === 'tr') {
    return { mood: 'happy', message: 'Selam Usta! Taşları eşleştirmeye hazır mısın?' };
  }
  if (language === 'ru') {
    return { mood: 'happy', message: 'Привет, Мастер! Готов к новой партии?' };
  }
  return { mood: 'happy', message: 'Salam, Usta! Oyuna başlamağa hazırsan?' };
}

export function getDominiVoiceTestMessage(language: LanguageCode): {
  mood: DominiMood;
  message: string;
} {
  if (language === 'en') {
    return { mood: 'happy', message: 'Hi, I am Domini! My voice is clear and ready.' };
  }
  if (language === 'tr') {
    return { mood: 'happy', message: 'Merhaba, ben Domini! Sesim net ve hazır.' };
  }
  if (language === 'ru') {
    return { mood: 'happy', message: 'Привет, я Домини! Голос звучит чисто и чётко.' };
  }
  return { mood: 'happy', message: 'Salam! Mən Dominiyəm, səsim aydın və təmiz gəlir.' };
}

export interface DominiPrewarmEntry {
  mood: DominiMood;
  message: string;
}

/**
 * Returns prioritized unique Domini lines for a language so they can be
 * pre-fetched and decoded into memory for zero-latency real-time playback.
 */
export function getAllDominiPrewarmEntries(
  language: LanguageCode,
  maxMistakes = 3
): DominiPrewarmEntry[] {
  const dict = MESSAGES[language] ?? MESSAGES.az;
  const raw: DominiPrewarmEntry[] = [];

  // Highest priority: menu greeting, first match, 1st & 2nd mistake warnings, bonuses/traps, early combos
  raw.push(getDominiMenuGreeting(language));
  raw.push(getDominiVoiceTestMessage(language));
  if (dict.firstMatch[0]) raw.push({ mood: 'happy', message: dict.firstMatch[0] });
  if (dict.bonus[0]) raw.push({ mood: 'hype', message: dict.bonus[0] });
  if (dict.trap[0]) raw.push({ mood: 'oops', message: dict.trap[0] });
  for (let m = 1; m < maxMistakes; m++) {
    raw.push(getDominiMistakeWarning(language, m, maxMistakes));
  }
  raw.push(getDominiTimeWarning(language));
  raw.push(getDominiDefeatMessage(language));
  if (dict.combo2[0]) raw.push({ mood: 'happy', message: dict.combo2[0] });
  if (dict.combo3[0]) raw.push({ mood: 'hype', message: dict.combo3[0] });
  if (dict.shuffle[0]) raw.push({ mood: 'happy', message: dict.shuffle[0] });

  // Remaining variations and endgame phrases
  dict.firstMatch.slice(1).forEach((message) => raw.push({ mood: 'happy', message }));
  dict.bonus.slice(1).forEach((message) => raw.push({ mood: 'hype', message }));
  dict.trap.slice(1).forEach((message) => raw.push({ mood: 'oops', message }));
  dict.combo2.slice(1).forEach((message) => raw.push({ mood: 'happy', message }));
  dict.combo3.slice(1).forEach((message) => raw.push({ mood: 'hype', message }));
  dict.combo4Plus.forEach((message) => raw.push({ mood: 'hype', message }));
  dict.endgame8.forEach((message) => raw.push({ mood: 'endgame', message }));
  dict.endgame4.forEach((message) => raw.push({ mood: 'endgame', message }));
  dict.finalPair.forEach((message) => raw.push({ mood: 'endgame', message }));
  dict.shuffle.slice(1).forEach((message) => raw.push({ mood: 'happy', message }));
  dict.tapGreet.forEach((message) => raw.push({ mood: 'happy', message }));

  const seen = new Set<string>();
  return raw.filter((entry) => {
    const key = `${entry.mood}:${entry.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
