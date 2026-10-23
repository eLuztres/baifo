'use client';

import { FormEvent, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Heart, Loader2 } from 'lucide-react';
import { useI18n, useTranslateMessage } from '@/components/i18n-provider';
import { Button, ButtonProps } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { TranslationKey } from '@/lib/i18n-core';
import type { ReserveChannel } from '@/lib/validators';
import { useToast } from '@/hooks/use-toast';
import { cancelReservation, reserveProduct } from '@/lib/actions/reservation.actions';
import { cn } from '@/lib/utils';

interface ReservationProps {
  productId: string;
  className?: string;
}

interface ReserveButtonProps extends ReservationProps {
  productName: string;
  userName?: string;
  hours: number;
  variant?: ButtonProps['variant'];
}

interface ReservationNoticeProps {
  until: string;
  isMine: boolean;
}

export const CHANNELS: { channel: ReserveChannel; label: TranslationKey }[] = [
  { channel: 'whatsapp', label: 'CONTACT_WHATSAPP_LABEL' },
  { channel: 'instagram', label: 'CONTACT_INSTAGRAM_LABEL' },
  { channel: 'email', label: 'RESERVE_CHANNEL_EMAIL' },
  { channel: 'phone', label: 'RESERVE_CHANNEL_PHONE' },
];

/** Small golden button that opens the reservation window; no sign-in needed, guests just say how to reach them. */
export const ReserveButton = ({
  productId,
  productName,
  userName,
  hours,
  className,
  variant,
}: ReserveButtonProps) => {
  const { t, locale } = useI18n();
  const translate = useTranslateMessage();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState('');
  const [channel, setChannel] = useState<ReserveChannel>('whatsapp');
  const [contact, setContact] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [reservedUntil, setReservedUntil] = useState<string>();

  const isGuest = !userName;
  const canSend = (!isGuest || (name.trim() && contact.trim())) && !isPending;

  const handleSend = (event: FormEvent) => {
    event.preventDefault();
    setError('');
    startTransition(async () => {
      const result = await reserveProduct({ productId, name, channel, contact: contact || undefined, message: message || undefined });
      if (!result.success) return setError(result.message);
      setReservedUntil(result.until);
    });
  };

  // The page only learns about the reservation once the window closes, so the confirmation stays readable.
  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open && reservedUntil) router.refresh();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button type='button' variant={variant} className={cn('h-11 rounded-full', className)}>
          <Heart />
          {t('RESERVE_BUTTON', { hours })}
        </Button>
      </DialogTrigger>
      <DialogContent className='max-w-md rounded-3xl border-primary/30 bg-card'>
        {reservedUntil ? (
          <div className='space-y-4 py-4 text-center'>
            <span className='mx-auto flex size-14 items-center justify-center rounded-full border border-primary/40 bg-primary/10 text-primary'>
              <Check className='size-6' />
            </span>
            <DialogTitle className='text-2xl'>{t('RESERVE_SENT_TITLE')}</DialogTitle>
            <DialogDescription className='leading-6'>
              {t('RESERVE_SENT_TEXT', {
                name: productName,
                until: new Date(reservedUntil).toLocaleString(locale, { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }),
              })}
            </DialogDescription>
            <DialogClose asChild>
              <Button type='button' variant='outline' className='rounded-full'>
                {t('RESERVE_CLOSE')}
              </Button>
            </DialogClose>
          </div>
        ) : (
          <form onSubmit={handleSend} className='space-y-5'>
            <DialogHeader className='space-y-2 text-left'>
              <p className='eyebrow'>{productName}</p>
              <DialogTitle className='text-2xl'>{t('RESERVE_DIALOG_TITLE', { hours })}</DialogTitle>
              <DialogDescription className='leading-6'>{t('RESERVE_NOTE', { hours })}</DialogDescription>
            </DialogHeader>

            {isGuest ? (
              <div className='space-y-2'>
                <Label htmlFor='reserve-name'>{t('RESERVE_NAME')}</Label>
                <Input id='reserve-name' value={name} maxLength={60} onChange={(event) => setName(event.target.value)} />
              </div>
            ) : (
              <p className='text-sm text-muted-foreground'>{t('RESERVE_AS', { name: userName })}</p>
            )}

            <div className='space-y-2'>
              <Label>{t('RESERVE_CHANNEL')}</Label>
              <div className='flex flex-wrap gap-2'>
                {CHANNELS.map((option) => (
                  <button
                    key={option.channel}
                    type='button'
                    aria-pressed={channel === option.channel}
                    onClick={() => setChannel(option.channel)}
                    className={cn(
                      'rounded-full border px-3 py-1.5 text-sm transition',
                      channel === option.channel
                        ? 'border-primary bg-primary/15 text-primary'
                        : 'border-border text-muted-foreground hover:border-primary/50'
                    )}
                  >
                    {t(option.label)}
                  </button>
                ))}
              </div>
              <Input
                aria-label={t('RESERVE_CONTACT')}
                placeholder={t('RESERVE_CONTACT')}
                value={contact}
                maxLength={120}
                onChange={(event) => setContact(event.target.value)}
              />
            </div>

            <div className='space-y-2'>
              <Label htmlFor='reserve-message'>{t('RESERVE_MESSAGE')}</Label>
              <Textarea id='reserve-message' rows={2} maxLength={500} value={message} onChange={(event) => setMessage(event.target.value)} />
            </div>

            {error && <p role='alert' className='text-sm text-destructive'>{translate(error)}</p>}

            <Button type='submit' className='h-11 w-full rounded-full' disabled={!canSend}>
              {isPending ? <Loader2 className='animate-spin' /> : <Heart />}
              {t('RESERVE_SEND')}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};

/** Small link for the customer (or an admin) to free the ring again. */
export const CancelReservationButton = ({ productId, className }: ReservationProps) => {
  const { t } = useI18n();
  const { toast } = useToast();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleCancel = () =>
    startTransition(async () => {
      const result = await cancelReservation(productId);
      toast({ variant: result.success ? 'default' : 'destructive', description: result.message });
      router.refresh();
    });

  return (
    <Button type='button' variant='link' size='sm' className={cn('text-muted-foreground', className)} onClick={handleCancel} disabled={isPending}>
      {isPending && <Loader2 className='animate-spin' />}
      {t('RESERVE_CANCEL')}
    </Button>
  );
};

/** "Reserved (for you) until …", in the visitor's own language and time zone. */
export const ReservationNotice = ({ until, isMine }: ReservationNoticeProps) => {
  const { t, locale } = useI18n();
  const end = new Date(until).toLocaleString(locale, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
  return (
    <span suppressHydrationWarning>{t(isMine ? 'RESERVE_MINE' : 'RESERVE_OTHER', { until: end })}</span>
  );
};
