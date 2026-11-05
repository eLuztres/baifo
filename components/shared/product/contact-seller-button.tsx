'use client';

import { useState, useTransition, type ReactNode } from 'react';
import { Loader2, MessageCircle } from 'lucide-react';
import { useI18n } from '@/components/i18n-provider';
import { Button } from '@/components/ui/button';
import { getMercadilloContact, getProductContact } from '@/lib/actions/product.actions';
import { cn } from '@/lib/utils';
import { whatsappAppUrl, whatsappLinkUrl, whatsappWebUrl } from '@/lib/whatsapp-chat';

interface ContactSellerButtonProps {
  /** The listing to contact; or `mercadilloId`, a Mercadillo. */
  productId?: string;
  mercadilloId?: string;
  /** The prefilled WhatsApp message, in the listing's language. */
  message: string;
  className?: string;
  /** In the list of several contacts: the row's own look and words instead of "Contact". */
  buttonClassName?: string;
  children?: ReactNode;
}

type ContactProblem = 'unavailable' | 'tooMany';

const WHATSAPP_TAB = 'baifo-whatsapp';
// Long enough for the phone to ask "Open in WhatsApp?" and switch to the app.
const APP_WAIT_MS = 2500;

const isPhone = () => /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

/** Straight to the app, with no tab left behind; the page still showing after the wait means there is no app. */
function openInApp(phone: string, message: string) {
  window.location.href = whatsappAppUrl(phone, message);
  setTimeout(() => {
    if (document.visibilityState === 'visible') window.location.href = whatsappLinkUrl(phone, message);
  }, APP_WAIT_MS);
}

/** Classifieds: one tap opens WhatsApp with the message written.
    The seller's number is fetched on the tap, so it isn't in the page for scrapers. */
export default function ContactSellerButton({ productId, mercadilloId, message, className, buttonClassName, children }: ContactSellerButtonProps) {
  const { t } = useI18n();
  const [problem, setProblem] = useState<ContactProblem | null>(null);
  const [isPending, startTransition] = useTransition();

  const openChat = () => {
    const isOnPhone = isPhone();
    // Computers: opened inside the tap, because after waiting for the number browsers would block it as a pop-up.
    const chat = isOnPhone ? null : window.open('', WHATSAPP_TAB);
    startTransition(async () => {
      const contact = mercadilloId ? await getMercadilloContact(mercadilloId) : productId ? await getProductContact(productId) : null;
      if (!contact || 'isRateLimited' in contact) {
        chat?.close();
        setProblem(contact ? 'tooMany' : 'unavailable');
        return;
      }
      setProblem(null);
      const phone = contact.whatsappUrl.split('/').pop() ?? '';
      if (isOnPhone) {
        openInApp(phone, message);
      } else if (chat) {
        // A tab reused from an earlier contact is on WhatsApp's site, which doesn't allow setting this.
        try {
          chat.opener = null;
        } catch {}
        chat.location.href = whatsappWebUrl(phone, message);
      } else {
        window.location.href = whatsappLinkUrl(phone, message);
      }
    });
  };

  if (problem === 'unavailable') return <p className={cn('text-sm text-muted-foreground', className)}>{t('CONTACT_SELLER_UNAVAILABLE')}</p>;

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <Button onClick={openChat} disabled={isPending} className={cn('h-11 rounded-full', buttonClassName)}>
        {children ?? (
          <>
            {isPending ? <Loader2 className='animate-spin' /> : <MessageCircle />} {t('CONTACT_SELLER')}
          </>
        )}
      </Button>
      {problem === 'tooMany' && (
        // The button stays, so the visitor can try again after the wait.
        <p role='alert' className='text-sm text-muted-foreground'>{t('CONTACT_SELLER_TOO_MANY')}</p>
      )}
    </div>
  );
}
