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
    <div className="min-h-screen bg-[#FAF9F6] flex flex-col">
      <AppNav profile={profile} authenticated={authenticated} variant="app" />

      <div className="flex-1 lg:pl-60 pb-24 lg:pb-12">
        {rightRail ? (
          <div className="mx-auto w-full max-w-[1140px] px-4 sm:px-6 py-7 grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_340px] gap-7 items-start">
            <main className="min-w-0 space-y-6">{children}</main>
            <aside className="xl:sticky xl:top-6 space-y-4">{rightRail}</aside>
          </div>
        ) : (
          <main className={`mx-auto w-full ${maxWidthClass} px-4 sm:px-6 py-7 space-y-6`}>
            {children}
          </main>
        )}
      </div>
    </div>
  );
}
