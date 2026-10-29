import { isAdmin } from '@/lib/auth-guard';
import { renewPaidByAdmin } from '@/lib/marketplace/publish';
import { markRenewalPaid } from '@/lib/marketplace/payment.actions';

jest.mock('@/lib/auth-guard', () => ({ isAdmin: jest.fn(), getSession: jest.fn(async () => ({ user: { email: 'jose@example.com' } })) }));
jest.mock('@/lib/marketplace/publish', () => ({ publishPaidByAdmin: jest.fn(), renewPaidByAdmin: jest.fn() }));
jest.mock('@/lib/marketplace/listing-payment', () => ({ recordConsent: jest.fn() }));

const ID = 'ff25bd1e-d82d-4561-8ca2-337545aa373e';
const mockAdmin = isAdmin as jest.Mock;
const mockRenew = renewPaidByAdmin as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockAdmin.mockResolvedValue(true);
  mockRenew.mockResolvedValue('renewed');
});

describe('markRenewalPaid', () => {
  it('books the renewal with the amount as a fixed-2 string and who recorded it', async () => {
    expect(await markRenewalPaid(ID, { method: 'bizum', amount: '5,5' })).toEqual({ success: true, message: 'Pago apuntado y anuncio renovado' });
    expect(mockRenew).toHaveBeenCalledWith(ID, { method: 'bizum', amount: '5.50', recordedBy: 'jose@example.com' });
  });

  it('is for admins only', async () => {
    mockAdmin.mockResolvedValue(false);
    expect((await markRenewalPaid(ID, { method: 'cash', amount: '5.00' })).success).toBe(false);
    expect(mockRenew).not.toHaveBeenCalled();
  });

  it('refuses a bad id, method or amount', async () => {
    expect((await markRenewalPaid('not-an-id', { method: 'cash', amount: '5.00' })).success).toBe(false);
    expect((await markRenewalPaid(ID, { method: 'stripe' as never, amount: '5.00' })).success).toBe(false);
    expect((await markRenewalPaid(ID, { method: 'cash', amount: '5 €' })).success).toBe(false);
    expect(mockRenew).not.toHaveBeenCalled();
  });

  it('says so when the listing cannot be renewed', async () => {
    mockRenew.mockResolvedValue('not-renewable');
    expect(await markRenewalPaid(ID, { method: 'cash', amount: '5.00' })).toMatchObject({ success: false });
  });
});
