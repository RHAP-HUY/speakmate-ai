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

/**
 * Authentic Duolingo 3-Zone App Shell:
 * - Left Fixed Navigation Rail (256px on lg+)
 * - Centered Main Learning Stage
 * - Optional Sticky Right Gamification Rail (350px on xl+)
 */
export function AppShell({
  profile,
  authenticated,
  rightRail,
  maxWidthClass = 'max-w-5xl',
  children,
}: AppShellProps) {
  return (
    <div className="min-h-screen bg-[#F7F9FC] flex flex-col">
      <AppNav profile={profile} authenticated={authenticated} variant="app" />

      <div className="flex-1 lg:pl-64 pb-24 lg:pb-12">
        {rightRail ? (
          <div className="mx-auto w-full max-w-[1140px] px-4 sm:px-6 py-6 grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_350px] gap-7 items-start">
            <main className="min-w-0 space-y-6">{children}</main>
            <aside className="xl:sticky xl:top-6 space-y-5">{rightRail}</aside>
          </div>
        ) : (
          <main className={`mx-auto w-full ${maxWidthClass} px-4 sm:px-6 py-6 space-y-6`}>
            {children}
          </main>
        )}
      </div>
    </div>
  );
}
