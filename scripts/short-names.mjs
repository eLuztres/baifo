#!/usr/bin/env node
// Gives every listing without a short name one (1–3 words, every language), written by the AI from its titles.
// New listings get it when the AI writes them; this is for the ones from before.
//   npm run short-names            dry run: shows what would change
//   npm run short-names -- --apply
import nextEnv from '@next/env';
import { PrismaClient } from '@prisma/client';
import { draftText } from '../lib/studio/openai.mjs';

nextEnv.loadEnvConfig(process.cwd(), false, { info() {}, error: console.error });

const shouldApply = process.argv.includes('--apply');
const shopLocale = process.env.DEFAULT_LOCALE || 'en';

// The same rule the listing prompt gives the AI (lib/marketplace/ai.ts SHORT_RULE).
const shortNamesPrompt = (titles) =>
  'For each title of this listing of Baifo, a local marketplace, write a short name in the same language: the title cut ' +
  'down to 1–3 words, at most 20 characters, naming what it is, e.g. "Boss RC-500", "Cables", "Apple Watch Ultra", ' +
  '"Ana, canguro", "Busco surf". Return JSON with names.\n' +
  Object.entries(titles)
    .map(([locale, title]) => `${locale}: ${title}`)
    .join('\n');

/** A short name per language, from { es: 'Lote de cables y electrónica', en: '…' }. */
async function writeShortNames(titles) {
  const locales = Object.keys(titles);
  const result = await draftText(null, '', null, {
    prompt: shortNamesPrompt(titles),
    schema: {
      type: 'object',
      properties: {
        names: { type: 'object', properties: Object.fromEntries(locales.map((locale) => [locale, { type: 'string' }])), required: locales, additionalProperties: false },
      },
      required: ['names'],
    },
  });
  return result.names ?? {};
}

const prisma = new PrismaClient();
try {
  const products = await prisma.product.findMany({ where: { shortName: null }, include: { submission: true }, orderBy: { name: 'asc' } });
  const drafts = await prisma.submission.findMany({ where: { shortTitle: null, title: { not: null }, productId: null } });

  for (const product of products) {
    const translations = product.translations ?? {};
    const titles = { [shopLocale]: product.name, ...Object.fromEntries(Object.entries(translations).filter(([, text]) => text?.name).map(([locale, text]) => [locale, text.name])) };
    const names = await writeShortNames(titles);
    console.log(`${product.name} → ${JSON.stringify(names)}`);
    if (!shouldApply) continue;
    const withShort = (texts, key) => Object.fromEntries(Object.entries(texts ?? {}).map(([locale, text]) => [locale, { ...text, [key]: names[locale] || text?.[key] }]));
    await prisma.product.update({ where: { id: product.id }, data: { shortName: names[shopLocale] || null, translations: withShort(translations, 'shortName') } });
    if (product.submission) {
      await prisma.submission.update({
        where: { id: product.submission.id },
        data: { shortTitle: names[shopLocale] || null, translations: withShort(product.submission.translations, 'short') },
      });
    }
  }

  for (const draft of drafts) {
    const translations = draft.translations ?? {};
    const titles = { [shopLocale]: draft.title, ...Object.fromEntries(Object.entries(translations).filter(([, text]) => text?.title).map(([locale, text]) => [locale, text.title])) };
    const names = await writeShortNames(titles);
    console.log(`(not live) ${draft.title} → ${JSON.stringify(names)}`);
    if (!shouldApply) continue;
    const short = Object.fromEntries(Object.entries(translations).map(([locale, text]) => [locale, { ...text, short: names[locale] || text?.short }]));
    await prisma.submission.update({ where: { id: draft.id }, data: { shortTitle: names[shopLocale] || null, translations: short } });
  }

  if (!shouldApply && products.length + drafts.length > 0) console.log('\nDry run. Run with --apply to save.');
} finally {
  await prisma.$disconnect();
}
