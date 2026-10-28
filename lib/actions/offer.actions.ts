'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { prisma } from '@/db/prisma';
import { isAdmin } from '@/lib/auth-guard';
import type { TranslationKey } from '@/lib/i18n-core';
import { getEnabledLocales, getShopLocale } from '@/lib/i18n-server';
import { translateText } from '@/lib/marketplace/ai';
import { formatError } from '@/lib/utils';
import { offerSchema, type OfferInput } from '@/lib/validators';

const idSchema = z.string().uuid();

interface OfferTexts {
  title: string;
  text: string;
  audience: string;
}

/** Title, text and audience in every shop language; without the AI they stay in the shop's language only. */
async function translateOffer({ title, text, audience }: OfferTexts) {
  const shopLocale = getShopLocale();
  const own = { [shopLocale]: { title, description: text, short: audience } };
  try {
    // The audience goes as the "short title": a label of a word or two, like "Students".
    const others = getEnabledLocales().filter((locale) => locale !== shopLocale);
    const translated = await translateText({ title, description: text, ...(audience && { short: audience }) }, shopLocale, others);
    return { ...translated, ...own };
  } catch (error) {
    console.error('Offer texts not translated', error);
    return own;
  }
}

const textsData = (texts: Awaited<ReturnType<typeof translateOffer>>, hasAudience: boolean) => {
  const entries = Object.entries(texts);
  return {
    title: Object.fromEntries(entries.map(([locale, value]) => [locale, value?.title ?? ''])),
    text: Object.fromEntries(entries.map(([locale, value]) => [locale, value?.description ?? ''])),
    audience: hasAudience ? Object.fromEntries(entries.map(([locale, value]) => [locale, value?.short ?? ''])) : {},
  };
};

// The home page, /ofertas and the menu's link all change with an offer.
const refreshOfferPages = () => revalidatePath('/', 'layout');

/** Adds an offer or changes one; its texts are translated into every shop language. */
export async function saveOffer(input: OfferInput) {
  try {
    if (!(await isAdmin())) return { success: false, message: 'ERROR_ADMIN_ONLY' satisfies TranslationKey };
    const { id, title, text, audience, ...fields } = offerSchema.parse(input);
    const data = { ...fields, ...textsData(await translateOffer({ title, text, audience }), Boolean(audience)) };
    if (id) await prisma.offer.update({ where: { id }, data });
    else await prisma.offer.create({ data });
    refreshOfferPages();
    return { success: true, message: 'OFFERS_ADMIN_SAVED' satisfies TranslationKey };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

/** Ends an offer now, before its end date; it moves to the ended ones. */
export async function endOffer(offerId: string) {
  try {
    if (!(await isAdmin())) return { success: false, message: 'ERROR_ADMIN_ONLY' satisfies TranslationKey };
    await prisma.offer.update({ where: { id: idSchema.parse(offerId) }, data: { endsAt: new Date() } });
    refreshOfferPages();
    return { success: true, message: 'OFFERS_ADMIN_ENDED' satisfies TranslationKey };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

export async function deleteOffer(offerId: string) {
  try {
    if (!(await isAdmin())) return { success: false, message: 'ERROR_ADMIN_ONLY' satisfies TranslationKey };
    await prisma.offer.delete({ where: { id: idSchema.parse(offerId) } });
    refreshOfferPages();
    return { success: true, message: 'OFFERS_ADMIN_DELETED' satisfies TranslationKey };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}
