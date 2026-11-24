import { describe, expect, it, vi } from 'vitest';
import { runStaggeredHedgedRace } from '@/lib/gemini-client';

describe('runStaggeredHedgedRace (low-latency failover & hedging)', () => {
  it('returns immediately on healthy primary without calling backup models', async () => {
    const called: string[] = [];
    const result = await runStaggeredHedgedRace({
      models: ['m-fast', 'm-backup-1', 'm-backup-2'],
      hedgeDelayMs: 200,
      totalBudgetMs: 3_000,
      attempt: async (model) => {
        called.push(model);
        await new Promise((r) => setTimeout(r, 15));
        return `ok:${model}`;
      },
    });

    expect(result).toEqual({ model: 'm-fast', value: 'ok:m-fast' });
    expect(called).toEqual(['m-fast']);
  });

  it('immediately fails over at 0ms when primary throws 503 high demand', async () => {
    const errors: string[] = [];
    const t0 = Date.now();

    const result = await runStaggeredHedgedRace({
      models: ['m-overloaded', 'm-healthy', 'm-spare'],
      hedgeDelayMs: 2_000, // large delay proves immediate failover on error
      totalBudgetMs: 5_000,
      onModelError: (m) => errors.push(m),
      attempt: async (model) => {
        if (model === 'm-overloaded') {
          throw new Error('503 UNAVAILABLE: high demand');
        }
        return `reply:${model}`;
      },
    });

    expect(result).toEqual({ model: 'm-healthy', value: 'reply:m-healthy' });
    expect(errors).toEqual(['m-overloaded']);
    expect(Date.now() - t0).toBeLessThan(400);
  });

  it('launches a hedged backup in parallel when primary stalls beyond hedgeDelayMs', async () => {
    const called: string[] = [];
    const result = await runStaggeredHedgedRace({
      models: ['m-stalled', 'm-fast-backup'],
      hedgeDelayMs: 40,
      totalBudgetMs: 4_000,
      attempt: async (model) => {
        called.push(model);
        if (model === 'm-stalled') {
          await new Promise((r) => setTimeout(r, 500));
          return 'late';
        }
        await new Promise((r) => setTimeout(r, 20));
        return 'fast-winner';
      },
    });

    expect(result).toEqual({ model: 'm-fast-backup', value: 'fast-winner' });
    expect(called).toEqual(['m-stalled', 'm-fast-backup']);
  });

  it('stops racing immediately on fatal API key auth errors', async () => {
    const attempt = vi.fn().mockRejectedValue(new Error('401 API_KEY_INVALID'));

    await expect(
      runStaggeredHedgedRace({
        models: ['m1', 'm2', 'm3'],
        hedgeDelayMs: 50,
        totalBudgetMs: 3_000,
        isFatalKeyError: (e) => String(e).includes('401'),
        attempt,
      })
    ).rejects.toThrow('401 API_KEY_INVALID');

    expect(attempt).toHaveBeenCalledTimes(1);
  });
});
