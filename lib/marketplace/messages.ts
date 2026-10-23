// What the Baifo bot writes on WhatsApp. Sellers never open the website before the payment link,
// so these texts live here and not in the shop's i18n files.

export type BotLocale = 'es' | 'en';

/** Spanish for Spanish numbers, English for everyone else (tourists and residents from abroad). */
export const localeOf = (waId: string): BotLocale => (waId.startsWith('34') ? 'es' : 'en');

const TEXTS = {
  es: {
    welcome: '¡Hola! 👋 Soy Baifo. Mándame una foto de lo que quieres vender y, si quieres, el precio y unas palabras.',
    photoReceived: '📸 ¡Foto recibida! Puedes mandar más fotos, el precio y una descripción. Cuando termines, pulsa ✅ Listo.',
    askPhoto: 'Mándame primero una foto de lo que quieres vender 📸',
    textReceived: 'Apuntado ✍️ Cuando termines, pulsa ✅ Listo.',
    done: '¡Gracias! 🙌 Estamos preparando tu anuncio. Te escribimos con un enlace en cuanto esté revisado.',
    help: 'Así funciona: 1) mándame fotos y, si quieres, precio y descripción, 2) pulsa ✅ Listo, 3) revisamos tu anuncio y te mandamos un enlace para publicarlo 3 meses.\nEscribe "borrar" para empezar de nuevo o "vendido" cuando lo hayas vendido.',
    cancelled: 'Listo, he borrado lo que me habías mandado. Puedes empezar de nuevo cuando quieras.',
    nothingToCancel: 'No hay nada pendiente que borrar.',
    busy: 'Tu anuncio anterior todavía se está preparando. Te escribimos enseguida.',
    approved: '¡Tu anuncio está listo! ✨ Míralo, elige cómo quieres publicarlo y paga aquí:\n{url}',
    rejected: 'Lo sentimos, no podemos publicar este anuncio. Si tienes dudas, contéstanos aquí.',
    live: '🎉 ¡Tu anuncio ya está online durante {days} días!\n{url}',
    sold: '¡Enhorabuena por la venta! 🎉 He quitado tu anuncio.',
    noLiveListing: 'No encuentro ningún anuncio tuyo online.',
    expiring: '⏳ Tu anuncio «{title}» termina el {date}. Si ya lo vendiste, escribe "vendido". Si quieres seguir, mándanos las fotos de nuevo cuando termine.',
    expired: 'Tu anuncio «{title}» ha terminado y ya no está online. ¿Lo publicamos otra vez? Mándanos las fotos.',
    buttonDone: '✅ Listo',
  },
  en: {
    welcome: "Hi! 👋 I'm Baifo. Send me a photo of what you want to sell and, if you like, the price and a few words.",
    photoReceived: '📸 Photo received! You can send more photos, the price and a description. When you are done, tap ✅ Done.',
    askPhoto: 'Please send me a photo of what you want to sell first 📸',
    textReceived: 'Got it ✍️ When you are done, tap ✅ Done.',
    done: "Thanks! 🙌 We're preparing your listing and will send you a link as soon as it is reviewed.",
    help: 'How it works: 1) send me photos and, if you like, the price and a description, 2) tap ✅ Done, 3) we review your listing and send you a link to publish it for 3 months.\nWrite "delete" to start over or "sold" once it is sold.',
    cancelled: "Done, I deleted what you had sent. You can start again whenever you like.",
    nothingToCancel: 'There is nothing pending to delete.',
    busy: 'Your previous listing is still being prepared. We will write to you shortly.',
    approved: 'Your listing is ready! ✨ Have a look, choose how to publish it and pay here:\n{url}',
    rejected: "Sorry, we can't publish this listing. If you have questions, just reply here.",
    live: '🎉 Your listing is online for {days} days!\n{url}',
    sold: 'Congratulations on the sale! 🎉 I took your listing down.',
    noLiveListing: "I can't find a listing of yours that is online.",
    expiring: '⏳ Your listing "{title}" ends on {date}. If it is sold, write "sold". To keep it online, send us the photos again when it ends.',
    expired: 'Your listing "{title}" has ended and is no longer online. Shall we publish it again? Just send us the photos.',
    buttonDone: '✅ Done',
  },
} satisfies Record<BotLocale, Record<string, string>>;

export type BotText = keyof (typeof TEXTS)['es'];

export function botText(locale: BotLocale, key: BotText, values: Record<string, string | number> = {}) {
  return TEXTS[locale][key].replace(/\{(\w+)\}/g, (_, name: string) => String(values[name] ?? ''));
}

/** Commands sellers can type, in either language. */
export const COMMANDS = {
  help: ['ayuda', 'help', 'hola', 'hi', 'hello', 'info'],
  cancel: ['borrar', 'cancelar', 'delete', 'cancel'],
  sold: ['vendido', 'sold'],
} as const;

export type Command = keyof typeof COMMANDS;

export function commandOf(text: string): Command | undefined {
  const word = text.trim().toLowerCase().replace(/[!.¡¿?]/g, '');
  return (Object.keys(COMMANDS) as Command[]).find((command) => (COMMANDS[command] as readonly string[]).includes(word));
}
