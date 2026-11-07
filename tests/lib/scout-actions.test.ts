import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { createScout, deleteScout, updateScout } from '@/lib/actions/scout.actions';

jest.mock('@/auth', () => ({ auth: jest.fn(), signIn: jest.fn(), signOut: jest.fn() }));
jest.mock('@/db/prisma', () => ({
  prisma: { scout: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() } },
}));
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }));
jest.mock('next/headers', () => ({ cookies: jest.fn(), headers: jest.fn() }));

const mockAuth = auth as unknown as jest.Mock;
const db = (prisma as unknown as { scout: Record<string, jest.Mock> }).scout;
const ADMIN = { user: { id: 'admin-1', role: 'admin' } };
const ID = '6f1c2a4e-1b2c-4d3e-8f90-123456789abc';

beforeEach(() => {
  jest.clearAllMocks();
  mockAuth.mockResolvedValue(ADMIN);
  db.findUnique.mockResolvedValue(null);
});

describe('createScout', () => {
  it('refuses non-admins', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1', role: 'user' } });

    await expect(createScout({ name: 'Ana', phone: '' })).resolves.toEqual({ success: false, message: 'ERROR_ADMIN_ONLY' });
    expect(db.create).not.toHaveBeenCalled();
  });

  it('makes the link code from the name, and keeps the number with its country code', async () => {
    await expect(createScout({ name: 'Ana María', phone: '612 345 678' })).resolves.toEqual({ success: true, message: 'SCOUT_CREATED' });

    expect(db.create).toHaveBeenCalledWith({ data: { name: 'Ana María', phone: '34612345678', code: 'ana-maria' } });
  });

  it('adds a number to the code when another señalador has it', async () => {
    db.findUnique.mockImplementation(async ({ where }: { where: { code: string } }) => (['ana', 'ana2'].includes(where.code) ? { id: 'taken' } : null));

    await createScout({ name: 'Ana', phone: '' });

    expect(db.create).toHaveBeenCalledWith({ data: { name: 'Ana', phone: null, code: 'ana3' } });
  });

  it('needs a name and a real number', async () => {
    expect((await createScout({ name: ' ', phone: '' })).success).toBe(false);
    expect((await createScout({ name: 'Ana', phone: 'call me' })).success).toBe(false);
    expect(db.create).not.toHaveBeenCalled();
  });
});

describe('updateScout', () => {
  it('changes the name and number but never the code, so printed QRs keep working', async () => {
    await expect(updateScout({ id: ID, name: 'Ana Pérez', phone: '+34 600 111 222' })).resolves.toEqual({ success: true, message: 'SCOUT_UPDATED' });

    expect(db.update).toHaveBeenCalledWith({ where: { id: ID }, data: { name: 'Ana Pérez', phone: '34600111222' } });
  });
});

describe('deleteScout', () => {
  it('deletes only for admins', async () => {
    mockAuth.mockResolvedValue(null);
    await expect(deleteScout(ID)).resolves.toEqual({ success: false, message: 'ERROR_ADMIN_ONLY' });

    mockAuth.mockResolvedValue(ADMIN);
    await expect(deleteScout(ID)).resolves.toEqual({ success: true, message: 'SCOUT_DELETED' });
    expect(db.delete).toHaveBeenCalledWith({ where: { id: ID } });
  });
});
