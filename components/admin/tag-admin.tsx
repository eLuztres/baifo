'use client';

import { Fragment, useMemo, useState, useTransition, type FormEvent, type KeyboardEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronDown, Globe, Languages, Loader2, Plus, Search, Trash2 } from 'lucide-react';
import ProductMedia from '@/components/ProductMedia';
import { useI18n } from '@/components/i18n-provider';
import DeleteDialog from '@/components/shared/delete-dialog';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { createTag, deleteTag, setTagName, translateTag } from '@/lib/actions/tag.actions';
import { translateMessage, type Locale } from '@/lib/i18n-core';
import { MAX_TAG_LENGTH, byTagName, tagNameKey, type TagNames } from '@/lib/tag-names';
import { cn } from '@/lib/utils';

export interface TagListing {
  id: string;
  title: string;
  /** The listing's state, in the admin's language. */
  status: string;
  image?: string;
}

export interface TagRow {
  id: string;
  names: TagNames;
  listings: TagListing[];
}

export interface TagLanguage {
  id: Locale;
  /** Its own name ("Deutsch"), for the table's head. */
  name: string;
}

interface TagAdminProps {
  tags: TagRow[];
  /** The shop's languages, its own first. */
  languages: TagLanguage[];
}

/** Every etiqueta with its name in each shop language, A to Z: each name is written or fixed by hand, right in the table. */
export default function TagAdmin({ tags, languages }: TagAdminProps) {
  const { t, locale } = useI18n();
  const { toast } = useToast();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  // Per etiqueta, the language whose name was touched last: "Traducir" starts from it.
  const [usedLanguages, setUsedLanguages] = useState<Record<string, Locale>>({});
  const [translatingId, setTranslatingId] = useState<string | null>(null);
  // Phones: the etiqueta whose names show in the pop-up.
  const [namesId, setNamesId] = useState<string | null>(null);
  const namesTag = tags.find((tag) => tag.id === namesId);
  const [isPending, startTransition] = useTransition();
  // New ones are named in the admin's language when the shop has it, else in the shop's own.
  const baseLocale = languages.some((language) => language.id === locale) ? locale : languages[0].id;

  const typed = tagNameKey(query);
  const shown = useMemo(() => tags.filter((tag) => Object.values(tag.names).some((name) => name && tagNameKey(name).includes(typed))).sort(byTagName(baseLocale)), [tags, typed, baseLocale]);
  const canCreate = Boolean(typed) && !tags.some((tag) => tagNameKey(tag.names[baseLocale] ?? '') === typed);

  const create = (event: FormEvent) => {
    event.preventDefault();
    if (!canCreate) return;
    startTransition(async () => {
      const result = await createTag(baseLocale, query);
      toast({
        variant: result.success ? 'default' : 'destructive',
        description: translateMessage(t, result.message),
      });
      if (result.success) {
        setQuery('');
        router.refresh();
      }
    });
  };

  const countText = (count: number) => (count === 0 ? t('TAG_COUNT_NONE') : count === 1 ? t('TAG_COUNT_ONE') : t('TAG_COUNT', { count }));
  const deleteHint = (count: number) => (count === 0 ? t('TAG_DELETE_HINT_NONE') : count === 1 ? t('TAG_DELETE_HINT_ONE') : t('TAG_DELETE_HINT', { count }));

  const listingsOf = (tag: TagRow) => (
    <ul className='grid gap-1 sm:grid-cols-2 lg:grid-cols-3'>
      {tag.listings.map((listing) => (
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
  );

  const countButton = (tag: TagRow) => {
    const isOpen = openId === tag.id;
    return (
      <button
        type='button'
        aria-expanded={isOpen}
        aria-label={countText(tag.listings.length)}
        disabled={tag.listings.length === 0}
        onClick={() => setOpenId(isOpen ? null : tag.id)}
        className='flex min-h-9 items-center gap-1 whitespace-nowrap rounded-lg px-2 text-sm font-medium text-primary enabled:hover:bg-muted disabled:text-muted-foreground'
      >
        {/* Phones: the number alone, so the name next to it has room. */}
        <span className='md:hidden'>{tag.listings.length}</span>
        <span className='max-md:hidden'>{countText(tag.listings.length)}</span>
        {tag.listings.length > 0 && <ChevronDown className={cn('size-4 transition-transform max-md:hidden', isOpen && 'rotate-180')} aria-hidden />}
      </button>
    );
  };

  // The name last touched, if it has one; else the first written, in the table's order.
  const baseOf = (tag: TagRow) => {
    const used = usedLanguages[tag.id];
    return used && tag.names[used] ? used : languages.find((language) => tag.names[language.id])?.id;
  };

  const translate = (tag: TagRow, from: Locale) => {
    setTranslatingId(tag.id);
    startTransition(async () => {
      const result = await translateTag(tag.id, from);
      if (!result.success) toast({ variant: 'destructive', description: result.message });
      router.refresh();
      setTranslatingId(null);
    });
  };

  // Only while a name is missing; it shows which language it translates from (on a phone's line, the icon alone).
  const translateButton = (tag: TagRow, isCompact = false) => {
    const from = baseOf(tag);
    if (!from || languages.every((language) => tag.names[language.id])) return null;
    const fromName = languages.find((language) => language.id === from)?.name ?? from;
    return (
      <Button
        variant='outline'
        size='sm'
        disabled={translatingId === tag.id}
        onClick={() => translate(tag, from)}
        title={t('TAG_TRANSLATE_FROM', { language: fromName })}
        aria-label={t('TAG_TRANSLATE_FROM', { language: fromName })}
        className='h-8 shrink-0 gap-1 rounded-full border-primary px-2 text-primary hover:bg-primary/10 hover:text-primary'
      >
        {translatingId === tag.id ? <Loader2 className='animate-spin' /> : <Languages />}
        {!isCompact && <span className='text-xs font-semibold uppercase'>{from}</span>}
      </Button>
    );
  };

  const deleteButton = (tag: TagRow) => (
    <DeleteDialog
      id={tag.id}
      action={deleteTag}
      description={deleteHint(tag.listings.length)}
      trigger={
        <Button variant='ghost' size='icon' className='shrink-0 rounded-full text-destructive hover:bg-destructive/10 hover:text-destructive' aria-label={t('DELETE_DIALOG_CONFIRM')}>
          <Trash2 />
        </Button>
      }
    />
  );

  return (
    <div className='space-y-4'>
      <form onSubmit={create} className='flex items-center gap-2'>
        <div className='relative min-w-0 flex-1'>
          <Search className='absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground' aria-hidden />
          <Input
            aria-label={t('TAG_SEARCH')}
            value={query}
            maxLength={MAX_TAG_LENGTH}
            enterKeyHint='search'
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('TAG_SEARCH')}
            className='h-11 rounded-full bg-card pl-9 text-base md:text-sm'
          />
        </div>
        {canCreate && (
          <Button type='submit' className='h-11 max-w-[50%] rounded-full' disabled={isPending}>
            {isPending ? <Loader2 className='animate-spin' /> : <Plus />}
            <span className='truncate'>{t('TAG_CREATE', { name: query.trim() })}</span>
          </Button>
        )}
      </form>

      {shown.length === 0 ? (
        <p className='rounded-3xl border border-dashed border-border p-12 text-center text-muted-foreground'>{t('TAG_EMPTY')}</p>
      ) : (
        <>
          {/* Wide screens: one row per etiqueta, one column per language. */}
          <div className='hidden overflow-hidden rounded-2xl border border-border bg-card md:block'>
            <table className='w-full table-fixed text-sm'>
              <thead>
                <tr className='border-b border-border text-left text-xs text-muted-foreground'>
                  {languages.map((language) => (
                    <th key={language.id} className='px-3 py-2 font-medium'>
                      {language.name}
                    </th>
                  ))}
                  <th className='w-20 px-3 py-2 font-medium'>
                    <span className='sr-only'>{t('TAG_TRANSLATE')}</span>
                  </th>
                  <th className='w-36 px-3 py-2 font-medium'>{t('TAG_LISTINGS')}</th>
                  <th className='w-12' />
                </tr>
              </thead>
              <tbody>
                {shown.map((tag) => (
                  <Fragment key={tag.id}>
                    <tr className='border-b border-border last:border-0'>
                      {languages.map((language) => (
                        <td key={language.id} className='px-1.5 py-1'>
                          <TagNameCell tag={tag} language={language} onUse={() => setUsedLanguages((used) => ({ ...used, [tag.id]: language.id }))} />
                        </td>
                      ))}
                      <td className='px-1.5 py-1'>{translateButton(tag)}</td>
                      <td className='px-1.5 py-1'>{countButton(tag)}</td>
                      <td className='pr-1.5'>{deleteButton(tag)}</td>
                    </tr>
                    {openId === tag.id && (
                      <tr className='border-b border-border bg-background/50'>
                        <td colSpan={languages.length + 3} className='p-2'>
                          {listingsOf(tag)}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>

          {/* Phones: one line per etiqueta with its first language's name; the others in a pop-up. */}
          <ul className='divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card md:hidden'>
            {shown.map((tag) => {
              const filled = languages.filter((language) => tag.names[language.id]).length;
              const isMissing = filled < languages.length;
              return (
                <li key={tag.id} className='p-1.5'>
                  <div className='flex items-center gap-1'>
                    <div className='min-w-0 flex-1 font-medium'>
                      <TagNameCell tag={tag} language={languages[0]} onUse={() => setUsedLanguages((used) => ({ ...used, [tag.id]: languages[0].id }))} isWrapped />
                    </div>
                    {translateButton(tag, true)}
                    <Button
                      variant='ghost'
                      size='sm'
                      onClick={() => setNamesId(tag.id)}
                      aria-label={t('TAG_NAMES_SHOW')}
                      title={t('TAG_NAMES_SHOW')}
                      className={cn('h-8 shrink-0 gap-1 rounded-full px-2 text-xs tabular-nums', isMissing ? 'text-primary' : 'text-muted-foreground')}
                    >
                      <Globe />
                      {filled}/{languages.length}
                    </Button>
                    {countButton(tag)}
                    {deleteButton(tag)}
                  </div>
                  {openId === tag.id && <div className='mt-1 border-t border-border pt-1'>{listingsOf(tag)}</div>}
                </li>
              );
            })}
          </ul>
        </>
      )}

      {namesTag && (
        <Dialog open onOpenChange={(isOpen) => !isOpen && setNamesId(null)}>
          <DialogContent className='max-w-sm'>
            <DialogHeader>
              <DialogTitle>{namesTag.names[languages[0].id] ?? Object.values(namesTag.names).find(Boolean)}</DialogTitle>
              <DialogDescription>{t('TAG_NAMES_HINT')}</DialogDescription>
            </DialogHeader>
            <dl className='grid grid-cols-[2.25rem_minmax(0,1fr)] items-center gap-y-1'>
              {languages.map((language) => (
                <Fragment key={language.id}>
                  <dt className='text-xs font-medium uppercase text-muted-foreground'>{language.id}</dt>
                  <dd>
                    <TagNameCell tag={namesTag} language={language} onUse={() => setUsedLanguages((used) => ({ ...used, [namesTag.id]: language.id }))} />
                  </dd>
                </Fragment>
              ))}
            </dl>
            <div className='flex justify-end'>{translateButton(namesTag)}</div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

interface TagNameCellProps {
  tag: TagRow;
  language: TagLanguage;
  /** Tapped or written: the row's "Traducir" starts from this language. */
  onUse: () => void;
  /** A long name takes a second line instead of being cut (a phone's line). */
  isWrapped?: boolean;
}

/** One name of an etiqueta: "—" until written; a tap turns it into a field, Enter or leaving it saves. */
function TagNameCell({ tag, language, onUse, isWrapped }: TagNameCellProps) {
  const { t } = useI18n();
  const { toast } = useToast();
  const router = useRouter();
  const name = tag.names[language.id] ?? '';
  const [text, setText] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const label = t('TAG_NAME_IN', { language: language.name });

  const save = () => {
    if (text === null) return;
    if (text.trim() === name) return setText(null);
    startTransition(async () => {
      const result = await setTagName(tag.id, language.id, text);
      if (!result.success)
        toast({
          variant: 'destructive',
          description: translateMessage(t, result.message),
        });
      else router.refresh();
      setText(null);
    });
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      save();
    } else if (event.key === 'Escape') setText(null);
  };

  if (text !== null || isPending) {
    return (
      <div className='relative'>
        <Input
          autoFocus
          aria-label={label}
          value={text ?? name}
          maxLength={MAX_TAG_LENGTH}
          readOnly={isPending}
          onChange={(event) => setText(event.target.value)}
          onBlur={save}
          onKeyDown={handleKeyDown}
          className='h-9 rounded-lg bg-background px-2 text-base md:text-sm'
        />
        {isPending && <Loader2 className='absolute right-2 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground' aria-hidden />}
      </div>
    );
  }
  return (
    <button
      type='button'
      aria-label={label}
      onClick={() => {
        onUse();
        setText(name);
      }}
      className={cn('flex min-h-9 w-full items-center rounded-lg px-2 text-left hover:bg-muted', !isWrapped && 'truncate')}
    >
      {name ? <span className={cn(isWrapped ? 'min-w-0 hyphens-auto leading-tight [overflow-wrap:anywhere]' : 'truncate')}>{name}</span> : <span className='text-muted-foreground'>—</span>}
    </button>
  );
}
