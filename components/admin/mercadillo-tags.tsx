'use client';

import { useState } from 'react';
import { Plus, Search, Tag, X } from 'lucide-react';
import { useI18n } from '@/components/i18n-provider';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { foldText } from '@/lib/search-text';

/** An etiqueta a selección can hold, with how many listings carry it. */
export interface TagOption {
  id: string;
  name: string;
  count: number;
}

interface MercadilloTagsProps {
  tags: TagOption[];
  chosenIds: string[];
  onChange: (ids: string[]) => void;
}

/** The selección's etiquetas as chips, and a searchable list to choose them: every listing with one is in it. */
export default function MercadilloTags({ tags, chosenIds, onChange }: MercadilloTagsProps) {
  const { t } = useI18n();
  const [isPicking, setIsPicking] = useState(false);
  const [query, setQuery] = useState('');
  const chosen = tags.filter((tag) => chosenIds.includes(tag.id));
  const found = tags.filter((tag) => foldText(tag.name).includes(foldText(query.trim())));
  const toggle = (id: string) => onChange(chosenIds.includes(id) ? chosenIds.filter((one) => one !== id) : [...chosenIds, id]);

  return (
    <div className='space-y-3 rounded-2xl border border-border p-3'>
      <div className='flex items-center justify-between gap-2'>
        <p className='flex items-center gap-1.5 font-medium'>
          <Tag className='size-4' aria-hidden /> {t('MERCADILLO_TAGS')}
        </p>
        <Button type='button' size='sm' className='rounded-full' aria-expanded={isPicking} onClick={() => setIsPicking((open) => !open)}>
          <Plus /> {t('MERCADILLO_TAGS_ADD')}
        </Button>
      </div>
      <p className='text-xs text-muted-foreground'>{t('MERCADILLO_TAGS_HINT')}</p>
      {chosen.length === 0 ? (
        <p className='text-sm text-muted-foreground'>{t('MERCADILLO_TAGS_NONE')}</p>
      ) : (
        <ul className='flex flex-wrap gap-2'>
          {chosen.map((tag) => (
            <li key={tag.id}>
              <button
                type='button'
                aria-label={t('MERCADILLO_TAG_REMOVE', { name: tag.name })}
                onClick={() => toggle(tag.id)}
                className='inline-flex items-center gap-1.5 rounded-full border border-accent/60 bg-accent/20 py-1 pl-3 pr-2 text-sm hover:bg-accent/30'
              >
                <Tag className='size-3.5' aria-hidden /> {tag.name} <X className='size-3.5 opacity-70' aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
      {isPicking && (
        <div className='rounded-xl border border-border bg-popover p-1.5 shadow-lg'>
          <label className='flex items-center gap-2 border-b border-border px-2 pb-1.5 pt-0.5 text-muted-foreground'>
            <Search className='size-4 shrink-0' aria-hidden />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('MERCADILLO_TAGS_SEARCH')} className='h-8 min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none' />
          </label>
          <ul className='max-h-56 overflow-y-auto pt-1'>
            {found.map((tag) => (
              <li key={tag.id}>
                <label className='flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 text-sm hover:bg-muted'>
                  <Checkbox checked={chosenIds.includes(tag.id)} onCheckedChange={() => toggle(tag.id)} />
                  <span className='min-w-0 flex-1 truncate'>{tag.name}</span>
                  <span className='shrink-0 text-xs text-muted-foreground'>{tag.count}</span>
                </label>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
