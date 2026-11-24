'use client';

import type { ReactNode } from 'react';
import { AppNav } from '@/components/AppNav';
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
  return (
    <div className="min-h-screen bg-[#F6F7F9] flex flex-col">
      <AppNav profile={profile} authenticated={authenticated} variant="app" />

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
