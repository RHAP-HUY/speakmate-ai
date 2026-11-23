import {
  getGoogleOAuthConfig,
  refreshGoogleAccessToken,
  type GoogleSessionPayload,
} from '@/lib/google-auth';
import type { AccountCloudBundle } from '@/types';

const DRIVE_API_BASE = 'https://www.googleapis.com/drive/v3';
const DRIVE_UPLOAD_BASE = 'https://www.googleapis.com/upload/drive/v3';

// Cache owner access token in memory to avoid refreshing on every Drive sync
let cachedOwnerToken: { accessToken: string; expiresAt: number } | null = null;

function sanitizeFileSegment(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 80);
}

function escapeDriveQueryValue(val: string): string {
  return val.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

async function getOwnerDriveAccessToken(): Promise<string> {
  const { ownerRefreshToken } = getGoogleOAuthConfig();
  if (!ownerRefreshToken) {
    throw new Error('GOOGLE_DRIVE_OWNER_REFRESH_TOKEN chưa được cấu hình.');
  }
  if (cachedOwnerToken && cachedOwnerToken.expiresAt > Date.now() + 60_000) {
    return cachedOwnerToken.accessToken;
  }
  const fresh = await refreshGoogleAccessToken(ownerRefreshToken);
  cachedOwnerToken = fresh;
  return fresh.accessToken;
}

async function findDriveItem(params: {
  accessToken: string;
  name: string;
  mimeType?: string;
  parentId?: string;
}): Promise<string | null> {
  const clauses = [
    `name = '${escapeDriveQueryValue(params.name)}'`,
    'trashed = false',
  ];
  if (params.mimeType) {
    clauses.push(`mimeType = '${escapeDriveQueryValue(params.mimeType)}'`);
  }
  if (params.parentId) {
    clauses.push(`'${escapeDriveQueryValue(params.parentId)}' in parents`);
  }

  const url = new URL(`${DRIVE_API_BASE}/files`);
  url.searchParams.set('q', clauses.join(' and '));
  url.searchParams.set('fields', 'files(id, name)');
  url.searchParams.set('pageSize', '1');

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${params.accessToken}` },
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Google Drive search lỗi (${res.status}): ${errText.slice(0, 160)}`);
  }
  const data = (await res.json()) as { files?: { id: string }[] };
  return data.files?.[0]?.id ?? null;
}

async function ensureDriveFolder(params: {
  accessToken: string;
  name: string;
  parentId?: string;
}): Promise<string> {
  const existing = await findDriveItem({
    accessToken: params.accessToken,
    name: params.name,
    mimeType: 'application/vnd.google-apps.folder',
    parentId: params.parentId,
  });
  if (existing) return existing;

  const metadata: Record<string, unknown> = {
    name: params.name,
    mimeType: 'application/vnd.google-apps.folder',
  };
  if (params.parentId) {
    metadata.parents = [params.parentId];
  }

  const res = await fetch(`${DRIVE_API_BASE}/files?fields=id`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${params.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(metadata),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Không thể tạo thư mục trên Google Drive (${res.status}): ${errText.slice(0, 160)}`);
  }

  const created = (await res.json()) as { id: string };
  return created.id;
}

async function readDriveJsonFile<T>(params: {
  accessToken: string;
  folderId: string;
  fileName: string;
}): Promise<T | null> {
  const fileId = await findDriveItem({
    accessToken: params.accessToken,
    name: params.fileName,
    parentId: params.folderId,
  });
  if (!fileId) return null;

  const res = await fetch(`${DRIVE_API_BASE}/files/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${params.accessToken}` },
  });
  if (!res.ok) {
    if (res.status === 404) return null;
    throw new Error(`Không thể đọc dữ liệu trên Google Drive (${res.status}).`);
  }

  const text = await res.text();
  if (!text.trim()) return null;
  return JSON.parse(text) as T;
}

async function upsertDriveJsonFile(params: {
  accessToken: string;
  folderId: string;
  fileName: string;
  data: unknown;
}): Promise<string> {
  const existingId = await findDriveItem({
    accessToken: params.accessToken,
    name: params.fileName,
    parentId: params.folderId,
  });

  const jsonBody = JSON.stringify(params.data, null, 2);

  if (existingId) {
    const res = await fetch(
      `${DRIVE_UPLOAD_BASE}/files/${existingId}?uploadType=media&fields=id`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${params.accessToken}`,
          'Content-Type': 'application/json; charset=UTF-8',
        },
        body: jsonBody,
      }
    );
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Lỗi cập nhật tệp Google Drive (${res.status}): ${errText.slice(0, 160)}`);
    }
    return existingId;
  }

  const boundary = 'speakmate_drive_boundary_7f9a2c';
  const metadata = JSON.stringify({
    name: params.fileName,
    parents: [params.folderId],
    mimeType: 'application/json',
  });

  const multipartBody = [
    `--${boundary}`,
    'Content-Type: application/json; charset=UTF-8',
    '',
    metadata,
    `--${boundary}`,
    'Content-Type: application/json; charset=UTF-8',
    '',
    jsonBody,
    `--${boundary}--`,
  ].join('\r\n');

  const res = await fetch(
    `${DRIVE_UPLOAD_BASE}/files?uploadType=multipart&fields=id`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${params.accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: multipartBody,
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Lỗi tạo tệp Google Drive (${res.status}): ${errText.slice(0, 160)}`);
  }

  const created = (await res.json()) as { id: string };
  return created.id;
}

interface AccountIndexEntry {
  accountId: string;
  email: string;
  displayName: string;
  englishLevel: string;
  streakDays: number;
  xp: number;
  updatedAt: string;
  fileName: string;
}

/**
 * Resolves whether to write into the owner's central 5TB Google Drive
 * (storing ALL users' accounts under `SpeakMate AI Database/accounts/`)
 * OR directly into the logged-in user's own Google Drive (`SpeakMate AI/`).
 */
async function resolveDriveTarget(session: GoogleSessionPayload): Promise<{
  accessToken: string;
  folderId: string;
  rootFolderId: string;
  fileName: string;
  mode: 'google-drive-owner' | 'google-drive-user';
}> {
  const cfg = getGoogleOAuthConfig();

  if (cfg.ownerDriveConfigured) {
    const ownerToken = await getOwnerDriveAccessToken();
    const rootFolderId = await ensureDriveFolder({
      accessToken: ownerToken,
      name: cfg.ownerFolderName,
    });
    const accountsFolderId = await ensureDriveFolder({
      accessToken: ownerToken,
      name: 'accounts',
      parentId: rootFolderId,
    });
    const safeId = sanitizeFileSegment(session.userId || session.email);
    return {
      accessToken: ownerToken,
      folderId: accountsFolderId,
      rootFolderId,
      fileName: `account_${safeId}.json`,
      mode: 'google-drive-owner',
    };
  }

  const rootFolderId = await ensureDriveFolder({
    accessToken: session.accessToken,
    name: cfg.ownerFolderName,
  });
  return {
    accessToken: session.accessToken,
    folderId: rootFolderId,
    rootFolderId,
    fileName: 'speakmate_account_data.json',
    mode: 'google-drive-user',
  };
}

export async function loadAccountBundleFromDrive(
  session: GoogleSessionPayload
): Promise<{
  bundle: AccountCloudBundle | null;
  mode: 'google-drive-owner' | 'google-drive-user';
}> {
  const target = await resolveDriveTarget(session);
  const bundle = await readDriveJsonFile<AccountCloudBundle>({
    accessToken: target.accessToken,
    folderId: target.folderId,
    fileName: target.fileName,
  });
  return { bundle, mode: target.mode };
}

export async function saveAccountBundleToDrive(
  session: GoogleSessionPayload,
  bundle: AccountCloudBundle
): Promise<{
  fileId: string;
  mode: 'google-drive-owner' | 'google-drive-user';
}> {
  const target = await resolveDriveTarget(session);

  const normalizedBundle: AccountCloudBundle = {
    ...bundle,
    version: 3,
    accountId: session.userId,
    email: session.email,
    provider: 'google',
    updatedAt: new Date().toISOString(),
  };

  const fileId = await upsertDriveJsonFile({
    accessToken: target.accessToken,
    folderId: target.folderId,
    fileName: target.fileName,
    data: normalizedBundle,
  });

  // In Owner 5TB Central Drive mode, maintain an up-to-date accounts_index.json roster
  if (target.mode === 'google-drive-owner') {
    try {
      const index =
        (await readDriveJsonFile<AccountIndexEntry[]>({
          accessToken: target.accessToken,
          folderId: target.rootFolderId,
          fileName: 'accounts_index.json',
        })) ?? [];

      const entry: AccountIndexEntry = {
        accountId: session.userId,
        email: session.email,
        displayName: normalizedBundle.profile.displayName || session.name,
        englishLevel: normalizedBundle.profile.englishLevel,
        streakDays: normalizedBundle.profile.streakDays,
        xp: normalizedBundle.profile.xp,
        updatedAt: normalizedBundle.updatedAt,
        fileName: target.fileName,
      };

      const nextIndex = [
        entry,
        ...index.filter((item) => item.accountId !== session.userId),
      ];

      await upsertDriveJsonFile({
        accessToken: target.accessToken,
        folderId: target.rootFolderId,
        fileName: 'accounts_index.json',
        data: nextIndex,
      });
    } catch {
      // Index update is best-effort; account bundle itself is already safely saved
    }
  }

  return { fileId, mode: target.mode };
}
