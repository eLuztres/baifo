'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/db/prisma';
import { isAdmin } from '@/lib/auth-guard';
import { hashtagSlug, toHashtagName } from '@/lib/hashtag-text';
import type { TranslationKey } from '@/lib/i18n-core';
import { formatError } from '@/lib/utils';
import { idSchema } from '@/lib/validators';

const adminOnly = () => ({ success: false, message: 'ERROR_ADMIN_ONLY' satisfies TranslationKey });
const invalidName = () => ({ success: false, message: 'HASHTAG_INVALID' satisfies TranslationKey });

// The listings' pages and the search show them.
const revalidateStore = () => revalidatePath('/', 'layout');

export async function createHashtag(text: string) {
  try {
    if (!(await isAdmin())) return adminOnly();
    const name = toHashtagName(text);
    if (!name) return invalidName();
    const slug = hashtagSlug(name);
    await prisma.hashtag.upsert({ where: { slug }, update: {}, create: { slug, name } });
    revalidatePath('/admin/hashtags');
    return { success: true, message: 'HASHTAG_CREATED' satisfies TranslationKey };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

/** Fixes how it is written. A name another hashtag already has joins them: its listings move over, this one goes. */
export async function renameHashtag(id: string, text: string) {
  try {
    if (!(await isAdmin())) return adminOnly();
    const hashtagId = idSchema.parse(id);
    const name = toHashtagName(text);
    if (!name) return invalidName();
    const slug = hashtagSlug(name);
    const sameName = await prisma.hashtag.findUnique({ where: { slug }, select: { id: true } });
    if (sameName && sameName.id !== hashtagId) {
      await prisma.$transaction(async (tx) => {
        const { submissions } = await tx.hashtag.findUniqueOrThrow({ where: { id: hashtagId }, select: { submissions: { select: { id: true } } } });
        await tx.hashtag.update({ where: { id: sameName.id }, data: { submissions: { connect: submissions } } });
        await tx.hashtag.delete({ where: { id: hashtagId } });
      });
      revalidateStore();
      return { success: true, message: 'HASHTAG_MERGED' satisfies TranslationKey };
    }
    await prisma.hashtag.update({ where: { id: hashtagId }, data: { name, slug } });
    revalidateStore();
    return { success: true, message: 'HASHTAG_RENAMED' satisfies TranslationKey };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

/** Removes the hashtag only; its listings stay as they are, without it. */
export async function deleteHashtag(id: string) {
  try {
    if (!(await isAdmin())) return adminOnly();
    await prisma.hashtag.delete({ where: { id: idSchema.parse(id) } });
    revalidateStore();
    return { success: true, message: 'HASHTAG_DELETED' satisfies TranslationKey };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}
