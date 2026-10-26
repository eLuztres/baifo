import { prisma } from '@/db/prisma';
import { onUsage } from '@/lib/studio/openai.mjs';
import { costOf } from '@/lib/ai-usage';

jest.mock('@/db/prisma', () => ({ prisma: { aiUsage: { create: jest.fn() } } }));
jest.mock('@/lib/studio/openai.mjs', () => ({ onUsage: jest.fn() }));

// The listener lib/ai-usage registers when it loads; captured before beforeEach clears the mock.
const saveUsage = (onUsage as jest.Mock).mock.calls[0][0];
const create = (prisma as unknown as { aiUsage: { create: jest.Mock } }).aiUsage.create;

describe('costOf', () => {
  it('prices a text call by input and output tokens', () => {
    // gpt-6-astra: $10 in, $50 out per 1M tokens.
    expect(costOf('gpt-6-astra', { input_tokens: 1_000, output_tokens: 200 })).toBeCloseTo(0.02);
  });

  it('charges cached input at the cached price', () => {
    expect(costOf('gpt-6-astra', { input_tokens: 1_000, input_tokens_details: { cached_tokens: 1_000 } })).toBeCloseTo(0.001);
  });

  it('prices a picture by text, image and output tokens', () => {
    // gpt-image-2.5-flare: text $5, image $8 in, $30 out per 1M tokens.
    const usage = { input_tokens: 1_100, input_tokens_details: { image_tokens: 1_000 }, output_tokens: 4_000 };
    expect(costOf('gpt-image-2.5-flare', usage)).toBeCloseTo(0.0005 + 0.008 + 0.12);
  });

  it('costs nothing for a model without a known price', () => {
    expect(costOf('some-new-model', { input_tokens: 1_000, output_tokens: 1_000 })).toBe(0);
  });
});

describe('saving a call', () => {
  it('saves the kind, tokens and cost of every call', async () => {
    await saveUsage({ endpoint: '/images/edits', model: 'gpt-image-2.5-flare', usage: { input_tokens: 10, output_tokens: 20 } });

    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({ kind: 'picture', model: 'gpt-image-2.5-flare', inputTokens: 10, outputTokens: 20 }),
    });
  });

  it('tells voice notes and credit checks apart', async () => {
    await saveUsage({ endpoint: '/audio/transcriptions', model: 'gpt-4o-transcribe', usage: {} });
    await saveUsage({ endpoint: '/responses', model: 'gpt-6-astra', usage: {}, purpose: 'check' });

    expect(create.mock.calls.map(([{ data }]) => data.kind)).toEqual(['voice', 'check']);
  });
});
