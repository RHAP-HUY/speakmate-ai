'use client';

import {
  CheckCircle2,
  Cloud,
  Download,
  ExternalLink,
  HardDrive,
  KeyRound,
  Loader2,
  LogOut,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { NovaCompanion } from '@/components/BrandArt';
import { ProfileForm } from '@/components/ProfileForm';
import {
  exportLocalProgressBackup,
  forceSyncToGoogleDrive,
  getAuthSessionInfo,
  getCurrentProfile,
  getLocalPersonalKey,
  importLocalProgressBackup,
  saveProfile,
  setLocalPersonalKey,
  signOutAccount,
} from '@/lib/data-store';
import type { ApiKeyMode, AuthSessionInfo, UserProfile } from '@/types';

interface KeyStatusInfo {
  apiKeyMode: ApiKeyMode;
  hasPersonalKey: boolean;
  personalKeyHint: string | null;
  sharedPoolCount: number;
  encryptionReady: boolean;
}

export default function SettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [authenticated, setAuthenticated] = useState(false);

  const [keyStatus, setKeyStatus] = useState<KeyStatusInfo>({
    apiKeyMode: 'system',
    hasPersonalKey: false,
    personalKeyHint: null,
    sharedPoolCount: 0,
    encryptionReady: false,
  });

  const [personalInput, setPersonalInput] = useState('');
  const [keyActionLoading, setKeyActionLoading] = useState(false);
  const [keyMessage, setKeyMessage] = useState<string | null>(null);
  const [keyError, setKeyError] = useState<string | null>(null);
  const [backupNotice, setBackupNotice] = useState<string | null>(null);
  const [syncingDrive, setSyncingDrive] = useState(false);
  const [sessionInfo, setSessionInfo] = useState<AuthSessionInfo | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      const [{ profile: prof, authenticated: isAuth }, sInfo] =
        await Promise.all([getCurrentProfile(), getAuthSessionInfo(true)]);
      if (!active) return;
      if (!isAuth || !prof) {
        router.replace('/auth?next=/settings');
        return;
      }
      setProfile(prof);
      setAuthenticated(true);
      setSessionInfo(sInfo);

      try {
        const res = await fetch('/api/user-key');
        if (res.ok) {
          const data = (await res.json()) as KeyStatusInfo;
          if (active) {
            const localKey = getLocalPersonalKey();
            setKeyStatus({
              ...data,
              apiKeyMode: prof.apiKeyMode || data.apiKeyMode,
              hasPersonalKey: data.hasPersonalKey || Boolean(localKey),
            });
          }
        }
      } catch {
        // ignore network issues
      }

      if (active) setLoading(false);
    }

    void load();
    return () => {
      active = false;
    };
  }, [router]);

  async function handleTestKey() {
    setKeyError(null);
    setKeyMessage(null);
    if (!personalInput.trim()) {
      setKeyError('Hãy dán Gemini API Key cá nhân của bạn vào ô trước khi kiểm tra.');
      return;
    }
    setKeyActionLoading(true);
    try {
      const res = await fetch('/api/user-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test', personalKey: personalInput.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Key không hợp lệ.');
      setKeyMessage(`Key hợp lệ (${data.keyHint})! Bạn có thể bấm Lưu cài đặt Key.`);
    } catch (err) {
      setKeyError(err instanceof Error ? err.message : 'Kiểm tra Key thất bại.');
    } finally {
      setKeyActionLoading(false);
    }
  }

  async function handleSaveKeySettings(targetMode: ApiKeyMode) {
    setKeyError(null);
    setKeyMessage(null);
    setKeyActionLoading(true);

    try {
      const cleaned = personalInput.trim();
      const res = await fetch('/api/user-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save',
          apiKeyMode: targetMode,
          personalKey: cleaned || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Không thể lưu cấu hình API Key.');

      if (cleaned && !data.storedOnServer) {
        setLocalPersonalKey(cleaned);
      }

      const updatedProfile = await saveProfile({ apiKeyMode: targetMode });
      setProfile(updatedProfile);
      setKeyStatus((prev) => ({
        ...prev,
        apiKeyMode: targetMode,
        hasPersonalKey: prev.hasPersonalKey || Boolean(cleaned),
        personalKeyHint: data.keyHint || prev.personalKeyHint,
      }));
      setPersonalInput('');
      setKeyMessage(
        data.warning ||
          (targetMode === 'personal'
            ? 'Đã chuyển sang dùng Gemini API Key cá nhân của bạn.'
            : 'Đã chuyển sang dùng API Key dùng chung của hệ thống.')
      );
    } catch (err) {
      setKeyError(err instanceof Error ? err.message : 'Lưu thất bại.');
    } finally {
      setKeyActionLoading(false);
    }
  }

  async function handleDeletePersonalKey() {
    setKeyError(null);
    setKeyMessage(null);
    setKeyActionLoading(true);
    try {
      await fetch('/api/user-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete' }),
      });
      setLocalPersonalKey(null);
      const updated = await saveProfile({ apiKeyMode: 'system' });
      setProfile(updated);
      setKeyStatus((prev) => ({
        ...prev,
        apiKeyMode: 'system',
        hasPersonalKey: false,
        personalKeyHint: null,
      }));
      setKeyMessage('Đã xóa API Key cá nhân và quay về chế độ dùng chung.');
    } finally {
      setKeyActionLoading(false);
    }
  }

  if (loading || !profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-mesh-light">
        <NovaCompanion mood="happy" className="h-18 w-18 animate-gentle-float" />
        <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <AppShell
      profile={profile}
      authenticated={authenticated}
      maxWidthClass="max-w-3xl"
    >
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900">
          Hồ sơ, Đồng bộ Drive 5TB &amp; API Key
        </h1>
        <p className="text-sm font-medium text-slate-500 mt-1">
          Tùy chỉnh cá nhân hóa học tập, đồng bộ tài khoản Google và quản lý nguồn Gemini AI.
        </p>
      </div>

      {/* Google Drive 5TB Cloud Sync Card */}
      <section className="card-duo-elevated p-6 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
              {sessionInfo?.provider === 'google' ? (
                <HardDrive className="h-5 w-5 text-emerald-600" />
              ) : (
                <Cloud className="h-5 w-5 text-indigo-600" />
              )}
              Lưu trữ Google Drive 5TB &amp; Đồng bộ Tài khoản
            </h2>
            <p className="text-xs font-medium text-slate-500 mt-1">
              {sessionInfo?.provider === 'google' && sessionInfo.user
                ? `Đang đăng nhập Google (${sessionInfo.user.email}) · Chế độ: ${
                    sessionInfo.storageMode === 'google-drive-owner'
                      ? 'Kho Drive 5TB trung tâm'
                      : 'Google Drive của tài khoản'
                  }. Mọi tiến độ tự động lưu lên Drive.`
                : sessionInfo?.provider === 'supabase' && sessionInfo.user
                  ? `Đang đồng bộ đám mây (${sessionInfo.user.email}).`
                  : 'Đang lưu cục bộ trên máy này. Đăng nhập Google để lưu và khôi phục tự động qua mọi thiết bị.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/onboarding"
              className="btn-duo btn-duo-white px-3.5 py-2 text-xs"
            >
              <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
              Chọn lại Ngôn ngữ &amp; Sở thích
            </Link>
            <Link
              href="/auth"
              className="btn-duo btn-duo-blue px-3.5 py-2 text-xs"
            >
              Google / Apple →
            </Link>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 pt-1">
          {sessionInfo?.provider === 'google' && sessionInfo.authenticated && (
            <button
              type="button"
              disabled={syncingDrive}
              onClick={async () => {
                setSyncingDrive(true);
                setBackupNotice(null);
                const res = await forceSyncToGoogleDrive();
                setSyncingDrive(false);
                setBackupNotice(
                  res.ok
                    ? '✅ Đã đồng bộ toàn bộ hồ sơ, lịch chuỗi, XP & lịch sử lên Google Drive 5TB!'
                    : `Lỗi đồng bộ Drive: ${res.error}`
                );
              }}
              className="btn-duo btn-duo-green px-4 py-2.5 text-xs"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${syncingDrive ? 'animate-spin' : ''}`}
              />
              {syncingDrive ? 'Đang đồng bộ...' : 'Đồng bộ ngay lên Drive'}
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              const json = exportLocalProgressBackup();
              const blob = new Blob([json], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `speakmate-backup-${new Date().toISOString().slice(0, 10)}.json`;
              a.click();
              URL.revokeObjectURL(url);
              setBackupNotice(
                'Đã tải tệp sao lưu toàn bộ chuỗi học, XP, sổ tay & lịch sử!'
              );
            }}
            className="btn-duo btn-duo-white px-3.5 py-2.5 text-xs"
          >
            <Download className="h-3.5 w-3.5" />
            Xuất sao lưu (.json)
          </button>

          <label className="btn-duo btn-duo-white px-3.5 py-2.5 text-xs">
            <Upload className="h-3.5 w-3.5 text-[#1CB0F6]" />
            Khôi phục từ tệp
            <input
              type="file"
              accept="application/json"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                try {
                  const text = await file.text();
                  importLocalProgressBackup(text);
                  const { profile: reloaded } = await getCurrentProfile();
                  if (reloaded) setProfile(reloaded);
                  setBackupNotice(
                    'Đã khôi phục thành công toàn bộ dữ liệu học!'
                  );
                } catch {
                  setBackupNotice(
                    'Tệp sao lưu không hợp lệ, vui lòng chọn đúng tệp .json.'
                  );
                }
              }}
            />
          </label>

          {sessionInfo?.authenticated && sessionInfo.provider !== 'local' && (
            <button
              type="button"
              onClick={async () => {
                await signOutAccount();
                router.push('/auth');
                router.refresh();
              }}
              className="inline-flex items-center gap-1.5 rounded-xl border-2 border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-extrabold text-rose-700 hover:bg-rose-100 cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" />
              Đăng xuất
            </button>
          )}
        </div>

        {backupNotice && (
          <div className="rounded-xl border-2 border-emerald-200 bg-[#F1FDE8] px-3.5 py-2.5 text-xs font-extrabold text-[#3B8702]">
            {backupNotice}
          </div>
        )}
      </section>

      {/* Profile Form Card */}
      <section className="card-duo-elevated p-6">
        <h2 className="text-base font-black text-slate-900 mb-4">
          Thông tin học viên (Đồng bộ mọi thiết bị)
        </h2>
        <ProfileForm
          initialProfile={profile}
          mode="settings"
          onSave={async (updates) => {
            const saved = await saveProfile(updates);
            setProfile(saved);
          }}
        />
      </section>

      {/* Gemini API Key Card */}
      <section className="card-duo-elevated p-6 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-[#1CB0F6]" />
              Nguồn Google Gemini API Key
            </h2>
            <p className="text-xs font-medium text-slate-500 mt-1">
              Dùng chung Pool Key hệ thống hoặc gắn Key cá nhân riêng từng tài khoản.
            </p>
          </div>
          <span className="rounded-xl border-2 border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-black text-slate-700">
            Pool hệ thống: {keyStatus.sharedPoolCount} key
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => void handleSaveKeySettings('system')}
            disabled={keyActionLoading}
            className={`rounded-2xl border-2 p-4 text-left transition cursor-pointer ${
              keyStatus.apiKeyMode === 'system'
                ? 'border-[#1CB0F6] bg-[#DDF4FF]/50'
                : 'border-slate-200 bg-white hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-black text-slate-900">
                Dùng API hệ thống
              </span>
              {keyStatus.apiKeyMode === 'system' && (
                <CheckCircle2 className="h-5 w-5 text-[#1899D6]" />
              )}
            </div>
            <p className="mt-1 text-xs font-medium text-slate-600">
              Tự động xoay vòng qua {Math.max(1, keyStatus.sharedPoolCount)} key trên server. Không cần cài gì thêm.
            </p>
          </button>

          <button
            type="button"
            onClick={() =>
              setKeyStatus((prev) => ({ ...prev, apiKeyMode: 'personal' }))
            }
            className={`rounded-2xl border-2 p-4 text-left transition cursor-pointer ${
              keyStatus.apiKeyMode === 'personal'
                ? 'border-[#1CB0F6] bg-[#DDF4FF]/50'
                : 'border-slate-200 bg-white hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-black text-slate-900">
                Dùng API Key cá nhân
              </span>
              {keyStatus.apiKeyMode === 'personal' && (
                <CheckCircle2 className="h-5 w-5 text-[#1899D6]" />
              )}
            </div>
            <p className="mt-1 text-xs font-medium text-slate-600">
              Dùng hạn mức riêng của bạn, không lo giới hạn khi nhiều người dùng cùng lúc.
            </p>
          </button>
        </div>

        {keyStatus.apiKeyMode === 'personal' && (
          <div className="rounded-2xl border-2 border-slate-200 bg-[#F7F9FC] p-4 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-extrabold text-slate-700 flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                {keyStatus.personalKeyHint
                  ? `Đã lưu Key: ${keyStatus.personalKeyHint}`
                  : 'Nhập Gemini API Key miễn phí của bạn'}
              </span>
              <a
                href="https://aistudio.google.com/apikey"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 font-extrabold text-[#1899D6] hover:underline"
              >
                Lấy Key miễn phí
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>

            <input
              type="password"
              value={personalInput}
              onChange={(e) => setPersonalInput(e.target.value)}
              placeholder="Dán AIza... vào đây để thêm hoặc thay Key mới"
              className="w-full rounded-xl border-2 border-slate-200 bg-white px-3.5 py-2.5 text-sm font-mono focus:border-[#1CB0F6] focus:outline-none"
            />

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleTestKey}
                disabled={keyActionLoading}
                className="btn-duo btn-duo-white px-4 py-2 text-xs"
              >
                Kiểm tra Key
              </button>
              <button
                type="button"
                onClick={() => void handleSaveKeySettings('personal')}
                disabled={keyActionLoading}
                className="btn-duo btn-duo-green px-4 py-2 text-xs"
              >
                Lưu Key cá nhân
              </button>
              {keyStatus.hasPersonalKey && (
                <button
                  type="button"
                  onClick={handleDeletePersonalKey}
                  disabled={keyActionLoading}
                  className="inline-flex items-center gap-1 rounded-xl border-2 border-rose-200 bg-rose-50 px-3 py-2 text-xs font-extrabold text-rose-700 hover:bg-rose-100 cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Xóa Key
                </button>
              )}
            </div>
          </div>
        )}

        {keyError && (
          <div className="rounded-xl border-2 border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-bold text-rose-700">
            {keyError}
          </div>
        )}
        {keyMessage && (
          <div className="rounded-xl border-2 border-emerald-200 bg-[#F1FDE8] px-3.5 py-2.5 text-xs font-extrabold text-[#3B8702]">
            {keyMessage}
          </div>
        )}
      </section>
    </AppShell>
  );
}
