import { NextResponse } from 'next/server';
import { isServerEncryptionAvailable } from '@/lib/crypto';
import { parseGeminiKeyPool } from '@/lib/gemini-keys';
import { isSupabaseConfigured } from '@/lib/supabase/config';

export async function GET() {
  const poolCount = parseGeminiKeyPool().length;

  return NextResponse.json({
    ok: true,
    supabaseConfigured: isSupabaseConfigured(),
    sharedGeminiPoolCount: poolCount,
    serverEncryptionEnabled: isServerEncryptionAvailable(),
    primaryModel: process.env.GEMINI_MODEL?.trim() || 'gemini-3.5-flash-lite',
  });
}
