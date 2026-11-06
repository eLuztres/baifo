import { prisma } from '@/db/prisma';
import { isAdmin } from '@/lib/auth-guard';
import { createTag, deleteTag, setTagName, translateTag, translateTags } from '@/lib/actions/tag.actions';
import { translateTagNames } from '@/lib/marketplace/ai';

jest.mock('@/lib/auth-guard', () => ({ isAdmin: jest.fn(async () => true) }));
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }));
jest.mock('@/lib/i18n-server', () => ({ getEnabledLocales: () => ['es', 'en', 'de'], getT: async () => ({ t: (key: string) => key }) }));
jest.mock('@/lib/marketplace/ai', () => ({ translateTagNames: jest.fn() }));
jest.mock('@/db/prisma', () => ({ prisma: { tag: { findMany: jest.fn(async () => []), findUniqueOrThrow: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() } } }));

const db = (prisma as unknown as { tag: Record<'findMany' | 'findUniqueOrThrow' | 'create' | 'update' | 'delete', jest.Mock> }).tag;
const ID = 'ff25bd1e-d82d-4561-8ca2-337545aa373e';
const OTHER = '0d2f5e2a-1111-4222-8333-444455556666';

beforeEach(() => {
  jest.clearAllMocks();
  db.findMany.mockResolvedValue([{ id: OTHER, names: { es: 'Música', en: 'Music' } }]);
});

describe('etiqueta actions', () => {
  it('is only for an admin', async () => {
    (isAdmin as jest.Mock).mockResolvedValueOnce(false);
    expect((await deleteTag(ID)).success).toBe(false);
    expect(db.delete).not.toHaveBeenCalled();
  });

  it('creates it with its name in one language only', async () => {
    expect(await createTag('de', ' Looper-Pedal ')).toEqual({ success: true, message: 'TAG_CREATED' });
    expect(db.create).toHaveBeenCalledWith({ data: { names: { de: 'Looper-Pedal' } } });
  });

  it('never makes a second one with a name another has in that language', async () => {
    expect(await createTag('es', 'musica')).toEqual({ success: false, message: 'TAG_NAME_TAKEN' });
    expect(db.create).not.toHaveBeenCalled();
  });

  it('writes one language by hand and keeps the others', async () => {
    db.findUniqueOrThrow.mockResolvedValue({ names: { es: 'Cerámica' } });
    expect((await setTagName(ID, 'en', 'Ceramics')).success).toBe(true);
    expect(db.update).toHaveBeenCalledWith({ where: { id: ID }, data: { names: { es: 'Cerámica', en: 'Ceramics' } } });
  });

  it('takes a language away when emptied, but never the last one', async () => {
    db.findUniqueOrThrow.mockResolvedValue({ names: { es: 'Cerámica', en: 'Ceramics' } });
    await setTagName(ID, 'en', ' ');
    expect(db.update).toHaveBeenCalledWith({ where: { id: ID }, data: { names: { es: 'Cerámica' } } });
    db.findUniqueOrThrow.mockResolvedValue({ names: { es: 'Cerámica' } });
    expect(await setTagName(ID, 'es', '')).toEqual({ success: false, message: 'TAG_INVALID' });
  });

  it('translates from the selected language into the shop\'s other ones, saving nothing', async () => {
    (translateTagNames as jest.Mock).mockResolvedValue([{ es: 'Pedal looper', de: 'Looper-Pedal' }]);
    const result = await translateTags('en', ['Looper pedal']);
    expect(translateTagNames).toHaveBeenCalledWith(['Looper pedal'], 'en', ['es', 'de']);
    expect(result).toEqual({ success: true, message: '', translations: [{ es: 'Pedal looper', de: 'Looper-Pedal' }] });
    expect(db.update).not.toHaveBeenCalled();
  });
});

describe('translating one etiqueta on the Etiquetas page', () => {
  it('fills only its empty names, from the language asked', async () => {
    db.findUniqueOrThrow.mockResolvedValue({ names: { es: 'Cerámica', de: 'Keramik' } });
    (translateTagNames as jest.Mock).mockResolvedValue([{ en: 'Ceramics' }]);
    expect((await translateTag(ID, 'de')).success).toBe(true);
    expect(translateTagNames).toHaveBeenCalledWith(['Keramik'], 'de', ['en']);
    expect(db.update).toHaveBeenCalledWith({ where: { id: ID }, data: { names: { es: 'Cerámica', de: 'Keramik', en: 'Ceramics' } } });
  });

  it('cannot translate from a language it has no name in', async () => {
    db.findUniqueOrThrow.mockResolvedValue({ names: { es: 'Cerámica' } });
    expect((await translateTag(ID, 'en')).success).toBe(false);
    expect(translateTagNames).not.toHaveBeenCalled();
  });
});
