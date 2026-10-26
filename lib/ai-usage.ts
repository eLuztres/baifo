import { prisma } from '@/db/prisma';
import { onUsage } from '@/lib/studio/openai.mjs';

// The app's OpenAI calls go through here, so every call is saved with its cost (admin → AI costs).
export { checkCredit, draftText, editImage, generateImage, transcribeAudio } from '@/lib/studio/openai.mjs';

export const AI_USAGE_KINDS = ['picture', 'text', 'voice', 'check'] as const;
export type AiUsageKind = (typeof AI_USAGE_KINDS)[number];

/** USD per 1M tokens; `imageInput` for picture models, whose image tokens cost more than text. */
interface TokenPrices {
  input: number;
  cachedInput?: number;
  imageInput?: number;
  output: number;
}

// From developers.openai.com/api/docs/pricing (standard tier), checked 2026-10-26. A model missing here costs 0.
const IMAGE_MODEL_PRICES: TokenPrices = { input: 5, cachedInput: 1.25, imageInput: 8, output: 30 };
export const MODEL_PRICES: Record<string, TokenPrices> = {
  'gpt-6-astra': { input: 10, cachedInput: 1, output: 50 },
  'gpt-6-sol': { input: 2, cachedInput: 0.2, output: 10 },
  'gpt-6.1-sol': { input: 2, cachedInput: 0.1, output: 10 },
  'gpt-6-luna': { input: 0.1, cachedInput: 0.01, output: 0.5 },
  'gpt-image-2.5-flare': IMAGE_MODEL_PRICES,
  'gpt-image-2.5-sunburst': IMAGE_MODEL_PRICES,
  'gpt-image-2': IMAGE_MODEL_PRICES,
  'gpt-4o-transcribe': { input: 2.5, output: 10 },
  'gpt-4o-mini-transcribe': { input: 1.25, output: 5 },
};

/** The token counts OpenAI returns with a call (responses, images and transcriptions name them alike). */
export interface OpenAiUsage {
  input_tokens?: number;
  output_tokens?: number;
  input_tokens_details?: { cached_tokens?: number; image_tokens?: number };
}

/** What one call cost in USD. */
export function costOf(model: string, usage: OpenAiUsage = {}) {
  const prices = MODEL_PRICES[model];
  if (!prices) return 0;
  const input = usage.input_tokens ?? 0;
  const cached = usage.input_tokens_details?.cached_tokens ?? 0;
  const images = usage.input_tokens_details?.image_tokens ?? 0;
  const plain = Math.max(input - cached - images, 0);
  const total =
    plain * prices.input +
    cached * (prices.cachedInput ?? prices.input) +
    images * (prices.imageInput ?? prices.input) +
    (usage.output_tokens ?? 0) * prices.output;
  return total / 1_000_000;
}

const kindOf = (endpoint: string, purpose?: string): AiUsageKind =>
  purpose === 'check' ? 'check' : endpoint.startsWith('/images') ? 'picture' : endpoint.startsWith('/audio') ? 'voice' : 'text';

onUsage(async ({ endpoint, model, usage, purpose }) => {
  await prisma.aiUsage.create({
    data: {
      kind: kindOf(endpoint, purpose),
      model: String(model),
      inputTokens: usage?.input_tokens ?? 0,
      outputTokens: usage?.output_tokens ?? 0,
      costUsd: costOf(String(model), usage),
    },
  });
});

const DAY_MS = 24 * 60 * 60 * 1000;

async function totalSince(since?: Date) {
  const { _sum, _count } = await prisma.aiUsage.aggregate({
    where: since ? { createdAt: { gte: since } } : {},
    _sum: { costUsd: true },
    _count: true,
  });
  return { cost: Number(_sum.costUsd ?? 0), calls: _count };
}

/** The admin's AI costs page: totals, this month by kind and the latest calls. */
export async function getAiCostSummary(now = new Date()) {
  const startOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const [today, month, last30Days, allTime, byKind, latest] = await Promise.all([
    totalSince(startOfDay),
    totalSince(startOfMonth),
    totalSince(new Date(now.getTime() - 30 * DAY_MS)),
    totalSince(),
    prisma.aiUsage.groupBy({
      by: ['kind'],
      where: { createdAt: { gte: startOfMonth } },
      _sum: { costUsd: true },
      _count: true,
    }),
    prisma.aiUsage.findMany({ orderBy: { createdAt: 'desc' }, take: 20 }),
  ]);
  return {
    today,
    month,
    last30Days,
    allTime,
    byKind: byKind.map(({ kind, _sum, _count }) => ({ kind, cost: Number(_sum.costUsd ?? 0), calls: _count })),
    latest: latest.map((call) => ({ ...call, costUsd: Number(call.costUsd), isPriced: call.model in MODEL_PRICES })),
  };
}
