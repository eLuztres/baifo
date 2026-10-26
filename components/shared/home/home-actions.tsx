import Link from 'next/link';
import { Camera, HandHeart, Search, Sparkles, type LucideIcon } from 'lucide-react';
import { BRAND, HOME_ACTIONS } from '@/lib/brand';
import { localize } from '@/lib/category';
import { getT } from '@/lib/i18n-server';
import { SECTION_IDS } from './one-page';

const ICONS: Record<string, LucideIcon> = { camera: Camera, search: Search, offer: HandHeart, services: Sparkles };

/** "What can you do": one small card per action (brand/home-actions.json), swiped sideways; new services are new entries. */
export default async function HomeActions() {
  const { t, locale } = await getT();
  const whatsappUrl = BRAND.contact.showPhone ? BRAND.contact.whatsappUrl : undefined;
  const actions = HOME_ACTIONS.flatMap((action) => {
    const message = action.whatsapp && localize(action.whatsapp, locale);
    // An action that starts a WhatsApp chat needs the shop's number.
    const href = action.href ?? (whatsappUrl && message ? `${whatsappUrl}?text=${encodeURIComponent(message)}` : undefined);
    if (!href) return [];
    return [{ href, isExternal: !action.href, Icon: ICONS[action.icon] ?? Sparkles, title: localize(action.title, locale), text: localize(action.text, locale) }];
  });
  if (actions.length === 0) return null;

  return (
    <section id={SECTION_IDS.workshop} aria-labelledby='home-actions-title' className='space-y-3'>
      <h2 id='home-actions-title' className='font-display text-2xl sm:text-3xl'>
        {t('HOME_ACTIONS_TITLE')}
      </h2>
      {/* Sideways only: a vertical overflow would make the row its own scroller. */}
      <ul className='-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto overflow-y-hidden overscroll-x-contain px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-4 sm:overflow-visible sm:px-0'>
        {actions.map(({ href, isExternal, Icon, title, text }) => (
          <li key={title} className='w-[68%] shrink-0 snap-start sm:w-auto'>
            <Link
              href={href}
              target={isExternal ? '_blank' : undefined}
              rel={isExternal ? 'noopener noreferrer' : undefined}
              className='flex h-full flex-col gap-2 rounded-2xl border border-border bg-card p-4 transition hover:border-primary/40 hover:bg-muted/50'
            >
              <span className='flex size-9 items-center justify-center rounded-full bg-primary/15 text-primary'>
                <Icon className='size-5' aria-hidden='true' />
              </span>
              <span className='font-medium leading-tight'>{title}</span>
              <span className='text-sm leading-snug text-muted-foreground'>{text}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
