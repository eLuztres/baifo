'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import QRCode from 'qrcode';
import type { z } from 'zod';
import { Copy, Loader2, MessageCircle, Pencil, Plus, QrCode, Share2, Trash2 } from 'lucide-react';
import { useI18n } from '@/components/i18n-provider';
import DeleteDialog from '@/components/shared/delete-dialog';
import WhatsAppQr from '@/components/shared/whatsapp-qr';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { createScout, deleteScout, updateScout } from '@/lib/actions/scout.actions';
import { translateMessage } from '@/lib/i18n-core';
import { scoutSchema } from '@/lib/validators';
import { whatsappLinkUrl } from '@/lib/whatsapp-chat';

export interface EditableScout {
  id: string;
  name: string;
  phone: string | null;
  code: string;
  /** Their link, e.g. https://baifo.es/s/ana. */
  url: string;
  listingCount: number;
}

interface ScoutEditorProps {
  scout?: EditableScout;
  onClose: () => void;
  onSaved: () => void;
}

/** Dialog to add a señalador or change their name and number. */
function ScoutEditor({ scout, onClose, onSaved }: ScoutEditorProps) {
  const { t } = useI18n();
  const { toast } = useToast();
  const form = useForm<z.infer<typeof scoutSchema>>({
    resolver: zodResolver(scoutSchema),
    defaultValues: { name: scout?.name ?? '', phone: scout?.phone ? `+${scout.phone}` : '' },
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
    QRCode.toCanvas(canvas, scout.url, { width: 1024, margin: 2, errorCorrectionLevel: 'M' }).then(() =>
      canvas.toBlob((blob) => blob && setFile(new File([blob], `baifo-${scout.code}.png`, { type: 'image/png' })), 'image/png'),
    );
  }, [scout.url, scout.code]);

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
        <DialogHeader>
          <DialogTitle>{scout.name}</DialogTitle>
          <DialogDescription>{t('SCOUT_QR_HINT')}</DialogDescription>
        </DialogHeader>
        <WhatsAppQr url={scout.url} label={scout.url} className='mx-auto w-full max-w-64 rounded-2xl' />
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
