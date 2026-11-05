import { prisma } from '@/db/prisma';
import { hashtagSlug } from '@/lib/hashtag-text';

/** Every hashtag to suggest in the editor, the most used first. */
export const getHashtagOptions = async () => {
  const hashtags = await prisma.hashtag.findMany({
    orderBy: [{ submissions: { _count: 'desc' } }, { slug: 'asc' }],
    select: { name: true, _count: { select: { submissions: true } } },
  });
  return hashtags.map(({ name, _count }) => ({ name, count: _count.submissions }));
};

/** Every hashtag with the listings that use it, in any state, for the admin's list. */
export const getHashtagsWithListings = () =>
  prisma.hashtag.findMany({
    orderBy: { slug: 'asc' },
    select: {
      id: true,
      slug: true,
      name: true,
      submissions: { orderBy: { updatedAt: 'desc' }, select: { id: true, title: true, status: true, type: true, images: true, rawImages: true } },
    },
  });

/** The rows of these hashtags; one not there yet is made now. Same spelling rules, so no near-duplicates. */
export const findOrCreateHashtags = (names: string[]) =>
  Promise.all(
    names.map((name) => {
      const slug = hashtagSlug(name);
      return prisma.hashtag.upsert({ where: { slug }, update: {}, create: { slug, name }, select: { id: true } });
    })
  );
