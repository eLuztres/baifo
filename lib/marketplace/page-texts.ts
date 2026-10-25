import type { Locale } from '@/lib/i18n-core';

// Texts of the seller's /publicar page. Baifo-only, so they stay out of the template's i18n files.
const TEXTS = {
  es: {
    title: 'Tu anuncio',
    intro: 'Así se verá tu anuncio en Baifo. Elige cómo quieres publicarlo y paga para ponerlo online.',
    planTitle: '¿Cómo lo publicamos?',
    planNormal: 'Normal',
    planNormalText: 'Tu anuncio en Baifo durante {days} días.',
    planBig: 'Grande',
    planBigText: 'Destacado arriba y más grande, durante {days} días.',
    extrasTitle: 'Extras gratis',
    extraFacebook: 'Publicarlo también en Facebook',
    extraWallapop: 'Publicarlo también en Wallapop',
    consent: 'Acepto que mi número de WhatsApp se muestre en la web y en la lista impresa de Baifo para que los compradores me contacten.',
    payStripe: 'Pagar {price} con tarjeta',
    payPaypal: 'O paga con PayPal',
    consentRequired: 'Para publicar necesitamos tu permiso para mostrar tu número.',
    paid: '¡Gracias! Tu pago se ha recibido y tu anuncio ya está (o estará en unos segundos) online. Te avisamos por WhatsApp.',
    live: 'Este anuncio ya está online.',
    viewListing: 'Ver anuncio',
    unavailable: 'Este enlace ya no es válido. Escríbenos por WhatsApp si tienes dudas.',
    error: 'Algo ha fallado. Inténtalo de nuevo en un momento.',
  },
  en: {
    title: 'Your listing',
    intro: 'This is how your listing will look on Baifo. Choose how to publish it and pay to put it online.',
    planTitle: 'How should we publish it?',
    planNormal: 'Normal',
    planNormalText: 'Your listing on Baifo for {days} days.',
    planBig: 'Big',
    planBigText: 'Featured at the top and bigger, for {days} days.',
    extrasTitle: 'Free extras',
    extraFacebook: 'Also post it on Facebook',
    extraWallapop: 'Also post it on Wallapop',
    consent: 'I agree that my WhatsApp number is shown on the website and on Baifo’s printed list so buyers can contact me.',
    payStripe: 'Pay {price} by card',
    payPaypal: 'Or pay with PayPal',
    consentRequired: 'To publish, we need your permission to show your number.',
    paid: 'Thank you! Your payment arrived and your listing is (or will be in a few seconds) online. We will let you know on WhatsApp.',
    live: 'This listing is online.',
    viewListing: 'View listing',
    unavailable: 'This link is no longer valid. Write to us on WhatsApp if you have questions.',
    error: 'Something went wrong. Please try again in a moment.',
  },
  it: {
    title: 'Il tuo annuncio',
    intro: 'Ecco come apparirà il tuo annuncio su Baifo. Scegli come pubblicarlo e paga per metterlo online.',
    planTitle: 'Come lo pubblichiamo?',
    planNormal: 'Normale',
    planNormalText: 'Il tuo annuncio su Baifo per {days} giorni.',
    planBig: 'Grande',
    planBigText: 'In evidenza in alto e più grande, per {days} giorni.',
    extrasTitle: 'Extra gratuiti',
    extraFacebook: 'Pubblicalo anche su Facebook',
    extraWallapop: 'Pubblicalo anche su Wallapop',
    consent: 'Accetto che il mio numero WhatsApp venga mostrato sul sito e nella lista stampata di Baifo, così gli acquirenti possono contattarmi.',
    payStripe: 'Paga {price} con carta',
    payPaypal: 'Oppure paga con PayPal',
    consentRequired: 'Per pubblicare ci serve il tuo permesso a mostrare il tuo numero.',
    paid: 'Grazie! Abbiamo ricevuto il pagamento e il tuo annuncio è (o sarà tra pochi secondi) online. Ti avvisiamo su WhatsApp.',
    live: 'Questo annuncio è già online.',
    viewListing: 'Vedi annuncio',
    unavailable: 'Questo link non è più valido. Scrivici su WhatsApp se hai domande.',
    error: 'Qualcosa è andato storto. Riprova tra un momento.',
  },
} satisfies Record<'es' | 'en' | 'it', Record<string, string>>;

export type PublishPageTexts = (typeof TEXTS)['es'];

export const publishPageTexts = (locale: Locale): PublishPageTexts => (locale in TEXTS ? TEXTS[locale as keyof typeof TEXTS] : TEXTS.en);

export const fill = (text: string, values: Record<string, string | number>) =>
  text.replace(/\{(\w+)\}/g, (_, name: string) => String(values[name] ?? ''));
