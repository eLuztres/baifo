import { paypal, generateAccessToken } from '@/lib/paypal';
import { CURRENCY } from '@/lib/constants/currency';

// PayPal is mocked at fetch level, so the tests need neither credentials nor network.
const mockFetch = jest.fn();
const originalFetch = global.fetch;

beforeAll(() => {
  global.fetch = mockFetch as unknown as typeof fetch;
});
afterAll(() => {
  global.fetch = originalFetch;
});

const jsonResponse = (body: unknown) =>
  ({ ok: true, status: 200, json: async () => body, text: async () => JSON.stringify(body) }) as Response;

const TOKEN_RESPONSE = jsonResponse({ access_token: 'token-1' });

test('generates token from paypal', async () => {
  mockFetch.mockResolvedValueOnce(TOKEN_RESPONSE);

  await expect(generateAccessToken()).resolves.toBe('token-1');
  expect(mockFetch).toHaveBeenCalledWith(
    expect.stringMatching(/\/v1\/oauth2\/token$/),
    expect.objectContaining({ method: 'POST', body: 'grant_type=client_credentials' })
  );
});

test('creates a paypal order', async () => {
  mockFetch.mockResolvedValueOnce(TOKEN_RESPONSE).mockResolvedValueOnce(jsonResponse({ id: 'PP-1', status: 'CREATED' }));

  const orderResponse = await paypal.createOrder('10.00');

  expect(orderResponse).toEqual({ id: 'PP-1', status: 'CREATED' });
  const [url, request] = mockFetch.mock.calls[1];
  expect(url).toMatch(/\/v2\/checkout\/orders$/);
  expect(request.headers.Authorization).toBe('Bearer token-1');
  expect(JSON.parse(request.body).purchase_units[0].amount).toEqual({ currency_code: CURRENCY, value: '10.00' });
});

test('simulate capturing a payment from an order', async () => {
  mockFetch.mockResolvedValueOnce(TOKEN_RESPONSE).mockResolvedValueOnce(jsonResponse({ id: '100', status: 'COMPLETED' }));

  const captureResponse = await paypal.capturePayment('100');

  expect(captureResponse).toHaveProperty('status', 'COMPLETED');
  expect(mockFetch.mock.calls[1][0]).toMatch(/\/v2\/checkout\/orders\/100\/capture$/);
});
