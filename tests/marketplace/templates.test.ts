import { sendButtons, sendText } from '@/lib/whatsapp-cloud/client';
import { sendWithTemplateFallback, toTemplateParameter } from '@/lib/marketplace/templates';

const SELLER = '447700111222';
const fetchMock = jest.fn();

const ok = () => ({ ok: true, json: async () => ({ messages: [{ id: 'wamid.1' }] }) });
const metaError = (code: number) => ({ ok: false, statusText: 'Bad Request', json: async () => ({ error: { message: `error ${code}`, code } }) });
const sentBody = (call: number) => JSON.parse(fetchMock.mock.calls[call][1].body);

beforeEach(() => {
  process.env.WHATSAPP_TOKEN = 'token';
  process.env.WHATSAPP_PHONE_NUMBER_ID = '123';
  global.fetch = fetchMock as unknown as typeof fetch;
  fetchMock.mockReset();
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

const sendLive = () =>
  sendWithTemplateFallback(SELLER, () => sendText(SELLER, '🎉 Your listing is online for 90 days!\nhttps://baifo.es/p'), {
    key: 'listingLive',
    locale: 'en',
    parameters: ['90', 'https://baifo.es/p'],
  });

describe('sendWithTemplateFallback', () => {
  it('sends the normal message while the 24-hour window is open', async () => {
    fetchMock.mockResolvedValueOnce(ok());
    await sendLive();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(sentBody(0)).toMatchObject({ to: SELLER, type: 'text' });
  });

  it('sends the template with the same content when the window is closed (131047)', async () => {
    fetchMock.mockResolvedValueOnce(metaError(131047)).mockResolvedValueOnce(ok());
    await sendLive();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(sentBody(1)).toEqual({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: SELLER,
      type: 'template',
      template: {
        name: 'listing_live',
        language: { code: 'en' },
        components: [{ type: 'body', parameters: [{ type: 'text', text: '90' }, { type: 'text', text: 'https://baifo.es/p' }] }],
      },
    });
  });

  it('passes the review buttons as quick-reply payloads', async () => {
    fetchMock.mockResolvedValueOnce(metaError(131047)).mockResolvedValueOnce(ok());
    const buttons = [{ id: 'approve:s1', title: '✅ Aprobar' }, { id: 'reject:s1', title: '❌ Rechazar' }];
    await sendWithTemplateFallback('34600000000', () => sendButtons('34600000000', 'Mesa', buttons), {
      key: 'reviewRequest',
      locale: 'es',
      parameters: ['Mesa', '25,00 €', '', 'Mesa robusta.\nPoco usada.'],
      buttonPayloads: buttons.map((button) => button.id),
    });
    const { template } = sentBody(1);
    expect(template.name).toBe('review_request');
    expect(template.components[0].parameters.map((parameter: { text: string }) => parameter.text)).toEqual(['Mesa', '25,00 €', '-', 'Mesa robusta. · Poco usada.']);
    expect(template.components[2]).toEqual({ type: 'button', sub_type: 'quick_reply', index: '1', parameters: [{ type: 'payload', payload: 'reject:s1' }] });
  });

  it('falls back to the Spanish template when the language is missing (132001)', async () => {
    fetchMock.mockResolvedValueOnce(metaError(131047)).mockResolvedValueOnce(metaError(132001)).mockResolvedValueOnce(ok());
    await sendLive();
    expect(sentBody(1).template.language.code).toBe('en');
    expect(sentBody(2).template.language.code).toBe('es');
  });

  it('logs a failing template without throwing', async () => {
    fetchMock.mockResolvedValueOnce(metaError(131047)).mockResolvedValueOnce(metaError(132000));
    await expect(sendLive()).resolves.toBeUndefined();
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('listing_live'), expect.any(Error));
  });

  it('throws other errors as before, without a template', async () => {
    fetchMock.mockResolvedValueOnce(metaError(131026));
    await expect(sendLive()).rejects.toThrow('error 131026');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe('toTemplateParameter', () => {
  it('removes what Meta refuses in a parameter', () => {
    expect(toTemplateParameter('a\n\nb\tc     d')).toBe('a · b c d');
    expect(toTemplateParameter('  ')).toBe('-');
  });
});
