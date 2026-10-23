import { CURRENCY } from '@/lib/constants/currency';

const base = process.env.PAYPAL_API_URL || 'https://api-m.sandbox.paypal.com';

export interface PayPalOrder {
  id: string;
  status: string;
}

export interface PayPalCapture extends PayPalOrder {
  payer?: { email_address?: string };
  purchase_units?: { payments?: { captures?: { amount?: { value?: string } }[] } }[];
}

export const paypal = {
  /** `price` is the order total as a fixed-2 string, e.g. '12.30'. */
  createOrder: async function createOrder(price: string): Promise<PayPalOrder> {
    const accessToken = await generateAccessToken();

    const response = await fetch(`${base}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [{ amount: { currency_code: CURRENCY, value: price } }],
      }),
    });

    return handleResponse<PayPalOrder>(response);
  },
  capturePayment: async function capturePayment(orderId: string): Promise<PayPalCapture> {
    const accessToken = await generateAccessToken();

    const response = await fetch(`${base}/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
    });
    return handleResponse<PayPalCapture>(response);
  },
};

export async function generateAccessToken(): Promise<string> {
  const { PAYPAL_CLIENT_ID, PAYPAL_APP_SECRET } = process.env;
  const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_APP_SECRET}`).toString('base64');

  const response = await fetch(`${base}/v1/oauth2/token`, {
    method: 'POST',
    body: 'grant_type=client_credentials',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });

  const jsonData = await handleResponse<{ access_token: string }>(response);
  return jsonData.access_token;
}

// PayPal's error bodies hold debug ids and internals: they go to the log, the customer gets a plain message.
async function handleResponse<T>(response: Response): Promise<T> {
  if (response.ok) return response.json();

  console.error(`[paypal] ${response.status} ${response.url}: ${await response.text()}`);
  throw new Error('ORDER_PAYPAL_FAILED');
}
