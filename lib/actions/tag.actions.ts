'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { prisma } from '@/db/prisma';
import { aiErrorText } from '@/lib/ai-errors';
import { isAdmin } from '@/lib/auth-guard';
import { LOCALES, type Locale } from '@/lib/i18n-core';
import { getEnabledLocales, getT } from '@/lib/i18n-server';
import { translateTagNames } from '@/lib/marketplace/ai';
import { cleanTagName, MAX_TAG_LENGTH, withMissingNames, type TagNames } from '@/lib/tag-names';
import { findTagByName } from '@/lib/tags';
import type { TranslationKey } from '@/lib/i18n-core';
import { formatError } from '@/lib/utils';
import { idSchema } from '@/lib/validators';

const adminOnly = () => ({
  success: false,
  message: 'ERROR_ADMIN_ONLY' satisfies TranslationKey,
});
const localeSchema = z.enum(LOCALES.map((option) => option.id) as [Locale, ...Locale[]]);
const nameSchema = z.string().max(200).transform(cleanTagName);

// The listings' pages, the search and the editor show them.
const revalidateStore = () => revalidatePath('/', 'layout');

/** A new etiqueta with its name in one language; the others stay empty until written or translated. */
export async function createTag(locale: Locale, text: string) {
  try {
    if (!(await isAdmin())) return adminOnly();
    const language = localeSchema.parse(locale);
    const name = nameSchema.parse(text);
    if (!name)
      return {
        success: false,
        message: 'TAG_INVALID' satisfies TranslationKey,
      };
    if (await findTagByName(language, name))
      return {
        success: false,
        message: 'TAG_NAME_TAKEN' satisfies TranslationKey,
      };
    await prisma.tag.create({ data: { names: { [language]: name } } });
    revalidatePath('/admin/etiquetas');
    return { success: true, message: 'TAG_CREATED' satisfies TranslationKey };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

/** Its name in one language, written by hand; empty takes that language away, as long as another one is left. */
export async function setTagName(id: string, locale: Locale, text: string) {
  try {
    if (!(await isAdmin())) return adminOnly();
    const tagId = idSchema.parse(id);
    const language = localeSchema.parse(locale);
    const name = nameSchema.parse(text);
    const tag = await prisma.tag.findUniqueOrThrow({
      where: { id: tagId },
      select: { names: true },
    });
    const others: TagNames = { ...(tag.names as TagNames) };
    delete others[language];
    if (!name && Object.values(others).every((other) => !other))
      return {
        success: false,
        message: 'TAG_INVALID' satisfies TranslationKey,
      };
    if (name && (await findTagByName(language, name, tagId)))
      return {
        success: false,
        message: 'TAG_NAME_TAKEN' satisfies TranslationKey,
      };
    await prisma.tag.update({
      where: { id: tagId },
      data: { names: name ? { ...others, [language]: name } : others },
    });
    revalidateStore();
    return { success: true, message: 'TAG_SAVED' satisfies TranslationKey };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

/** Removes the etiqueta only; its listings stay as they are, without it. */
export async function deleteTag(id: string) {
  try {
    if (!(await isAdmin())) return adminOnly();
    await prisma.tag.delete({ where: { id: idSchema.parse(id) } });
    revalidateStore();
    return { success: true, message: 'TAG_DELETED' satisfies TranslationKey };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

const translateSchema = z.object({
  from: localeSchema,
  names: z.array(z.string().min(1).max(MAX_TAG_LENGTH)).min(1).max(20),
});

/** The editor's "Traducir": these names, from the selected tab's language into the shop's other ones. Nothing is saved;
    the message is already in the admin's language. */
export async function translateTags(from: Locale, names: string[]) {
  const { t } = await getT();
  if (!(await isAdmin())) return { success: false, message: t('ERROR_ADMIN_ONLY'), translations: [] };
  const parsed = translateSchema.safeParse({ from, names });
  if (!parsed.success) return { success: false, message: t('TAG_INVALID'), translations: [] };
  try {
    const locales = getEnabledLocales().filter((locale) => locale !== parsed.data.from);
    return {
      success: true,
      message: '',
      translations: await translateTagNames(parsed.data.names, parsed.data.from, locales),
    };
  } catch (error) {
    console.error('Etiquetas not translated', error);
    return {
      success: false,
      message: aiErrorText(t, error) ?? t('TAG_TRANSLATE_FAILED'),
      translations: [],
    };
  }
}

/** The Etiquetas page's "Traducir": one etiqueta's empty names, translated from its name in `from`. Names already written stay. */
export async function translateTag(id: string, from: Locale) {
  const { t } = await getT();
  if (!(await isAdmin())) return { success: false, message: t('ERROR_ADMIN_ONLY') };
  try {
    const tagId = idSchema.parse(id);
    const language = localeSchema.parse(from);
    const tag = await prisma.tag.findUniqueOrThrow({
      where: { id: tagId },
      select: { names: true },
    });
    const names = tag.names as TagNames;
    const base = names[language];
    const missing = getEnabledLocales().filter((locale) => !names[locale]);
    if (!base) return { success: false, message: t('TAG_INVALID') };
    if (missing.length === 0) return { success: true, message: t('TAG_SAVED') };
    const [translated] = await translateTagNames([base], language, missing);
    await prisma.tag.update({
      where: { id: tagId },
      data: { names: withMissingNames(names, translated ?? {}) },
    });
    revalidateStore();
    return { success: true, message: t('TAG_SAVED') };
  } catch (error) {
    console.error(`Etiqueta ${id} not translated`, error);
    return {
      success: false,
      message: aiErrorText(t, error) ?? t('TAG_TRANSLATE_FAILED'),
    };
  }
}
