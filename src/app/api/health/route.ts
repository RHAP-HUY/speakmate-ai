import { NextResponse } from 'next/server';
import { isServerEncryptionAvailable } from '@/lib/crypto';
import { parseGeminiKeyPool } from '@/lib/gemini-keys';
import {
  DEFAULT_GEMINI_MODEL,
  getLastHealthyModel,
  getOrderedGeminiModels,
} from '@/lib/gemini-models';
import { getGoogleOAuthConfig } from '@/lib/google-auth';
import { isSupabaseConfigured } from '@/lib/supabase/config';

export async function GET() {
  const poolCount = parseGeminiKeyPool().length;
  const googleCfg = getGoogleOAuthConfig();
  const supabaseConfigured = isSupabaseConfigured();

  const storageMode = googleCfg.ownerDriveConfigured
    ? 'google-drive-owner'
    : googleCfg.configured
      ? 'google-drive-user'
      : supabaseConfigured
        ? 'supabase'
        : 'local';

  return NextResponse.json({
    ok: true,
    storageMode,
    googleAuthConfigured: googleCfg.configured,
    ownerDriveConfigured: googleCfg.ownerDriveConfigured,
    supabaseConfigured,
    sharedGeminiPoolCount: poolCount,
    serverEncryptionEnabled: isServerEncryptionAvailable(),
    primaryModel: process.env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL,
    lastHealthyModel: getLastHealthyModel(),
    orderedModels: getOrderedGeminiModels(),
  });
}
