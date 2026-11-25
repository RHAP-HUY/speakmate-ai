'use client';

import { WifiOff } from 'lucide-react';
import { type ReactNode, useEffect, useState } from 'react';
import { AppNav } from '@/components/AppNav';
import {
  type DriveSyncStatus,
  getDriveSyncStatus,
  SYNC_STATUS_EVENT,
} from '@/lib/data-store';
import type { UserProfile } from '@/types';

interface AppShellProps {
  profile: UserProfile | null;
  authenticated: boolean;
  rightRail?: ReactNode;
  maxWidthClass?: string;
  children: ReactNode;
}

export function AppShell({
  profile,
  authenticated,
  rightRail,
  maxWidthClass = 'max-w-5xl',
  children,
}: AppShellProps) {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const updateNet = () => {
      setIsOffline(
        !navigator.onLine || getDriveSyncStatus() === 'offline'
      );
    };
    updateNet();

    const onSyncEvent = (ev: Event) => {
      const detail = (ev as CustomEvent<{ status?: DriveSyncStatus }>).detail;
      if (detail?.status === 'offline') {
        setIsOffline(true);
      } else if (navigator.onLine) {
        setIsOffline(false);
      }
    };

    window.addEventListener('online', updateNet);
    window.addEventListener('offline', updateNet);
    window.addEventListener(SYNC_STATUS_EVENT, onSyncEvent);
    return () => {
      window.removeEventListener('online', updateNet);
      window.removeEventListener('offline', updateNet);
      window.removeEventListener(SYNC_STATUS_EVENT, onSyncEvent);
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#F6F7F9] flex flex-col">
      <AppNav profile={profile} authenticated={authenticated} variant="app" />

      {isOffline && (
        <div
          role="status"
          className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-xs font-medium text-amber-900"
        >
          <span className="inline-flex items-center gap-1.5">
            <WifiOff className="h-3.5 w-3.5 text-amber-700" />
            Đang ngoại tuyến — Tiến trình học và sổ tay vẫn lưu trên máy và sẽ tự đồng bộ khi có mạng lại.
          </span>
        </div>
      )}

      <div className="flex-1 pb-24 lg:pb-16">
        {rightRail ? (
          <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 py-8 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_336px] gap-8 items-start">
            <main id="main-content" className="min-w-0 space-y-7">{children}</main>
            <aside className="lg:sticky lg:top-24 space-y-5">{rightRail}</aside>
          </div>
        ) : (
          <main
            id="main-content"
            className={`mx-auto w-full ${maxWidthClass} px-4 sm:px-6 py-8 space-y-7`}
          >
            {children}
          </main>
        )}
      </div>
    </div>
  );
}
