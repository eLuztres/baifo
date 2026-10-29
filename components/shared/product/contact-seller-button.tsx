'use client';

import { useState, useTransition } from 'react';
import { Loader2, MessageCircle, Phone } from 'lucide-react';
import { useI18n } from '@/components/i18n-provider';
import { Button } from '@/components/ui/button';
import { getProductContact } from '@/lib/actions/product.actions';
import { cn } from '@/lib/utils';

interface ContactSellerButtonProps {
  productId: string;
  productName: string;
  /** The WhatsApp text in the seller's language; missing: in the visitor's. */
  message?: string;
  className?: string;
}

interface SellerContact {
  phone: string;
  whatsappUrl: string;
}

/** Classifieds: the seller's number shows only after a click, so it isn't in the page for scrapers. */
export default function ContactSellerButton({ productId, productName, message: sellerMessage, className }: ContactSellerButtonProps) {
  const { t } = useI18n();
  const [contact, setContact] = useState<SellerContact | null | undefined>(undefined);
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [isPending, startTransition] = useTransition();

  const reveal = () =>
    startTransition(async () => {
      const result = await getProductContact(productId);
      const isBlocked = result !== null && 'isRateLimited' in result;
      setIsRateLimited(isBlocked);
      if (!isBlocked) setContact(result);
    });

  if (contact === null) return <p className={cn('text-sm text-muted-foreground', className)}>{t('CONTACT_SELLER_UNAVAILABLE')}</p>;

  if (contact) {
    const message = sellerMessage ?? t('CONTACT_SELLER_MESSAGE', { name: productName, url: window.location.href });
    return (
      <div className={cn('flex flex-col gap-2 sm:flex-row', className)}>
        <Button asChild className='h-11 flex-1 rounded-full'>
          <a href={`${contact.whatsappUrl}?text=${encodeURIComponent(message)}`} target='_blank' rel='noopener noreferrer'>
            <MessageCircle /> {t('CONTACT_SELLER_WHATSAPP')}
          </a>
        </Button>
        <Button asChild variant='outline' className='h-11 flex-1 rounded-full'>
          <a href={`tel:${contact.phone}`}>
            <Phone /> {contact.phone}
          </a>
        </Button>
      </div>
    );
  }

  const button = (
    <Button onClick={reveal} disabled={isPending} className={cn('h-11 rounded-full', className)}>
      {isPending ? <Loader2 className='animate-spin' /> : <MessageCircle />} {t('CONTACT_SELLER')}
    </Button>
  );
  if (!isRateLimited) return button;

  // The button stays, so the visitor can try again after the wait.
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {button}
      <p role='alert' className='text-sm text-muted-foreground'>{t('CONTACT_SELLER_TOO_MANY')}</p>
    </div>
  );
}
