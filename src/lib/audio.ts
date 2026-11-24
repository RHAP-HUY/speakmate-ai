const MAX_CLIENT_TTS_CACHE = 50;
const ttsCache = new Map<string, string>();
const pendingPreloads = new Set<string>();
let currentAudio: HTMLAudioElement | null = null;
let currentAbortController: AbortController | null = null;
let playbackToken = 0;

function evictOldestCacheIfNeeded(): void {
  while (ttsCache.size >= MAX_CLIENT_TTS_CACHE) {
    const oldestKey = ttsCache.keys().next().value;
    if (!oldestKey) break;
    const oldUrl = ttsCache.get(oldestKey);
    if (oldUrl && typeof URL !== 'undefined') {
      try {
        URL.revokeObjectURL(oldUrl);
      } catch {
        // ignore revoke errors
      }
    }
    ttsCache.delete(oldestKey);
  }
}

export function buildClientTtsCacheKey(
  voice: string,
  speed: number,
  text: string
): string {
  return `${voice}|${speed.toFixed(2)}|${text.trim()}`;
}

export function getClientTtsCacheSize(): number {
  return ttsCache.size;
}

export function clearClientTtsCache(): void {
  for (const url of ttsCache.values()) {
    if (typeof URL !== 'undefined') {
      try {
        URL.revokeObjectURL(url);
      } catch {
        // ignore
      }
    }
  }
  ttsCache.clear();
  pendingPreloads.clear();
}

export function stopVoicePlayback(): void {
  playbackToken += 1;
  if (currentAbortController) {
    try {
      currentAbortController.abort();
    } catch {
      // ignore
    }
    currentAbortController = null;
  }
  if (currentAudio) {
    try {
      currentAudio.pause();
      currentAudio.currentTime = 0;
    } catch {
      // ignore
    }
    currentAudio = null;
  }
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      // ignore
    }
  }
}

function speakWithBrowserFallback(params: {
  text: string;
  browserLang: string;
  speed: number;
  token: number;
  onStart?: () => void;
  onEnd?: () => void;
}): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    params.onEnd?.();
    return;
  }

  const utterance = new SpeechSynthesisUtterance(params.text);
  utterance.lang = params.browserLang || 'en-US';
  utterance.rate = Math.min(1.25, Math.max(0.65, params.speed));

  const voices = window.speechSynthesis.getVoices();
  const preferred =
    voices.find((v) =>
      v.lang.toLowerCase().startsWith(params.browserLang.toLowerCase())
    ) ?? voices.find((v) => v.lang.toLowerCase().startsWith('en'));
  if (preferred) {
    utterance.voice = preferred;
  }

  utterance.onstart = () => {
    if (playbackToken === params.token) params.onStart?.();
  };
  utterance.onend = () => {
    if (playbackToken === params.token) params.onEnd?.();
  };
  utterance.onerror = () => {
    if (playbackToken === params.token) params.onEnd?.();
  };

  window.speechSynthesis.speak(utterance);
}

/**
 * Quietly pre-fetches upcoming lesson/flashcard TTS audio into the client LRU cache
 * so clicking Play or advancing to the next question feels instantaneous.
 */
export async function preloadNaturalVoice(params: {
  text: string;
  voice: string;
  speed: number;
}): Promise<void> {
  if (typeof window === 'undefined' || typeof fetch === 'undefined') return;
  const cleanText = params.text.trim();
  if (!cleanText) return;

  const cacheKey = buildClientTtsCacheKey(params.voice, params.speed, cleanText);
  if (ttsCache.has(cacheKey) || pendingPreloads.has(cacheKey)) return;

  pendingPreloads.add(cacheKey);
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 8_000);

  try {
    const response = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: cleanText,
        voice: params.voice,
        speed: params.speed,
      }),
      signal: controller.signal,
    });
    if (!response.ok) return;
    const blob = await response.blob();
    if (blob.size === 0) return;

    evictOldestCacheIfNeeded();
    ttsCache.set(cacheKey, URL.createObjectURL(blob));
  } catch {
    // Silent background preload failure is completely safe
  } finally {
    window.clearTimeout(timer);
    pendingPreloads.delete(cacheKey);
  }
}

/**
 * Plays inline base64 MP3 audio returned directly by /api/tutor/turn at 0ms extra RTT,
 * caching the Blob URL so replay clicks are also instantaneous.
 */
export async function playBase64Audio(params: {
  base64: string;
  mimeType?: string;
  text: string;
  voice: string;
  browserLang: string;
  speed: number;
  onStart?: () => void;
  onEnd?: () => void;
}): Promise<void> {
  stopVoicePlayback();
  const token = ++playbackToken;
  const cleanText = params.text.trim();

  try {
    const binary = atob(params.base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: params.mimeType || 'audio/mpeg' });
    if (blob.size === 0) {
      throw new Error('Empty inline audio');
    }

    const audioUrl = URL.createObjectURL(blob);
    if (cleanText) {
      const cacheKey = buildClientTtsCacheKey(
        params.voice,
        params.speed,
        cleanText
      );
      if (!ttsCache.has(cacheKey)) {
        evictOldestCacheIfNeeded();
        ttsCache.set(cacheKey, audioUrl);
      }
    }

    if (playbackToken !== token) return;

    const audio = new Audio(audioUrl);
    currentAudio = audio;
    audio.onplay = () => {
      if (playbackToken === token) params.onStart?.();
    };
    audio.onended = () => {
      if (currentAudio === audio) currentAudio = null;
      if (playbackToken === token) params.onEnd?.();
    };
    audio.onerror = () => {
      if (currentAudio === audio) currentAudio = null;
      if (playbackToken === token) {
        void playNaturalVoice({
          text: cleanText,
          voice: params.voice,
          browserLang: params.browserLang,
          speed: params.speed,
          onStart: params.onStart,
          onEnd: params.onEnd,
        });
      }
    };

    await audio.play();
  } catch {
    if (playbackToken === token) {
      await playNaturalVoice({
        text: cleanText,
        voice: params.voice,
        browserLang: params.browserLang,
        speed: params.speed,
        onStart: params.onStart,
        onEnd: params.onEnd,
      });
    }
  }
}

export async function playNaturalVoice(params: {
  text: string;
  voice: string;
  browserLang: string;
  speed: number;
  onStart?: () => void;
  onEnd?: () => void;
}): Promise<void> {
  stopVoicePlayback();
  const token = ++playbackToken;
  const cleanText = params.text.trim();
  if (!cleanText) {
    params.onEnd?.();
    return;
  }

  const cacheKey = buildClientTtsCacheKey(params.voice, params.speed, cleanText);

  try {
    let audioUrl = ttsCache.get(cacheKey);
    if (audioUrl) {
      // Refresh LRU position
      ttsCache.delete(cacheKey);
      ttsCache.set(cacheKey, audioUrl);
    } else {
      const controller = new AbortController();
      currentAbortController = controller;
      const timeoutId =
        typeof window !== 'undefined'
          ? window.setTimeout(() => controller.abort(), 6_500)
          : null;

      try {
        const response = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: cleanText,
            voice: params.voice,
            speed: params.speed,
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error('TTS API fallback');
        }

        const blob = await response.blob();
        if (blob.size === 0) {
          throw new Error('Empty TTS audio');
        }
        audioUrl = URL.createObjectURL(blob);
        evictOldestCacheIfNeeded();
        ttsCache.set(cacheKey, audioUrl);
      } finally {
        if (timeoutId !== null && typeof window !== 'undefined') {
          window.clearTimeout(timeoutId);
        }
        if (currentAbortController === controller) {
          currentAbortController = null;
        }
      }
    }

    if (playbackToken !== token) return;

    const audio = new Audio(audioUrl);
    currentAudio = audio;
    audio.onplay = () => {
      if (playbackToken === token) params.onStart?.();
    };
    audio.onended = () => {
      if (currentAudio === audio) currentAudio = null;
      if (playbackToken === token) params.onEnd?.();
    };
    audio.onerror = () => {
      if (currentAudio === audio) currentAudio = null;
      if (playbackToken === token) {
        speakWithBrowserFallback({ ...params, text: cleanText, token });
      }
    };

    await audio.play();
  } catch {
    if (playbackToken === token) {
      speakWithBrowserFallback({ ...params, text: cleanText, token });
    }
  }
}

export function pickSupportedAudioMimeType(): string {
  if (typeof MediaRecorder === 'undefined') return 'audio/webm';
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/ogg;codecs=opus',
  ];
  for (const mime of candidates) {
    if (MediaRecorder.isTypeSupported(mime)) {
      return mime;
    }
  }
  return '';
}

/**
 * Creates a speech-optimized MediaRecorder (32kbps) to keep audio payloads small
 * and fast to upload/transcribe, with automatic fallback for strict mobile browsers.
 */
export function createSpeechRecorder(stream: MediaStream): MediaRecorder {
  const mimeType = pickSupportedAudioMimeType();
  const preferredOptions: MediaRecorderOptions = {
    audioBitsPerSecond: 32_000,
    ...(mimeType ? { mimeType } : {}),
  };

  try {
    return new MediaRecorder(stream, preferredOptions);
  } catch {
    if (mimeType) {
      try {
        return new MediaRecorder(stream, { mimeType });
      } catch {
        // Fall through to browser default
      }
    }
    return new MediaRecorder(stream);
  }
}
