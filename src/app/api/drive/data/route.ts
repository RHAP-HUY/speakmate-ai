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
import type { AccountCloudBundle } from '@/types';

export const maxDuration = 30;

export async function GET() {
  try {
    const rawSession = await readGoogleSession();
    if (!rawSession) {
      return NextResponse.json(
        { error: 'Chưa đăng nhập tài khoản Google.' },
        { status: 401 }
      );
    }

    const { session, refreshed } = await ensureFreshSessionAccessToken(rawSession);
    const { bundle, mode } = await loadAccountBundleFromDrive(session);

    const response = NextResponse.json({
      ok: true,
      mode,
      bundle,
      user: {
        id: session.userId,
        email: session.email,
        name: session.name,
        avatarUrl: session.picture ?? null,
      },
    });

    if (refreshed) {
      attachGoogleSessionCookie(response, session);
    }
    return response;
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Không thể tải dữ liệu từ Google Drive.';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const rawSession = await readGoogleSession();
    if (!rawSession) {
      return NextResponse.json(
        { error: 'Chưa đăng nhập tài khoản Google.' },
        { status: 401 }
      );
    }

    const body = (await request.json()) as { bundle?: AccountCloudBundle };
    if (!body?.bundle || !body.bundle.profile) {
      return NextResponse.json(
        { error: 'Dữ liệu đồng bộ Google Drive không hợp lệ.' },
        { status: 400 }
      );
    }

    const { session, refreshed } = await ensureFreshSessionAccessToken(rawSession);
    const saved = await saveAccountBundleToDrive(session, body.bundle);

    const response = NextResponse.json({
      ok: true,
      mode: saved.mode,
      fileId: saved.fileId,
      syncedAt: new Date().toISOString(),
    });

    if (refreshed) {
      attachGoogleSessionCookie(response, session);
    }
    return response;
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Không thể lưu dữ liệu lên Google Drive.';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
