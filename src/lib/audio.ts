const ttsCache = new Map<string, string>();
let currentAudio: HTMLAudioElement | null = null;
let playbackToken = 0;

export function stopVoicePlayback(): void {
  playbackToken += 1;
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

  const cacheKey = `${params.voice}|${params.speed.toFixed(2)}|${cleanText}`;

  try {
    let audioUrl = ttsCache.get(cacheKey);
    if (!audioUrl) {
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: cleanText,
          voice: params.voice,
          speed: params.speed,
        }),
      });

      if (!response.ok) {
        throw new Error('TTS API fallback');
      }

      const blob = await response.blob();
      if (blob.size === 0) {
        throw new Error('Empty TTS audio');
      }
      audioUrl = URL.createObjectURL(blob);

      if (ttsCache.size >= 40) {
        const oldestKey = ttsCache.keys().next().value;
        if (oldestKey) {
          const oldUrl = ttsCache.get(oldestKey);
          if (oldUrl) URL.revokeObjectURL(oldUrl);
          ttsCache.delete(oldestKey);
        }
      }
      ttsCache.set(cacheKey, audioUrl);
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
