import { ThinkingLevel } from '@google/genai';
import { afterEach, describe, expect, it } from 'vitest';
import {
  DEFAULT_GEMINI_MODEL,
  getLastHealthyModel,
  getOrderedGeminiModels,
  getThinkingConfigForModel,
  isUnsupportedOrMissingModelError,
  markModelCooldown,
  markModelHealthy,
  resetModelHealthForTest,
} from '@/lib/gemini-models';

describe('gemini-models speed & health routing', () => {
  afterEach(() => {
    resetModelHealthForTest();
  });

  it('orders default low-latency models with configured model first and valid v1 fallbacks', () => {
    const models = getOrderedGeminiModels({ GEMINI_MODEL: 'gemini-3.1-flash-lite' });
    expect(models[0]).toBe('gemini-3.1-flash-lite');
    expect(models).toContain(DEFAULT_GEMINI_MODEL);
    expect(models).toContain('gemini-3.5-flash');
    expect(models).toContain('gemini-3.6-flash');
    expect(models).not.toContain('gemini-flash-latest');
    expect(new Set(models).size).toBe(models.length);
  });

  it('sticks to lastHealthyModel and demotes cooled-down models', () => {
    markModelCooldown('gemini-3.5-flash-lite', 60_000);
    markModelHealthy('gemini-3.1-flash-lite');

    const models = getOrderedGeminiModels({});
    expect(getLastHealthyModel()).toBe('gemini-3.1-flash-lite');
    expect(models[0]).toBe('gemini-3.1-flash-lite');
    expect(models[models.length - 1]).toBe('gemini-3.5-flash-lite');
  });

  it('picks valid minimum-latency thinkingConfig per model family', () => {
    expect(getThinkingConfigForModel('gemini-3.5-flash-lite')).toEqual({
      thinkingLevel: ThinkingLevel.MINIMAL,
    });
    expect(getThinkingConfigForModel('gemini-3.1-flash-lite')).toBeUndefined();
    expect(getThinkingConfigForModel('gemini-3.8-flash')).toEqual({
      thinkingLevel: ThinkingLevel.LOW,
    });
    expect(getThinkingConfigForModel('gemini-2.5-flash')).toEqual({
      thinkingBudget: 0,
    });
  });

  it('detects unsupported or missing model errors cleanly', () => {
    expect(
      isUnsupportedOrMissingModelError(
        new Error('404 This model is no longer available to new users')
      )
    ).toBe(true);
    expect(
      isUnsupportedOrMissingModelError(
        new Error('INVALID_ARGUMENT: Thinking level MINIMAL is not supported')
      )
    ).toBe(true);
    expect(
      isUnsupportedOrMissingModelError(new Error('Network socket closed'))
    ).toBe(false);
  });
});
