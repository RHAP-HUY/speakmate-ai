import { GoogleGenAI } from '@google/genai';
import { NextResponse, type NextRequest } from 'next/server';
import {
  encryptSecret,
  isServerEncryptionAvailable,
  maskApiKey,
} from '@/lib/crypto';
import {
  isFatalGeminiKeyAuthError,
  parseGeminiKeyPool,
} from '@/lib/gemini-keys';
import {
  getOrderedGeminiModels,
  getThinkingConfigForModel,
} from '@/lib/gemini-models';
import { checkSlidingWindowRateLimit } from '@/lib/rate-limit';
import { extractClientIp } from '@/lib/security';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { createSupabaseServerClient } from '@/lib/supabase/server';

const NO_STORE_HEADERS = { 'Cache-Control': 'no-store, private' };

async function verifyGeminiKey(apiKey: string): Promise<boolean> {
  const ai = new GoogleGenAI({ apiKey });
  const candidates = getOrderedGeminiModels().slice(0, 4);
  let lastError: unknown = null;
  for (const model of candidates) {
    let timer: ReturnType<typeof setTimeout> | null = null;
    try {
      const thinkingConfig = getThinkingConfigForModel(model, 'realtime');
      const res = await Promise.race([
        ai.models.generateContent({
          model,
          contents: 'Reply with just OK',
          config: {
            maxOutputTokens: 16,
            ...(thinkingConfig ? { thinkingConfig } : {}),
          },
        }),
        new Promise<never>((_, reject) => {
          timer = setTimeout(
            () => reject(new Error(`Timeout kiểm tra model ${model}`)),
            8000
          );
        }),
      ]);
      if (res.text) return true;
    } catch (err) {
      lastError = err;
      if (isFatalGeminiKeyAuthError(err)) {
        throw new Error('Gemini API Key không hợp lệ hoặc đã bị thu hồi.');
      }
    } finally {
      if (timer) clearTimeout(timer);
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error('Không thể xác thực Gemini API Key.');
}

export async function GET() {
  const sharedPoolCount = parseGeminiKeyPool().length;
  const encryptionReady = isServerEncryptionAvailable();

  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      {
        supabaseConfigured: false,
        apiKeyMode: 'system',
        hasPersonalKey: false,
        personalKeyHint: null,
        sharedPoolCount,
        encryptionReady,
      },
      { headers: NO_STORE_HEADERS }
    );
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase unavailable' }, { status: 500 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [{ data: profile }, { data: keyRow }] = await Promise.all([
    supabase
      .from('profiles')
      .select('api_key_mode')
      .eq('id', user.id)
      .maybeSingle(),
    supabase
      .from('user_api_keys')
      .select('key_hint')
      .eq('user_id', user.id)
      .maybeSingle(),
  ]);

  return NextResponse.json({
    supabaseConfigured: true,
    apiKeyMode: profile?.api_key_mode ?? 'system',
    hasPersonalKey: Boolean(keyRow?.key_hint),
    personalKeyHint: keyRow?.key_hint ?? null,
    sharedPoolCount,
    encryptionReady,
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      action: 'save' | 'test' | 'delete';
      apiKeyMode?: 'system' | 'personal';
      personalKey?: string;
    };

    if (body.action === 'test') {
      const rl = checkSlidingWindowRateLimit({
        namespace: 'user-key-test',
        key: extractClientIp(request.headers),
        limit: 12,
        windowMs: 60_000,
      });
      if (!rl.allowed) {
        return NextResponse.json(
          { error: 'Bạn kiểm tra API Key quá nhanh. Vui lòng thử lại sau 1 phút.' },
          {
            status: 429,
            headers: {
              ...NO_STORE_HEADERS,
              'Retry-After': String(rl.retryAfterSeconds),
            },
          }
        );
      }

      const keyToTest = body.personalKey?.trim();
      if (!keyToTest) {
        return NextResponse.json(
          { error: 'Vui lòng nhập API Key để kiểm tra.' },
          { status: 400, headers: NO_STORE_HEADERS }
        );
      }
      await verifyGeminiKey(keyToTest);
      return NextResponse.json(
        {
          ok: true,
          message: 'API Key hoạt động tốt!',
          keyHint: maskApiKey(keyToTest),
        },
        { headers: NO_STORE_HEADERS }
      );
    }

    if (!isSupabaseConfigured()) {
      return NextResponse.json({
        ok: true,
        storedOnServer: false,
        keyHint: body.personalKey ? maskApiKey(body.personalKey) : null,
      });
    }

    const supabase = await createSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Supabase unavailable' }, { status: 500 });
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (body.action === 'delete') {
      await Promise.all([
        supabase.from('user_api_keys').delete().eq('user_id', user.id),
        supabase
          .from('profiles')
          .update({ api_key_mode: 'system' })
          .eq('id', user.id),
      ]);
      return NextResponse.json({
        ok: true,
        apiKeyMode: 'system',
        hasPersonalKey: false,
        personalKeyHint: null,
      });
    }

    const nextMode = body.apiKeyMode === 'personal' ? 'personal' : 'system';
    const trimmedKey = body.personalKey?.trim();

    let storedOnServer = false;
    let keyHint: string | null = null;

    if (trimmedKey) {
      if (isServerEncryptionAvailable()) {
        const encrypted = encryptSecret(trimmedKey);
        keyHint = maskApiKey(trimmedKey);
        const { error: upsertErr } = await supabase
          .from('user_api_keys')
          .upsert(
            {
              user_id: user.id,
              encrypted_gemini_key: encrypted,
              key_hint: keyHint,
            },
            { onConflict: 'user_id' }
          );
        if (upsertErr) {
          throw upsertErr;
        }
        storedOnServer = true;
      } else {
        keyHint = maskApiKey(trimmedKey);
      }
    }

    const { error: profileErr } = await supabase
      .from('profiles')
      .update({ api_key_mode: nextMode })
      .eq('id', user.id);

    if (profileErr) {
      throw profileErr;
    }

    return NextResponse.json({
      ok: true,
      apiKeyMode: nextMode,
      storedOnServer,
      keyHint,
      warning:
        trimmedKey && !storedOnServer
          ? 'Server chưa cài APP_ENCRYPTION_SECRET nên Key cá nhân chỉ lưu cục bộ trên trình duyệt hiện tại của bạn.'
          : null,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Không thể xử lý API Key.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
