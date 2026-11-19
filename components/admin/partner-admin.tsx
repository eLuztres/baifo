'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Copy, Eye, KeyRound, MessageCircle, Pencil, Plus, Trash2 } from 'lucide-react';
import PartnerForm, { type EditablePartner } from '@/components/admin/partner-form';
import { useI18n } from '@/components/i18n-provider';
import DeleteDialog from '@/components/shared/delete-dialog';
import { MercadilloIcon } from '@/components/shared/mercadillo-row';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { deletePartner, renewPartnerLink } from '@/lib/actions/partner.actions';
import { translateMessage, type Locale } from '@/lib/i18n-core';
import { localize } from '@/lib/localize';
import { adminTexts } from '@/lib/marketplace/admin-texts';
import { partnerPath } from '@/lib/partner-paths';
import { whatsappLinkUrl } from '@/lib/whatsapp-chat';

export interface AdminPartner extends EditablePartner {
  /** Its private panel link, as it works now. */
  panelUrl: string;
  /** Listings using its places (online, hidden or being written). */
  listingCount: number;
}

interface PartnerAdminProps {
  locale: Locale;
  /** The shop's language first. */
  locales: Locale[];
  partners: AdminPartner[];
  shopName: string;
}

/** The partners' mercadillos: each with its listings, its private link to copy, send or renew, and the way to make a new one. */
export default function PartnerAdmin({ locale, locales, partners, shopName }: PartnerAdminProps) {
  const { t } = useI18n();
  const { toast } = useToast();
  const router = useRouter();
  const texts = adminTexts(locale);
  // 'new': the form makes one; a partner: it changes that one.
  const [editing, setEditing] = useState<EditablePartner | 'new' | null>(null);
  const [renewing, setRenewing] = useState<AdminPartner | null>(null);
  const [isRenewing, startRenewing] = useTransition();

  const inviteMessage = (partner: AdminPartner, url: string) =>
    t('PARTNER_INVITE_MESSAGE', { name: localize(partner.name, locale), shop: shopName, url, max: partner.maxListings });
  // Straight to its WhatsApp with a number; without one, WhatsApp asks whom to send it to.
  const whatsappHref = (partner: AdminPartner, url: string) =>
    partner.contactPhone ? whatsappLinkUrl(partner.contactPhone, inviteMessage(partner, url)) : `https://api.whatsapp.com/send?text=${encodeURIComponent(inviteMessage(partner, url))}`;

  const copyLink = async (url: string) => {
    await navigator.clipboard.writeText(url);
    toast({ description: t('PARTNER_LINK_COPIED') });
  };

  const renewLink = (partner: AdminPartner) =>
    startRenewing(async () => {
      const result = await renewPartnerLink(partner.id);
      setRenewing(null);
      toast({ variant: result.success ? 'default' : 'destructive', description: translateMessage(t, result.message) });
      if (result.success) router.refresh();
    });

  return (
    <div className='space-y-4'>
      <Button className='rounded-full' onClick={() => setEditing('new')}>
        <Plus /> {t('PARTNER_NEW')}
      </Button>
      {partners.length === 0 ? (
        <p className='rounded-3xl border border-dashed border-border p-12 text-center text-muted-foreground'>{t('PARTNER_EMPTY_ADMIN')}</p>
      ) : (
        <ul className='space-y-3'>
          {partners.map((partner) => (
            <li key={partner.id} className='flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card p-3'>
              <MercadilloIcon src={partner.icon} className='size-12' />
              {/* At least 10rem for its name: on a phone the tools move to their own line instead of squeezing it. */}
              <Link href={partnerPath(partner.slug)} className='min-w-0 flex-1 basis-40 hover:underline'>
                <p className='truncate font-medium'>{localize(partner.name, locale)}</p>
                <p className='text-sm text-muted-foreground'>{t('PARTNER_LISTINGS_USED', { count: partner.listingCount, max: partner.maxListings })}</p>
                <p className='break-all text-xs text-muted-foreground'>{partner.slug}</p>
              </Link>
              {/* The link's tools first: sending it is what the admin does most here. */}
              <div className='ml-auto flex shrink-0 items-center'>
                <Button variant='ghost' size='icon' className='rounded-full text-primary' aria-label={t('PARTNER_SEND_WHATSAPP')} title={t('PARTNER_SEND_WHATSAPP')} asChild>
                  <a href={whatsappHref(partner, partner.panelUrl)} target='_blank' rel='noopener noreferrer'>
                    <MessageCircle />
                  </a>
                </Button>
                <Button variant='ghost' size='icon' className='rounded-full' aria-label={t('PARTNER_COPY_LINK')} title={t('PARTNER_COPY_LINK')} onClick={() => copyLink(partner.panelUrl)}>
                  <Copy />
                </Button>
                <Button variant='ghost' size='icon' className='rounded-full' aria-label={t('PARTNER_RENEW_LINK')} title={t('PARTNER_RENEW_LINK')} onClick={() => setRenewing(partner)}>
                  <KeyRound />
                </Button>
                <Button variant='ghost' size='icon' className='rounded-full' aria-label={t('PARTNER_OPEN_PANEL')} title={t('PARTNER_OPEN_PANEL')} asChild>
                  <a href={partner.panelUrl} target='_blank' rel='noopener noreferrer'>
                    <Eye />
                  </a>
                </Button>
                <Button variant='ghost' size='icon' className='rounded-full' aria-label={t('PARTNER_EDIT_ADMIN')} title={t('PARTNER_EDIT_ADMIN')} onClick={() => setEditing(partner)}>
                  <Pencil />
                </Button>
                <DeleteDialog
                  id={partner.id}
                  action={deletePartner}
                  description={t('PARTNER_DELETE_HINT')}
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
        <Dialog open onOpenChange={(isOpen) => !isOpen && setEditing(null)}>
          <DialogContent className='max-h-[90dvh] overflow-y-auto sm:max-w-2xl' onInteractOutside={(event) => event.preventDefault()}>
            <DialogHeader>
              <DialogTitle>{t(editing === 'new' ? 'PARTNER_NEW' : 'PARTNER_EDIT_ADMIN')}</DialogTitle>
              <DialogDescription>{t('PARTNER_FORM_INTRO')}</DialogDescription>
            </DialogHeader>
            <PartnerForm
              key={editing === 'new' ? 'new' : editing.id}
              locales={locales}
              partner={editing === 'new' ? undefined : editing}
              isAdminForm
              texts={texts}
              onCancel={() => setEditing(null)}
              onSaved={() => {
                setEditing(null);
                router.refresh();
              }}
            />
          </DialogContent>
        </Dialog>
      )}

      <AlertDialog open={Boolean(renewing)} onOpenChange={(isOpen) => !isOpen && setRenewing(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('PARTNER_RENEW_TITLE')}</AlertDialogTitle>
            <AlertDialogDescription>{t('PARTNER_RENEW_TEXT')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('DELETE_DIALOG_CANCEL')}</AlertDialogCancel>
            <AlertDialogAction
              disabled={isRenewing}
              onClick={(event) => {
                // Stays open until the new link is made.
                event.preventDefault();
                if (renewing) renewLink(renewing);
              }}
            >
              {t('PARTNER_RENEW_CONFIRM')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
