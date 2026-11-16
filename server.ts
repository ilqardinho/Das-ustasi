import express from 'express';
import http from 'http';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, type LiveServerMessage, Modality } from '@google/genai';
import { attachRoomWebSocketServer } from './server/rooms.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const DOMINI_VOICE_NAME = 'Kore';
const ttsCache = new Map<string, string>();
const pcmStreamCache = new Map<string, Buffer>();
const PCM_CACHE_DIR = '/tmp/stone-master-pcm-cache-v8';
const MAX_TTS_CACHE = 150;
const modelCooldowns = new Map<string, number>();

const SPOKEN_TEXT_MAP: Record<string, string> = {
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
};

function normalizeSpokenText(rawText: string, language: string): string {
  const trimmed = rawText.trim();
  const mapped = SPOKEN_TEXT_MAP[trimmed];
  if (mapped) return mapped;
  let cleaned = trimmed.replace(/!{2,}/g, '!').replace(/\s+/g, ' ');
  if (language !== 'en') {
    cleaned = cleaned.replace(/([\p{L}])\1{2,}/gu, '$1');
  }
  return cleaned;
}

try {
  fs.mkdirSync(PCM_CACHE_DIR, { recursive: true });
} catch {
  // Ignore cache dir creation errors
}

function getPcmDiskPath(cacheKey: string): string {
  const hash = crypto.createHash('sha1').update(cacheKey).digest('hex');
  return path.join(PCM_CACHE_DIR, `${hash}.pcm`);
}

let geminiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  if (!geminiClient) {
    geminiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return geminiClient;
}

function isModelCoolingDown(model: string): boolean {
  return Date.now() < (modelCooldowns.get(model) ?? 0);
}

function markModelFailure(model: string, err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  if (message.includes('429') || message.toLowerCase().includes('quota')) {
    modelCooldowns.set(model, Date.now() + 60_000);
  } else {
    modelCooldowns.set(model, Date.now() + 15_000);
  }
}

function getLanguageName(language: string): string {
  return language === 'en'
    ? 'English'
    : language === 'tr'
    ? 'Turkish'
    : language === 'ru'
    ? 'Russian'
    : 'Azerbaijani';
}

function getStylePrompt(language: string, mood: string): string {
  if (language === 'az') {
    const azBase =
      'Təmiz Azərbaycan ədəbi dilində, səlis Bakı tələffüzü ilə danışan canlı, aydın və enerjili qadın səsi ilə oxu.';
    if (mood === 'sad') {
      return `${azBase} Üzgün, kədərli, səmimi təəssüf və yumşaq təsəlli hissi ilə səsləndir.`;
    }
    if (mood === 'warning') {
      return `${azBase} Təcili xəbərdarlıq, narahatlıq və həyəcan hissi ilə cəld səsləndir.`;
    }
    if (mood === 'hype' || mood === 'endgame') {
      return `${azBase} Böyük sevinc, coşqu və qələbə həvəsi ilə parlaq səsləndir.`;
    }
    if (mood === 'oops') {
      return `${azBase} Təəssüf və heyifsilənmə hissi ilə təbii səsləndir.`;
    }
    return `${azBase} Şən, səmimi və təbii qadın səsi ilə aydın oxu.`;
  }

  const langName = getLanguageName(language);
  const basePersona = `Speak in fluent, natural ${langName} with a warm, clear, expressive female voice at a lively pace.`;

  if (mood === 'sad') {
    return `${basePersona} Sorrowful, gently disappointed, sad yet sympathetic encouragement.`;
  }
  if (mood === 'warning') {
    return `${basePersona} Urgent, expressive warning emotion.`;
  }
  if (mood === 'hype' || mood === 'endgame') {
    return `${basePersona} Bursting joy, excitement, and celebratory inflection.`;
  }
  if (mood === 'oops') {
    return `${basePersona} Sincere regret and gentle disappointment.`;
  }
  return `${basePersona} Bright joy, warmth, and lively enthusiasm.`;
}

async function streamViaTtsModel(params: {
  ai: GoogleGenAI;
  model: string;
  rawText: string;
  language: string;
  mood: string;
  onChunk: (buf: Buffer) => void;
}): Promise<boolean> {
  const { ai, model, rawText, language, mood, onChunk } = params;
  const responseStream = await ai.models.generateContentStream({
    model,
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: rawText,
            speechMetadata: {
              style: getStylePrompt(language, mood),
            },
          },
        ],
      },
    ],
    config: {
      responseModalities: ['AUDIO'],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: DOMINI_VOICE_NAME },
        },
      },
    },
  });

  let emitted = false;
  for await (const chunk of responseStream) {
    const data = chunk.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!data) continue;
    const buf = Buffer.from(data, 'base64');
    if (buf.length === 0) continue;
    emitted = true;
    onChunk(buf);
  }
  return emitted;
}

async function streamViaLiveApi(params: {
  ai: GoogleGenAI;
  rawText: string;
  language: string;
  mood: string;
  onChunk: (buf: Buffer) => void;
}): Promise<boolean> {
  const { ai, rawText, language, mood, onChunk } = params;
  const langName = getLanguageName(language);
  const tone =
    language === 'az'
      ? mood === 'sad'
        ? 'üzgün, kədərli, təəssüf və yumşaq təsəlli hissi ilə'
        : mood === 'warning'
        ? 'səmimi təəssüf, həyəcan və xəbərdaredici emosiya ilə'
        : mood === 'hype' || mood === 'endgame'
        ? 'böyük sevinc, coşqu və fərəh hissi ilə'
        : mood === 'oops'
        ? 'təəssüf, heyifsilənmə və yüngül təəccüb hissi ilə'
        : 'şən, sevincli və enerjili emosiya ilə'
      : mood === 'sad'
      ? 'sad, sorrowful, and gently sympathetic emotion'
      : mood === 'warning'
      ? 'sincere regret and urgent warning emotion'
      : mood === 'hype' || mood === 'endgame'
      ? 'bursting joy, excitement, and celebratory energy'
      : mood === 'oops'
      ? 'sincere regret and disappointment'
      : 'bright joy and lively enthusiasm';

  const systemInstruction =
    language === 'az'
      ? `Sən Domini adlı oyun aparıcısısan və hər zaman eyni sabit, canlı və səmimi real qadın səsi ilə danışırsan. Sənə verilən qısa nidanı və ya sözü əlavə söz demədən, sual vermədən, tərcümə etmədən, yalnız olduğu kimi, təmiz Azərbaycan (Bakı) tələffüzü ilə, canlı və bir az sürətli templə ${tone} ucadan səsləndir.`
      : `You are Domini, a charismatic female host with one consistent, authentic woman voice across all languages. Expressively vocalize ONLY the exact short exclamation or phrase provided by the user, word for word, in fluent natural ${langName} at a brisk, lively pace with ${tone}. Do not add extra words or explanations.`;

  const userDirective =
    language === 'az'
      ? `Yalnız bunu olduğu kimi, canlı qadın səsi və ${tone} səsləndir: "${rawText}"`
      : `Expressively say ONLY this exact phrase verbatim in a natural female voice with ${tone}: "${rawText}"`;

  return new Promise<boolean>((resolve, reject) => {
    let settled = false;
    let emitted = false;
    let sessionRef: Awaited<ReturnType<GoogleGenAI['live']['connect']>> | null = null;

    const finish = (ok: boolean, err?: unknown) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutId);
      try {
        sessionRef?.close();
      } catch {
        // Ignore close errors
      }
      if (err) {
        reject(err);
      } else {
        resolve(ok);
      }
    };

    const timeoutId = setTimeout(() => {
      finish(emitted);
    }, 4500);

    ai.live
      .connect({
        model: 'gemini-3.8-live',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: DOMINI_VOICE_NAME } },
          },
          systemInstruction,
        },
        callbacks: {
          onmessage: (message: LiveServerMessage) => {
            for (const part of message.serverContent?.modelTurn?.parts ?? []) {
              if (part.inlineData?.data) {
                const buf = Buffer.from(part.inlineData.data, 'base64');
                if (buf.length > 0) {
                  emitted = true;
                  onChunk(buf);
                }
              }
            }
            if (message.serverContent?.turnComplete) {
              finish(emitted);
            }
          },
          onerror: (err) => {
            finish(emitted, err);
          },
          onclose: () => {
            finish(emitted);
          },
        },
      })
      .then((session) => {
        sessionRef = session;
        if (settled) {
          try {
            session.close();
          } catch {
            // Ignore
          }
          return;
        }
        session.sendClientContent({
          turns: [{ role: 'user', parts: [{ text: userDirective }] }],
          turnComplete: true,
        });
      })
      .catch((err) => finish(false, err));
  });
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '64kb' }));

  app.post('/api/tts', async (req, res) => {
    const rawText = typeof req.body?.text === 'string' ? req.body.text.trim() : '';
    const language = typeof req.body?.language === 'string' ? req.body.language : 'az';
    const mood = typeof req.body?.mood === 'string' ? req.body.mood : 'happy';

    if (!rawText || rawText.length > 220) {
      res.status(400).json({ error: 'Invalid text payload' });
      return;
    }

    const ai = getGeminiClient();
    if (!ai) {
      res.status(200).json({ available: false, reason: 'missing_api_key' });
      return;
    }

    const spokenText = normalizeSpokenText(rawText, language);
    const cacheKey = `v8:${DOMINI_VOICE_NAME}:${language}:${mood}:${spokenText}`;
    const cached = ttsCache.get(cacheKey);
    if (cached) {
      res.json({ available: true, audioBase64: cached, mimeType: 'audio/wav', cached: true });
      return;
    }

    const ttsModels = ['gemini-3.8-flash-lite-tts', 'gemini-3.8-flash-tts'];
    for (const model of ttsModels) {
      if (isModelCoolingDown(model)) continue;
      try {
        const response = await ai.models.generateContent({
          model,
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: spokenText,
                  speechMetadata: {
                    style: getStylePrompt(language, mood),
                  },
                },
              ],
            },
          ],
          config: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: DOMINI_VOICE_NAME },
              },
            },
          },
        });

        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (base64Audio) {
          if (ttsCache.size >= MAX_TTS_CACHE) {
            const oldestKey = ttsCache.keys().next().value;
            if (oldestKey) ttsCache.delete(oldestKey);
          }
          ttsCache.set(cacheKey, base64Audio);
          res.json({ available: true, audioBase64: base64Audio, mimeType: 'audio/wav' });
          return;
        }
      } catch (err) {
        markModelFailure(model, err);
      }
    }

    res.status(200).json({ available: false, reason: 'tts_unavailable' });
  });

  // Real-time streaming raw PCM (24kHz, mono, 16-bit LE) TTS endpoint with multi-model human fallback
  app.post('/api/tts/stream', async (req, res) => {
    const rawText = typeof req.body?.text === 'string' ? req.body.text.trim() : '';
    const language = typeof req.body?.language === 'string' ? req.body.language : 'az';
    const mood = typeof req.body?.mood === 'string' ? req.body.mood : 'happy';

    if (!rawText || rawText.length > 220) {
      res.status(400).json({ error: 'Invalid text payload' });
      return;
    }

    const spokenText = normalizeSpokenText(rawText, language);
    const cacheKey = `v8:${DOMINI_VOICE_NAME}:${language}:${mood}:${spokenText}`;
    let cachedPcm = pcmStreamCache.get(cacheKey);
    if (!cachedPcm) {
      try {
        const diskPath = getPcmDiskPath(cacheKey);
        if (fs.existsSync(diskPath)) {
          cachedPcm = fs.readFileSync(diskPath);
          pcmStreamCache.set(cacheKey, cachedPcm);
        }
      } catch {
        // Ignore disk cache read errors
      }
    }

    if (cachedPcm && cachedPcm.length > 0) {
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('X-TTS-Available', 'true');
      res.setHeader('X-TTS-Cached', 'true');
      res.end(cachedPcm);
      return;
    }

    const ai = getGeminiClient();
    if (!ai) {
      res.status(200).setHeader('X-TTS-Available', 'false').setHeader('X-TTS-Reason', 'no_key').end();
      return;
    }

    let headersSent = false;
    const chunks: Buffer[] = [];
    const emitChunk = (modelTag: string) => (buf: Buffer) => {
      if (!headersSent) {
        headersSent = true;
        res.setHeader('Content-Type', 'application/octet-stream');
        res.setHeader('X-TTS-Available', 'true');
        res.setHeader('X-TTS-Model', modelTag);
        res.setHeader('Cache-Control', 'no-store');
      }
      chunks.push(buf);
      res.write(buf);
    };

    const saveCache = () => {
      const fullPcm = Buffer.concat(chunks);
      if (fullPcm.length > 0) {
        if (pcmStreamCache.size >= MAX_TTS_CACHE) {
          const oldest = pcmStreamCache.keys().next().value;
          if (oldest) pcmStreamCache.delete(oldest);
        }
        pcmStreamCache.set(cacheKey, fullPcm);
        try {
          fs.writeFileSync(getPcmDiskPath(cacheKey), fullPcm);
        } catch {
          // Ignore disk cache write errors
        }
      }
    };

    let lastReason = 'unavailable';

    // 1. Primary dedicated TTS streaming models (gemini-3.8-flash-lite-tts / gemini-3.8-flash-tts)
    //    for accurate verbatim pronunciation without conversational filler, using one consistent Kore female voice
    for (const model of ['gemini-3.8-flash-lite-tts', 'gemini-3.8-flash-tts']) {
      if (isModelCoolingDown(model)) {
        lastReason = `${model}:cooldown`;
        continue;
      }
      try {
        const ok = await streamViaTtsModel({
          ai,
          model,
          rawText: spokenText,
          language,
          mood,
          onChunk: emitChunk(model),
        });
        if (ok) {
          res.end();
          saveCache();
          return;
        }
      } catch (err) {
        markModelFailure(model, err);
        const msg = err instanceof Error ? err.message : String(err);
        lastReason = msg.includes('429') ? `${model}:429` : `${model}:err`;
        if (headersSent) {
          res.end();
          return;
        }
      }
    }

    // 2. Fallback to Live API (gemini-3.8-live) with the same Kore female voice if TTS endpoints are cooling down
    if (!isModelCoolingDown('gemini-3.8-live')) {
      try {
        const ok = await streamViaLiveApi({
          ai,
          rawText: spokenText,
          language,
          mood,
          onChunk: emitChunk('gemini-3.8-live'),
        });
        if (ok) {
          res.end();
          saveCache();
          return;
        }
      } catch (err) {
        markModelFailure('gemini-3.8-live', err);
        const msg = err instanceof Error ? err.message : String(err);
        lastReason = msg.includes('429') ? 'live:429' : 'live:err';
        if (headersSent) {
          res.end();
          return;
        }
      }
    } else {
      lastReason = 'live:cooldown';
    }

    if (!headersSent) {
      res.status(200).setHeader('X-TTS-Available', 'false').setHeader('X-TTS-Reason', lastReason).end();
    } else {
      res.end();
    }
  });

  const httpServer = http.createServer(app);
  const roomManager = attachRoomWebSocketServer(httpServer);

  app.get('/api/health', (_req, res) => {
    res.status(200).json({ ok: true });
  });

  app.get('/api/rooms/:code', (req, res) => {
    const room = roomManager.getRoomSnapshot(String(req.params.code ?? ''));
    if (!room) {
      res.status(404).json({ exists: false });
      return;
    }
    res.json({ exists: true, room });
  });

  const distDir = path.resolve(__dirname, 'dist');
  const hasDistBuild = fs.existsSync(path.join(distDir, 'index.html'));
  const runningUnderTsx = process.execArgv.some((arg) => arg.includes('tsx'));
  const isDevMode =
    process.env.NODE_ENV !== 'production' &&
    (process.env.npm_lifecycle_event === 'dev' || runningUnderTsx || !hasDistBuild);

  if (isDevMode) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: { server: httpServer },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT} (mode=${isDevMode ? 'dev' : 'prod'})`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
