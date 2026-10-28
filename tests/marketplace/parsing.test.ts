import { createHmac } from 'node:crypto';
import { parsePrice } from '@/lib/marketplace/price';
import { choiceOf, commandOf, localeOf } from '@/lib/marketplace/messages';
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
  it('knows commands in every bot language, ignoring case and punctuation', () => {
    expect(commandOf('¡Vendido!')).toBe('sold');
    expect(commandOf('DELETE')).toBe('cancel');
    expect(commandOf('Ayuda')).toBe('help');
    expect(commandOf('Löschen')).toBe('cancel');
    expect(commandOf('Vendu !')).toBe('sold');
    expect(commandOf('vendo una mesa')).toBeUndefined();
    expect(commandOf('Hola')).toBe('greeting');
  });

  it.each([
    ['1', 'PRODUCT'],
    ['2)', 'WANTED'],
    [' 4 ', 'EVENT'],
    ['Vendo una mesa', 'PRODUCT'],
    ['busco piso', 'WANTED'],
    ['Clases de yoga', 'SERVICE'],
    ['vendo clases de surf', 'SERVICE'],
    ['Taller de cerámica el sábado', 'EVENT'],
    ['Ich suche ein Fahrrad', 'WANTED'],
  ])('reads "%s" as the choice %s', (text, type) => {
    expect(choiceOf(text)).toBe(type);
  });

  it.each(['5', '12', 'mesa de teca', 'hola'])('reads no choice in "%s"', (text) => {
    expect(choiceOf(text)).toBeUndefined();
  });

  it('writes to each number in its country language and English to others', () => {
    expect(localeOf('34600111222')).toBe('es');
    expect(localeOf('393331112222')).toBe('it');
    expect(localeOf('33612345678')).toBe('fr');
    expect(localeOf('49170111222')).toBe('de');
    expect(localeOf('436641112222')).toBe('de');
    expect(localeOf('447700111222')).toBe('en');
    expect(localeOf('41791112222')).toBe('en');
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
                  { id: 'm4', from: '34600111222', type: 'interactive', interactive: { list_reply: { id: 'type:WANTED', title: 'Algo que buscas' } } },
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
      { id: 'm4', from: '34600111222', profileName: 'Ana', type: 'button', buttonId: 'type:WANTED', text: 'Algo que buscas' },
    ]);
  });

  it('ignores status updates and junk', () => {
    expect(parseMessages({ entry: [{ changes: [{ value: { statuses: [{}] } }] }] })).toEqual([]);
    expect(parseMessages('nonsense')).toEqual([]);
  });
});
