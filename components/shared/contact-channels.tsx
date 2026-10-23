import type { ComponentType } from 'react';
import { Mail, MessageCircle, Phone } from 'lucide-react';
import InstagramIcon from '@/components/shared/icons/instagram-icon';
import { BRAND } from '@/lib/brand';
import type { Translator } from '@/lib/i18n';

export interface ContactChannel {
  label: string;
  value: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
  external: boolean;
}

/** The contact options configured in .env, minus the ones its SHOW_CONTACT_* switches hide (footer and contact page). */
export function getContactChannels(t: Translator): ContactChannel[] {
  const { email, phone, whatsappUrl, instagram, instagramUrl, showEmail, showPhone, showInstagram } = BRAND.contact;
  const channels: ContactChannel[] = [];

  if (email && showEmail) {
    channels.push({ label: t('CONTACT_EMAIL_LABEL'), value: email, href: `mailto:${email}`, icon: Mail, external: false });
  }
  if (phone && showPhone) {
    channels.push({
      label: whatsappUrl ? t('CONTACT_WHATSAPP_LABEL') : t('CONTACT_PHONE_LABEL'),
      value: phone,
      href: whatsappUrl ?? `tel:${phone.replace(/[^\d+]/g, '')}`,
      icon: whatsappUrl ? MessageCircle : Phone,
      external: Boolean(whatsappUrl),
    });
  }
  if (instagram && instagramUrl && showInstagram) {
    channels.push({
      label: t('CONTACT_INSTAGRAM_LABEL'),
      value: `@${instagram.replace(/^@/, '')}`,
      href: instagramUrl,
      icon: InstagramIcon,
      external: true,
    });
  }

  return channels;
}
