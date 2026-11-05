import { prisma } from '@/db/prisma';
import { isAdmin } from '@/lib/auth-guard';
import { createHashtag, deleteHashtag, renameHashtag } from '@/lib/actions/hashtag.actions';

jest.mock('@/lib/auth-guard', () => ({ isAdmin: jest.fn(async () => true) }));
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }));
jest.mock('@/db/prisma', () => {
  const hashtag = { findUnique: jest.fn(), findUniqueOrThrow: jest.fn(), update: jest.fn(), upsert: jest.fn(), delete: jest.fn() };
  return { prisma: { hashtag, $transaction: jest.fn(async (run: (tx: unknown) => unknown) => run({ hashtag })) } };
});

const db = (prisma as unknown as { hashtag: Record<'findUnique' | 'findUniqueOrThrow' | 'update' | 'upsert' | 'delete', jest.Mock> }).hashtag;
const ID = 'ff25bd1e-d82d-4561-8ca2-337545aa373e';
const OTHER = '0d2f5e2a-1111-4222-8333-444455556666';

beforeEach(() => jest.clearAllMocks());

describe('hashtag actions', () => {
  it('is only for an admin', async () => {
    (isAdmin as jest.Mock).mockResolvedValueOnce(false);
    expect((await deleteHashtag(ID)).success).toBe(false);
    expect(db.delete).not.toHaveBeenCalled();
  });

  it('creates it under its accent-free slug', async () => {
    expect(await createHashtag('#Música')).toEqual({ success: true, message: 'HASHTAG_CREATED' });
    expect(db.upsert).toHaveBeenCalledWith({ where: { slug: 'musica' }, update: {}, create: { slug: 'musica', name: 'música' } });
  });

  it('refuses a name with nothing left in it', async () => {
    expect(await createHashtag('#!?')).toEqual({ success: false, message: 'HASHTAG_INVALID' });
    expect(await renameHashtag(ID, '  ')).toEqual({ success: false, message: 'HASHTAG_INVALID' });
    expect(db.upsert).not.toHaveBeenCalled();
    expect(db.update).not.toHaveBeenCalled();
  });

  it('renames in place, also when only the accent changes', async () => {
    db.findUnique.mockResolvedValue({ id: ID });
    expect(await renameHashtag(ID, 'Música')).toEqual({ success: true, message: 'HASHTAG_RENAMED' });
    expect(db.update).toHaveBeenCalledWith({ where: { id: ID }, data: { name: 'música', slug: 'musica' } });
    expect(db.delete).not.toHaveBeenCalled();
  });

  it('joins into a hashtag that already has the name: its listings move, this one goes', async () => {
    db.findUnique.mockResolvedValue({ id: OTHER });
    db.findUniqueOrThrow.mockResolvedValue({ submissions: [{ id: 'listing-1' }, { id: 'listing-2' }] });
    expect(await renameHashtag(ID, 'surf')).toEqual({ success: true, message: 'HASHTAG_MERGED' });
    expect(db.update).toHaveBeenCalledWith({ where: { id: OTHER }, data: { submissions: { connect: [{ id: 'listing-1' }, { id: 'listing-2' }] } } });
    expect(db.delete).toHaveBeenCalledWith({ where: { id: ID } });
  });
});
