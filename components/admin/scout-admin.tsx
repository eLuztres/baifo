'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import QRCode from 'qrcode';
import type { z } from 'zod';
import { Camera, Copy, Loader2, MessageCircle, Pencil, Plus, QrCode, Share2, Trash2 } from 'lucide-react';
import { useI18n } from '@/components/i18n-provider';
import DeleteDialog from '@/components/shared/delete-dialog';
import ProductMedia from '@/components/ProductMedia';
import WhatsAppQr from '@/components/shared/whatsapp-qr';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { createScout, deleteScout, updateScout } from '@/lib/actions/scout.actions';
import { translateMessage } from '@/lib/i18n-core';
import { preparePhotos } from '@/lib/prepare-photos';
import { useUploadThing } from '@/lib/uploadthing';
import { cn } from '@/lib/utils';
import { scoutSchema } from '@/lib/validators';
import { whatsappLinkUrl } from '@/lib/whatsapp-chat';

export interface EditableScout {
  id: string;
  name: string;
  phone: string | null;
  image: string | null;
  code: string;
  /** Their link, e.g. https://baifo.es/s/ana. */
  url: string;
  /** What their QR opens: the shop's WhatsApp chat with their code in the message. */
  qrUrl: string;
  listingCount: number;
}

interface ScoutEditorProps {
  scout?: EditableScout;
  onClose: () => void;
  onSaved: () => void;
}

const initials = (name: string) =>
  name
    .split(/\s+/)
    .map((word) => word[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

/** Their photo in a circle, or their initials when there is none. */
function ScoutPicture({ name, image, className }: { name: string; image: string | null; className?: string }) {
  return (
    <span className={cn('relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted font-medium text-primary', className)}>
      {image ? <ProductMedia src={image} alt='' fill sizes='6rem' isStill /> : initials(name)}
    </span>
  );
}

interface PicturePickerProps {
  name: string;
  image: string | null;
  onChange: (image: string | null) => void;
}

/** The round photo slot: tap to pick a photo, tap again to change it. */
function PicturePicker({ name, image, onChange }: PicturePickerProps) {
  const { t } = useI18n();
  const { toast } = useToast();
  const input = useRef<HTMLInputElement>(null);
  const { startUpload, isUploading } = useUploadThing('imageUploader', {
    onClientUploadComplete: (files) => {
      if (files[0]) onChange(files[0].ufsUrl);
    },
    onUploadError: () => {
      toast({ variant: 'destructive', description: t('STUDIO_UPLOAD_FAILED') });
    },
  });

  return (
    <div className='flex flex-col items-center gap-1'>
      <button
        type='button'
        onClick={() => input.current?.click()}
        disabled={isUploading}
        aria-label={t('SCOUT_PICTURE')}
        className='relative size-24 rounded-full border-2 border-dashed border-border bg-muted text-muted-foreground transition hover:border-primary hover:text-primary'
      >
        {image ? (
          <>
            <ScoutPicture name={name} image={image} className='size-full' />
            <span className='absolute bottom-0 right-0 flex size-8 items-center justify-center rounded-full border-2 border-background bg-primary text-primary-foreground'>
              <Pencil className='size-4' />
            </span>
          </>
        ) : (
          <span className='flex flex-col items-center gap-1 text-xs'>
            {isUploading ? <Loader2 className='size-6 animate-spin' /> : <Camera className='size-6' />}
            {t('SCOUT_PICTURE')}
          </span>
        )}
      </button>
      {image && (
        <button type='button' className='text-xs text-muted-foreground hover:text-destructive' onClick={() => onChange(null)}>
          {t('SCOUT_PICTURE_REMOVE')}
        </button>
      )}
      <input
        ref={input}
        type='file'
        accept='image/*'
        hidden
        onChange={async (event) => {
          const files = Array.from(event.target.files ?? []);
          event.target.value = '';
          if (files.length > 0) await startUpload(await preparePhotos(files));
        }}
      />
    </div>
  );
}

/** Dialog to add a señalador or change their photo, name and number. */
function ScoutEditor({ scout, onClose, onSaved }: ScoutEditorProps) {
  const { t } = useI18n();
  const { toast } = useToast();
  const form = useForm<z.infer<typeof scoutSchema>>({
    resolver: zodResolver(scoutSchema),
    defaultValues: { name: scout?.name ?? '', phone: scout?.phone ? `+${scout.phone}` : '', image: scout?.image ?? null },
  });

  const handleSubmit = async (values: z.infer<typeof scoutSchema>) => {
    const result = scout ? await updateScout({ ...values, id: scout.id }) : await createScout(values);
    if (!result.success) return toast({ variant: 'destructive', description: translateMessage(t, result.message) });
    toast({ description: translateMessage(t, result.message) });
    onSaved();
  };

  return (
    <Dialog open onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>{t(scout ? 'SCOUT_EDIT' : 'SCOUT_NEW')}</DialogTitle>
          <DialogDescription>{t('SCOUT_FORM_INTRO')}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className='space-y-4'>
            <PicturePicker name={form.watch('name')} image={form.watch('image') ?? null} onChange={(image) => form.setValue('image', image, { shouldDirty: true })} />
            <FormField
              control={form.control}
              name='name'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('SCOUT_NAME')}</FormLabel>
                  <FormControl>
                    <Input autoFocus {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='phone'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('SCOUT_PHONE')}</FormLabel>
                  <FormControl>
                    <Input type='tel' inputMode='tel' placeholder='+34 600 000 000' {...field} />
                  </FormControl>
                  <p className='text-xs text-muted-foreground'>{t('SCOUT_PHONE_HINT')}</p>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className='flex justify-end gap-2'>
              <Button type='button' variant='ghost' onClick={onClose}>
                {t('DELETE_DIALOG_CANCEL')}
              </Button>
              <Button type='submit' disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting && <Loader2 className='animate-spin' />}
                {t('SCOUT_SAVE')}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

/** Their QR big enough to scan from the screen, and as a picture to share (WhatsApp on a phone) or save. */
function ScoutQr({ scout, onClose }: { scout: EditableScout; onClose: () => void }) {
  const { t } = useI18n();

  const [file, setFile] = useState<File | null>(null);

  // Made beforehand: iOS only shares straight from the tap, so nothing may be awaited before navigator.share.
  useEffect(() => {
    // Drawn on a canvas: fetching a data: URL is blocked by our connect-src rule.
    const canvas = document.createElement('canvas');
    QRCode.toCanvas(canvas, scout.qrUrl, { width: 1024, margin: 2, errorCorrectionLevel: 'M' }).then(() =>
      canvas.toBlob((blob) => blob && setFile(new File([blob], `baifo-${scout.code}.png`, { type: 'image/png' })), 'image/png'),
    );
  }, [scout.qrUrl, scout.code]);

  const shareQr = async () => {
    if (!file) return;
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], text: scout.url }).catch(() => {});
      return;
    }
    const link = document.createElement('a');
    link.href = URL.createObjectURL(file);
    link.download = file.name;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return (
    <Dialog open onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className='sm:max-w-sm'>
        <DialogHeader className='items-center text-center'>
          {scout.image && <ScoutPicture name={scout.name} image={scout.image} className='size-20' />}
          <DialogTitle>{scout.name}</DialogTitle>
          <DialogDescription>{t('SCOUT_QR_HINT')}</DialogDescription>
        </DialogHeader>
        <WhatsAppQr url={scout.qrUrl} label={scout.url} className='mx-auto w-full max-w-64 rounded-2xl' />
        <p className='break-all text-center font-mono text-sm text-primary'>{scout.url.replace(/^https?:\/\//, '')}</p>
        <Button className='w-full rounded-full' onClick={shareQr} disabled={!file}>
          <Share2 /> {t('SCOUT_SHARE_QR')}
        </Button>
      </DialogContent>
    </Dialog>
  );
}

interface ScoutAdminProps {
  scouts: EditableScout[];
  shopName: string;
}

/** The señaladores, each with their link, QR and listings, and the way to add one. */
export default function ScoutAdmin({ scouts, shopName }: ScoutAdminProps) {
  const { t } = useI18n();
  const { toast } = useToast();
  const router = useRouter();
  const [editing, setEditing] = useState<EditableScout | 'new' | null>(null);
  const [showingQr, setShowingQr] = useState<EditableScout | null>(null);

  const copyLink = async (scout: EditableScout) => {
    await navigator.clipboard.writeText(scout.url);
    toast({ description: t('SCOUT_LINK_COPIED') });
  };

  return (
    <div className='space-y-4'>
      <Button className='rounded-full' onClick={() => setEditing('new')}>
        <Plus /> {t('SCOUT_NEW')}
      </Button>
      {scouts.length === 0 ? (
        <p className='rounded-3xl border border-dashed border-border p-12 text-center text-muted-foreground'>{t('SCOUT_EMPTY')}</p>
      ) : (
        <ul className='space-y-3'>
          {scouts.map((scout) => (
            <li key={scout.id} className='flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl border border-border bg-card p-3'>
              <ScoutPicture name={scout.name} image={scout.image} className='size-12' />
              <Link href={`/admin/listings?senalador=${scout.id}`} className='min-w-28 flex-1 hover:underline'>
                <p className='truncate font-medium'>{scout.name}</p>
                <p className='text-sm text-muted-foreground'>
                  {scout.listingCount === 1 ? t('SCOUT_COUNT_ONE') : t('SCOUT_COUNT', { count: scout.listingCount })}
                  {scout.phone && ` · +${scout.phone}`}
                </p>
                <p className='break-all font-mono text-xs text-primary'>{scout.url.replace(/^https?:\/\//, '')}</p>
              </Link>
              {/* On the narrowest phones the buttons take their own line rather than squeezing the name. */}
              <div className='flex shrink-0 items-center [&_button]:size-9 [&_a]:size-9'>
                <Button variant='ghost' size='icon' className='rounded-full' aria-label={t('SCOUT_QR')} title={t('SCOUT_QR')} onClick={() => setShowingQr(scout)}>
                  <QrCode />
                </Button>
                <Button variant='ghost' size='icon' className='rounded-full' aria-label={t('SCOUT_COPY_LINK')} title={t('SCOUT_COPY_LINK')} onClick={() => copyLink(scout)}>
                  <Copy />
                </Button>
                {scout.phone && (
                  <Button variant='ghost' size='icon' className='rounded-full text-primary' aria-label={t('SCOUT_SEND_WHATSAPP')} title={t('SCOUT_SEND_WHATSAPP')} asChild>
                    <a href={whatsappLinkUrl(scout.phone, t('SCOUT_SEND_MESSAGE', { name: scout.name, url: scout.url, shop: shopName }))} target='_blank' rel='noopener noreferrer'>
                      <MessageCircle />
                    </a>
                  </Button>
                )}
                <Button variant='ghost' size='icon' className='rounded-full' aria-label={t('SCOUT_EDIT')} title={t('SCOUT_EDIT')} onClick={() => setEditing(scout)}>
                  <Pencil />
                </Button>
                <DeleteDialog
                  id={scout.id}
                  action={deleteScout}
                  description={t('SCOUT_DELETE_HINT')}
                  trigger={
                    <Button variant='ghost' size='icon' className='rounded-full text-destructive hover:bg-destructive/10 hover:text-destructive' aria-label={t('DELETE_DIALOG_CONFIRM')}>
                      <Trash2 />
                    </Button>
                  }
                />
              </div>
            </li>
          ))}
        </ul>
      )}
      {editing && (
        <ScoutEditor
          key={editing === 'new' ? 'new' : editing.id}
          scout={editing === 'new' ? undefined : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            router.refresh();
          }}
        />
      )}
      {showingQr && <ScoutQr scout={showingQr} onClose={() => setShowingQr(null)} />}
    </div>
  );
}
