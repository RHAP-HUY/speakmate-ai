'use client';

import { NovaCompanion } from '@/components/BrandArt';

export function HubPageSkeleton() {
  return (
    <div
      className="min-h-screen bg-[#F6F7F9] flex flex-col"
      aria-busy="true"
      aria-label="Đang tải lộ trình học tập"
    >
      <header className="sticky top-0 z-30 border-b border-gray-200/80 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 h-16">
          <div className="flex items-center gap-2.5">
            <NovaCompanion className="h-8 w-8" />
            <span className="font-display text-[17px] font-bold tracking-tight text-gray-900">
              SpeakMate
            </span>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-16 rounded-full bg-gray-100 animate-pulse" />
            <div className="h-7 w-16 rounded-full bg-gray-100 animate-pulse" />
            <div className="h-8 w-8 rounded-full bg-gray-200 animate-pulse" />
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 py-8 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_336px] gap-8 items-start">
        <main className="min-w-0 space-y-6">
          <div className="space-y-2.5">
            <div className="h-8 w-72 max-w-full rounded-xl bg-gray-200/80 animate-pulse" />
            <div className="h-4 w-96 max-w-full rounded-lg bg-gray-200/60 animate-pulse" />
          </div>

          <div className="flex gap-2 overflow-hidden">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="h-9 w-28 shrink-0 rounded-full bg-white border border-gray-200 animate-pulse"
              />
            ))}
          </div>

          <div className="h-52 w-full rounded-3xl bg-gray-200/80 animate-pulse" />

          <div className="rounded-3xl border border-gray-200/80 bg-white overflow-hidden divide-y divide-gray-100">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-4">
                <div className="h-10 w-10 rounded-full bg-gray-100 animate-pulse shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-56 max-w-full rounded bg-gray-200/75 animate-pulse" />
                  <div className="h-3 w-80 max-w-full rounded bg-gray-100 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </main>

        <aside className="rounded-3xl border border-gray-200/80 bg-white p-5 space-y-5">
          <div className="h-6 w-40 rounded-lg bg-gray-200/80 animate-pulse" />
          <div className="grid grid-cols-7 gap-1.5">
            {[1, 2, 3, 4, 5, 6, 7].map((i) => (
              <div
                key={i}
                className="h-9 w-9 rounded-full bg-gray-100 animate-pulse mx-auto"
              />
            ))}
          </div>
          <div className="border-t border-gray-100 pt-5 space-y-3">
            <div className="h-4 w-32 rounded bg-gray-200/75 animate-pulse" />
            <div className="h-2 w-full rounded-full bg-gray-100 animate-pulse" />
            <div className="h-2 w-4/5 rounded-full bg-gray-100 animate-pulse" />
            <div className="h-2 w-3/5 rounded-full bg-gray-100 animate-pulse" />
          </div>
        </aside>
      </div>
    </div>
  );
}

export function WorkspacePageSkeleton({ title }: { title?: string }) {
  return (
    <div
      className="min-h-screen bg-[#F6F7F9] flex flex-col"
      aria-busy="true"
      aria-label={title ? `Đang tải ${title}` : 'Đang tải trang'}
    >
      <header className="sticky top-0 z-30 border-b border-gray-200/80 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 h-16">
          <div className="flex items-center gap-2.5">
            <NovaCompanion className="h-8 w-8" />
            <span className="font-display text-[17px] font-bold tracking-tight text-gray-900">
              SpeakMate
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-7 w-16 rounded-full bg-gray-100 animate-pulse" />
            <div className="h-8 w-8 rounded-full bg-gray-200 animate-pulse" />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl px-4 sm:px-6 py-8 space-y-6">
        <div className="space-y-2">
          <div className="h-8 w-64 max-w-full rounded-xl bg-gray-200/80 animate-pulse" />
          <div className="h-4 w-96 max-w-full rounded-lg bg-gray-200/60 animate-pulse" />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-24 rounded-2xl border border-gray-200/80 bg-white p-4 space-y-2.5"
            >
              <div className="h-3 w-20 rounded bg-gray-100 animate-pulse" />
              <div className="h-7 w-16 rounded bg-gray-200/75 animate-pulse" />
            </div>
          ))}
        </div>

        <div className="rounded-3xl border border-gray-200/80 bg-white p-6 space-y-4">
          <div className="h-5 w-48 rounded bg-gray-200/80 animate-pulse" />
          <div className="h-20 w-full rounded-2xl bg-gray-100 animate-pulse" />
          <div className="h-20 w-full rounded-2xl bg-gray-100 animate-pulse" />
        </div>
      </main>
    </div>
  );
}
