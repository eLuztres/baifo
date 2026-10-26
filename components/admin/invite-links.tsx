'use client';

import { useState, useTransition } from 'react';
import { Copy, Link2, Loader2, Plus, Trash2 } from 'lucide-react';
import { createInvite, deleteInvite } from '@/lib/actions/invite.actions';
import { useI18n, useTranslateMessage } from '@/components/i18n-provider';
import DeleteDialog from '@/components/shared/delete-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

interface OpenInvite {
  id: string;
  note: string | null;
  link: string;
  expiresAt: Date;
}

interface InviteLinksProps {
  invites: OpenInvite[];
  days: number;
}

/** Invite-only sign-up: the admin makes one-time links here and sends them to people. */
const InviteLinks = ({ invites, days }: InviteLinksProps) => {
  const { t, locale } = useI18n();
  const translateMessage = useTranslateMessage();
  const { toast } = useToast();
  const [note, setNote] = useState('');
  const [isPending, startTransition] = useTransition();

  const copy = async (link: string, message = t('ADMIN_INVITE_COPIED')) => {
    try {
      await navigator.clipboard.writeText(link);
      toast({ description: message });
    } catch {
      toast({ variant: 'destructive', description: t('SHARE_FAILED') });
    }
  };

  // The new link is copied at once; it also shows in the list below to copy again.
  const create = () =>
    startTransition(async () => {
      const result = await createInvite(note);
      if (!result.success || !result.link) {
        toast({ variant: 'destructive', description: translateMessage(result.message) });
        return;
      }
      setNote('');
      await copy(result.link, translateMessage(result.message));
    });

  return (
    <section className='my-4 space-y-4 rounded-3xl border border-border bg-card p-5 sm:p-6'>
      <div className='space-y-1'>
        <h2 className='flex items-center gap-2 font-display text-xl'>
          <Link2 className='size-5 text-primary' /> {t('ADMIN_INVITES_TITLE')}
        </h2>
        <p className='text-sm text-muted-foreground'>{t('ADMIN_INVITES_TEXT', { days })}</p>
      </div>

      <div className='flex flex-col gap-3 sm:flex-row'>
        <Input
          value={note}
          onChange={(event) => setNote(event.target.value)}
          maxLength={80}
          placeholder={t('ADMIN_INVITE_NOTE')}
          aria-label={t('ADMIN_INVITE_NOTE')}
          className='h-11 flex-1 rounded-2xl bg-background'
        />
        <Button className='h-11 rounded-full' disabled={isPending} onClick={create}>
          {isPending ? <Loader2 className='animate-spin' /> : <Plus />} {t('ADMIN_INVITE_CREATE')}
        </Button>
      </div>

      {invites.length === 0 ? (
        <p className='text-sm text-muted-foreground'>{t('ADMIN_INVITES_EMPTY')}</p>
      ) : (
        <ul className='divide-y divide-border rounded-2xl border border-border bg-background'>
          {invites.map((invite) => (
            <li key={invite.id} className='flex items-center gap-3 p-3'>
              <div className='min-w-0 flex-1'>
                <p className='truncate font-medium'>{invite.note || invite.link}</p>
                <p className='text-xs text-muted-foreground'>
                  {t('ADMIN_INVITE_EXPIRES', { date: invite.expiresAt.toLocaleDateString(locale) })}
                </p>
              </div>
              <Button variant='outline' size='sm' className='rounded-full' onClick={() => copy(invite.link)}>
                <Copy /> {t('ADMIN_INVITE_COPY')}
              </Button>
              <DeleteDialog
                id={invite.id}
                action={deleteInvite}
                trigger={
                  <Button size='icon' variant='ghost' aria-label={t('ADMIN_INVITE_DELETE')} className='rounded-full hover:bg-destructive hover:text-destructive-foreground'>
                    <Trash2 className='size-4' />
                  </Button>
                }
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

export default InviteLinks;
