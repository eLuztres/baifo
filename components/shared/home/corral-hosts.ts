import { BRAND } from '@/lib/brand';
import { getPlaces } from '@/lib/places';

export interface CorralHost {
  name: string;
  corralName: string;
  image: string;
  whatsappUrl: string;
}

/** The people of the live corrals, so contact starts with a face; a host without their own number gets the shop's.
    `message` writes the WhatsApp text for a host's first name. */
export async function getCorralHosts(message: (name: string) => string): Promise<CorralHost[]> {
  const places = await getPlaces();
  return places.flatMap(({ isLive, corral }) => {
    if (!isLive || !corral?.hostName || !corral.hostImage) return [];
    const name = corral.hostName.split(' ')[0];
    const text = message(name);
    const phone = corral.whatsapp?.replace(/\D/g, '');
    const whatsappUrl = phone
      ? `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(text)}`
      : BRAND.contact.showPhone && BRAND.contact.sellWhatsappUrl(text);
    return whatsappUrl ? [{ name, corralName: corral.name, image: corral.hostImage, whatsappUrl }] : [];
  });
}
