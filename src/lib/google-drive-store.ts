import {
  getGoogleOAuthConfig,
  refreshGoogleAccessToken,
  type GoogleSessionPayload,
} from '@/lib/google-auth';
import type { AccountCloudBundle } from '@/types';

const DRIVE_API_BASE = 'https://www.googleapis.com/drive/v3';
const DRIVE_UPLOAD_BASE = 'https://www.googleapis.com/upload/drive/v3';
const DRIVE_HTTP_TIMEOUT_MS = 10_000;
const ID_CACHE_TTL_MS = 10 * 60_000; // 10 minutes
const ROSTER_CACHE_TTL_MS = 30_000; // 30 seconds

interface CachedIdEntry {
  id: string;
  expiresAt: number;
}

// In-memory TTL caches to eliminate redundant Drive lookup round-trips
let cachedOwnerToken: { accessToken: string; expiresAt: number } | null = null;
const folderIdCache = new Map<string, CachedIdEntry>();
const fileIdCache = new Map<string, CachedIdEntry>();
let cachedRoster: {
  items: PublicLeaderboardRosterItem[];
  expiresAt: number;
} | null = null;

// Serialized in-process queue so concurrent account saves don't clobber accounts_index.json
let accountsIndexWriteChain: Promise<void> = Promise.resolve();

function getCachedId(map: Map<string, CachedIdEntry>, key: string): string | null {
  const entry = map.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    map.delete(key);
    return null;
  }
  return entry.id;
}

function setCachedId(map: Map<string, CachedIdEntry>, key: string, id: string): void {
  if (map.size >= 500 && !map.has(key)) {
    const oldest = map.keys().next().value;
    if (oldest) map.delete(oldest);
  }
  map.set(key, { id, expiresAt: Date.now() + ID_CACHE_TTL_MS });
}

export function getDriveCacheStats(): {
  ownerTokenCached: boolean;
  folderIdsCached: number;
  fileIdsCached: number;
  leaderboardRosterCached: boolean;
} {
  const now = Date.now();
  return {
    ownerTokenCached: Boolean(cachedOwnerToken && cachedOwnerToken.expiresAt > now),
    folderIdsCached: folderIdCache.size,
    fileIdsCached: fileIdCache.size,
    leaderboardRosterCached: Boolean(cachedRoster && cachedRoster.expiresAt > now),
  };
}

function sanitizeFileSegment(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 80);
}

function escapeDriveQueryValue(val: string): string {
  return val.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function driveFetchWithRetry(
  url: string,
  init: RequestInit,
  maxRetries = 2
): Promise<Response> {
  let lastError: unknown = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(url, {
        ...init,
        signal: AbortSignal.timeout(DRIVE_HTTP_TIMEOUT_MS),
      });

      const isTransient =
        res.status === 429 ||
        res.status === 500 ||
        res.status === 502 ||
        res.status === 503 ||
        res.status === 504;

      if (!isTransient || attempt === maxRetries) {
        return res;
      }

      const retryAfterSec = Number(res.headers.get('retry-after') || 0);
      const backoffMs =
        retryAfterSec > 0
          ? Math.min(3000, retryAfterSec * 1000)
          : 250 * Math.pow(2, attempt);
      await sleep(backoffMs);
    } catch (err) {
      lastError = err;
      if (attempt === maxRetries) {
        throw err;
      }
      await sleep(250 * Math.pow(2, attempt));
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error('Lỗi kết nối Google Drive API.');
}

async function getOwnerDriveAccessToken(forceRefresh = false): Promise<string> {
  const { ownerRefreshToken } = getGoogleOAuthConfig();
  if (!ownerRefreshToken) {
    throw new Error('GOOGLE_DRIVE_OWNER_REFRESH_TOKEN chưa được cấu hình.');
  }
  if (
    !forceRefresh &&
    cachedOwnerToken &&
    cachedOwnerToken.expiresAt > Date.now() + 60_000
  ) {
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

  const res = await driveFetchWithRetry(url.toString(), {
    headers: { Authorization: `Bearer ${params.accessToken}` },
  });
  if (!res.ok) {
    if (res.status === 401) {
      cachedOwnerToken = null;
    }
    const errText = await res.text();
    throw new Error(
      `Google Drive search lỗi (${res.status}): ${errText.slice(0, 160)}`
    );
  }
  const data = (await res.json()) as { files?: { id: string }[] };
  return data.files?.[0]?.id ?? null;
}

async function ensureDriveFolder(params: {
  accessToken: string;
  name: string;
  parentId?: string;
  cacheScope: string;
}): Promise<string> {
  const cacheKey = `${params.cacheScope}:${params.parentId ?? 'root'}:${params.name}`;
  const cached = getCachedId(folderIdCache, cacheKey);
  if (cached) return cached;

  const existing = await findDriveItem({
    accessToken: params.accessToken,
    name: params.name,
    mimeType: 'application/vnd.google-apps.folder',
    parentId: params.parentId,
  });
  if (existing) {
    setCachedId(folderIdCache, cacheKey, existing);
    return existing;
  }

  const metadata: Record<string, unknown> = {
    name: params.name,
    mimeType: 'application/vnd.google-apps.folder',
  };
  if (params.parentId) {
    metadata.parents = [params.parentId];
  }

  const res = await driveFetchWithRetry(`${DRIVE_API_BASE}/files?fields=id`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${params.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(metadata),
  });

  if (!res.ok) {
    if (res.status === 401) {
      cachedOwnerToken = null;
    }
    const errText = await res.text();
    throw new Error(
      `Không thể tạo thư mục trên Google Drive (${res.status}): ${errText.slice(0, 160)}`
    );
  }

  const created = (await res.json()) as { id: string };
  setCachedId(folderIdCache, cacheKey, created.id);
  return created.id;
}

async function readDriveJsonFile<T>(params: {
  accessToken: string;
  folderId: string;
  fileName: string;
}): Promise<T | null> {
  const fileKey = `${params.folderId}:${params.fileName}`;
  let fileId = getCachedId(fileIdCache, fileKey);

  if (!fileId) {
    fileId = await findDriveItem({
      accessToken: params.accessToken,
      name: params.fileName,
      parentId: params.folderId,
    });
    if (!fileId) return null;
    setCachedId(fileIdCache, fileKey, fileId);
  }

  const res = await driveFetchWithRetry(
    `${DRIVE_API_BASE}/files/${fileId}?alt=media`,
    {
      headers: { Authorization: `Bearer ${params.accessToken}` },
    }
  );
  if (!res.ok) {
    if (res.status === 404) {
      fileIdCache.delete(fileKey);
      return null;
    }
    if (res.status === 401) {
      cachedOwnerToken = null;
    }
    throw new Error(`Không thể đọc dữ liệu trên Google Drive (${res.status}).`);
  }

  const text = await res.text();
  if (!text.trim()) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

async function upsertDriveJsonFile(params: {
  accessToken: string;
  folderId: string;
  fileName: string;
  data: unknown;
}): Promise<string> {
  const fileKey = `${params.folderId}:${params.fileName}`;
  let existingId = getCachedId(fileIdCache, fileKey);

  if (!existingId) {
    existingId = await findDriveItem({
      accessToken: params.accessToken,
      name: params.fileName,
      parentId: params.folderId,
    });
  }

  const jsonBody = JSON.stringify(params.data, null, 2);

  if (existingId) {
    const res = await driveFetchWithRetry(
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
    if (res.ok) {
      setCachedId(fileIdCache, fileKey, existingId);
      return existingId;
    }
    if (res.status === 404) {
      // Cached file was deleted externally -> fall through to create a fresh file
      fileIdCache.delete(fileKey);
    } else {
      if (res.status === 401) {
        cachedOwnerToken = null;
      }
      const errText = await res.text();
      throw new Error(
        `Lỗi cập nhật tệp Google Drive (${res.status}): ${errText.slice(0, 160)}`
      );
    }
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

  const res = await driveFetchWithRetry(
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
    if (res.status === 401) {
      cachedOwnerToken = null;
    }
    const errText = await res.text();
    throw new Error(
      `Lỗi tạo tệp Google Drive (${res.status}): ${errText.slice(0, 160)}`
    );
  }

  const created = (await res.json()) as { id: string };
  setCachedId(fileIdCache, fileKey, created.id);
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

async function resolveDriveTarget(
  session: GoogleSessionPayload,
  forceRefreshOwnerToken = false
): Promise<{
  accessToken: string;
  folderId: string;
  rootFolderId: string;
  fileName: string;
  mode: 'google-drive-owner' | 'google-drive-user';
}> {
  const cfg = getGoogleOAuthConfig();

  if (cfg.ownerDriveConfigured) {
    const ownerToken = await getOwnerDriveAccessToken(forceRefreshOwnerToken);
    const rootFolderId = await ensureDriveFolder({
      accessToken: ownerToken,
      name: cfg.ownerFolderName,
      cacheScope: 'owner',
    });
    const accountsFolderId = await ensureDriveFolder({
      accessToken: ownerToken,
      name: 'accounts',
      parentId: rootFolderId,
      cacheScope: 'owner',
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
    cacheScope: `user:${session.userId}`,
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
  const run = async (forceRefresh: boolean) => {
    const target = await resolveDriveTarget(session, forceRefresh);
    const bundle = await readDriveJsonFile<AccountCloudBundle>({
      accessToken: target.accessToken,
      folderId: target.folderId,
      fileName: target.fileName,
    });
    return { bundle, mode: target.mode };
  };

  try {
    return await run(false);
  } catch (err) {
    if (
      err instanceof Error &&
      err.message.includes('(401)') &&
      getGoogleOAuthConfig().ownerDriveConfigured
    ) {
      return run(true);
    }
    throw err;
  }
}

export async function saveAccountBundleToDrive(
  session: GoogleSessionPayload,
  bundle: AccountCloudBundle
): Promise<{
  fileId: string;
  mode: 'google-drive-owner' | 'google-drive-user';
}> {
  const runSave = async (forceRefresh: boolean) => {
    const target = await resolveDriveTarget(session, forceRefresh);

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

    // In Owner 5TB Central Drive mode, serialize updates to accounts_index.json
    if (target.mode === 'google-drive-owner') {
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

      accountsIndexWriteChain = accountsIndexWriteChain
        .then(async () => {
          const index =
            (await readDriveJsonFile<AccountIndexEntry[]>({
              accessToken: target.accessToken,
              folderId: target.rootFolderId,
              fileName: 'accounts_index.json',
            })) ?? [];

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
          cachedRoster = null;
        })
        .catch(() => {
          // Index update is best-effort; account bundle itself is already safely persisted
        });

      await accountsIndexWriteChain;
    }

    return { fileId, mode: target.mode };
  };

  try {
    return await runSave(false);
  } catch (err) {
    if (
      err instanceof Error &&
      err.message.includes('(401)') &&
      getGoogleOAuthConfig().ownerDriveConfigured
    ) {
      return runSave(true);
    }
    throw err;
  }
}

export interface PublicLeaderboardRosterItem {
  accountId: string;
  displayName: string;
  englishLevel: string;
  streakDays: number;
  xp: number;
  updatedAt: string;
}

/**
 * Privacy-safe leaderboard reader from the central 5TB Owner Google Drive.
 * Uses a 30s TTL cache for fast low-latency loading and strips emails completely.
 */
export async function readOwnerLeaderboardRoster(): Promise<
  PublicLeaderboardRosterItem[]
> {
  const cfg = getGoogleOAuthConfig();
  if (!cfg.ownerDriveConfigured) return [];

  if (cachedRoster && cachedRoster.expiresAt > Date.now()) {
    return cachedRoster.items;
  }

  try {
    const ownerToken = await getOwnerDriveAccessToken();
    const rootFolderId = await ensureDriveFolder({
      accessToken: ownerToken,
      name: cfg.ownerFolderName,
      cacheScope: 'owner',
    });
    if (!rootFolderId) return [];

    const index =
      (await readDriveJsonFile<AccountIndexEntry[]>({
        accessToken: ownerToken,
        folderId: rootFolderId,
        fileName: 'accounts_index.json',
      })) ?? [];

    const sanitized = index
      .filter((item) => Boolean(item && item.accountId))
      .map((item) => ({
        accountId: item.accountId,
        displayName:
          (item.displayName || '').trim() || 'Học viên SpeakMate',
        englishLevel: item.englishLevel || 'A0-A1',
        streakDays: Math.max(0, Number(item.streakDays || 0)),
        xp: Math.max(0, Number(item.xp || 0)),
        updatedAt: item.updatedAt || '',
      }));

    cachedRoster = {
      items: sanitized,
      expiresAt: Date.now() + ROSTER_CACHE_TTL_MS,
    };

    return sanitized;
  } catch {
    return cachedRoster?.items ?? [];
  }
}
