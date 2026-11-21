'use client';

import {
  Bookmark,
  Check,
  Eye,
  EyeOff,
  Loader2,
  Mic,
  MicOff,
  PhoneOff,
  Send,
  Sparkles,
  Volume2,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import {
  pickSupportedAudioMimeType,
  playNaturalVoice,
  stopVoicePlayback,
} from '@/lib/audio';
import {
  appendConversationMessages,
  createConversationRecord,
  finishConversationRecord,
  getCurrentProfile,
  getLocalPersonalKey,
  savePhrase,
} from '@/lib/data-store';
import { AI_PERSONAS, pickPersona, SCENARIOS } from '@/lib/scenarios';
import type { AiPersona, ReplyHint, TutorMessage, UserProfile } from '@/types';

type CallPhase = 'initializing' | 'idle' | 'recording' | 'thinking' | 'speaking' | 'ended';
type MicMode = 'tap' | 'handsfree';

function formatTimer(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function CallStudioInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const scenarioId = searchParams.get('scenario') || 'daily-small-talk';
  const personaParam = searchParams.get('persona') || '';

  const scenario =
    SCENARIOS.find((s) => s.id === scenarioId) ?? SCENARIOS[0];

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [persona, setPersona] = useState<AiPersona>(AI_PERSONAS[0]);
  const [conversationId, setConversationId] = useState<string | null>(null);

  const [phase, setPhase] = useState<CallPhase>('initializing');
  const [micMode, setMicMode] = useState<MicMode>('tap');
  const [speed, setSpeed] = useState<number>(0.85);
  const [showVietnamese, setShowVietnamese] = useState<boolean>(true);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);

  const [messages, setMessages] = useState<TutorMessage[]>([]);
  const [replyHints, setReplyHints] = useState<ReplyHint[]>([]);
  const [textInput, setTextInput] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [savedKeys, setSavedKeys] = useState<Set<string>>(new Set());
  const [micLevel, setMicLevel] = useState<number>(0);
  const [autoListenTick, setAutoListenTick] = useState<number>(0);

  // Refs for stable audio / timer callbacks
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordStartRef = useRef<number>(0);
  const vadRafRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const conversationIdRef = useRef<string | null>(null);
  const messagesRef = useRef<TutorMessage[]>([]);
  const profileRef = useRef<UserProfile | null>(null);
  const personaRef = useRef<AiPersona>(AI_PERSONAS[0]);
  const speedRef = useRef<number>(0.85);
  const micModeRef = useRef<MicMode>('tap');
  const phaseRef = useRef<CallPhase>('initializing');
  const startedInitRef = useRef<boolean>(false);

  useEffect(() => {
    messagesRef.current = messages;
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

  useEffect(() => {
    micModeRef.current = micMode;
  }, [micMode]);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  // Call duration timer
  useEffect(() => {
    if (phase === 'initializing' || phase === 'ended') return;
    const timer = setInterval(() => {
      setElapsedSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [phase]);

  const cleanupRecordingResources = useCallback(() => {
    if (vadRafRef.current !== null) {
      cancelAnimationFrame(vadRafRef.current);
      vadRafRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    mediaRecorderRef.current = null;
    setMicLevel(0);
  }, []);

  useEffect(() => {
    return () => {
      stopVoicePlayback();
      cleanupRecordingResources();
    };
  }, [cleanupRecordingResources]);

  const buildAuthHeaders = useCallback((): Record<string, string> => {
    const headers: Record<string, string> = {};
    const personalKey = getLocalPersonalKey();
    if (personalKey && profileRef.current?.apiKeyMode === 'personal') {
      headers['x-user-gemini-key'] = personalKey;
    }
    return headers;
  }, []);

  const speakAiSentence = useCallback(
    async (text: string, customSpeed?: number, autoListenAfter = false) => {
      const p = personaRef.current;
      setPhase('speaking');
      await playNaturalVoice({
        text,
        voice: p.edgeVoice,
        browserLang: p.browserLang,
        speed: customSpeed ?? speedRef.current,
        onStart: () => setPhase('speaking'),
        onEnd: () => {
          setPhase((prev) => (prev === 'ended' ? 'ended' : 'idle'));
          if (
            autoListenAfter &&
            micModeRef.current === 'handsfree' &&
            phaseRef.current !== 'ended'
          ) {
            setAutoListenTick((t) => t + 1);
          }
        },
      });
    },
    []
  );

  const sendTurn = useCallback(
    async (opts: {
      isStart?: boolean;
      userText?: string;
      audioBlob?: Blob;
      audioMime?: string;
    }) => {
      setErrorMsg(null);
      setPhase('thinking');
      stopVoicePlayback();

      try {
        const payload = {
          scenarioId: scenario.id,
          personaId: personaRef.current.id,
          isStart: opts.isStart,
          userText: opts.userText,
          history: messagesRef.current.map((m) => ({
            role: m.role,
            englishText: m.englishText,
          })),
          profileOverride: profileRef.current
            ? {
                displayName: profileRef.current.displayName,
                englishLevel: profileRef.current.englishLevel,
                jobField: profileRef.current.jobField,
                hobbies: profileRef.current.hobbies,
              }
            : undefined,
        };

        let response: Response;
        const headers = buildAuthHeaders();

        if (opts.audioBlob) {
          const fd = new FormData();
          fd.append('payload', JSON.stringify(payload));
          fd.append('audio', opts.audioBlob, 'speech.webm');
          response = await fetch('/api/tutor/turn', {
            method: 'POST',
            headers,
            body: fd,
          });
        } else {
          response = await fetch('/api/tutor/turn', {
            method: 'POST',
            headers: {
              ...headers,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
          });
        }

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'Không thể kết nối AI Tutor.');
        }

        const nowIso = new Date().toISOString();
        const newMessages: TutorMessage[] = [];

        if (!opts.isStart) {
          newMessages.push({
            id: crypto.randomUUID(),
            role: 'user',
            englishText: data.userTranscript,
            naturalRewrite: data.naturalRewrite,
            coachingTip: data.coachingTip,
            createdAt: nowIso,
          });
        }

        const aiMsg: TutorMessage = {
          id: crypto.randomUUID(),
          role: 'assistant',
          englishText: data.aiReplyEn,
          vietnameseTranslation: data.aiReplyVi,
          coachingTip: opts.isStart ? data.coachingTip : null,
          replyHints: data.replyHints ?? [],
          createdAt: nowIso,
        };
        newMessages.push(aiMsg);

        setMessages((prev) => [...prev, ...newMessages]);
        setReplyHints(data.replyHints ?? []);

        if (conversationIdRef.current) {
          await appendConversationMessages(
            conversationIdRef.current,
            newMessages
          );
        }

        await speakAiSentence(data.aiReplyEn, undefined, true);
      } catch (err) {
        setErrorMsg(
          err instanceof Error ? err.message : 'Có lỗi xảy ra khi gọi AI.'
        );
        setPhase('idle');
      }
    },
    [buildAuthHeaders, scenario.id, speakAiSentence]
  );

  // Initialize session on mount
  useEffect(() => {
    if (startedInitRef.current) return;
    startedInitRef.current = true;

    async function init() {
      const { profile: loadedProfile, authenticated } =
        await getCurrentProfile();
      if (!authenticated || !loadedProfile) {
        router.replace('/auth?next=/call');
        return;
      }

      const chosenPersona = pickPersona(
        loadedProfile.preferredAccent,
        personaParam || undefined
      );
      profileRef.current = loadedProfile;
      personaRef.current = chosenPersona;
      setProfile(loadedProfile);
      setPersona(chosenPersona);
      setSpeed(loadedProfile.preferredSpeed || 0.85);
      speedRef.current = loadedProfile.preferredSpeed || 0.85;

      const conv = await createConversationRecord({
        scenarioId: scenario.id,
        scenarioTitle: scenario.titleVi,
        topicCategory: scenario.category,
        accent: chosenPersona.accent,
        aiPersona: chosenPersona.name,
        level: loadedProfile.englishLevel,
      });
      conversationIdRef.current = conv.id;
      setConversationId(conv.id);

      await sendTurn({ isStart: true });
    }

    init();
  }, [personaParam, router, scenario, sendTurn]);

  const stopRecordingAndSend = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === 'inactive') return;
    recorder.stop();
  }, []);

  const startRecording = useCallback(async () => {
    if (phaseRef.current === 'thinking' || phaseRef.current === 'ended') return;
    setErrorMsg(null);
    stopVoicePlayback();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = pickSupportedAudioMimeType();
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      chunksRef.current = [];
      recordStartRef.current = Date.now();
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) chunksRef.current.push(ev.data);
      };

      recorder.onstop = () => {
        const duration = Date.now() - recordStartRef.current;
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || 'audio/webm',
        });
        cleanupRecordingResources();

        if (duration < 450 || blob.size < 1200) {
          setErrorMsg(
            'Đoạn nói hơi ngắn hoặc chưa thu được tiếng. Bạn hãy bấm mic và nói rõ hơn nhé!'
          );
          setPhase('idle');
          return;
        }

        void sendTurn({
          audioBlob: blob,
          audioMime: recorder.mimeType || 'audio/webm',
        });
      };

      // Audio level meter + optional Hands-free VAD auto-stop
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;

      if (AudioContextClass) {
        const ctx = new AudioContextClass();
        audioCtxRef.current = ctx;
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 512;
        source.connect(analyser);
        const buffer = new Uint8Array(analyser.fftSize);

        let speechDetected = false;
        let lastSoundTs = Date.now();

        const monitor = () => {
          if (!mediaRecorderRef.current || mediaRecorderRef.current.state !== 'recording') {
            return;
          }
          analyser.getByteTimeDomainData(buffer);
          let sumSq = 0;
          for (let i = 0; i < buffer.length; i++) {
            const norm = (buffer[i] - 128) / 128;
            sumSq += norm * norm;
          }
          const rms = Math.sqrt(sumSq / buffer.length);
          setMicLevel(Math.min(100, Math.round(rms * 360)));

          if (rms > 0.035) {
            speechDetected = true;
            lastSoundTs = Date.now();
          } else if (
            micModeRef.current === 'handsfree' &&
            speechDetected &&
            Date.now() - lastSoundTs > 1550
          ) {
            stopRecordingAndSend();
            return;
          }

          vadRafRef.current = requestAnimationFrame(monitor);
        };
        vadRafRef.current = requestAnimationFrame(monitor);
      }

      recorder.start(200);
      setPhase('recording');
    } catch {
      cleanupRecordingResources();
      setErrorMsg(
        'Không thể mở Micro. Vui lòng cấp quyền Micro trên trình duyệt hoặc dùng ô gõ chữ bên dưới.'
      );
      setPhase('idle');
    }
  }, [cleanupRecordingResources, sendTurn, stopRecordingAndSend]);

  useEffect(() => {
    if (autoListenTick === 0 || micMode !== 'handsfree') return;
    const timer = setTimeout(() => {
      if (phaseRef.current === 'idle') {
        void startRecording();
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [autoListenTick, micMode, startRecording]);

  // Spacebar shortcut on desktop when in tap mode
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.code !== 'Space') return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }
      e.preventDefault();
      if (phaseRef.current === 'recording') {
        stopRecordingAndSend();
      } else if (phaseRef.current === 'idle' || phaseRef.current === 'speaking') {
        void startRecording();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [startRecording, stopRecordingAndSend]);

  async function handleSendText(textToSend?: string) {
    const clean = (textToSend ?? textInput).trim();
    if (!clean || phase === 'thinking' || phase === 'ended') return;
    if (!textToSend) setTextInput('');
    await sendTurn({ userText: clean });
  }

  async function handleSavePhrase(en: string, vi: string) {
    const key = en.toLowerCase();
    if (savedKeys.has(key)) return;
    try {
      await savePhrase({
        englishPhrase: en,
        vietnameseMeaning: vi,
        category: scenario.category,
        accent: persona.accent,
      });
      setSavedKeys((prev) => new Set(prev).add(key));
    } catch {
      setErrorMsg('Không thể lưu cụm từ lúc này.');
    }
  }

  async function handleEndCall() {
    stopVoicePlayback();
    cleanupRecordingResources();
    setPhase('ended');
    if (conversationId) {
      const userSentCount = messages.filter((m) => m.role === 'user').length;
      await finishConversationRecord({
        conversationId,
        durationSeconds: elapsedSeconds,
        messageCount: messages.length,
        userMessagesSent: userSentCount,
      });
    }
  }

  function handleChangePersona(nextPersonaId: string) {
    const next = AI_PERSONAS.find((p) => p.id === nextPersonaId);
    if (!next) return;
    personaRef.current = next;
    setPersona(next);
  }

  const userTurns = messages.filter((m) => m.role === 'user').length;

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-white">
      {/* Top Call Bar */}
      <header className="sticky top-0 z-20 border-b border-slate-800 bg-slate-900/95 backdrop-blur-md px-4 py-3">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`relative flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br ${persona.gradient} text-lg font-bold shadow-md`}
            >
              {persona.flag}
              {(phase === 'speaking' || phase === 'recording') && (
                <span className="absolute -inset-1 rounded-2xl border-2 border-cyan-400/70 animate-voice-pulse" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold text-white">
                  {persona.name} · {scenario.titleVi}
                </h1>
                <span className="rounded-full bg-slate-800 px-2 py-0.5 font-mono text-[11px] text-cyan-300">
                  {formatTimer(elapsedSeconds)}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {phase === 'initializing' && 'Đang kết nối cuộc gọi...'}
                {phase === 'idle' &&
                  (micMode === 'handsfree'
                    ? 'Sẵn sàng — Hãy nói hoặc bấm Mic'
                    : 'Sẵn sàng — Bấm Mic (hoặc phím Space) để nói')}
                {phase === 'recording' && 'Đang nghe bạn nói...'}
                {phase === 'thinking' && `${persona.name} đang suy nghĩ & sửa câu...`}
                {phase === 'speaking' && `${persona.name} đang nói (${persona.accentLabel})...`}
                {phase === 'ended' && 'Cuộc gọi đã kết thúc'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Switch Accent Mid-call */}
            <select
              value={persona.id}
              onChange={(e) => handleChangePersona(e.target.value)}
              aria-label="Đổi giọng AI"
              className="rounded-xl border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs font-medium text-slate-200 focus:outline-none"
            >
              {AI_PERSONAS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.flag} {p.name} ({p.accent})
                </option>
              ))}
            </select>

            {/* Speed selector */}
            <div className="flex items-center rounded-xl border border-slate-700 bg-slate-800 p-0.5">
              {[0.75, 0.85, 1.0, 1.1].map((spd) => (
                <button
                  key={spd}
                  type="button"
                  onClick={() => setSpeed(spd)}
                  className={`rounded-lg px-2 py-1 text-[11px] font-semibold transition cursor-pointer ${
                    Math.abs(speed - spd) < 0.03
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  {spd}x
                </button>
              ))}
            </div>

            {/* Toggle Vietnamese */}
            <button
              type="button"
              onClick={() => setShowVietnamese((v) => !v)}
              className="inline-flex items-center gap-1 rounded-xl border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 cursor-pointer"
            >
              {showVietnamese ? (
                <>
                  <Eye className="h-3.5 w-3.5 text-cyan-400" />
                  <span className="hidden sm:inline">Song ngữ</span>
                </>
              ) : (
                <>
                  <EyeOff className="h-3.5 w-3.5 text-slate-400" />
                  <span className="hidden sm:inline">Ẩn dịch</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleEndCall}
              disabled={phase === 'ended'}
              className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-50 transition cursor-pointer"
            >
              <PhoneOff className="h-3.5 w-3.5" />
              Kết thúc
            </button>
          </div>
        </div>
      </header>

      {/* Main Conversation Stream */}
      <main className="mx-auto flex-1 w-full max-w-4xl px-4 py-5 space-y-4 overflow-y-auto">
        {messages.length === 0 && phase === 'initializing' && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-cyan-400 mb-3" />
            <p className="text-sm text-slate-300">
              {persona.name} đang nhấc máy chào {profile?.displayName || 'bạn'}...
            </p>
          </div>
        )}

        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          const isSavedRewrite =
            msg.naturalRewrite &&
            savedKeys.has(msg.naturalRewrite.toLowerCase());
          const isSavedAi = savedKeys.has(msg.englishText.toLowerCase());

          return (
            <div
              key={msg.id}
              className={`flex flex-col ${
                isUser ? 'items-end' : 'items-start'
              }`}
            >
              <div
                className={`max-w-[92%] sm:max-w-[82%] rounded-2xl px-4 py-3 ${
                  isUser
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-900 border border-slate-800 text-slate-100'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm sm:text-base font-medium leading-relaxed">
                    {msg.englishText}
                  </p>
                  {!isUser && (
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        onClick={() => void speakAiSentence(msg.englishText)}
                        title="Nghe lại"
                        className="rounded-lg bg-slate-800 p-1.5 text-cyan-300 hover:bg-slate-700 cursor-pointer"
                      >
                        <Volume2 className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          void speakAiSentence(msg.englishText, 0.72)
                        }
                        title="Nghe chậm 0.72x"
                        className="rounded-lg bg-slate-800 px-2 py-1 text-[11px] font-semibold text-amber-300 hover:bg-slate-700 cursor-pointer"
                      >
                        Chậm
                      </button>
                    </div>
                  )}
                </div>

                {!isUser && showVietnamese && msg.vietnameseTranslation && (
                  <p className="mt-1.5 border-t border-slate-800 pt-1.5 text-xs text-slate-300">
                    🇻🇳 {msg.vietnameseTranslation}
                  </p>
                )}

                {!isUser && msg.vietnameseTranslation && (
                  <div className="mt-2 flex items-center justify-end">
                    <button
                      type="button"
                      onClick={() =>
                        handleSavePhrase(
                          msg.englishText,
                          msg.vietnameseTranslation || ''
                        )
                      }
                      className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-cyan-300 cursor-pointer"
                    >
                      {isSavedAi ? (
                        <>
                          <Check className="h-3 w-3 text-emerald-400" />
                          Đã lưu câu
                        </>
                      ) : (
                        <>
                          <Bookmark className="h-3 w-3" />
                          Lưu vào sổ tay
                        </>
                      )}
                    </button>
                  </div>
                )}

                {msg.coachingTip && (
                  <div className="mt-2 rounded-xl bg-slate-800/80 px-3 py-2 text-xs text-amber-200">
                    💡 {msg.coachingTip}
                  </div>
                )}
              </div>

              {/* Native phrasing upgrade card for user turns */}
              {isUser && msg.naturalRewrite && (
                <div className="mt-1.5 max-w-[92%] sm:max-w-[82%] rounded-2xl border border-emerald-500/30 bg-emerald-950/60 px-3.5 py-2.5 text-xs">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="inline-flex items-center gap-1 font-bold text-emerald-300">
                      <Sparkles className="h-3.5 w-3.5" />
                      Cách người bản xứ nói tự nhiên hơn:
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() =>
                          void speakAiSentence(msg.naturalRewrite || '')
                        }
                        className="inline-flex items-center gap-1 rounded-lg bg-emerald-900/70 px-2 py-0.5 text-[11px] font-semibold text-emerald-200 hover:bg-emerald-800 cursor-pointer"
                      >
                        <Volume2 className="h-3 w-3" />
                        Nghe mẫu
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          handleSavePhrase(
                            msg.naturalRewrite || '',
                            msg.englishText
                          )
                        }
                        className="inline-flex items-center gap-1 rounded-lg bg-emerald-900/70 px-2 py-0.5 text-[11px] font-semibold text-emerald-200 hover:bg-emerald-800 cursor-pointer"
                      >
                        {isSavedRewrite ? (
                          <Check className="h-3 w-3" />
                        ) : (
                          <Bookmark className="h-3 w-3" />
                        )}
                        {isSavedRewrite ? 'Đã lưu' : 'Lưu'}
                      </button>
                    </div>
                  </div>
                  <p className="text-sm font-semibold text-white">
                    “{msg.naturalRewrite}”
                  </p>
                </div>
              )}
            </div>
          );
        })}

        {phase === 'thinking' && (
          <div className="flex items-center gap-2 text-xs text-cyan-300 pl-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>{persona.name} đang nghe và chuẩn bị câu trả lời...</span>
          </div>
        )}

        {errorMsg && (
          <div className="rounded-2xl border border-rose-500/40 bg-rose-950/70 px-4 py-3 text-xs text-rose-200">
            {errorMsg}
          </div>
        )}

        <div ref={messagesEndRef} />
      </main>

      {/* Bottom Smart Reply Hints + Mic Dock */}
      {phase !== 'ended' && (
        <footer className="sticky bottom-0 z-20 border-t border-slate-800 bg-slate-900/95 backdrop-blur-md px-4 py-3">
          <div className="mx-auto max-w-4xl space-y-3">
            {/* 3 Reply Hints for A0-A1 support */}
            {replyHints.length > 0 && (
              <div>
                <div className="text-[11px] font-semibold text-slate-400 mb-1.5">
                  💬 Gợi ý cách trả lời (nghe thử rồi đọc theo vào mic hoặc bấm gửi):
                </div>
                <div className="grid gap-2 sm:grid-cols-3">
                  {replyHints.map((hint, idx) => (
                    <div
                      key={`${idx}-${hint.en}`}
                      className="flex flex-col justify-between rounded-xl border border-slate-800 bg-slate-950/90 p-2.5"
                    >
                      <div>
                        <div className="text-xs font-semibold text-white">
                          {hint.en}
                        </div>
                        {hint.phonetic && (
                          <div className="text-[11px] text-cyan-300/90 mt-0.5">
                            /{hint.phonetic}/
                          </div>
                        )}
                        {showVietnamese && (
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            {hint.vi}
                          </div>
                        )}
                      </div>
                      <div className="mt-2 flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => void speakAiSentence(hint.en, 0.8)}
                          className="inline-flex items-center gap-1 rounded-lg bg-slate-800 px-2 py-1 text-[11px] font-medium text-cyan-300 hover:bg-slate-700 cursor-pointer"
                        >
                          <Volume2 className="h-3 w-3" />
                          Nghe mẫu
                        </button>
                        <button
                          type="button"
                          disabled={phase === 'thinking'}
                          onClick={() => void handleSendText(hint.en)}
                          className="inline-flex items-center gap-1 rounded-lg bg-indigo-600/80 px-2 py-1 text-[11px] font-medium text-white hover:bg-indigo-600 disabled:opacity-50 cursor-pointer"
                        >
                          Dùng câu này
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Mic + Text Input Controls */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="flex items-center gap-2">
                {/* Mode Toggle */}
                <button
                  type="button"
                  onClick={() =>
                    setMicMode((m) => (m === 'tap' ? 'handsfree' : 'tap'))
                  }
                  className={`rounded-xl border px-3 py-2.5 text-xs font-semibold transition cursor-pointer ${
                    micMode === 'handsfree'
                      ? 'border-cyan-500 bg-cyan-950/70 text-cyan-300'
                      : 'border-slate-700 bg-slate-800 text-slate-300'
                  }`}
                >
                  {micMode === 'handsfree' ? 'Rảnh tay (Auto)' : 'Chạm để nói'}
                </button>

                {/* Primary Mic Button */}
                <button
                  type="button"
                  disabled={phase === 'thinking' || phase === 'initializing'}
                  onClick={() => {
                    if (phase === 'recording') {
                      stopRecordingAndSend();
                    } else {
                      void startRecording();
                    }
                  }}
                  className={`relative flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-bold shadow-lg transition disabled:opacity-50 cursor-pointer ${
                    phase === 'recording'
                      ? 'bg-rose-600 text-white hover:bg-rose-700'
                      : 'bg-gradient-to-r from-indigo-600 to-cyan-600 text-white hover:from-indigo-500 hover:to-cyan-500'
                  }`}
                >
                  {phase === 'recording' ? (
                    <>
                      <MicOff className="h-4 w-4 animate-pulse" />
                      <span>Dừng & Gửi</span>
                      <span
                        className="ml-1 inline-block h-2.5 rounded-full bg-white/80 transition-all"
                        style={{ width: `${Math.max(8, micLevel * 0.4)}px` }}
                      />
                    </>
                  ) : (
                    <>
                      <Mic className="h-4 w-4" />
                      <span>Nói ngay</span>
                    </>
                  )}
                </button>
              </div>

              {/* Optional Text Fallback Input */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void handleSendText();
                }}
                className="flex flex-1 items-center gap-2"
              >
                <input
                  type="text"
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder="Hoặc gõ tiếng Anh / Việt nếu đang ở nơi ồn..."
                  className="flex-1 rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2.5 text-sm text-white placeholder-slate-400 focus:border-cyan-500 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={!textInput.trim() || phase === 'thinking'}
                  aria-label="Gửi tin nhắn"
                  className="rounded-xl bg-slate-800 p-2.5 text-cyan-400 hover:bg-slate-700 disabled:opacity-40 cursor-pointer"
                >
                  <Send className="h-4 w-4" />
                </button>
              </form>
            </div>
          </div>
        </footer>
      )}

      {/* Session Ended Summary Modal */}
      {phase === 'ended' && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl border border-slate-700 bg-slate-900 p-6 text-center shadow-2xl">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-cyan-500 text-2xl">
              🎉
            </div>
            <h2 className="text-xl font-bold text-white">
              Tuyệt vời lắm, {profile?.displayName || 'bạn'}!
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              Bạn vừa hoàn thành một buổi luyện giao tiếp thực tế với {persona.name}.
            </p>

            <div className="my-5 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-slate-800 p-3">
                <div className="text-lg font-bold text-cyan-400">
                  {formatTimer(elapsedSeconds)}
                </div>
                <div className="text-[11px] text-slate-400">Thời gian gọi</div>
              </div>
              <div className="rounded-2xl bg-slate-800 p-3">
                <div className="text-lg font-bold text-emerald-400">
                  {userTurns} lượt
                </div>
                <div className="text-[11px] text-slate-400">Câu bạn đã nói</div>
              </div>
            </div>

            <div className="flex flex-col gap-2.5 sm:flex-row">
              <Link
                href="/history"
                className="flex-1 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-xs font-semibold text-white hover:bg-slate-700"
              >
                Xem lại hội thoại
              </Link>
              <Link
                href="/"
                className="flex-1 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-indigo-700"
              >
                Về trang chủ
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CallPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
          <Loader2 className="h-7 w-7 animate-spin text-cyan-400" />
        </div>
      }
    >
      <CallStudioInner />
    </Suspense>
  );
}
