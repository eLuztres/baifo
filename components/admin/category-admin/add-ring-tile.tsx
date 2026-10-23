'use client';

import Link from 'next/link';
import { Gem, Plus } from 'lucide-react';
import { useI18n } from '@/components/i18n-provider';

interface AddRingTileProps {
  categoryId: string;
  name: string;
}

/** The admin's last tile in a category's rings: opens the studio to add a ring to that category. */
const AddRingTile = ({ categoryId, name }: AddRingTileProps) => {
  const { t } = useI18n();

  return (
    <Link
      href={`/admin/studio?category=${categoryId}`}
      className='flex size-full snap-center flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-primary/40 bg-background/50 p-4 text-center text-sm text-primary backdrop-blur-md transition hover:border-primary hover:bg-background/70'
    >
      <span className='relative'>
        <Gem className='size-10' strokeWidth={1.5} />
        <Plus className='absolute -right-2 -top-2 size-5 rounded-full bg-primary p-0.5 text-primary-foreground' />
      </span>
      {t('CATEGORY_ADD_RING', { name })}
    </Link>
  );
};

export default AddRingTile;
