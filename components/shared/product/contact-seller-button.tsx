'use client';

import { FormEvent, useId, useRef, useState, useTransition } from 'react';
import { Loader2, MessageCircle, Phone } from 'lucide-react';
import { useI18n } from '@/components/i18n-provider';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import WhatsAppLogo from '@/components/shared/whatsapp-logo';
import { getProductContact } from '@/lib/actions/product.actions';
import {
  cleanNickname,
  contactMessage,
  type ContactMessageTexts,
  NICKNAME_MAX_LENGTH,
  NICKNAME_STORAGE_KEY,
} from '@/lib/contact-message';
import { cn } from '@/lib/utils';
import styles from './contact-seller-button.module.css';

interface ContactSellerButtonProps {
  productId: string;
  /** The prefilled WhatsApp message, in the listing's language. */
  messageTexts: ContactMessageTexts;
  /** The mascot waving hello in the pop-up (BRAND.contactImage); a waving hand alone without it. */
  image?: string;
  className?: string;
}

interface SellerContact {
  phone: string;
  whatsappUrl: string;
}

const ICON_BUTTON = 'size-14 rounded-full [&_svg]:size-6';

interface WavingMascotProps {
  image?: string;
}

/** The shop's mascot waving hello, drawn in the text color so it shows in light and dark themes. */
function WavingMascot({ image }: WavingMascotProps) {
  const mask = image && `url(${image}) center / contain no-repeat`;
  return (
    <span aria-hidden='true' className='relative mx-auto block size-20'>
      {mask && <span className={cn(styles.head, 'block size-full bg-foreground')} style={{ mask, WebkitMask: mask }} />}
      <span className={cn(styles.hand, 'absolute leading-none', mask ? '-bottom-1 -right-3 text-3xl' : 'inset-0 grid place-items-center text-6xl')}>
        👋
      </span>
    </span>
  );
}

// Read on open, not on render: localStorage only exists in the browser.
const storedNickname = () => {
  try {
    return localStorage.getItem(NICKNAME_STORAGE_KEY) ?? '';
  } catch {
    return '';
  }
};

const storeNickname = (nickname: string) => {
  try {
    if (nickname) localStorage.setItem(NICKNAME_STORAGE_KEY, nickname);
    else localStorage.removeItem(NICKNAME_STORAGE_KEY);
  } catch {
    // Private mode: the nickname is just not remembered.
  }
};

/** Classifieds: a friendly pop-up asks for an optional nickname before WhatsApp opens with the message written.
    The seller's number is fetched when it opens, so it isn't in the page for scrapers. */
export default function ContactSellerButton({ productId, messageTexts, image, className }: ContactSellerButtonProps) {
  const { t } = useI18n();
  const nicknameId = useId();
  const whatsappLink = useRef<HTMLAnchorElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [nickname, setNickname] = useState('');
  const [contact, setContact] = useState<SellerContact | null | undefined>(undefined);
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [isPending, startTransition] = useTransition();

  const open = () => {
    setNickname(storedNickname());
    setIsOpen(true);
    if (contact) return;
    startTransition(async () => {
      const result = await getProductContact(productId);
      const isBlocked = result !== null && 'isRateLimited' in result;
      setIsRateLimited(isBlocked);
      // The wait message shows next to the button, so the pop-up closes.
      if (isBlocked) setIsOpen(false);
      else setContact(result);
    });
  };

  // Enter in the field writes on WhatsApp too; a click on the link keeps it a real link (no pop-up blocker).
  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    whatsappLink.current?.click();
  };

  const contacted = () => {
    storeNickname(cleanNickname(nickname));
    setIsOpen(false);
  };

  if (contact === null) return <p className={cn('text-sm text-muted-foreground', className)}>{t('CONTACT_SELLER_UNAVAILABLE')}</p>;

  const chatUrl = (name: string) => contact && `${contact.whatsappUrl}?text=${encodeURIComponent(contactMessage(messageTexts, name))}`;

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <Button onClick={open} disabled={isPending && !isOpen} className='h-11 rounded-full'>
        <MessageCircle /> {t('CONTACT_SELLER')}
      </Button>
      {isRateLimited && (
        // The button stays, so the visitor can try again after the wait.
        <p role='alert' className='text-sm text-muted-foreground'>{t('CONTACT_SELLER_TOO_MANY')}</p>
      )}

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className='max-w-sm rounded-[2rem] border-primary/20 bg-card px-5 pb-6 pt-8 sm:px-8'>
          <form onSubmit={handleSubmit} className='flex flex-col gap-5'>
            <div className='flex flex-col items-center gap-3 text-center'>
              <WavingMascot image={image} />
              <DialogTitle className='text-2xl leading-tight'>{t('CONTACT_DIALOG_TITLE')}</DialogTitle>
              <DialogDescription className='text-sm leading-6'>{t('CONTACT_DIALOG_TEXT')}</DialogDescription>
            </div>

            <div className='flex flex-col gap-1.5'>
              <Label htmlFor={nicknameId}>{t('CONTACT_NICKNAME')}</Label>
              <Input
                id={nicknameId}
                value={nickname}
                maxLength={NICKNAME_MAX_LENGTH}
                autoComplete='nickname'
                enterKeyHint='send'
                aria-describedby={`${nicknameId}-hint`}
                onChange={(event) => setNickname(event.target.value)}
                className='h-12 rounded-2xl'
              />
              <p id={`${nicknameId}-hint`} className='text-xs text-muted-foreground'>{t('CONTACT_NICKNAME_HINT')}</p>
            </div>

            <div className='flex justify-center gap-4'>
              {contact ? (
                <>
                  <Button asChild variant='outline' className={ICON_BUTTON}>
                    <a href={`tel:${contact.phone}`} aria-label={t('CONTACT_SELLER_CALL')} title={t('CONTACT_SELLER_CALL')} onClick={contacted}>
                      <Phone />
                    </a>
                  </Button>
                  <Button asChild className={ICON_BUTTON}>
                    <a
                      ref={whatsappLink}
                      href={chatUrl(nickname)}
                      target='_blank'
                      rel='noopener noreferrer'
                      aria-label={t('CONTACT_SELLER_WHATSAPP')}
                      title={t('CONTACT_SELLER_WHATSAPP')}
                      onClick={contacted}
                    >
                      <WhatsAppLogo />
                    </a>
                  </Button>
                </>
              ) : (
                <Button type='button' disabled aria-label={t('CONTACT_SELLER_WHATSAPP')} className={ICON_BUTTON}>
                  <Loader2 className='animate-spin' />
                </Button>
              )}
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
