'use client';

import { useMemo, useState, useTransition, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronDown, Loader2, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import ProductMedia from '@/components/ProductMedia';
import { useI18n } from '@/components/i18n-provider';
import DeleteDialog from '@/components/shared/delete-dialog';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { createHashtag, deleteHashtag, renameHashtag } from '@/lib/actions/hashtag.actions';
import { MAX_HASHTAG_LENGTH, hashtagSlug, toHashtagName } from '@/lib/hashtag-text';
import { translateMessage } from '@/lib/i18n-core';
import { cn } from '@/lib/utils';

export interface HashtagListing {
  id: string;
  title: string;
  /** The listing's state, in the admin's language. */
  status: string;
  image?: string;
}

export interface HashtagRow {
  id: string;
  slug: string;
  name: string;
  listings: HashtagListing[];
}

type HashtagView = 'used' | 'name' | 'unused';

interface HashtagAdminProps {
  hashtags: HashtagRow[];
}

/** The shop's hashtags: one field finds them or makes a new one; each row opens to the listings that use it. */
export default function HashtagAdmin({ hashtags }: HashtagAdminProps) {
  const { t } = useI18n();
  const { toast } = useToast();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [view, setView] = useState<HashtagView>('used');
  const [openId, setOpenId] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<HashtagRow | null>(null);
  const [isPending, startTransition] = useTransition();

  const typed = hashtagSlug(query);
  const shown = useMemo(() => {
    const found = hashtags.filter((hashtag) => hashtag.slug.includes(typed) && (view !== 'unused' || hashtag.listings.length === 0));
    return view === 'used' ? [...found].sort((a, b) => b.listings.length - a.listings.length) : found;
  }, [hashtags, typed, view]);
  const canCreate = Boolean(typed) && !hashtags.some((hashtag) => hashtag.slug === typed);

  const create = (event: FormEvent) => {
    event.preventDefault();
    if (!canCreate) return;
    startTransition(async () => {
      const result = await createHashtag(query);
      toast({ variant: result.success ? 'default' : 'destructive', description: translateMessage(t, result.message) });
      if (result.success) {
        setQuery('');
        router.refresh();
      }
    });
  };

  const countText = (count: number) => (count === 0 ? t('HASHTAG_COUNT_NONE') : count === 1 ? t('HASHTAG_COUNT_ONE') : t('HASHTAG_COUNT', { count }));
  const deleteHint = (count: number) => (count === 0 ? t('HASHTAG_DELETE_HINT_NONE') : count === 1 ? t('HASHTAG_DELETE_HINT_ONE') : t('HASHTAG_DELETE_HINT', { count }));

  return (
    <div className='space-y-4'>
      <form onSubmit={create} className='flex items-center gap-2'>
        <div className='relative min-w-0 flex-1'>
          <Search className='absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground' aria-hidden />
          <Input
            aria-label={t('HASHTAG_SEARCH')}
            value={query}
            maxLength={MAX_HASHTAG_LENGTH + 1}
            autoCapitalize='none'
            enterKeyHint='search'
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('HASHTAG_SEARCH')}
            className='h-11 rounded-full bg-card pl-9 text-base md:text-sm'
          />
        </div>
        <select
          aria-label={t('HASHTAG_VIEW')}
          value={view}
          onChange={(event) => setView(event.target.value as HashtagView)}
          className='h-11 w-28 shrink-0 rounded-full border border-border bg-card px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:w-36'
        >
          <option value='used'>{t('HASHTAG_VIEW_USED')}</option>
          <option value='name'>{t('HASHTAG_VIEW_NAME')}</option>
          <option value='unused'>{t('HASHTAG_VIEW_UNUSED')}</option>
        </select>
      </form>

      {canCreate && (
        <Button className='rounded-full' disabled={isPending} onClick={create}>
          {isPending ? <Loader2 className='animate-spin' /> : <Plus />} {t('HASHTAG_CREATE', { name: toHashtagName(query) })}
        </Button>
      )}

      {shown.length === 0 && !canCreate ? (
        <p className='rounded-3xl border border-dashed border-border p-12 text-center text-muted-foreground'>{t('HASHTAG_EMPTY')}</p>
      ) : (
        <ul className='space-y-2'>
          {shown.map((hashtag) => {
            const isOpen = openId === hashtag.id;
            const hasListings = hashtag.listings.length > 0;
            return (
              <li key={hashtag.id} className='rounded-2xl border border-border bg-card'>
                <div className='flex items-center gap-1 p-1.5 pl-2'>
                  <button
                    type='button'
                    aria-expanded={isOpen}
                    disabled={!hasListings}
                    onClick={() => setOpenId(isOpen ? null : hashtag.id)}
                    className='flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-xl px-2 text-left enabled:hover:bg-muted'
                  >
                    <span className='min-w-0 flex-1'>
                      <span className='block truncate font-medium'>#{hashtag.name}</span>
                      <span className='block text-xs text-muted-foreground'>{countText(hashtag.listings.length)}</span>
                    </span>
                    {hasListings && <ChevronDown className={cn('size-4 shrink-0 text-muted-foreground transition-transform', isOpen && 'rotate-180')} aria-hidden />}
                  </button>
                  <Button variant='ghost' size='icon' className='shrink-0 rounded-full' aria-label={t('HASHTAG_RENAME')} onClick={() => setRenaming(hashtag)}>
                    <Pencil />
                  </Button>
                  <DeleteDialog
                    id={hashtag.id}
                    action={deleteHashtag}
                    description={deleteHint(hashtag.listings.length)}
                    trigger={
                      <Button variant='ghost' size='icon' className='shrink-0 rounded-full text-destructive hover:bg-destructive/10 hover:text-destructive' aria-label={t('DELETE_DIALOG_CONFIRM')}>
                        <Trash2 />
                      </Button>
                    }
                  />
                </div>
                {isOpen && (
                  <ul className='space-y-1 border-t border-border p-2'>
                    {hashtag.listings.map((listing) => (
                      <li key={listing.id}>
                        <Link href={`/admin/listings/${listing.id}`} className='flex items-center gap-3 rounded-xl p-1.5 hover:bg-muted'>
                          <span className='relative block h-12 w-9 shrink-0 overflow-hidden rounded-md bg-muted'>
                            {listing.image && <ProductMedia src={listing.image} fill sizes='36px' isStill className='object-cover' />}
                          </span>
                          <span className='min-w-0 flex-1'>
                            <span className='block truncate text-sm'>{listing.title}</span>
                            <span className='block text-xs text-muted-foreground'>{listing.status}</span>
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {renaming && <RenameDialog key={renaming.id} hashtag={renaming} others={hashtags} onClose={() => setRenaming(null)} />}
    </div>
  );
}

interface RenameDialogProps {
  hashtag: HashtagRow;
  others: HashtagRow[];
  onClose: () => void;
}

/** Changes how a hashtag is written; a name that already exists joins the two, and says so first. */
function RenameDialog({ hashtag, others, onClose }: RenameDialogProps) {
  const { t } = useI18n();
  const { toast } = useToast();
  const router = useRouter();
  const [text, setText] = useState(hashtag.name);
  const [isPending, startTransition] = useTransition();
  const name = toHashtagName(text);
  const slug = hashtagSlug(name);
  const target = others.find((other) => other.slug === slug && other.id !== hashtag.id);

  const save = (event: FormEvent) => {
    event.preventDefault();
    startTransition(async () => {
      const result = await renameHashtag(hashtag.id, text);
      toast({ variant: result.success ? 'default' : 'destructive', description: translateMessage(t, result.message) });
      if (!result.success) return;
      router.refresh();
      onClose();
    });
  };

  return (
    <Dialog open onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('HASHTAG_RENAME')}</DialogTitle>
          <DialogDescription>#{hashtag.name}</DialogDescription>
        </DialogHeader>
        <form onSubmit={save} className='space-y-4'>
          <Input aria-label={t('HASHTAG_RENAME')} value={text} maxLength={MAX_HASHTAG_LENGTH + 1} autoCapitalize='none' onChange={(event) => setText(event.target.value)} className='h-11 rounded-2xl text-base md:text-sm' />
          {target && <p className='text-sm text-muted-foreground'>{t('HASHTAG_MERGE_HINT', { name: target.name })}</p>}
          <div className='flex justify-end gap-2'>
            <Button type='button' variant='ghost' onClick={onClose}>
              {t('DELETE_DIALOG_CANCEL')}
            </Button>
            <Button type='submit' disabled={isPending || !name || name === hashtag.name}>
              {isPending && <Loader2 className='animate-spin' />}
              {target ? t('HASHTAG_MERGE') : t('HASHTAG_SAVE')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
