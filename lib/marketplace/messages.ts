// What the Baifo bot writes on WhatsApp. Sellers never open the website before the payment link,
// so these texts live here and not in the shop's i18n files.
import type { ListingType } from '@/lib/constants';

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
    welcome: '¡Hola! 👋 Gracias por escribir a Baifo. ¿Qué quieres publicar?',
    choiceHint: 'Contesta con el número y te digo qué necesito.',
    chooseButton: 'Elegir',
    typePRODUCT: 'Algo que vendes',
    typeWANTED: 'Algo que buscas',
    typeSERVICE: 'Un servicio o clase',
    typeEVENT: 'Un evento o taller',
    checklistPRODUCT: 'Perfecto. Mándame:\n📸 De 1 a 5 fotos\n📝 Qué es\n✨ Cómo está: nuevo, como nuevo, bueno o aceptable\n💶 El precio\n📍 La zona',
    checklistWANTED: 'Perfecto. Cuéntame:\n🔎 Qué buscas\n✨ En qué estado te vale\n💶 Tu presupuesto (desde–hasta)\n📍 La zona\n📸 Una foto, si tienes (si no, la creamos nosotros)',
    checklistSERVICE: 'Perfecto. Cuéntame:\n📝 Qué ofreces\n🧭 Si es una clase, un servicio o un acompañamiento\n💶 Precio «a partir de» (si quieres ponerlo)\n📍 La zona\n📸 Una foto o tu logo',
    checklistEVENT: 'Perfecto. Mándame:\n📝 El título\n📅 Fecha y hora\n📍 La dirección\n🎫 La entrada (0 = gratis)\n💬 Una descripción\n📸 El cartel o una foto',
    checklistEnd: 'Con eso te preparo el anuncio y te lo enseño antes de publicarlo.',
    serviceArea: '📍 De momento solo publicamos cosas que se puedan entregar en {area}. ¡Pronto llegamos al resto de Fuerteventura!',
    photoReceived: '📸 ¡Foto recibida! Puedes mandar más fotos, el precio y una descripción. Cuando termines, pulsa ✅ Listo.',
    askPhoto: 'Mándame primero una foto de lo que quieres vender 📸',
    textReceived: 'Apuntado ✍️ Cuando termines, pulsa ✅ Listo.',
    done: '¡Gracias! 🙌 Estamos preparando tu anuncio. Te escribimos con un enlace en cuanto esté revisado.',
    help: 'Así funciona: 1) dime qué quieres publicar: algo que vendes, algo que buscas, un servicio o clase, o un evento o taller, 2) mándame las fotos y los datos y pulsa ✅ Listo, 3) revisamos tu anuncio y te mandamos un enlace para publicarlo 3 meses.\nEscribe "borrar" para empezar de nuevo o "vendido" cuando lo hayas vendido.',
    cancelled: 'Listo, he borrado lo que me habías mandado. Puedes empezar de nuevo cuando quieras.',
    nothingToCancel: 'No hay nada pendiente que borrar.',
    busy: 'Tu anuncio anterior todavía se está preparando. Te escribimos enseguida.',
    approved: 'Hola 👋 Tu anuncio ya está hecho. Así lo verá la gente en Baifo:\n{url}\nEl enlace es privado, solo para ti, y vale {hours} horas. Queda un último paso para que salga online.',
    rejected: 'Lo sentimos, no podemos publicar este anuncio. Si tienes dudas, contéstanos aquí.',
    rejectedReason: 'Lo sentimos, no podemos publicar este anuncio. Motivo: {reason}\nSi tienes dudas, contéstanos aquí.',
    live: '🎉 ¡Tu anuncio ya está online durante {days} días!\n{url}',
    sold: '¡Enhorabuena por la venta! 🎉 He quitado tu anuncio.',
    noLiveListing: 'No encuentro ningún anuncio tuyo online.',
    expiring: '⏳ Tu anuncio «{title}» termina el {date}. Si ya lo vendiste, escribe "vendido". Si quieres seguir, mándanos las fotos de nuevo cuando termine.',
    expired: 'Tu anuncio «{title}» ha terminado y ya no está online. ¿Lo publicamos otra vez? Mándanos las fotos.',
    buttonDone: '✅ Listo',
  },
  en: {
    welcome: 'Hi! 👋 Thanks for writing to Baifo. What would you like to post?',
    choiceHint: "Reply with the number and I'll tell you what I need.",
    chooseButton: 'Choose',
    typePRODUCT: 'Something you sell',
    typeWANTED: 'Something you look for',
    typeSERVICE: 'A service or class',
    typeEVENT: 'An event or workshop',
    checklistPRODUCT: 'Great. Send me:\n📸 1 to 5 photos\n📝 What it is\n✨ Its condition: new, like new, good or fair\n💶 The price\n📍 The area',
    checklistWANTED: "Great. Tell me:\n🔎 What you're looking for\n✨ What condition is fine for you\n💶 Your budget (from–to)\n📍 The area\n📸 A photo, if you have one (if not, we'll make one)",
    checklistSERVICE: 'Great. Tell me:\n📝 What you offer\n🧭 Whether it is a class, a service or accompaniment\n💶 A "from" price (if you want to show one)\n📍 The area\n📸 A photo or your logo',
    checklistEVENT: 'Great. Send me:\n📝 The title\n📅 Date and time\n📍 The address\n🎫 The entry price (0 = free)\n💬 A description\n📸 The poster or a photo',
    checklistEnd: "With that I'll put your listing together and show it to you before it goes online.",
    serviceArea: '📍 For now we only post items that can be handed over in {area}. The rest of Fuerteventura is coming soon!',
    photoReceived: '📸 Photo received! You can send more photos, the price and a description. When you are done, tap ✅ Done.',
    askPhoto: 'Please send me a photo of what you want to sell first 📸',
    textReceived: 'Got it ✍️ When you are done, tap ✅ Done.',
    done: "Thanks! 🙌 We're preparing your listing and will send you a link as soon as it is reviewed.",
    help: 'How it works: 1) tell me what you want to post: something you sell, something you look for, a service or class, or an event or workshop, 2) send me the photos and details and tap ✅ Done, 3) we review your listing and send you a link to publish it for 3 months.\nWrite "delete" to start over or "sold" once it is sold.',
    cancelled: "Done, I deleted what you had sent. You can start again whenever you like.",
    nothingToCancel: 'There is nothing pending to delete.',
    busy: 'Your previous listing is still being prepared. We will write to you shortly.',
    approved: 'Hi 👋 Your listing is ready. This is how people will see it on Baifo:\n{url}\nThe link is private, just for you, and works for {hours} hours. One last step and it goes online.',
    rejected: "Sorry, we can't publish this listing. If you have questions, just reply here.",
    rejectedReason: "Sorry, we can't publish this listing. Reason: {reason}\nIf you have questions, just reply here.",
    live: '🎉 Your listing is online for {days} days!\n{url}',
    sold: 'Congratulations on the sale! 🎉 I took your listing down.',
    noLiveListing: "I can't find a listing of yours that is online.",
    expiring: '⏳ Your listing "{title}" ends on {date}. If it is sold, write "sold". To keep it online, send us the photos again when it ends.',
    expired: 'Your listing "{title}" has ended and is no longer online. Shall we publish it again? Just send us the photos.',
    buttonDone: '✅ Done',
  },
  it: {
    welcome: 'Ciao! 👋 Grazie per aver scritto a Baifo. Cosa vuoi pubblicare?',
    choiceHint: 'Rispondi con il numero e ti dico cosa mi serve.',
    chooseButton: 'Scegli',
    typePRODUCT: 'Qualcosa che vendi',
    typeWANTED: 'Qualcosa che cerchi',
    typeSERVICE: 'Un servizio o lezione',
    typeEVENT: 'Un evento o workshop',
    checklistPRODUCT: 'Perfetto. Mandami:\n📸 Da 1 a 5 foto\n📝 Cos\'è\n✨ Com\'è: nuovo, come nuovo, buono o discreto\n💶 Il prezzo\n📍 La zona',
    checklistWANTED: 'Perfetto. Raccontami:\n🔎 Cosa cerchi\n✨ In che stato ti va bene\n💶 Il tuo budget (da–a)\n📍 La zona\n📸 Una foto, se ce l\'hai (se no, la creiamo noi)',
    checklistSERVICE: 'Perfetto. Raccontami:\n📝 Cosa offri\n🧭 Se è una lezione, un servizio o un accompagnamento\n💶 Prezzo «a partire da» (se vuoi indicarlo)\n📍 La zona\n📸 Una foto o il tuo logo',
    checklistEVENT: 'Perfetto. Mandami:\n📝 Il titolo\n📅 Data e ora\n📍 L\'indirizzo\n🎫 L\'ingresso (0 = gratis)\n💬 Una descrizione\n📸 La locandina o una foto',
    checklistEnd: 'Con questo ti preparo l\'annuncio e te lo faccio vedere prima di pubblicarlo.',
    serviceArea: '📍 Per ora pubblichiamo solo oggetti che si possono consegnare a {area}. Presto anche nel resto di Fuerteventura!',
    photoReceived: '📸 Foto ricevuta! Puoi mandare altre foto, il prezzo e una descrizione. Quando hai finito, tocca ✅ Fatto.',
    askPhoto: 'Prima mandami una foto di quello che vuoi vendere 📸',
    textReceived: 'Segnato ✍️ Quando hai finito, tocca ✅ Fatto.',
    done: 'Grazie! 🙌 Stiamo preparando il tuo annuncio. Ti scriviamo con un link appena è stato controllato.',
    help: 'Ecco come funziona: 1) dimmi cosa vuoi pubblicare: qualcosa che vendi, qualcosa che cerchi, un servizio o lezione, o un evento o workshop, 2) mandami le foto e i dettagli e tocca ✅ Fatto, 3) controlliamo il tuo annuncio e ti mandiamo un link per pubblicarlo per 3 mesi.\nScrivi "cancella" per ricominciare o "venduto" quando l\'hai venduto.',
    cancelled: 'Fatto, ho cancellato quello che mi avevi mandato. Puoi ricominciare quando vuoi.',
    nothingToCancel: 'Non c\'è niente in sospeso da cancellare.',
    busy: 'Il tuo annuncio precedente è ancora in preparazione. Ti scriviamo a breve.',
    approved: 'Ciao 👋 Il tuo annuncio è pronto. Ecco come lo vedranno su Baifo:\n{url}\nIl link è privato, solo per te, e vale {hours} ore. Manca un ultimo passo e va online.',
    rejected: 'Ci dispiace, non possiamo pubblicare questo annuncio. Se hai domande, rispondici qui.',
    rejectedReason: 'Ci dispiace, non possiamo pubblicare questo annuncio. Motivo: {reason}\nSe hai domande, rispondici qui.',
    live: '🎉 Il tuo annuncio è online per {days} giorni!\n{url}',
    sold: 'Complimenti per la vendita! 🎉 Ho tolto il tuo annuncio.',
    noLiveListing: 'Non trovo nessun tuo annuncio online.',
    expiring: '⏳ Il tuo annuncio «{title}» scade il {date}. Se l\'hai già venduto, scrivi "venduto". Se vuoi continuare, rimandaci le foto quando scade.',
    expired: 'Il tuo annuncio «{title}» è scaduto e non è più online. Lo pubblichiamo di nuovo? Mandaci le foto.',
    buttonDone: '✅ Fatto',
  },
  fr: {
    welcome: 'Salut ! 👋 Merci d\'écrire à Baifo. Qu\'est-ce que tu veux publier ?',
    choiceHint: 'Réponds avec le numéro et je te dis ce qu\'il me faut.',
    chooseButton: 'Choisir',
    typePRODUCT: 'Ce que tu vends',
    typeWANTED: 'Ce que tu cherches',
    typeSERVICE: 'Un service ou un cours',
    typeEVENT: 'Un événement ou atelier',
    checklistPRODUCT: 'Parfait. Envoie-moi :\n📸 De 1 à 5 photos\n📝 Ce que c\'est\n✨ Son état : neuf, comme neuf, bon ou correct\n💶 Le prix\n📍 Le coin',
    checklistWANTED: 'Parfait. Dis-moi :\n🔎 Ce que tu cherches\n✨ Dans quel état ça te va\n💶 Ton budget (de–à)\n📍 Le coin\n📸 Une photo, si tu en as une (sinon, on la crée)',
    checklistSERVICE: 'Parfait. Dis-moi :\n📝 Ce que tu proposes\n🧭 Si c\'est un cours, un service ou un accompagnement\n💶 Un prix « à partir de » (si tu veux l\'indiquer)\n📍 Le coin\n📸 Une photo ou ton logo',
    checklistEVENT: 'Parfait. Envoie-moi :\n📝 Le titre\n📅 La date et l\'heure\n📍 L\'adresse\n🎫 L\'entrée (0 = gratuit)\n💬 Une description\n📸 L\'affiche ou une photo',
    checklistEnd: 'Avec ça, je te prépare l\'annonce et je te la montre avant de la publier.',
    serviceArea: "📍 Pour l'instant, nous publions seulement des objets à remettre à {area}. Le reste de Fuerteventura arrive bientôt !",
    photoReceived: '📸 Photo reçue ! Tu peux envoyer d\'autres photos, le prix et une description. Quand tu as fini, appuie sur ✅ Terminé.',
    askPhoto: 'Envoie-moi d\'abord une photo de ce que tu veux vendre 📸',
    textReceived: 'C\'est noté ✍️ Quand tu as fini, appuie sur ✅ Terminé.',
    done: 'Merci ! 🙌 On prépare ton annonce. On t\'envoie un lien dès qu\'elle est vérifiée.',
    help: 'Comment ça marche : 1) dis-moi ce que tu veux publier : ce que tu vends, ce que tu cherches, un service ou un cours, ou un événement ou atelier, 2) envoie-moi les photos et les infos et appuie sur ✅ Terminé, 3) on vérifie ton annonce et on t\'envoie un lien pour la publier pendant 3 mois.\nÉcris "supprimer" pour recommencer ou "vendu" une fois l\'objet vendu.',
    cancelled: 'C\'est fait, j\'ai supprimé ce que tu m\'avais envoyé. Tu peux recommencer quand tu veux.',
    nothingToCancel: 'Il n\'y a rien en attente à supprimer.',
    busy: 'Ton annonce précédente est encore en préparation. On t\'écrit très vite.',
    approved: 'Bonjour 👋 Ton annonce est prête. Voici comment on la verra sur Baifo :\n{url}\nLe lien est privé, rien que pour toi, et reste valable {hours} heures. Plus qu’une étape et elle est en ligne.',
    rejected: 'Désolé, nous ne pouvons pas publier cette annonce. Si tu as des questions, réponds-nous ici.',
    rejectedReason: 'Désolé, nous ne pouvons pas publier cette annonce. Raison : {reason}\nSi tu as des questions, réponds-nous ici.',
    live: '🎉 Ton annonce est en ligne pour {days} jours !\n{url}',
    sold: 'Félicitations pour la vente ! 🎉 J\'ai retiré ton annonce.',
    noLiveListing: 'Je ne trouve aucune annonce de toi en ligne.',
    expiring: '⏳ Ton annonce « {title} » se termine le {date}. Si tu l\'as déjà vendu, écris "vendu". Pour la garder en ligne, renvoie-nous les photos quand elle se termine.',
    expired: 'Ton annonce « {title} » est terminée et n\'est plus en ligne. On la republie ? Envoie-nous les photos.',
    buttonDone: '✅ Terminé',
  },
  de: {
    welcome: 'Hallo! 👋 Danke, dass du Baifo schreibst. Was möchtest du veröffentlichen?',
    choiceHint: 'Antworte mit der Nummer, dann sage ich dir, was ich brauche.',
    chooseButton: 'Auswählen',
    typePRODUCT: 'Etwas, das du verkaufst',
    typeWANTED: 'Etwas, das du suchst',
    typeSERVICE: 'Ein Service oder Kurs',
    typeEVENT: 'Ein Event oder Workshop',
    checklistPRODUCT: 'Super. Schick mir:\n📸 1 bis 5 Fotos\n📝 Was es ist\n✨ Den Zustand: neu, wie neu, gut oder akzeptabel\n💶 Den Preis\n📍 Die Gegend',
    checklistWANTED: 'Super. Erzähl mir:\n🔎 Was du suchst\n✨ In welchem Zustand es sein darf\n💶 Dein Budget (von–bis)\n📍 Die Gegend\n📸 Ein Foto, wenn du eins hast (sonst machen wir eins)',
    checklistSERVICE: 'Super. Erzähl mir:\n📝 Was du anbietest\n🧭 Ob es ein Kurs, ein Service oder eine Begleitung ist\n💶 Einen „ab“-Preis (wenn du magst)\n📍 Die Gegend\n📸 Ein Foto oder dein Logo',
    checklistEVENT: 'Super. Schick mir:\n📝 Den Titel\n📅 Datum und Uhrzeit\n📍 Die Adresse\n🎫 Den Eintritt (0 = kostenlos)\n💬 Eine Beschreibung\n📸 Das Plakat oder ein Foto',
    checklistEnd: 'Damit bereite ich die Anzeige vor und zeige sie dir, bevor sie online geht.',
    serviceArea: '📍 Vorerst veröffentlichen wir nur Sachen, die in {area} übergeben werden können. Der Rest von Fuerteventura folgt bald!',
    photoReceived: '📸 Foto erhalten! Du kannst weitere Fotos, den Preis und eine Beschreibung schicken. Wenn du fertig bist, tippe auf ✅ Fertig.',
    askPhoto: 'Schick mir zuerst ein Foto von dem, was du verkaufen willst 📸',
    textReceived: 'Notiert ✍️ Wenn du fertig bist, tippe auf ✅ Fertig.',
    done: 'Danke! 🙌 Wir bereiten deine Anzeige vor und schicken dir einen Link, sobald sie geprüft ist.',
    help: 'So funktioniert\'s: 1) Sag mir, was du veröffentlichen willst: etwas, das du verkaufst, etwas, das du suchst, einen Service oder Kurs oder ein Event oder einen Workshop, 2) schick mir die Fotos und Infos und tippe auf ✅ Fertig, 3) wir prüfen deine Anzeige und schicken dir einen Link, um sie 3 Monate zu veröffentlichen.\nSchreib "löschen", um neu anzufangen, oder "verkauft", wenn es verkauft ist.',
    cancelled: 'Erledigt, ich habe gelöscht, was du geschickt hattest. Du kannst jederzeit neu anfangen.',
    nothingToCancel: 'Es gibt nichts Offenes zum Löschen.',
    busy: 'Deine vorherige Anzeige wird noch vorbereitet. Wir melden uns gleich.',
    approved: 'Hallo 👋 Deine Anzeige ist fertig. So sehen sie die Leute auf Baifo:\n{url}\nDer Link ist privat, nur für dich, und gilt {hours} Stunden. Noch ein letzter Schritt, dann ist sie online.',
    rejected: 'Leider können wir diese Anzeige nicht veröffentlichen. Wenn du Fragen hast, antworte uns einfach hier.',
    rejectedReason: 'Leider können wir diese Anzeige nicht veröffentlichen. Grund: {reason}\nWenn du Fragen hast, antworte uns einfach hier.',
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
  help: ['ayuda', 'help', 'info', 'aiuto', 'aide', 'hilfe'],
  greeting: ['hola', 'buenas', 'hi', 'hello', 'ciao', 'bonjour', 'salut', 'hallo'],
  cancel: ['borrar', 'cancelar', 'delete', 'cancel', 'cancella', 'annulla', 'supprimer', 'annuler', 'löschen', 'abbrechen'],
  sold: ['vendido', 'sold', 'venduto', 'vendu', 'verkauft'],
} as const;

export type Command = keyof typeof COMMANDS;

export function commandOf(text: string): Command | undefined {
  const word = text.toLowerCase().replace(/[!.¡¿?]/g, '').trim();
  return (Object.keys(COMMANDS) as Command[]).find((command) => (COMMANDS[command] as readonly string[]).includes(word));
}

/** The welcome's choices, in its order: "1" is the first. */
export const CHOICE_TYPES = ['PRODUCT', 'WANTED', 'SERVICE', 'EVENT'] as const satisfies readonly ListingType[];

// Words that name a choice, in any of the bot's languages.
const CHOICE_WORDS: Record<ListingType, string[]> = {
  PRODUCT: ['vendo', 'vender', 'sell', 'selling', 'vendere', 'vends', 'vendre', 'verkaufe', 'verkaufen'],
  WANTED: ['busco', 'buscar', 'buscando', 'looking', 'cerco', 'cherche', 'suche'],
  SERVICE: ['servicio', 'clase', 'clases', 'service', 'class', 'lessons', 'servizio', 'lezione', 'lezioni', 'cours', 'kurs', 'dienstleistung'],
  EVENT: ['evento', 'taller', 'event', 'workshop', 'événement', 'atelier', 'veranstaltung'],
};

/** The listing type a seller picked by typing its number ("2") or a word that names it ("busco una tabla"). */
export function choiceOf(text: string): ListingType | undefined {
  const number = text.trim().match(/^([1-4])[.)]?$/)?.[1];
  if (number) return CHOICE_TYPES[Number(number) - 1];
  const words = text.toLowerCase().split(/[^\p{L}]+/u);
  // The rarer types first: "vendo clases de surf" is a service.
  return [...CHOICE_TYPES].reverse().find((type) => CHOICE_WORDS[type].some((word) => words.includes(word)));
}
