import { NextResponse } from 'next/server';
import {
  getGoogleOAuthConfig,
  readGoogleSession,
} from '@/lib/google-auth';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { AuthSessionInfo } from '@/types';

export async function GET() {
  const googleCfg = getGoogleOAuthConfig();
  const supabaseConfigured = isSupabaseConfigured();

  // 1. Check direct Google OAuth + Google Drive 5TB session
  const googleSession = await readGoogleSession();
  if (googleSession) {
    const info: AuthSessionInfo = {
      authenticated: true,
      provider: 'google',
      storageMode: googleCfg.ownerDriveConfigured
        ? 'google-drive-owner'
        : 'google-drive-user',
      googleConfigured: googleCfg.configured,
      ownerDriveConfigured: googleCfg.ownerDriveConfigured,
      supabaseConfigured,
      user: {
        id: googleSession.userId,
        email: googleSession.email,
        name: googleSession.name,
        avatarUrl: googleSession.picture ?? null,
      },
    };
    return NextResponse.json(info, {
      headers: { 'Cache-Control': 'no-store, private' },
    });
  }

  // 2. Check Supabase Auth session if configured
  if (supabaseConfigured) {
    const supabase = await createSupabaseServerClient();
    if (supabase) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const info: AuthSessionInfo = {
          authenticated: true,
          provider: 'supabase',
          storageMode: 'supabase',
          googleConfigured: googleCfg.configured,
          ownerDriveConfigured: googleCfg.ownerDriveConfigured,
          supabaseConfigured,
          user: {
            id: user.id,
            email: user.email || '',
            name:
              String(user.user_metadata?.display_name || '') ||
              String(user.user_metadata?.full_name || '') ||
              user.email?.split('@')[0] ||
              'Học viên',
            avatarUrl:
              typeof user.user_metadata?.avatar_url === 'string'
                ? user.user_metadata.avatar_url
                : null,
          },
        };
        return NextResponse.json(info, {
          headers: { 'Cache-Control': 'no-store, private' },
        });
      }
    }
  }

  // 3. Unauthenticated (or local demo mode when neither Google OAuth nor Supabase is configured)
  const info: AuthSessionInfo = {
    authenticated: false,
    provider: 'local',
    storageMode: 'local',
    googleConfigured: googleCfg.configured,
    ownerDriveConfigured: googleCfg.ownerDriveConfigured,
    supabaseConfigured,
    user: null,
  };
  return NextResponse.json(info, {
    headers: { 'Cache-Control': 'no-store, private' },
  });
}
