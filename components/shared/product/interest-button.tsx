'use client';

import { ComponentType, FormEvent, KeyboardEvent, useId, useState, useTransition } from 'react';
import { Loader2, Mail, MessageCircle, Phone, Plus } from 'lucide-react';
import ProductMedia from '@/components/ProductMedia';
import InstagramIcon from '@/components/shared/icons/instagram-icon';
import { useI18n, useTranslateMessage } from '@/components/i18n-provider';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { ReserveChannel } from '@/lib/validators';
import { sendInterest } from '@/lib/actions/reservation.actions';
import { cn } from '@/lib/utils';
import { CHANNELS } from './reserve-button';
import styles from './interest-button.module.css';

interface HeartProps {
  className?: string;
}

interface InterestButtonProps {
  productId: string;
  productName: string;
  image?: string;
  /** Signed-in visitors are known already, so they only say how to reach them. */
  userName?: string;
  className?: string;
}

const CHANNEL_ICONS: Record<ReserveChannel, ComponentType<{ className?: string }>> = {
  whatsapp: MessageCircle,
  instagram: InstagramIcon,
  email: Mail,
  phone: Phone,
};

const FIELD_CLASS = 'h-12 rounded-2xl border-border/60 bg-background/40 px-4 focus-visible:border-primary/60';

/** A glossy heart with light and shade, beating softly. */
export const Heart = ({ className }: HeartProps) => {
  // Several hearts can be on one page, and SVG gradient ids are global.
  const id = useId();
  return (
    <svg viewBox='0 0 32 30' aria-hidden='true' className={cn(styles.heart, className)}>
      <defs>
        <linearGradient id={`${id}-body`} x1='0.15' y1='0' x2='0.85' y2='1'>
          <stop offset='0' className={styles.stopLight} />
          <stop offset='0.45' className={styles.stopMid} />
          <stop offset='1' className={styles.stopDark} />
        </linearGradient>
        <filter id={`${id}-blur`}>
          <feGaussianBlur stdDeviation='0.8' />
        </filter>
      </defs>
      <path
        d='M16 29s-13-7.6-13-17A7.5 7.5 0 0 1 16 7a7.5 7.5 0 0 1 13 5c0 9.4-13 17-13 17z'
        fill={`url(#${id}-body)`}
      />
      <ellipse cx='9.5' cy='10.5' rx='3.2' ry='2' transform='rotate(-35 9.5 10.5)' className={styles.shine} filter={`url(#${id}-blur)`} />
    </svg>
  );
};

/** Showcase mode: the visitor leaves a way to reach them and the maker gets an email; nothing is sold or reserved. */
const InterestButton = ({ productId, productName, image, userName, className }: InterestButtonProps) => {
  const { t } = useI18n();
  const translate = useTranslateMessage();
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState('');
  const [channel, setChannel] = useState<ReserveChannel>('whatsapp');
  const [contact, setContact] = useState('');
  const [message, setMessage] = useState('');
  const [isNoteOpen, setIsNoteOpen] = useState(false);
  const [error, setError] = useState('');
  const [isSent, setIsSent] = useState(false);

  const isGuest = !userName;
  const canSend = (!isGuest || (name.trim() && contact.trim())) && !isPending;

  const handleSend = (event: FormEvent) => {
    event.preventDefault();
    setError('');
    startTransition(async () => {
      const result = await sendInterest({ productId, name, channel, contact: contact || undefined, message: message || undefined });
      if (!result.success) return setError(result.message);
      setIsSent(true);
    });
  };

  // On a phone, the keyboard's Enter would send right away; it only closes the keyboard so the whole form shows.
  const handleFieldEnter = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    event.currentTarget.blur();
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button type='button' className={cn(styles.cta, 'flex h-12 items-center justify-center gap-3 rounded-full px-6 text-sm font-medium tracking-wide text-foreground', className)}>
          <Heart className='size-6' />
          {t('INTEREST_BUTTON')}
        </button>
      </DialogTrigger>

      <DialogContent className='max-w-md overflow-hidden rounded-[2rem] border-primary/20 bg-card p-0'>
        <div aria-hidden='true' className={cn(styles.glow, 'pointer-events-none absolute inset-x-0 top-0 h-48')} />

        <div className='relative px-6 pb-6 pt-8 sm:px-8'>
          {isSent ? (
            <div className='space-y-4 py-6 text-center'>
              <Heart className={cn(styles.pop, 'mx-auto size-16')} />
              <DialogTitle className='text-2xl'>{t('INTEREST_SENT_TITLE')}</DialogTitle>
              <DialogDescription className='leading-6'>{t('INTEREST_SENT_TEXT', { name: productName })}</DialogDescription>
              <DialogClose asChild>
                <Button type='button' variant='ghost' className='rounded-full text-muted-foreground'>
                  {t('RESERVE_CLOSE')}
                </Button>
              </DialogClose>
            </div>
          ) : (
            <form onSubmit={handleSend} className='space-y-5'>
              <div className='flex flex-col items-center gap-3 text-center'>
                {image && (
                  <span className={cn(styles.portrait, 'relative size-20 overflow-hidden rounded-full bg-muted')}>
                    <ProductMedia src={image} alt={productName} fill sizes='5rem' className='object-cover' />
                  </span>
                )}
                <p className='eyebrow'>{productName}</p>
                <DialogTitle className='text-2xl leading-tight'>{t('INTEREST_DIALOG_TITLE')}</DialogTitle>
                <DialogDescription className='max-w-xs text-sm leading-6'>{t('INTEREST_NOTE')}</DialogDescription>
              </div>

              <div className='space-y-3'>
                {isGuest && (
                  <Input
                    aria-label={t('RESERVE_NAME')}
                    placeholder={t('RESERVE_NAME')}
                    value={name}
                    maxLength={60}
                    onChange={(event) => setName(event.target.value)}
                    onKeyDown={handleFieldEnter}
                    enterKeyHint='done'
                    className={FIELD_CLASS}
                  />
                )}

                <div role='group' aria-label={t('RESERVE_CHANNEL')} className='flex justify-center gap-2'>
                  {CHANNELS.map((option) => {
                    const Icon = CHANNEL_ICONS[option.channel];
                    const isActive = channel === option.channel;
                    return (
                      <button
                        key={option.channel}
                        type='button'
                        aria-pressed={isActive}
                        aria-label={t(option.label)}
                        title={t(option.label)}
                        onClick={() => setChannel(option.channel)}
                        className={cn(
                          'flex size-11 items-center justify-center rounded-full border transition duration-300',
                          isActive
                            ? 'scale-110 border-primary/60 bg-primary/15 text-primary'
                            : 'border-border/60 text-muted-foreground hover:border-primary/40 hover:text-foreground'
                        )}
                      >
                        <Icon className='size-[18px]' />
                      </button>
                    );
                  })}
                </div>

                <Input
                  aria-label={t('RESERVE_CONTACT')}
                  placeholder={t('RESERVE_CONTACT')}
                  value={contact}
                  maxLength={120}
                  onChange={(event) => setContact(event.target.value)}
                  onKeyDown={handleFieldEnter}
                  enterKeyHint='done'
                  className={FIELD_CLASS}
                />

                {/* The note stays folded away: fewer fields make the first step feel lighter. */}
                {isNoteOpen ? (
                  <Textarea
                    aria-label={t('RESERVE_MESSAGE')}
                    placeholder={t('RESERVE_MESSAGE')}
                    rows={3}
                    maxLength={500}
                    value={message}
                    autoFocus
                    onChange={(event) => setMessage(event.target.value)}
                    className='rounded-2xl border-border/60 bg-background/40 px-4 py-3 focus-visible:border-primary/60'
                  />
                ) : (
                  <button
                    type='button'
                    onClick={() => setIsNoteOpen(true)}
                    className='mx-auto flex items-center gap-1.5 text-sm text-muted-foreground transition hover:text-primary'
                  >
                    <Plus className='size-4' />
                    {t('INTEREST_ADD_NOTE')}
                  </button>
                )}
              </div>

              {error && <p role='alert' className='text-center text-sm text-destructive'>{translate(error)}</p>}

              <div className='space-y-3'>
                <button
                  type='submit'
                  disabled={!canSend}
                  className={cn(styles.cta, 'flex h-14 w-full items-center justify-center gap-3 rounded-full text-base font-medium tracking-wide text-foreground disabled:opacity-50')}
                >
                  {isPending ? <Loader2 className='size-6 animate-spin text-primary' /> : <Heart className='size-7' />}
                  {t('INTEREST_SEND')}
                </button>
                <p className='text-center text-xs text-muted-foreground'>{t('INTEREST_REASSURE')}</p>
              </div>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InterestButton;
