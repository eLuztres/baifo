import { findPhoneInText } from '@/lib/marketplace/phone-in-text';

describe('findPhoneInText', () => {
  it.each([
    ['Info: 628 111 222', '628 111 222'],
    ['Llámame al 612 345 678 por las tardes', '612 345 678'],
    ['+34 612 345 678', '+34 612 345 678'],
    ['WhatsApp 0034612345678.', '0034612345678'],
    ['Teléfono 612.34.56.78', '612.34.56.78'],
    ['Fijo: 928-123-456', '928-123-456'],
    ['612345678', '612345678'],
  ])('finds the number in "%s"', (text, number) => {
    expect(findPhoneInText(text)).toBe(number);
  });

  it('takes the first number of several', () => {
    expect(findPhoneInText('Ana 612 345 678 o Luis 699 888 777')).toBe('612 345 678');
  });

  it.each([
    'Bici de montaña, 180 euros',
    'Concierto el sábado a las 20:00 en la plaza',
    'El 6.10.2026 20:00 en Puerto del Rosario',
    'Piso por 950.000 €',
    'Referencia 1234567890123',
    '',
  ])('finds nothing in "%s"', (text) => {
    expect(findPhoneInText(text)).toBe('');
  });
});
