'use client';

import { useState } from 'react';
import { Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import DeleteDialog from '@/components/shared/delete-dialog';
import { useI18n } from '@/components/i18n-provider';
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
import { Button } from '@/components/ui/button';
import { deleteCategory } from '@/lib/actions/category.actions';
import type { CategoryRingAdmin, EditableCategory } from '@/lib/category';
import { localize } from '@/lib/category';
import { cn } from '@/lib/utils';
import CategoryEditor from './category-editor';
import { useRingRegeneration } from './use-ring-regeneration';

interface CategoryToolbarProps {
  admin: CategoryRingAdmin;
  /** The slug of the category at the front of the ring, if there is one. */
  frontSlug?: string;
  className?: string;
}

type Editing = { category?: EditableCategory } | null;

const TOOL_CLASS = 'h-8 rounded-full border-primary/40 bg-background/70 backdrop-blur-md';

/** Admin buttons over the store's ring: new category, edit or delete the front one. */
const CategoryToolbar = ({ admin, frontSlug, className }: CategoryToolbarProps) => {
  const { t, locale } = useI18n();
  const [editing, setEditing] = useState<Editing>(null);
  const [staleRingIds, setStaleRingIds] = useState<string[]>([]);
  const { progress, regenerate } = useRingRegeneration();
  const front = admin.categories.find((category) => category.slug === frontSlug);
  const frontName = front ? localize(front.name, locale) : '';

  const handleSaved = (ringIds: string[]) => {
    setEditing(null);
    setStaleRingIds(ringIds);
  };

  return (
    <div className={cn('flex flex-wrap items-center justify-center gap-2 px-4', className)}>
      <Button size='sm' variant='outline' className={TOOL_CLASS} onClick={() => setEditing({})}>
        <Plus /> {t('CATEGORY_NEW')}
      </Button>
      {front && (
        <>
          <Button size='sm' variant='outline' className={TOOL_CLASS} onClick={() => setEditing({ category: front })}>
            <Pencil /> {t('CATEGORY_EDIT', { name: frontName })}
          </Button>
          <DeleteDialog
            id={front.id}
            action={deleteCategory}
            description={t('CATEGORY_DELETE_TEXT', { name: frontName, count: front.ringCount })}
            trigger={
              <Button size='sm' variant='outline' className={TOOL_CLASS}>
                <Trash2 /> {t('CATEGORY_DELETE', { name: frontName })}
              </Button>
            }
          />
        </>
      )}
      {progress && (
        <p className='flex items-center gap-2 text-xs text-muted-foreground' aria-live='polite'>
          <Loader2 className='size-4 animate-spin' />
          {t('CATEGORY_REGENERATE_PROGRESS', { done: progress.done + 1, count: progress.count })}
        </p>
      )}

      {editing && (
        <CategoryEditor
          key={editing.category?.id ?? 'new'}
          locales={admin.locales}
          category={editing.category}
          onClose={() => setEditing(null)}
          onSaved={handleSaved}
        />
      )}

      <AlertDialog open={staleRingIds.length > 0} onOpenChange={(isOpen) => !isOpen && setStaleRingIds([])}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('CATEGORY_REGENERATE_TITLE')}</AlertDialogTitle>
            <AlertDialogDescription>{t('CATEGORY_REGENERATE_TEXT', { count: staleRingIds.length })}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('CATEGORY_REGENERATE_NO')}</AlertDialogCancel>
            <AlertDialogAction onClick={() => regenerate(staleRingIds)}>{t('CATEGORY_REGENERATE_YES')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CategoryToolbar;
