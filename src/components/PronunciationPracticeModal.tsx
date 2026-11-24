'use client';

import {
  Award,
  Headphones,
  Loader2,
  Mic,
  MicOff,
  RotateCcw,
  Volume2,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  createSpeechRecorder,
  playNaturalVoice,
  stopVoicePlayback,
} from '@/lib/audio';
import { getLocalPersonalKey } from '@/lib/data-store';
import type {
  AiPersona,
  EnglishLevel,
  PronunciationPracticeResult,
  UserProfile,
} from '@/types';
import { getScoreTone } from './PronunciationBadge';

export interface PronunciationPracticeTarget {
  sentence: string;
  vietnamese?: string | null;
  phonetic?: string | null;
}

interface PronunciationPracticeModalProps {
  target: PronunciationPracticeTarget | null;
  persona: AiPersona;
  profile: UserProfile | null;
  onClose: () => void;
}

interface PronunciationPracticeModalInnerProps {
  target: PronunciationPracticeTarget;
  persona: AiPersona;
  profile: UserProfile | null;
  onClose: () => void;
}

export function PronunciationPracticeModal({
  target,
  persona,
  profile,
  onClose,
}: PronunciationPracticeModalProps) {
  if (!target) return null;
  return (
    <PronunciationPracticeModalInner
      key={target.sentence}
      target={target}
      persona={persona}
      profile={profile}
      onClose={onClose}
    />
  );
}

function PronunciationPracticeModalInner({
  target,
  persona,
  profile,
  onClose,
}: PronunciationPracticeModalInnerProps) {
  const [status, setStatus] = useState<'idle' | 'recording' | 'scoring'>('idle');
  const [micLevel, setMicLevel] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [result, setResult] = useState<PronunciationPracticeResult | null>(null);
  const [bestScore, setBestScore] = useState<number | null>(null);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [userAudioUrl, setUserAudioUrl] = useState<string | null>(null);
  const [canRetryScoring, setCanRetryScoring] = useState<boolean>(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordStartRef = useRef<number>(0);
  const rafRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const userAudioUrlRef = useRef<string | null>(null);
  const userAudioElRef = useRef<HTMLAudioElement | null>(null);
  const lastAudioBlobRef = useRef<Blob | null>(null);

  const stopMediaResources = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
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
  }, []);

  const cleanupRecording = useCallback(() => {
    stopMediaResources();
    setMicLevel(0);
  }, [stopMediaResources]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      stopVoicePlayback();
      stopMediaResources();
      if (userAudioElRef.current) {
        userAudioElRef.current.pause();
        userAudioElRef.current = null;
      }
      if (userAudioUrlRef.current) {
        URL.revokeObjectURL(userAudioUrlRef.current);
        userAudioUrlRef.current = null;
      }
    };
  }, [onClose, stopMediaResources]);

  const sentence = target.sentence;

  function playSample(speed = 0.85) {
    if (userAudioElRef.current) {
      userAudioElRef.current.pause();
    }
    void playNaturalVoice({
      text: sentence,
      voice: persona.edgeVoice,
      browserLang: persona.browserLang,
      speed,
    });
  }

  function playUserRecording() {
    if (!userAudioUrl) return;
    stopVoicePlayback();
    if (userAudioElRef.current) {
      userAudioElRef.current.pause();
    }
    const audio = new Audio(userAudioUrl);
    userAudioElRef.current = audio;
    void audio.play();
  }

  async function submitAudioForScoring(blob: Blob) {
    lastAudioBlobRef.current = blob;
    setStatus('scoring');
    setErrorMsg(null);
    setCanRetryScoring(false);

    try {
      const headers: Record<string, string> = {};
      const personalKey = getLocalPersonalKey();
      if (personalKey && profile?.apiKeyMode === 'personal') {
        headers['x-user-gemini-key'] = personalKey;
      }

      const fd = new FormData();
      fd.append(
        'payload',
        JSON.stringify({
          targetSentence: sentence,
          personaId: persona.id,
          accentLabel: persona.accentLabel,
          englishLevel: (profile?.englishLevel ?? 'A0-A1') as EnglishLevel,
          profileOverride: profile
            ? {
                displayName: profile.displayName,
                englishLevel: profile.englishLevel,
                jobField: profile.jobField,
                hobbies: profile.hobbies,
              }
            : undefined,
        })
      );
      fd.append('audio', blob, 'practice.webm');

      const res = await fetch('/api/tutor/pronunciation', {
        method: 'POST',
        headers,
        body: fd,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Không thể chấm điểm phát âm lúc này.');
      }

      const assessment = data.assessment as PronunciationPracticeResult;
      setResult(assessment);
      setLatencyMs(
        typeof data.meta?.latencyMs === 'number' ? data.meta.latencyMs : null
      );
      setBestScore((prev) =>
        prev === null
          ? assessment.overallScore
          : Math.max(prev, assessment.overallScore)
      );
    } catch (err) {
      setCanRetryScoring(true);
      setErrorMsg(
        err instanceof Error ? err.message : 'Lỗi khi chấm điểm phát âm.'
      );
    } finally {
      setStatus('idle');
    }
  }

  async function startPracticeRecording() {
    if (status === 'scoring') return;
    setErrorMsg(null);
    stopVoicePlayback();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
        },
      });
      streamRef.current = stream;

      const recorder = createSpeechRecorder(stream);
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
        cleanupRecording();

        if (duration < 400 || blob.size < 900) {
          setErrorMsg('Đoạn ghi âm hơi ngắn. Bạn hãy đọc hết câu rồi bấm Dừng nhé!');
          setStatus('idle');
          return;
        }

        if (userAudioUrlRef.current) {
          URL.revokeObjectURL(userAudioUrlRef.current);
        }
        const url = URL.createObjectURL(blob);
        userAudioUrlRef.current = url;
        setUserAudioUrl(url);

        void submitAudioForScoring(blob);
      };

      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (AudioContextClass) {
        const ctx = new AudioContextClass();
        audioCtxRef.current = ctx;
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        const buf = new Uint8Array(analyser.fftSize);
        const tick = () => {
          if (
            !mediaRecorderRef.current ||
            mediaRecorderRef.current.state !== 'recording'
          ) {
            return;
          }
          analyser.getByteTimeDomainData(buf);
          let sum = 0;
          for (let i = 0; i < buf.length; i++) {
            const norm = (buf[i] - 128) / 128;
            sum += norm * norm;
          }
          setMicLevel(Math.min(100, Math.round(Math.sqrt(sum / buf.length) * 360)));
          rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
      }

      recorder.start(200);
      setStatus('recording');
    } catch {
      cleanupRecording();
      setErrorMsg(
        'Không thể mở Micro. Hãy kiểm tra quyền Micro của trình duyệt nhé.'
      );
      setStatus('idle');
    }
  }

  function stopPracticeRecording() {
    const rec = mediaRecorderRef.current;
    if (rec && rec.state !== 'inactive') {
      rec.stop();
    }
  }

  const scoreTone = result ? getScoreTone(result.overallScore) : null;
  const wordsToFix = result
    ? result.wordFeedback.filter((w) => w.status !== 'good')
    : [];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Luyện đọc và chấm điểm phát âm"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 text-slate-900 shadow-2xl space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="font-mono text-[11px] font-semibold text-blue-700">
              CHẤM ĐIỂM PHÁT ÂM · GIỌNG {persona.accent}
            </div>
            <h2 className="mt-1 text-lg font-bold tracking-tight text-zinc-950">
              Luyện đọc theo giọng bản xứ
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-800 cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Target Sentence Box */}
        <div className="rounded-xl border border-zinc-200 bg-[#FAF9F6] p-4 space-y-2">
          <p className="text-base sm:text-lg font-bold text-zinc-950 leading-snug">
            “{sentence}”
          </p>
          {target.phonetic && (
            <p className="font-mono text-xs text-blue-700">
              /{target.phonetic}/
            </p>
          )}
          {target.vietnamese && (
            <p className="text-xs text-zinc-600">{target.vietnamese}</p>
          )}

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => playSample(0.88)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-white border border-zinc-200 px-3 py-1.5 text-xs font-semibold text-zinc-900 hover:bg-zinc-50 cursor-pointer"
            >
              <Volume2 className="h-3.5 w-3.5 text-blue-700" />
              Nghe mẫu ({persona.name})
            </button>
            <button
              type="button"
              onClick={() => playSample(0.72)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-white border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 cursor-pointer"
            >
              Nghe chậm 0.72x
            </button>
            {userAudioUrl && (
              <button
                type="button"
                onClick={playUserRecording}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 cursor-pointer"
              >
                <Headphones className="h-3.5 w-3.5" />
                Nghe giọng bạn
              </button>
            )}
          </div>
        </div>

        {/* Record CTA */}
        <div className="flex flex-col items-center justify-center gap-2 py-1">
          <button
            type="button"
            disabled={status === 'scoring'}
            onClick={() => {
              if (status === 'recording') {
                stopPracticeRecording();
              } else {
                void startPracticeRecording();
              }
            }}
            className={`inline-flex items-center gap-2.5 rounded-xl px-6 py-3 text-sm font-semibold text-white shadow-sm transition disabled:opacity-60 cursor-pointer ${
              status === 'recording'
                ? 'bg-rose-600 hover:bg-rose-700'
                : 'bg-zinc-900 hover:bg-zinc-800'
            }`}
          >
            {status === 'scoring' ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                AI đang phân tích từng âm...
              </>
            ) : status === 'recording' ? (
              <>
                <MicOff className="h-4 w-4 animate-pulse" />
                Dừng & Chấm điểm
                <span
                  className="ml-1 inline-block h-2.5 rounded-full bg-white/90 transition-all"
                  style={{ width: `${Math.max(10, micLevel * 0.45)}px` }}
                />
              </>
            ) : (
              <>
                {result ? (
                  <RotateCcw className="h-4 w-4" />
                ) : (
                  <Mic className="h-4 w-4" />
                )}
                {result ? 'Đọc lại để nâng điểm' : 'Bấm để đọc & Chấm điểm'}
              </>
            )}
          </button>
          <p className="text-[11px] text-slate-500">
            {status === 'recording'
              ? 'Đang thu âm... Đọc xong câu hãy bấm Dừng & Chấm điểm'
              : 'Nghe mẫu trước rồi đọc to rõ ràng như đang nói chuyện thật'}
          </p>
        </div>

        {errorMsg && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs text-rose-700 flex flex-wrap items-center justify-between gap-2">
            <span>{errorMsg}</span>
            {canRetryScoring && (
              <button
                type="button"
                onClick={() => {
                  const blob = lastAudioBlobRef.current;
                  if (blob) void submitAudioForScoring(blob);
                }}
                className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-indigo-700 cursor-pointer shrink-0"
              >
                <RotateCcw className="h-3 w-3" />
                Chấm lại bản vừa ghi
              </button>
            )}
          </div>
        )}

        {/* Pronunciation Result */}
        {result && scoreTone && (
          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-14 w-14 flex-col items-center justify-center rounded-2xl border font-bold ${scoreTone.pillLight}`}
                >
                  <span className="text-xl leading-none">
                    {result.overallScore}
                  </span>
                  <span className="text-[10px] font-semibold">/100</span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-bold ${scoreTone.textLight}`}>
                      {scoreTone.label}
                    </span>
                    {bestScore !== null && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                        <Award className="h-3 w-3" />
                        Kỷ lục: {bestScore}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5">
                    AI nghe được: <span className="font-medium text-slate-800">“{result.heardTranscript}”</span>
                  </p>
                </div>
              </div>
              {latencyMs !== null && (
                <span className="rounded-full bg-white border border-zinc-200 px-2 py-0.5 text-[10px] font-mono text-zinc-500 tabular-nums">
                  {(latencyMs / 1000).toFixed(1)}s
                </span>
              )}
            </div>

            {/* 3 Score bars */}
            <div className="grid grid-cols-3 gap-2.5">
              {[
                { label: 'Độ rõ âm', val: result.accuracyScore },
                { label: 'Trôi chảy', val: result.fluencyScore },
                { label: 'Ngữ điệu', val: result.intonationScore },
              ].map((m) => (
                <div
                  key={m.label}
                  className="rounded-xl bg-white border border-slate-200 p-2.5"
                >
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="text-slate-500">{m.label}</span>
                    <span className="font-bold text-slate-900">{m.val}</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full ${getScoreTone(m.val).bar}`}
                      style={{ width: `${m.val}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Word-by-word analysis */}
            <div>
              <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 mb-2">
                <span>Phân tích từng từ:</span>
                <span className="flex items-center gap-2 text-[10px]">
                  <span className="text-emerald-700">● Chuẩn</span>
                  <span className="text-amber-700">● Cần sửa</span>
                  <span className="text-rose-700">● Bỏ sót</span>
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {result.wordFeedback.map((wf, idx) => (
                  <span
                    key={`${wf.word}-${idx}`}
                    className={`rounded-xl border px-2.5 py-1 text-xs font-semibold ${
                      wf.status === 'good'
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                        : wf.status === 'improve'
                          ? 'border-amber-300 bg-amber-50 text-amber-900'
                          : 'border-rose-300 bg-rose-50 text-rose-800 line-through'
                    }`}
                  >
                    {wf.word}
                  </span>
                ))}
              </div>
            </div>

            {/* Detailed word fix tips */}
            {wordsToFix.length > 0 && (
              <div className="rounded-xl bg-white border border-amber-200/80 p-3 space-y-1.5">
                <div className="text-[11px] font-bold text-amber-800">
                  Các âm cần lưu ý:
                </div>
                {wordsToFix.slice(0, 6).map((w, idx) => (
                  <div
                    key={`${w.word}-detail-${idx}`}
                    className="flex flex-wrap items-baseline gap-1.5 text-xs text-slate-700"
                  >
                    <span
                      className={`font-bold ${
                        w.status === 'missing' ? 'text-rose-700' : 'text-amber-800'
                      }`}
                    >
                      {w.word}
                    </span>
                    {w.ipa && (
                      <span className="font-mono text-[11px] text-blue-700">
                        /{w.ipa.replace(/^\/|\/$/g, '')}/
                      </span>
                    )}
                    {w.tipVi && <span>— {w.tipVi}</span>}
                  </div>
                ))}
              </div>
            )}

            {/* Summary & linking tip */}
            <div className="space-y-2 text-xs">
              <p className="text-slate-700 leading-relaxed">
                <strong>Nhận xét:</strong> {result.summaryVi}
              </p>
              {result.linkingTipVi && (
                <div className="rounded-xl bg-blue-50/70 border border-blue-200 px-3 py-2 text-blue-950">
                  <strong>Nối âm &amp; ngữ điệu:</strong> {result.linkingTipVi}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
