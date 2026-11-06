'use server';

import { z } from 'zod';
import { isAdmin } from '@/lib/auth-guard';
import type { Locale, TranslationKey } from '@/lib/i18n-core';
import { aiErrorText } from '@/lib/ai-errors';
import { formatError } from '@/lib/utils';
import { getEnabledLocales, getShopLocale, getT } from '@/lib/i18n-server';
import { translateText, writeGroupText } from '@/lib/marketplace/ai';

const groupTextsSchema = z.object({ name: z.string().trim().min(1).max(60), text: z.string().trim().max(300) });

type GroupTexts = Partial<Record<Locale, { name: string; text: string }>>;

const adminOnly = () => ({ success: false, message: 'ERROR_ADMIN_ONLY' satisfies TranslationKey });

/** A Mercadillo's name and text from the shop's language, in every other language of the shop; never improved, only translated. */
export async function translateGroupTexts(data: z.infer<typeof groupTextsSchema>) {
  try {
    if (!(await isAdmin())) return adminOnly();
    const { name, text } = groupTextsSchema.parse(data);
    const from = getShopLocale();
    const made = await translateText({ title: name, description: text }, from, getEnabledLocales().filter((locale) => locale !== from));
    const texts = Object.fromEntries(Object.entries(made).map(([locale, item]) => [locale, { name: item?.title ?? '', text: item?.description ?? '' }]));
    return { success: true, message: '', texts: texts as GroupTexts };
  } catch (error) {
    return { success: false, message: aiErrorText((await getT()).t, error) ?? formatError(error) };
  }
}

/** The admin's notes as an inviting description, written by the AI, with the name, in every language of the shop. */
export async function improveGroupTexts(data: z.infer<typeof groupTextsSchema>) {
  try {
    if (!(await isAdmin())) return adminOnly();
    const { name, text } = groupTextsSchema.parse(data);
    const shopLocale = getShopLocale();
    const made = await writeGroupText({ title: name, description: text }, [shopLocale, ...getEnabledLocales().filter((locale) => locale !== shopLocale)]);
    // Cut to the 300 characters the text takes, so the improved one can always be saved.
    const texts = Object.fromEntries(Object.entries(made).map(([locale, item]) => [locale, { name: item?.title ?? '', text: (item?.description ?? '').slice(0, 300) }]));
    return { success: true, message: '', texts: texts as GroupTexts };
  } catch (error) {
    return { success: false, message: aiErrorText((await getT()).t, error) ?? formatError(error) };
  }
}
