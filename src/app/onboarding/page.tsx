'use client';

import { Loader2, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ProfileForm } from '@/components/ProfileForm';
import { getCurrentProfile, saveProfile } from '@/lib/data-store';
import type { UserProfile } from '@/types';

export default function OnboardingPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getCurrentProfile().then(({ profile: loaded, authenticated }) => {
      if (!active) return;
      if (!authenticated) {
        router.replace('/auth?next=/onboarding');
        return;
      }
      setProfile(loaded);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [router]);

  if (loading || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="h-7 w-7 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/40 to-cyan-50/40 py-8 px-4">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 text-center">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-cyan-500 text-white shadow-md mb-3">
            <Sparkles className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
            Cá nhân hóa gia sư AI cho riêng bạn
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Chỉ mất 30 giây! Thông tin này được lưu vào tài khoản để AI nhớ tên, nghề nghiệp và sở thích của bạn trên mọi thiết bị.
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/50 sm:p-8">
          <ProfileForm
            initialProfile={profile}
            mode="onboarding"
            onSave={async (updates) => {
              await saveProfile(updates);
              router.push('/');
              router.refresh();
            }}
          />
        </div>
      </div>
    </div>
  );
}
