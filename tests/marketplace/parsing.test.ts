import { createHmac } from 'node:crypto';
import { parsePrice } from '@/lib/marketplace/price';
import { commandOf, localeOf } from '@/lib/marketplace/messages';
import { isValidSignature, parseMessages } from '@/lib/whatsapp-cloud/webhook';
import { parseEdit, parseReviewButton } from '@/lib/marketplace/review';

jest.mock('@/db/prisma', () => ({ prisma: {} }));
jest.mock('@/lib/whatsapp-cloud/client', () => ({ sendText: jest.fn(), sendButtons: jest.fn() }));

describe('parsePrice', () => {
  it.each([
    ['Vendo la mesa por 25€', '25.00'],
    ['25 euros, casi nueva', '25.00'],
    ['precio: 12,50', '12.50'],
    ['€ 40', '40.00'],
    ['Price 7.5', '7.50'],
  ])('reads %s', (text, price) => {
    expect(parsePrice(text)).toBe(price);
  });

  it.each(['Mesa de 3 patas', 'La tengo desde 2019', 'precio 0', ''])('finds no price in %s', (text) => {
    expect(parsePrice(text)).toBeNull();
  });
});

describe('commands and language', () => {
  it('knows commands in both languages, ignoring case and punctuation', () => {
    expect(commandOf('¡Vendido!')).toBe('sold');
    expect(commandOf('DELETE')).toBe('cancel');
    expect(commandOf('Ayuda')).toBe('help');
    expect(commandOf('vendo una mesa')).toBeUndefined();
  });

  it('writes Spanish to Spanish numbers, Italian to Italian ones and English to others', () => {
    expect(localeOf('34600111222')).toBe('es');
    expect(localeOf('393331112222')).toBe('it');
    expect(localeOf('49170111222')).toBe('en');
  });
});

describe('admin review', () => {
  it('reads review buttons', () => {
    expect(parseReviewButton('approve:abc')).toEqual({ action: 'approve', submissionId: 'abc' });
    expect(parseReviewButton('done')).toBeNull();
    expect(parseReviewButton('delete:abc')).toBeNull();
  });

  it('reads edits', () => {
    expect(parseEdit('precio 25')).toEqual({ field: 'price', value: '25.00' });
    expect(parseEdit('Título Mesa de teca')).toEqual({ field: 'title', value: 'Mesa de teca' });
    expect(parseEdit('desc Robusta.\nPoco usada.')).toEqual({ field: 'description', value: 'Robusta.\nPoco usada.' });
    expect(parseEdit('cat Muebles')).toEqual({ field: 'category', value: 'Muebles' });
    expect(parseEdit('precio barato')).toBeNull();
    expect(parseEdit('hola')).toBeNull();
  });
});

describe('webhook', () => {
  const SECRET = 'app-secret';
  const sign = (body: string) => `sha256=${createHmac('sha256', SECRET).update(body).digest('hex')}`;

  it('accepts only bodies signed with the app secret', () => {
    const body = '{"entry":[]}';
    expect(isValidSignature(body, sign(body), SECRET)).toBe(true);
    expect(isValidSignature(body, sign('{"entry":[1]}'), SECRET)).toBe(false);
    expect(isValidSignature(body, null, SECRET)).toBe(false);
    expect(isValidSignature(body, sign(body), undefined)).toBe(false);
  });

  it('turns a webhook into messages with the sender name', () => {
    const body = {
      entry: [
        {
          changes: [
            {
              value: {
                contacts: [{ wa_id: '34600111222', profile: { name: 'Ana' } }],
                messages: [
                  { id: 'm1', from: '34600111222', type: 'image', image: { id: 'media-1', caption: '20€' } },
                  { id: 'm2', from: '34600111222', type: 'interactive', interactive: { button_reply: { id: 'done', title: 'Listo' } } },
                  { id: 'm3', from: '34600111222', type: 'sticker' },
                ],
              },
            },
          ],
        },
      ],
    };

    expect(parseMessages(body)).toEqual([
      { id: 'm1', from: '34600111222', profileName: 'Ana', type: 'image', mediaId: 'media-1', text: '20€' },
      { id: 'm2', from: '34600111222', profileName: 'Ana', type: 'button', buttonId: 'done', text: 'Listo' },
      { id: 'm3', from: '34600111222', profileName: 'Ana', type: 'other' },
    ]);
  });

  it('ignores status updates and junk', () => {
    expect(parseMessages({ entry: [{ changes: [{ value: { statuses: [{}] } }] }] })).toEqual([]);
    expect(parseMessages('nonsense')).toEqual([]);
  });
});
