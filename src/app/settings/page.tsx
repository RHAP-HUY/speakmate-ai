'use client';

import {
  CheckCircle2,
  Download,
  ExternalLink,
  LogOut,
  RefreshCw,
  Trash2,
  Upload,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { WorkspacePageSkeleton } from '@/components/PageSkeleton';
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
      setKeyError('Vui lòng dán khóa API cá nhân vào ô trước khi kiểm tra.');
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
      if (!res.ok) throw new Error(data.error || 'Khóa không hợp lệ.');
      setKeyMessage(`Khóa hợp lệ (${data.keyHint}). Bạn có thể bấm Lưu khóa cá nhân.`);
    } catch (err) {
      setKeyError(err instanceof Error ? err.message : 'Kiểm tra khóa thất bại.');
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
      if (!res.ok) throw new Error(data.error || 'Không thể lưu cấu hình khóa API.');

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
            ? 'Đã chuyển sang sử dụng khóa Gemini cá nhân của bạn.'
            : 'Đã chuyển sang sử dụng nguồn kết nối chung của hệ thống.')
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
      setKeyMessage('Đã gỡ khóa cá nhân và quay về chế độ mặc định.');
    } finally {
      setKeyActionLoading(false);
    }
  }

  if (loading || !profile) {
    return <WorkspacePageSkeleton title="Cài đặt hồ sơ" />;
  }

  return (
    <AppShell
      profile={profile}
      authenticated={authenticated}
      maxWidthClass="max-w-3xl"
    >
      <div className="space-y-1">
        <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">
          Hồ sơ &amp; Đồng bộ dữ liệu
        </h1>
        <p className="text-sm text-gray-500">
          Quản lý mục tiêu hàng ngày, tài khoản Google Drive và bản sao lưu tiến trình học tập.
        </p>
      </div>

      {/* Cloud Sync & Backup */}
      <section className="rounded-3xl border border-gray-200/80 bg-white p-6 shadow-xs space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1 max-w-lg">
            <h2 className="font-display text-base font-bold text-gray-900">
              Đồng bộ Google Drive &amp; Sao lưu tệp
            </h2>
            <p className="text-xs text-gray-500 leading-relaxed">
              {sessionInfo?.provider === 'google' && sessionInfo.user
                ? `Đang kết nối với ${sessionInfo.user.email}. Mọi tiến trình học, chuỗi ngày và sổ câu tự động cập nhật lên Google Drive.`
                : sessionInfo?.provider === 'supabase' && sessionInfo.user
                  ? `Đang đồng bộ đám mây (${sessionInfo.user.email}).`
                  : 'Hiện đang lưu trên trình duyệt này. Đăng nhập Google để tự động khôi phục dữ liệu khi đổi thiết bị.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/onboarding"
              className="btn-duo btn-duo-white px-4 py-2 text-xs"
            >
              Thiết lập lại lộ trình
            </Link>
            <Link
              href="/auth"
              className="btn-duo btn-duo-primary px-4 py-2 text-xs"
            >
              Tài khoản Google →
            </Link>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 pt-3 border-t border-gray-100">
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
                    ? 'Đã đồng bộ toàn bộ hồ sơ, lịch chuỗi và nhật ký hội thoại lên Google Drive.'
                    : `Không thể đồng bộ lúc này: ${res.error}`
                );
              }}
              className="btn-duo btn-duo-coral px-4 py-2 text-xs"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${syncingDrive ? 'animate-spin' : ''}`}
              />
              {syncingDrive ? 'Đang đồng bộ...' : 'Đồng bộ ngay'}
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
              setBackupNotice('Đã tải tệp sao lưu (.json) về máy của bạn.');
            }}
            className="btn-duo btn-duo-white px-4 py-2 text-xs"
          >
            <Download className="h-3.5 w-3.5" />
            Tải bản sao lưu (.json)
          </button>

          <label className="btn-duo btn-duo-white px-4 py-2 text-xs">
            <Upload className="h-3.5 w-3.5" />
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
                  setBackupNotice('Đã khôi phục toàn bộ tiến trình học tập.');
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
              className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" />
              Đăng xuất
            </button>
          )}
        </div>

        {backupNotice && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs font-medium text-emerald-800">
            {backupNotice}
          </div>
        )}
      </section>

      {/* Profile Form */}
      <section className="rounded-3xl border border-gray-200/80 bg-white p-6 shadow-xs">
        <h2 className="font-display text-lg font-bold text-gray-900 mb-5">
          Thông tin cá nhân hóa nội dung học
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

      {/* API Key Configuration */}
      <section className="rounded-3xl border border-gray-200/80 bg-white p-6 shadow-xs space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-base font-bold text-gray-900">
              Cấu hình kết nối giọng nói &amp; ngôn ngữ
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Dùng hạn mức mặc định của hệ thống hoặc gắn khóa Gemini API riêng của bạn.
            </p>
          </div>
          <span className="font-mono text-[11px] text-gray-400 tabular-nums">
            Hệ thống: {keyStatus.sharedPoolCount} khóa sẵn sàng
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => void handleSaveKeySettings('system')}
            disabled={keyActionLoading}
            className={`rounded-2xl border p-4 text-left transition cursor-pointer ${
              keyStatus.apiKeyMode === 'system'
                ? 'border-gray-900 bg-gray-50 ring-1 ring-gray-900'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-gray-900">
                Dùng kết nối hệ thống (Khuyên dùng)
              </span>
              {keyStatus.apiKeyMode === 'system' && (
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              )}
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Hoạt động ngay lập tức, không cần thiết lập thêm.
            </p>
          </button>

          <button
            type="button"
            onClick={() =>
              setKeyStatus((prev) => ({ ...prev, apiKeyMode: 'personal' }))
            }
            className={`rounded-2xl border p-4 text-left transition cursor-pointer ${
              keyStatus.apiKeyMode === 'personal'
                ? 'border-gray-900 bg-gray-50 ring-1 ring-gray-900'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-gray-900">
                Dùng khóa Gemini cá nhân
              </span>
              {keyStatus.apiKeyMode === 'personal' && (
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              )}
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Dùng hạn mức riêng của bạn, mã hóa AES-256-GCM trên máy chủ.
            </p>
          </button>
        </div>

        {keyStatus.apiKeyMode === 'personal' && (
          <div className="rounded-2xl border border-gray-200 bg-[#F6F7F9] p-4 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-gray-900">
                {keyStatus.personalKeyHint
                  ? `Khóa đang lưu: ${keyStatus.personalKeyHint}`
                  : 'Nhập khóa Gemini API của bạn'}
              </span>
              <a
                href="https://aistudio.google.com/apikey"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 font-semibold text-[#E5483F] hover:underline"
              >
                Lấy khóa tại Google AI Studio
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>

            <input
              type="password"
              value={personalInput}
              onChange={(e) => setPersonalInput(e.target.value)}
              placeholder="AIza..."
              className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-sm font-mono focus:border-gray-900 focus:outline-none"
            />

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleTestKey}
                disabled={keyActionLoading}
                className="btn-duo btn-duo-white px-4 py-2 text-xs"
              >
                Kiểm tra khóa
              </button>
              <button
                type="button"
                onClick={() => void handleSaveKeySettings('personal')}
                disabled={keyActionLoading}
                className="btn-duo btn-duo-primary px-4 py-2 text-xs"
              >
                Lưu khóa cá nhân
              </button>
              {keyStatus.hasPersonalKey && (
                <button
                  type="button"
                  onClick={handleDeletePersonalKey}
                  disabled={keyActionLoading}
                  className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Gỡ khóa
                </button>
              )}
            </div>
          </div>
        )}

        {keyError && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-700">
            {keyError}
          </div>
        )}
        {keyMessage && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs font-medium text-emerald-800">
            {keyMessage}
          </div>
        )}
      </section>
    </AppShell>
  );
}
