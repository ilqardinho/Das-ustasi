import { DominiMood, getAllDominiPrewarmEntries, getSpokenDominiText } from '../game/domini';
import { LanguageCode } from '../game/types';
import { soundEngine } from './audio';

const decodedBufferCache = new Map<string, AudioBuffer>();
const inflightPrewarm = new Set<string>();

let activeVoiceSources: AudioBufferSourceNode[] = [];
let activeStreamAbort: AbortController | null = null;
let serverCooldownUntil = 0;
let speakRequestToken = 0;
let cachedVoices: SpeechSynthesisVoice[] = [];

function refreshVoices() {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  try {
    cachedVoices = window.speechSynthesis.getVoices();
  } catch {
    cachedVoices = [];
  }
}

if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  refreshVoices();
  window.speechSynthesis.addEventListener?.('voiceschanged', refreshVoices);
}

const MALE_VOICE_HINT = /(male|erkek|tolga|mehmet|ahmet|kemal|yuri|pavel|dmitry|alex|daniel|david|mark|george|ryan|guy)/i;
const FEMALE_VOICE_HINT = /(female|qadin|kadın|yelda|emel|filiz|milena|irina|katya|samantha|victoria|zira|karen|susan|aria|jenny)/i;

function pickBestSpeechVoice(language: LanguageCode): {
  voice: SpeechSynthesisVoice | null;
  langTag: string;
} {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return { voice: null, langTag: 'az-AZ' };
  }

  const voices = cachedVoices.length > 0 ? cachedVoices : window.speechSynthesis.getVoices();
  const desired =
    language === 'en'
      ? ['en-US', 'en-GB', 'en']
      : language === 'tr'
      ? ['tr-TR', 'tr']
      : language === 'ru'
      ? ['ru-RU', 'ru']
      : ['az-AZ', 'az', 'tr-TR', 'tr'];

  for (const prefix of desired) {
    const candidates = voices.filter((v) =>
      v.lang.toLowerCase().startsWith(prefix.toLowerCase())
    );
    if (candidates.length === 0) continue;

    const explicitFemale = candidates.find((v) => FEMALE_VOICE_HINT.test(v.name));
    if (explicitFemale) return { voice: explicitFemale, langTag: explicitFemale.lang };

    const nonMale = candidates.find((v) => !MALE_VOICE_HINT.test(v.name));
    if (nonMale) return { voice: nonMale, langTag: nonMale.lang };

    // Never fall back to a known male voice when enforcing a unified female voice for Azerbaijani
    if (language !== 'az') {
      return { voice: candidates[0], langTag: candidates[0].lang };
    }
  }

  const fallbackTag =
    language === 'en' ? 'en-US' : language === 'tr' ? 'tr-TR' : language === 'ru' ? 'ru-RU' : 'az-AZ';
  return { voice: null, langTag: fallbackTag };
}

function speakWithNativeFallback(text: string, language: LanguageCode, mood: DominiMood) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  try {
    const { voice, langTag } = pickBestSpeechVoice(language);
    if (language === 'az' && !voice) {
      return;
    }

    window.speechSynthesis.cancel();
    const cleaned = text.replace(/·/g, ', ').replace(/\s+/g, ' ').trim();
    if (!cleaned) return;

    const utterance = new SpeechSynthesisUtterance(cleaned);
    if (voice) utterance.voice = voice;
    utterance.lang = langTag;
    utterance.volume = 0.92;
    utterance.rate = mood === 'warning' ? 1.24 : mood === 'sad' ? 0.98 : 1.15;
    utterance.pitch = mood === 'sad' ? 0.96 : 1.06;

    window.speechSynthesis.speak(utterance);
  } catch {
    // Ignore speech synthesis errors on restricted platforms
  }
}

export function stopDominiVoice() {
  speakRequestToken++;
  if (activeStreamAbort) {
    try {
      activeStreamAbort.abort();
    } catch {
      // Ignore abort errors
    }
    activeStreamAbort = null;
  }
  for (const src of activeVoiceSources) {
    try {
      src.stop();
      src.disconnect();
    } catch {
      // Ignore cleanup errors
    }
  }
  activeVoiceSources = [];

  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      // Ignore cleanup errors
    }
  }
}

export async function prewarmDominiVoices(
  language: LanguageCode,
  maxMistakes = 3
): Promise<void> {
  if (typeof window === 'undefined') return;
  if (Date.now() < serverCooldownUntil) return;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return;

  const priorityEntries = getAllDominiPrewarmEntries(language, maxMistakes).slice(0, 10);
  const queue = priorityEntries.filter((entry) => {
    const spoken = getSpokenDominiText(entry.message, language);
    const key = `v8:Kore:${language}:${entry.mood}:${spoken}`;
    return !decodedBufferCache.has(key) && !inflightPrewarm.has(key);
  });

  const worker = async () => {
    while (queue.length > 0) {
      if (Date.now() < serverCooldownUntil) return;
      const entry = queue.shift();
      if (!entry) return;
      const spoken = getSpokenDominiText(entry.message, language);
      const key = `v8:Kore:${language}:${entry.mood}:${spoken}`;
      if (decodedBufferCache.has(key) || inflightPrewarm.has(key)) continue;

      inflightPrewarm.add(key);
      try {
        const res = await fetch('/api/tts/stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: spoken, language, mood: entry.mood }),
        });
        if (!res.ok || res.headers.get('X-TTS-Available') === 'false') {
          if (res.headers.get('X-TTS-Reason')?.includes('429')) {
            serverCooldownUntil = Date.now() + 45_000;
          }
          continue;
        }
        const ab = await res.arrayBuffer();
        const raw = new Uint8Array(ab);
        const evenLen = raw.byteLength - (raw.byteLength % 2);
        if (evenLen > 0) {
          const buf = soundEngine.createBufferFromPcm16(raw.subarray(0, evenLen), 24000);
          if (buf) decodedBufferCache.set(key, buf);
        }
      } catch {
        // Ignore prewarm failures silently
      } finally {
        inflightPrewarm.delete(key);
      }
    }
  };

  await Promise.all([worker(), worker()]);
}

export async function speakDominiMessage(params: {
  text: string;
  language: LanguageCode;
  mood: DominiMood;
  enabled: boolean;
}): Promise<void> {
  const { text, language, mood, enabled } = params;
  stopDominiVoice();
  soundEngine.unlock();
  if (!enabled || !text.trim() || typeof window === 'undefined') return;

  const spokenText = getSpokenDominiText(text, language);
  if (!spokenText) return;

  const currentToken = speakRequestToken;
  const cacheKey = `v8:Kore:${language}:${mood}:${spokenText}`;

  // 1. Instant 0ms Web Audio playback if phrase was already streamed & cached
  const cachedBuffer = decodedBufferCache.get(cacheKey);
  if (cachedBuffer) {
    const src = soundEngine.playVoiceBuffer(cachedBuffer, 0.96, 1.02);
    if (src) {
      activeVoiceSources.push(src);
      src.onended = () => {
        activeVoiceSources = activeVoiceSources.filter((s) => s !== src);
      };
      return;
    }
  }

  // 2. If server TTS is in cooldown or offline, use native matching voice if available
  if (
    Date.now() < serverCooldownUntil ||
    (typeof navigator !== 'undefined' && navigator.onLine === false)
  ) {
    speakWithNativeFallback(spokenText, language, mood);
    return;
  }

  // 3. Stream real human 24kHz PCM audio progressively in real time from /api/tts/stream
  const controller = new AbortController();
  activeStreamAbort = controller;
  const firstChunkTimer = window.setTimeout(() => {
    controller.abort();
  }, 7500);

  try {
    const res = await fetch('/api/tts/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: spokenText, language, mood }),
      signal: controller.signal,
    });

    if (currentToken !== speakRequestToken) return;

    const availableHeader = res.headers.get('X-TTS-Available');
    if (!res.ok || availableHeader === 'false' || !res.body) {
      window.clearTimeout(firstChunkTimer);
      serverCooldownUntil = Date.now() + 45_000;
      speakWithNativeFallback(spokenText, language, mood);
      return;
    }

    const reader = res.body.getReader();
    const collectedChunks: Uint8Array[] = [];
    let pendingBytes = new Uint8Array(0);
    let nextTimeSec = 0;
    let gotAudio = false;
    const MIN_SCHEDULE_BYTES = 9600; // 200ms of 24kHz PCM16 prevents micro-chunk clicks

    const flushPending = (forceAll: boolean) => {
      const usableLen = pendingBytes.byteLength - (pendingBytes.byteLength % 2);
      if (usableLen <= 0) return;
      if (!forceAll && usableLen < MIN_SCHEDULE_BYTES) return;

      const toPlay = pendingBytes.slice(0, usableLen);
      pendingBytes = pendingBytes.slice(usableLen);
      collectedChunks.push(toPlay);

      const scheduled = soundEngine.schedulePcm16Chunk(toPlay, nextTimeSec, 24000, 0.96, 1.02);
      if (scheduled) {
        nextTimeSec = scheduled.nextTimeSec;
        const src = scheduled.source;
        activeVoiceSources.push(src);
        src.onended = () => {
          activeVoiceSources = activeVoiceSources.filter((s) => s !== src);
        };
      }
    };

    while (true) {
      const { done, value } = await reader.read();
      if (currentToken !== speakRequestToken) {
        reader.cancel().catch(() => {});
        return;
      }
      if (done) {
        flushPending(true);
        break;
      }
      if (!value || value.byteLength === 0) continue;

      if (!gotAudio) {
        gotAudio = true;
        window.clearTimeout(firstChunkTimer);
      }

      const merged = new Uint8Array(pendingBytes.byteLength + value.byteLength);
      merged.set(pendingBytes, 0);
      merged.set(value, pendingBytes.byteLength);
      pendingBytes = merged;
      flushPending(false);
    }

    window.clearTimeout(firstChunkTimer);
    if (!gotAudio) {
      speakWithNativeFallback(spokenText, language, mood);
      return;
    }

    // Assemble full PCM into AudioBuffer cache for 0ms instant future playback
    const totalBytes = collectedChunks.reduce((acc, c) => acc + c.byteLength, 0);
    if (totalBytes > 0) {
      const fullPcm = new Uint8Array(totalBytes);
      let offset = 0;
      for (const c of collectedChunks) {
        fullPcm.set(c, offset);
        offset += c.byteLength;
      }
      const fullBuf = soundEngine.createBufferFromPcm16(fullPcm, 24000);
      if (fullBuf) {
        decodedBufferCache.set(cacheKey, fullBuf);
      }
    }
  } catch {
    window.clearTimeout(firstChunkTimer);
    if (currentToken === speakRequestToken) {
      speakWithNativeFallback(spokenText, language, mood);
    }
  } finally {
    window.clearTimeout(firstChunkTimer);
    if (activeStreamAbort === controller) {
      activeStreamAbort = null;
    }
  }
}
