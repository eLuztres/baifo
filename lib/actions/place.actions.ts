'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import slugify from 'slugify';
import { prisma } from '@/db/prisma';
import { isAdmin } from '@/lib/auth-guard';
import type { TranslationKey } from '@/lib/i18n-core';
import { getEnabledLocales, getShopLocale } from '@/lib/i18n-server';
import { translateText } from '@/lib/marketplace/ai';
import { formatError } from '@/lib/utils';
import { corralSchema, placeSchema, type CorralInput, type PlaceInput } from '@/lib/validators';

/** Adds a place or changes one: its name (a town is called the same in every language), live or not, and its pin. */
export async function savePlace(input: PlaceInput) {
  try {
    if (!(await isAdmin())) return { success: false, message: 'ERROR_ADMIN_ONLY' satisfies TranslationKey };
    const { id, name, isLive, x, y } = placeSchema.parse(input);
    const names = Object.fromEntries(getEnabledLocales().map((locale) => [locale, name]));
    if (id) {
      await prisma.place.update({ where: { id }, data: { name: names, isLive, x, y } });
    } else {
      const { _max } = await prisma.place.aggregate({ _max: { sortOrder: true } });
      await prisma.place.create({
        data: { slug: slugify(name, { lower: true, strict: true }), name: names, isLive, x, y, sortOrder: (_max.sortOrder ?? -1) + 1 },
      });
    }
    // The header's picker and every filtered list change with it.
    revalidatePath('/', 'layout');
    return { success: true, message: 'PLACES_ADMIN_SAVED' satisfies TranslationKey };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

const idSchema = z.string().uuid();

/** The Corral's welcome and opening times in every shop language; without the AI they stay in the shop's language only. */
async function translateCorral(text: string, hours: string) {
  const shopLocale = getShopLocale();
  const own = { [shopLocale]: { title: hours, description: text } };
  if (!text && !hours) return own;
  try {
    return { ...(await translateText({ title: hours, description: text }, shopLocale, getEnabledLocales().filter((locale) => locale !== shopLocale))), ...own };
  } catch (error) {
    console.error('Corral texts not translated', error);
    return own;
  }
}

/** Sets up a place's Corral or changes it; a place without one shows "coming soon". */
export async function saveCorral(placeId: string, input: CorralInput) {
  try {
    if (!(await isAdmin())) return { success: false, message: 'ERROR_ADMIN_ONLY' satisfies TranslationKey };
    const id = idSchema.parse(placeId);
    const { text, hours, ...fields } = corralSchema.parse(input);
    const texts = Object.entries(await translateCorral(text, hours));
    const data = {
      ...fields,
      text: Object.fromEntries(texts.map(([locale, value]) => [locale, value?.description ?? ''])),
      hours: Object.fromEntries(texts.map(([locale, value]) => [locale, value?.title ?? ''])),
    };
    await prisma.corral.upsert({ where: { placeId: id }, create: { placeId: id, ...data }, update: data });
    revalidatePath('/', 'layout');
    return { success: true, message: 'CORRAL_ADMIN_SAVED' satisfies TranslationKey };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}
