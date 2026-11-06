import { prisma } from '@/db/prisma';
import type { Locale } from '@/lib/i18n-core';
import { tagNameKey, withMissingNames, type TagNames } from '@/lib/tag-names';

/** Every etiqueta to offer in the editor, with how many listings use it. */
export const getTagOptions = async () => {
  const tags = await prisma.tag.findMany({ select: { id: true, names: true, _count: { select: { submissions: true } } } });
  return tags.map(({ id, names, _count }) => ({ id, names: names as TagNames, count: _count.submissions }));
};

/** Every etiqueta with the listings that use it, in any state, for the admin's table. */
export const getTagsWithListings = async () => {
  const tags = await prisma.tag.findMany({
    select: {
      id: true,
      names: true,
      submissions: { orderBy: { updatedAt: 'desc' }, select: { id: true, title: true, status: true, type: true, images: true, rawImages: true } },
    },
  });
  return tags.map((tag) => ({ ...tag, names: tag.names as TagNames }));
};

/** The etiqueta that already has this name in this language, so none is made twice. */
export const findTagByName = async (locale: Locale, name: string, exceptId?: string) => {
  const key = tagNameKey(name);
  const tags = await prisma.tag.findMany({ select: { id: true, names: true } });
  return tags.find((tag) => tag.id !== exceptId && tagNameKey((tag.names as TagNames)[locale] ?? '') === key);
};

/** An etiqueta the editor sent: an existing one gets the names it lacked; a new one is made, or joins the one with its name. */
export const saveEditorTag = async ({ id, names }: { id?: string; names: TagNames }) => {
  const clean = withMissingNames({}, names);
  const existing = id
    ? await prisma.tag.findUnique({ where: { id }, select: { id: true, names: true } })
    : (await Promise.all((Object.entries(clean) as [Locale, string][]).map(([locale, name]) => findTagByName(locale, name)))).find(Boolean);
  if (!existing) return Object.keys(clean).length > 0 ? prisma.tag.create({ data: { names: clean }, select: { id: true } }) : null;
  const merged = withMissingNames(existing.names as TagNames, clean);
  if (Object.keys(merged).length !== Object.keys(existing.names as TagNames).length) await prisma.tag.update({ where: { id: existing.id }, data: { names: merged } });
  return { id: existing.id };
};
