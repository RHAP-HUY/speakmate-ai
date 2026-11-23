import { NextResponse, type NextRequest } from 'next/server';
import {
  attachGoogleSessionCookie,
  ensureFreshSessionAccessToken,
  readGoogleSession,
} from '@/lib/google-auth';
import {
  loadAccountBundleFromDrive,
  saveAccountBundleToDrive,
} from '@/lib/google-drive-store';
import {
  MAX_CLOUD_BUNDLE_BYTES,
  validateCloudBundlePayload,
} from '@/lib/security';

export const maxDuration = 30;

const NO_STORE_HEADERS = { 'Cache-Control': 'no-store, private' };

export async function GET() {
  try {
    const rawSession = await readGoogleSession();
    if (!rawSession) {
      return NextResponse.json(
        { error: 'Chưa đăng nhập tài khoản Google.' },
        { status: 401, headers: NO_STORE_HEADERS }
      );
    }

    const { session, refreshed } = await ensureFreshSessionAccessToken(rawSession);
    const { bundle, mode } = await loadAccountBundleFromDrive(session);

    const response = NextResponse.json(
      {
        ok: true,
        mode,
        bundle,
        user: {
          id: session.userId,
          email: session.email,
          name: session.name,
          avatarUrl: session.picture ?? null,
        },
      },
      { headers: NO_STORE_HEADERS }
    );

    if (refreshed) {
      attachGoogleSessionCookie(response, session);
    }
    return response;
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Không thể tải dữ liệu từ Google Drive.';
    return NextResponse.json(
      { error: message },
      { status: 502, headers: NO_STORE_HEADERS }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const rawSession = await readGoogleSession();
    if (!rawSession) {
      return NextResponse.json(
        { error: 'Chưa đăng nhập tài khoản Google.' },
        { status: 401, headers: NO_STORE_HEADERS }
      );
    }

    const contentLengthHeader = Number(request.headers.get('content-length') || 0);
    if (contentLengthHeader > MAX_CLOUD_BUNDLE_BYTES + 16_384) {
      return NextResponse.json(
        { error: 'Gói dữ liệu đồng bộ vượt quá giới hạn an toàn 2MB.' },
        { status: 413, headers: NO_STORE_HEADERS }
      );
    }

    const rawText = await request.text();
    const byteLength = Buffer.byteLength(rawText, 'utf8');
    if (byteLength > MAX_CLOUD_BUNDLE_BYTES + 16_384) {
      return NextResponse.json(
        { error: 'Gói dữ liệu đồng bộ vượt quá giới hạn an toàn 2MB.' },
        { status: 413, headers: NO_STORE_HEADERS }
      );
    }

    let body: { bundle?: unknown };
    try {
      body = JSON.parse(rawText) as { bundle?: unknown };
    } catch {
      return NextResponse.json(
        { error: 'JSON đồng bộ Google Drive không hợp lệ.' },
        { status: 400, headers: NO_STORE_HEADERS }
      );
    }

    const validated = validateCloudBundlePayload(body?.bundle, byteLength);
    if (!validated.valid || !validated.sanitized) {
      return NextResponse.json(
        { error: validated.error || 'Dữ liệu đồng bộ Google Drive không hợp lệ.' },
        { status: 400, headers: NO_STORE_HEADERS }
      );
    }

    const { session, refreshed } = await ensureFreshSessionAccessToken(rawSession);
    const saved = await saveAccountBundleToDrive(session, validated.sanitized);

    const response = NextResponse.json(
      {
        ok: true,
        mode: saved.mode,
        fileId: saved.fileId,
        syncedAt: new Date().toISOString(),
      },
      { headers: NO_STORE_HEADERS }
    );

    if (refreshed) {
      attachGoogleSessionCookie(response, session);
    }
    return response;
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Không thể lưu dữ liệu lên Google Drive.';
    return NextResponse.json(
      { error: message },
      { status: 502, headers: NO_STORE_HEADERS }
    );
  }
}
