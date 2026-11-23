import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  exportLocalProgressBackup,
  importLocalProgressBackup,
} from '@/lib/data-store';

function createMemoryStorage() {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
    setItem: (key: string, value: string) => {
      store.set(key, String(value));
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    },
    get length() {
      return store.size;
    },
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    _dump: () => store,
  };
}

describe('backup & restore (exportLocalProgressBackup / importLocalProgressBackup)', () => {
  let memoryStorage: ReturnType<typeof createMemoryStorage>;

  beforeEach(() => {
    memoryStorage = createMemoryStorage();
    vi.stubGlobal('window', {
      localStorage: memoryStorage,
      dispatchEvent: vi.fn(),
    });
    vi.stubGlobal('localStorage', memoryStorage);
    vi.stubGlobal('CustomEvent', class MockCustomEvent {
      type: string;
      detail: unknown;
      constructor(type: string, init?: { detail?: unknown }) {
        this.type = type;
        this.detail = init?.detail;
      }
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('exports and restores full progress including conversations and messagesByConversation', () => {
    const seedPayload = {
      version: 3,
      profile: {
        displayName: 'Minh Enterprise',
        englishLevel: 'A2-B1',
        xp: 1250,
        gems: 420,
      },
      dailyStats: [
        {
          practiceDate: '2026-11-23',
          secondsPracticed: 420,
          messagesSent: 12,
          sessionsCompleted: 2,
          lessonsCompleted: 1,
          xpEarned: 150,
        },
      ],
      phrases: [
        {
          id: 'p-1',
          englishPhrase: 'Could I get an iced latte?',
          vietnameseMeaning: 'Cho mình một ly latte đá nhé?',
          phonetic: 'cút ai gét ân ai-st lá-tê',
          masteryLevel: 2,
          createdAt: '2026-11-23T00:00:00.000Z',
        },
      ],
      conversations: [
        {
          id: 'conv-1',
          scenarioId: 'coffee-shop',
          scenarioTitle: 'Order Coffee',
          personaId: 'emma',
          startedAt: '2026-11-23T00:00:00.000Z',
          durationSeconds: 180,
          turnsCount: 2,
        },
      ],
      messagesByConversation: {
        'conv-1': [
          {
            id: 'm-1',
            role: 'assistant',
            englishText: 'Hi! What can I get for you?',
            vietnameseTranslation: 'Chào bạn! Bạn muốn gọi món gì?',
            createdAt: '2026-11-23T00:00:01.000Z',
          },
          {
            id: 'm-2',
            role: 'user',
            englishText: 'An iced latte, please.',
            createdAt: '2026-11-23T00:00:10.000Z',
          },
        ],
      },
    };

    importLocalProgressBackup(JSON.stringify(seedPayload));

    const exportedRaw = exportLocalProgressBackup();
    const exported = JSON.parse(exportedRaw);

    expect(exported.version).toBe(3);
    expect(exported.profile.displayName).toBe('Minh Enterprise');
    expect(exported.profile.xp).toBe(1250);
    expect(exported.dailyStats).toHaveLength(1);
    expect(exported.phrases).toHaveLength(1);
    expect(exported.conversations).toHaveLength(1);
    expect(exported.messagesByConversation['conv-1']).toHaveLength(2);
    expect(exported.messagesByConversation['conv-1'][1].englishText).toBe(
      'An iced latte, please.'
    );
  });

  it('rejects non-object JSON backup payloads safely', () => {
    expect(() => importLocalProgressBackup('[]')).toThrow();
    expect(() => importLocalProgressBackup('"hello"')).toThrow();
    expect(() => importLocalProgressBackup('null')).toThrow();
    expect(() => importLocalProgressBackup('{not-valid-json')).toThrow();
  });

  it('caps oversized phrases and message arrays to protect browser storage quota', () => {
    const hugeMessages = Array.from({ length: 160 }, (_, idx) => ({
      id: `m-${idx}`,
      role: 'user',
      englishText: `Sentence ${idx}`,
      createdAt: '2026-11-23T00:00:00.000Z',
    }));

    importLocalProgressBackup(
      JSON.stringify({
        conversations: [
          {
            id: 'conv-big',
            scenarioId: 'coffee-shop',
            scenarioTitle: 'Coffee',
            personaId: 'emma',
            startedAt: '2026-11-23T00:00:00.000Z',
            durationSeconds: 300,
            turnsCount: 160,
          },
        ],
        messagesByConversation: {
          'conv-big': hugeMessages,
        },
      })
    );

    const exported = JSON.parse(exportLocalProgressBackup());
    expect(exported.messagesByConversation['conv-big']).toHaveLength(120);
  });
});
