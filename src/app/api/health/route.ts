import { NextResponse } from 'next/server';
import { isServerEncryptionAvailable } from '@/lib/crypto';
import { parseGeminiKeyPool } from '@/lib/gemini-keys';
import {
  DEFAULT_GEMINI_MODEL,
  getLastHealthyModel,
  getOrderedGeminiModels,
} from '@/lib/gemini-models';
import { isSupabaseConfigured } from '@/lib/supabase/config';

export async function GET() {
  const poolCount = parseGeminiKeyPool().length;

  return NextResponse.json({
    ok: true,
    supabaseConfigured: isSupabaseConfigured(),
    sharedGeminiPoolCount: poolCount,
    serverEncryptionEnabled: isServerEncryptionAvailable(),
    primaryModel: process.env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL,
    lastHealthyModel: getLastHealthyModel(),
    orderedModels: getOrderedGeminiModels(),
  });
}
