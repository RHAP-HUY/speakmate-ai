import { NextResponse } from 'next/server';
import { isServerEncryptionAvailable } from '@/lib/crypto';
import { parseGeminiKeyPool } from '@/lib/gemini-keys';
import {
  DEFAULT_GEMINI_MODEL,
  getLastHealthyModel,
  getOrderedGeminiModels,
} from '@/lib/gemini-models';
import { getGoogleOAuthConfig } from '@/lib/google-auth';
import { getDriveCacheStats } from '@/lib/google-drive-store';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { getTtsCacheStats } from '@/lib/tts-cache';

const BOOT_TIME_MS = Date.now();

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

  return NextResponse.json(
    {
      ok: true,
      version: '4.0.0-enterprise',
      uptimeSeconds: Math.max(0, Math.round((Date.now() - BOOT_TIME_MS) / 1000)),
      storageMode,
      googleAuthConfigured: googleCfg.configured,
      ownerDriveConfigured: googleCfg.ownerDriveConfigured,
      supabaseConfigured,
      sharedGeminiPoolCount: poolCount,
      serverEncryptionEnabled: isServerEncryptionAvailable(),
      securityHeadersEnabled: true,
      primaryModel: process.env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL,
      lastHealthyModel: getLastHealthyModel(),
      orderedModels: getOrderedGeminiModels(),
      driveCache: getDriveCacheStats(),
      ttsCache: getTtsCacheStats(),
    },
    {
      headers: { 'Cache-Control': 'no-store, private' },
    }
  );
}
