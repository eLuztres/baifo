'use client';

import { useState, useTransition, type ComponentType, type ReactNode } from 'react';
import { Globe, Loader2, Mail, MessageCircle } from 'lucide-react';
import { useI18n } from '@/components/i18n-provider';
import InstagramIcon from '@/components/shared/icons/instagram-icon';
import { Button } from '@/components/ui/button';
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer';
import { getProductEmail } from '@/lib/actions/product.actions';
import { instagramUrl, webLabel } from '@/lib/marketplace/contact-ways';
import { cn } from '@/lib/utils';
import ContactSellerButton from './contact-seller-button';

interface ContactWaysButtonProps {
  productId: string;
  /** The prefilled WhatsApp message; missing when the listing shows no number. */
  message?: string;
  /** Only whether there is one: the address itself is fetched on the tap, like the number. */
  hasEmail: boolean;
  web?: string | null;
  instagram?: string | null;
  sellerName?: string | null;
  className?: string;
}

type EmailProblem = 'unavailable' | 'tooMany';

const ROW_CLASS =
  'flex h-auto w-full items-center justify-start gap-3 rounded-2xl border border-border bg-card p-3 text-left font-normal text-foreground shadow-none transition hover:border-primary/40 hover:bg-card';

/** "Contact" with more ways than the WhatsApp: one way opens it at once, several open a list to choose from. */
export default function ContactWaysButton({ productId, message, hasEmail, web, instagram, sellerName, className }: ContactWaysButtonProps) {
  const { t } = useI18n();
  const [emailProblem, setEmailProblem] = useState<EmailProblem | null>(null);
  const [isEmailPending, startEmail] = useTransition();
  const wayCount = [message, hasEmail, web, instagram].filter(Boolean).length;

  const openEmail = () =>
    startEmail(async () => {
      const contact = await getProductEmail(productId);
      if (!contact || 'isRateLimited' in contact) return setEmailProblem(contact ? 'tooMany' : 'unavailable');
      setEmailProblem(null);
      window.location.href = `mailto:${contact.email}`;
    });
  const problemNote = emailProblem && (
    <p role='alert' className='text-sm text-muted-foreground'>
      {t(emailProblem === 'tooMany' ? 'CONTACT_SELLER_TOO_MANY' : 'CONTACT_SELLER_UNAVAILABLE')}
    </p>
  );

  // One way only: no list in between, the tap goes straight there.
  if (wayCount === 1) {
    if (message) return <ContactSellerButton productId={productId} message={message} className={className} />;
    const Icon = hasEmail ? Mail : web ? Globe : InstagramIcon;
    const content = (
      <>
        {isEmailPending ? <Loader2 className='animate-spin' /> : <Icon className='size-4' />} {t('CONTACT_SELLER')}
      </>
    );
    return (
      <div className={cn('flex flex-col gap-2', className)}>
        {hasEmail ? (
          <Button onClick={openEmail} disabled={isEmailPending} className='h-11 rounded-full'>
            {content}
          </Button>
        ) : (
          <Button asChild className='h-11 rounded-full'>
            <a href={web ?? instagramUrl(instagram ?? '')} target='_blank' rel='noopener noreferrer'>
              {content}
            </a>
          </Button>
        )}
        {problemNote}
      </div>
    );
  }

  return (
    <Drawer>
      <DrawerTrigger asChild>
        <Button className={cn('h-11 rounded-full', className)}>
          <MessageCircle /> {t('CONTACT_SELLER')}
        </Button>
      </DrawerTrigger>
      <DrawerContent className='mx-auto max-w-md'>
        <DrawerHeader className='items-center text-center'>
          <DrawerTitle className='font-display text-2xl'>{sellerName ? t('CONTACT_WAYS_TITLE', { name: sellerName }) : t('CONTACT_SELLER')}</DrawerTitle>
          <DrawerDescription className='sr-only'>{t('CONTACT_SELLER')}</DrawerDescription>
        </DrawerHeader>
        <ul className='space-y-2 px-4 pb-6'>
          {message && (
            <li>
              <ContactSellerButton productId={productId} message={message} buttonClassName={ROW_CLASS}>
                <ContactRow icon={MessageCircle} label='WhatsApp' value={t('CONTACT_WRITE_WHATSAPP')} />
              </ContactSellerButton>
            </li>
          )}
          {hasEmail && (
            <li className='space-y-2'>
              <Button onClick={openEmail} disabled={isEmailPending} className={ROW_CLASS}>
                <ContactRow icon={isEmailPending ? Loader2 : Mail} label={t('CONTACT_EMAIL')} value={t('CONTACT_SEND_EMAIL')} />
              </Button>
              {problemNote}
            </li>
          )}
          {web && (
            <li>
              <a href={web} target='_blank' rel='noopener noreferrer' className={ROW_CLASS}>
                <ContactRow icon={Globe} label={t('CONTACT_WEB')} value={webLabel(web)} />
              </a>
            </li>
          )}
          {instagram && (
            <li>
              <a href={instagramUrl(instagram)} target='_blank' rel='noopener noreferrer' className={ROW_CLASS}>
                <ContactRow icon={InstagramIcon} label='Instagram' value={`@${instagram}`} />
              </a>
            </li>
          )}
        </ul>
      </DrawerContent>
    </Drawer>
  );
}

interface ContactRowProps {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: ReactNode;
}

function ContactRow({ icon: Icon, label, value }: ContactRowProps) {
  return (
    <>
      <span className='flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary'>
        <Icon className={cn('size-5', Icon === Loader2 && 'animate-spin')} />
      </span>
      <span className='min-w-0'>
        <span className='block text-xs text-muted-foreground'>{label}</span>
        <span className='block truncate font-medium'>{value}</span>
      </span>
    </>
  );
}
