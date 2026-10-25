// What the Baifo bot writes on WhatsApp. Sellers never open the website before the payment link,
// so these texts live here and not in the shop's i18n files.

export type BotLocale = 'es' | 'en' | 'it' | 'fr' | 'de';

// Country calling codes; Switzerland and Belgium are left out because they speak more than one of these.
const PREFIX_LOCALES: [string, BotLocale][] = [
  ['34', 'es'],
  ['39', 'it'],
  ['33', 'fr'],
  ['49', 'de'],
  ['43', 'de'],
];

/** The seller's language from their number's country, English for everyone else (tourists and residents from abroad). */
export const localeOf = (waId: string): BotLocale => PREFIX_LOCALES.find(([prefix]) => waId.startsWith(prefix))?.[1] ?? 'en';

const TEXTS = {
  es: {
    welcome: '¡Hola! 👋 Soy Baifo. Mándame una foto de lo que quieres vender y, si quieres, el precio y unas palabras.',
    serviceArea: '📍 De momento solo publicamos cosas que se puedan entregar en {area}. ¡Pronto llegamos al resto de Fuerteventura!',
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
    serviceArea: '📍 For now we only post items that can be handed over in {area}. The rest of Fuerteventura is coming soon!',
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
  it: {
    welcome: 'Ciao! 👋 Sono Baifo. Mandami una foto di quello che vuoi vendere e, se vuoi, il prezzo e qualche parola.',
    serviceArea: '📍 Per ora pubblichiamo solo oggetti che si possono consegnare a {area}. Presto anche nel resto di Fuerteventura!',
    photoReceived: '📸 Foto ricevuta! Puoi mandare altre foto, il prezzo e una descrizione. Quando hai finito, tocca ✅ Fatto.',
    askPhoto: 'Prima mandami una foto di quello che vuoi vendere 📸',
    textReceived: 'Segnato ✍️ Quando hai finito, tocca ✅ Fatto.',
    done: 'Grazie! 🙌 Stiamo preparando il tuo annuncio. Ti scriviamo con un link appena è stato controllato.',
    help: 'Ecco come funziona: 1) mandami delle foto e, se vuoi, prezzo e descrizione, 2) tocca ✅ Fatto, 3) controlliamo il tuo annuncio e ti mandiamo un link per pubblicarlo per 3 mesi.\nScrivi "cancella" per ricominciare o "venduto" quando l\'hai venduto.',
    cancelled: 'Fatto, ho cancellato quello che mi avevi mandato. Puoi ricominciare quando vuoi.',
    nothingToCancel: 'Non c\'è niente in sospeso da cancellare.',
    busy: 'Il tuo annuncio precedente è ancora in preparazione. Ti scriviamo a breve.',
    approved: 'Il tuo annuncio è pronto! ✨ Dagli un\'occhiata, scegli come pubblicarlo e paga qui:\n{url}',
    rejected: 'Ci dispiace, non possiamo pubblicare questo annuncio. Se hai domande, rispondici qui.',
    live: '🎉 Il tuo annuncio è online per {days} giorni!\n{url}',
    sold: 'Complimenti per la vendita! 🎉 Ho tolto il tuo annuncio.',
    noLiveListing: 'Non trovo nessun tuo annuncio online.',
    expiring: '⏳ Il tuo annuncio «{title}» scade il {date}. Se l\'hai già venduto, scrivi "venduto". Se vuoi continuare, rimandaci le foto quando scade.',
    expired: 'Il tuo annuncio «{title}» è scaduto e non è più online. Lo pubblichiamo di nuovo? Mandaci le foto.',
    buttonDone: '✅ Fatto',
  },
  fr: {
    welcome: 'Salut ! 👋 Je suis Baifo. Envoie-moi une photo de ce que tu veux vendre et, si tu veux, le prix et quelques mots.',
    serviceArea: "📍 Pour l'instant, nous publions seulement des objets à remettre à {area}. Le reste de Fuerteventura arrive bientôt !",
    photoReceived: '📸 Photo reçue ! Tu peux envoyer d\'autres photos, le prix et une description. Quand tu as fini, appuie sur ✅ Terminé.',
    askPhoto: 'Envoie-moi d\'abord une photo de ce que tu veux vendre 📸',
    textReceived: 'C\'est noté ✍️ Quand tu as fini, appuie sur ✅ Terminé.',
    done: 'Merci ! 🙌 On prépare ton annonce. On t\'envoie un lien dès qu\'elle est vérifiée.',
    help: 'Comment ça marche : 1) envoie-moi des photos et, si tu veux, le prix et une description, 2) appuie sur ✅ Terminé, 3) on vérifie ton annonce et on t\'envoie un lien pour la publier pendant 3 mois.\nÉcris "supprimer" pour recommencer ou "vendu" une fois l\'objet vendu.',
    cancelled: 'C\'est fait, j\'ai supprimé ce que tu m\'avais envoyé. Tu peux recommencer quand tu veux.',
    nothingToCancel: 'Il n\'y a rien en attente à supprimer.',
    busy: 'Ton annonce précédente est encore en préparation. On t\'écrit très vite.',
    approved: 'Ton annonce est prête ! ✨ Jette un œil, choisis comment la publier et paie ici :\n{url}',
    rejected: 'Désolé, nous ne pouvons pas publier cette annonce. Si tu as des questions, réponds-nous ici.',
    live: '🎉 Ton annonce est en ligne pour {days} jours !\n{url}',
    sold: 'Félicitations pour la vente ! 🎉 J\'ai retiré ton annonce.',
    noLiveListing: 'Je ne trouve aucune annonce de toi en ligne.',
    expiring: '⏳ Ton annonce « {title} » se termine le {date}. Si tu l\'as déjà vendu, écris "vendu". Pour la garder en ligne, renvoie-nous les photos quand elle se termine.',
    expired: 'Ton annonce « {title} » est terminée et n\'est plus en ligne. On la republie ? Envoie-nous les photos.',
    buttonDone: '✅ Terminé',
  },
  de: {
    welcome: 'Hallo! 👋 Ich bin Baifo. Schick mir ein Foto von dem, was du verkaufen willst, und wenn du magst, den Preis und ein paar Worte.',
    serviceArea: '📍 Vorerst veröffentlichen wir nur Sachen, die in {area} übergeben werden können. Der Rest von Fuerteventura folgt bald!',
    photoReceived: '📸 Foto erhalten! Du kannst weitere Fotos, den Preis und eine Beschreibung schicken. Wenn du fertig bist, tippe auf ✅ Fertig.',
    askPhoto: 'Schick mir zuerst ein Foto von dem, was du verkaufen willst 📸',
    textReceived: 'Notiert ✍️ Wenn du fertig bist, tippe auf ✅ Fertig.',
    done: 'Danke! 🙌 Wir bereiten deine Anzeige vor und schicken dir einen Link, sobald sie geprüft ist.',
    help: 'So funktioniert\'s: 1) Schick mir Fotos und, wenn du magst, Preis und Beschreibung, 2) tippe auf ✅ Fertig, 3) wir prüfen deine Anzeige und schicken dir einen Link, um sie 3 Monate zu veröffentlichen.\nSchreib "löschen", um neu anzufangen, oder "verkauft", wenn es verkauft ist.',
    cancelled: 'Erledigt, ich habe gelöscht, was du geschickt hattest. Du kannst jederzeit neu anfangen.',
    nothingToCancel: 'Es gibt nichts Offenes zum Löschen.',
    busy: 'Deine vorherige Anzeige wird noch vorbereitet. Wir melden uns gleich.',
    approved: 'Deine Anzeige ist fertig! ✨ Schau sie dir an, wähle, wie du sie veröffentlichen willst, und bezahle hier:\n{url}',
    rejected: 'Leider können wir diese Anzeige nicht veröffentlichen. Wenn du Fragen hast, antworte uns einfach hier.',
    live: '🎉 Deine Anzeige ist jetzt {days} Tage online!\n{url}',
    sold: 'Glückwunsch zum Verkauf! 🎉 Ich habe deine Anzeige entfernt.',
    noLiveListing: 'Ich finde keine Anzeige von dir, die online ist.',
    expiring: '⏳ Deine Anzeige „{title}“ endet am {date}. Wenn sie schon verkauft ist, schreib "verkauft". Um sie online zu halten, schick uns die Fotos noch einmal, wenn sie endet.',
    expired: 'Deine Anzeige „{title}“ ist abgelaufen und nicht mehr online. Sollen wir sie neu veröffentlichen? Schick uns einfach die Fotos.',
    buttonDone: '✅ Fertig',
  },
} satisfies Record<BotLocale, Record<string, string>>;

export type BotText = keyof (typeof TEXTS)['es'];

export function botText(locale: BotLocale, key: BotText, values: Record<string, string | number> = {}) {
  return TEXTS[locale][key].replace(/\{(\w+)\}/g, (_, name: string) => String(values[name] ?? ''));
}

/** Commands sellers can type, in any of the bot's languages. */
export const COMMANDS = {
  help: ['ayuda', 'help', 'hola', 'hi', 'hello', 'info', 'aiuto', 'ciao', 'aide', 'bonjour', 'salut', 'hilfe', 'hallo'],
  cancel: ['borrar', 'cancelar', 'delete', 'cancel', 'cancella', 'annulla', 'supprimer', 'annuler', 'löschen', 'abbrechen'],
  sold: ['vendido', 'sold', 'venduto', 'vendu', 'verkauft'],
} as const;

export type Command = keyof typeof COMMANDS;

export function commandOf(text: string): Command | undefined {
  const word = text.toLowerCase().replace(/[!.¡¿?]/g, '').trim();
  return (Object.keys(COMMANDS) as Command[]).find((command) => (COMMANDS[command] as readonly string[]).includes(word));
}
