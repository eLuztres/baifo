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
};

export type PublishPageTexts = (typeof TEXTS)['es'];

export const publishPageTexts = (locale: Locale): PublishPageTexts => (locale === 'es' ? TEXTS.es : TEXTS.en);

export const fill = (text: string, values: Record<string, string | number>) =>
  text.replace(/\{(\w+)\}/g, (_, name: string) => String(values[name] ?? ''));
