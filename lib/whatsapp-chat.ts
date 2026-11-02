const chatQuery = (phone: string, text: string) => `phone=${phone}&text=${encodeURIComponent(text)}`;

/** Opens the WhatsApp app right away, leaving no page or tab behind. */
export const whatsappAppUrl = (phone: string, text: string) => `whatsapp://send?${chatQuery(phone, text)}`;

/** Opens the chat in WhatsApp Web, without wa.me's "Continue to chat" page in between. */
export const whatsappWebUrl = (phone: string, text: string) => `https://web.whatsapp.com/send?${chatQuery(phone, text)}`;

/** Works anywhere: for a phone without the app, or a browser that refuses the others. */
export const whatsappLinkUrl = (phone: string, text: string) => `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
