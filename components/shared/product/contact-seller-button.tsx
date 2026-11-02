'use client';

import { useState, useTransition } from 'react';
import { Loader2, MessageCircle } from 'lucide-react';
import { useI18n } from '@/components/i18n-provider';
import { Button } from '@/components/ui/button';
import { getProductContact } from '@/lib/actions/product.actions';
import { cn } from '@/lib/utils';

interface ContactSellerButtonProps {
  productId: string;
  /** The prefilled WhatsApp message, in the listing's language. */
  message: string;
  className?: string;
}

type ContactProblem = 'unavailable' | 'tooMany';

/** Classifieds: one tap opens WhatsApp with the message written.
    The seller's number is fetched on the tap, so it isn't in the page for scrapers. */
export default function ContactSellerButton({ productId, message, className }: ContactSellerButtonProps) {
  const { t } = useI18n();
  const [problem, setProblem] = useState<ContactProblem | null>(null);
  const [isPending, startTransition] = useTransition();

  const openChat = () => {
    // Opened inside the tap: after waiting for the number, browsers would block it as a pop-up.
    const chat = window.open('', '_blank');
    startTransition(async () => {
      const contact = await getProductContact(productId);
      if (!contact || 'isRateLimited' in contact) {
        chat?.close();
        setProblem(contact ? 'tooMany' : 'unavailable');
        return;
      }
      setProblem(null);
      const chatUrl = `${contact.whatsappUrl}?text=${encodeURIComponent(message)}`;
      if (!chat) {
        window.location.href = chatUrl;
        return;
      }
      chat.opener = null;
      chat.location.href = chatUrl;
    });
  };

  if (problem === 'unavailable') return <p className={cn('text-sm text-muted-foreground', className)}>{t('CONTACT_SELLER_UNAVAILABLE')}</p>;

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <Button onClick={openChat} disabled={isPending} className='h-11 rounded-full'>
        {isPending ? <Loader2 className='animate-spin' /> : <MessageCircle />} {t('CONTACT_SELLER')}
      </Button>
      {problem === 'tooMany' && (
        // The button stays, so the visitor can try again after the wait.
        <p role='alert' className='text-sm text-muted-foreground'>{t('CONTACT_SELLER_TOO_MANY')}</p>
      )}
    </div>
  );
}
