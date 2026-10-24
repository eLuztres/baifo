import { SIMULATED_ADMIN, SIMULATED_SELLER, isSimulatedNumber, toSimulatedLine } from '@/lib/marketplace/simulator';
import { isAdminNumber } from '@/lib/marketplace/config';
import { reviewerOf } from '@/lib/marketplace/review';

jest.mock('@/db/prisma', () => ({ prisma: {} }));
jest.mock('@/lib/whatsapp-cloud/client', () => ({ sendText: jest.fn(), sendButtons: jest.fn() }));

describe('simulator', () => {
  it('recognises simulated numbers, which no real Spanish phone can have', () => {
    expect(isSimulatedNumber(SIMULATED_SELLER)).toBe(true);
    expect(isSimulatedNumber('34600111222')).toBe(false);
  });

  it('turns bot messages into chat lines with text, picture and buttons', () => {
    expect(toSimulatedLine(SIMULATED_SELLER, { type: 'text', text: { body: 'Hola' } })).toEqual({
      waId: SIMULATED_SELLER,
      direction: 'out',
      text: 'Hola',
    });
    expect(
      toSimulatedLine(SIMULATED_ADMIN, {
        type: 'interactive',
        interactive: {
          header: { type: 'image', image: { link: 'https://utfs.io/f/a.jpg' } },
          body: { text: 'Bici 70 €' },
          action: { buttons: [{ type: 'reply', reply: { id: 'approve:1', title: '✅ Aprobar' } }] },
        },
      })
    ).toEqual({
      waId: SIMULATED_ADMIN,
      direction: 'out',
      text: 'Bici 70 €',
      image: 'https://utfs.io/f/a.jpg',
      buttons: [{ id: 'approve:1', title: '✅ Aprobar' }],
    });
  });

  it('sends simulated listings to the simulated admin and treats it as an admin', () => {
    expect(reviewerOf(SIMULATED_SELLER)).toBe(SIMULATED_ADMIN);
    expect(isAdminNumber(SIMULATED_ADMIN)).toBe(true);
    expect(isAdminNumber(SIMULATED_SELLER)).toBe(false);
  });
});
