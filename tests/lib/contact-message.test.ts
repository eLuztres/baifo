import { cleanNickname, contactMessage, NICKNAME_MAX_LENGTH } from '@/lib/contact-message';
import { getTranslator, LOCALES } from '@/lib/i18n';

const TEXTS = { hello: 'Hi!', helloNamed: "Hi! I'm {nick}", body: '{hello} 👋 About “Clock”: https://shop.test/product/clock' };

describe('contact message', () => {
  it('keeps a nickname short, on one line and without links', () => {
    expect(cleanNickname('  Lula  ')).toBe('Lula');
    expect(cleanNickname('Lula\nla del\tbarrio')).toBe('Lula la del barrio');
    expect(cleanNickname('Lula https://spam.example')).toBe('Lula');
    expect(cleanNickname('Lula www.spam.com spam.es')).toBe('Lula');
    expect(cleanNickname('Lula @insta')).toBe('Lula');
    expect(cleanNickname('Lula <3 :)')).toBe('Lula 3');
    expect(cleanNickname('José María O’Neill')).toBe('José María O’Neill');
    expect(cleanNickname('x'.repeat(80))).toHaveLength(NICKNAME_MAX_LENGTH);
  });

  it('greets with the nickname, or just hello without one', () => {
    expect(contactMessage(TEXTS, 'Lula')).toBe("Hi! I'm Lula 👋 About “Clock”: https://shop.test/product/clock");
    expect(contactMessage(TEXTS, '  ')).toBe('Hi! 👋 About “Clock”: https://shop.test/product/clock');
    expect(contactMessage(TEXTS, 'http://x.com')).toBe('Hi! 👋 About “Clock”: https://shop.test/product/clock');
  });

  it('has a hello and a message for every listing type in every language', () => {
    for (const { id } of LOCALES) {
      const t = getTranslator(id);
      expect(t('CONTACT_MESSAGE_HELLO_NAMED')).toContain('{nick}');
      for (const key of ['CONTACT_MESSAGE_PRODUCT', 'CONTACT_MESSAGE_WANTED', 'CONTACT_MESSAGE_SERVICE', 'CONTACT_MESSAGE_EVENT'] as const) {
        expect(t(key)).toMatch(/^\{hello\} .*\{name\}.*\{shop\}.*\{url\}$/);
      }
    }
  });
});
