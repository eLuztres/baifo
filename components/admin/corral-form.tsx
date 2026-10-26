'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ExternalLink, Loader2, X } from 'lucide-react';
import ProductMedia from '@/components/ProductMedia';
import { useI18n } from '@/components/i18n-provider';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { saveCorral } from '@/lib/actions/place.actions';
import { translateMessage, type TranslationKey } from '@/lib/i18n-core';
import { preparePhotos } from '@/lib/prepare-photos';
import { UploadButton } from '@/lib/uploadthing';
import type { CorralInput } from '@/lib/validators';

/** A Corral as the admin edits it: its texts in the shop's language. */
export type CorralDraft = Omit<CorralInput, 'lat' | 'lng'> & { lat: number | null; lng: number | null };

interface CorralFormProps {
  place: { id: string; slug: string; name: string };
  corral: CorralDraft | null;
  children: React.ReactNode;
}

const EMPTY: Omit<CorralDraft, 'name'> = {
  address: '',
  venue: '',
  text: '',
  hours: '',
  lat: null,
  lng: null,
  hostName: '',
  hostImage: '',
  image: '',
  whatsapp: '',
  phone: '',
  email: '',
};

// "28.7372, -13.8700" as Google Maps copies it; empty is fine (no map then).
const parsePosition = (value: string) => {
  if (!value.trim()) return { lat: null, lng: null };
  const [lat, lng] = value.split(',').map((part) => Number(part.trim()));
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : undefined;
};

type TextField = 'name' | 'venue' | 'address' | 'hostName' | 'whatsapp' | 'phone' | 'email';

/** Sets up or changes a place's Corral, in a dialog from the place's card. */
export default function CorralForm({ place, corral, children }: CorralFormProps) {
  const { t } = useI18n();
  const { toast } = useToast();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [draft, setDraft] = useState<CorralDraft>(corral ?? { ...EMPTY, name: t('CORRAL_DEFAULT_NAME', { place: place.name }) });
  const [position, setPosition] = useState(corral?.lat != null && corral.lng != null ? `${corral.lat}, ${corral.lng}` : '');

  const set = (field: keyof CorralDraft) => (event: { target: { value: string } }) =>
    setDraft((current) => ({ ...current, [field]: event.target.value }));

  const save = () => {
    const coordinates = parsePosition(position);
    if (!coordinates) return toast({ variant: 'destructive', description: t('VALIDATION_CORRAL_POSITION') });
    startTransition(async () => {
      const result = await saveCorral(place.id, { ...draft, ...coordinates });
      toast({ variant: result.success ? 'default' : 'destructive', description: translateMessage(t, result.message) });
      if (!result.success) return;
      setIsOpen(false);
      router.refresh();
    });
  };

  const field = (name: TextField, label: TranslationKey, type = 'text') => (
    <div className='space-y-1'>
      <Label htmlFor={`corral-${name}`}>{t(label)}</Label>
      <Input id={`corral-${name}`} type={type} value={draft[name] ?? ''} onChange={set(name)} />
    </div>
  );

  const photo = (name: 'hostImage' | 'image', label: TranslationKey) => (
    <div className='space-y-2'>
      <Label>{t(label)}</Label>
      {draft[name] ? (
        <div className='flex items-center gap-3'>
          <div className='relative size-20 overflow-hidden rounded-xl bg-muted'>
            <ProductMedia src={draft[name] as string} alt={t(label)} fill className='object-cover' />
          </div>
          <Button type='button' size='sm' variant='ghost' onClick={() => setDraft((current) => ({ ...current, [name]: '' }))}>
            <X /> {t('CORRAL_ADMIN_REMOVE_PHOTO')}
          </Button>
        </div>
      ) : (
        <UploadButton
          endpoint='imageUploader'
          onBeforeUploadBegin={preparePhotos}
          className='items-start'
          appearance={{ button: 'bg-secondary text-secondary-foreground px-4 text-sm', allowedContent: 'text-muted-foreground' }}
          onClientUploadComplete={(files) => files[0] && setDraft((current) => ({ ...current, [name]: files[0].ufsUrl }))}
          onUploadError={() => {
            toast({ variant: 'destructive', description: t('STUDIO_UPLOAD_FAILED') });
          }}
        />
      )}
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className='max-h-[90dvh] overflow-y-auto sm:max-w-2xl'>
        <DialogHeader>
          <DialogTitle>{t('CORRAL_ADMIN_TITLE', { place: place.name })}</DialogTitle>
          <DialogDescription>{t('CORRAL_ADMIN_INTRO')}</DialogDescription>
        </DialogHeader>
        <div className='grid gap-4 sm:grid-cols-2'>
          {field('name', 'CORRAL_ADMIN_NAME')}
          {field('venue', 'CORRAL_ADMIN_VENUE')}
          <div className='sm:col-span-2'>{field('address', 'CORRAL_ADMIN_ADDRESS')}</div>
          <div className='space-y-1 sm:col-span-2'>
            <Label htmlFor='corral-position'>{t('CORRAL_ADMIN_POSITION')}</Label>
            <Input id='corral-position' value={position} onChange={(event) => setPosition(event.target.value)} placeholder='28.7372, -13.8700' />
            <p className='text-xs text-muted-foreground'>{t('CORRAL_ADMIN_POSITION_HINT')}</p>
          </div>
          <div className='space-y-1 sm:col-span-2'>
            <Label htmlFor='corral-text'>{t('CORRAL_ADMIN_TEXT')}</Label>
            <Textarea id='corral-text' rows={3} value={draft.text} onChange={set('text')} />
          </div>
          <div className='space-y-1 sm:col-span-2'>
            <Label htmlFor='corral-hours'>{t('CORRAL_ADMIN_HOURS')}</Label>
            <Textarea id='corral-hours' rows={2} value={draft.hours} onChange={set('hours')} placeholder='Lun–Vie 10–14h · Sáb 10–13h' />
          </div>
          {field('hostName', 'CORRAL_ADMIN_HOST_NAME')}
          {photo('hostImage', 'CORRAL_ADMIN_HOST_IMAGE')}
          {field('whatsapp', 'CORRAL_ADMIN_WHATSAPP', 'tel')}
          {field('phone', 'CORRAL_ADMIN_PHONE', 'tel')}
          {field('email', 'CORRAL_ADMIN_EMAIL', 'email')}
          {photo('image', 'CORRAL_ADMIN_IMAGE')}
        </div>
        <div className='flex flex-wrap items-center justify-between gap-3 pt-2'>
          {corral ? (
            <Link href={`/corral/${place.slug}`} target='_blank' className='inline-flex items-center gap-1 text-sm text-primary underline-offset-4 hover:underline'>
              <ExternalLink className='size-4' /> {t('CORRAL_ADMIN_VIEW')}
            </Link>
          ) : (
            <span />
          )}
          <Button className='rounded-full' disabled={isPending} onClick={save}>
            {isPending && <Loader2 className='animate-spin' />} {t('CORRAL_ADMIN_SAVE')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
