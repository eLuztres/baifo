// CallMeBot delivers a WhatsApp to the number that registered the key, which is all owner alerts need.
const CALLMEBOT_URL = 'https://api.callmebot.com/whatsapp.php';
const SEND_TIMEOUT_MS = 10000;

interface WhatsAppMessage {
  phone: string;
  apiKey: string;
  text: string;
}

/** Sends a WhatsApp to the owner's own number. Never throws. */
export async function sendWhatsApp({ phone, apiKey, text }: WhatsAppMessage): Promise<{ success: boolean; error?: string }> {
  const url = new URL(CALLMEBOT_URL);
  url.search = new URLSearchParams({ phone: phone.replace(/[^\d+]/g, ''), apikey: apiKey, text }).toString();
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(SEND_TIMEOUT_MS), cache: 'no-store' });
    if (response.ok) return { success: true };
    return { success: false, error: `${response.status} ${(await response.text()).slice(0, 200)}` };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}
