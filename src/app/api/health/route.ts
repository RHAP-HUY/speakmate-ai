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
      version: '12.0.0-adaptive-immersion',
      region: process.env.VERCEL_REGION || 'local',
      uptimeSeconds: Math.max(0, Math.round((Date.now() - BOOT_TIME_MS) / 1000)),
      storageMode,
      googleAuthConfigured: googleCfg.configured,
      ownerDriveConfigured: googleCfg.ownerDriveConfigured,
      supabaseConfigured,
      sharedGeminiPoolCount: poolCount,
      serverEncryptionEnabled: isServerEncryptionAvailable(),
      securityHeadersEnabled: true,
      pwaServiceWorker: true,
      promptInjectionGuard: true,
      rateLimitingEnabled: true,
      openGraphCardEnabled: true,
      srsSpacedRepetitionEnabled: true,
      cefrPlacementEnabled: true,
      ssrLandingEnabled: true,
      imageOptimizationEnabled: true,
      audioPreloadEnabled: true,
      hedgedRacingEnabled: true,
      inlineTurnAudioEnabled: true,
      pronunciationInsightsEnabled: true,
      adaptiveCoachEnabled: true,
      interactiveWordLookupEnabled: true,
      connectedSpeechGuideEnabled: true,
      streakShareCardEnabled: true,
      privacyPolicyUrl: 'https://speakmate-ai-nu.vercel.app/privacy',
      termsUrl: 'https://speakmate-ai-nu.vercel.app/terms',
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
