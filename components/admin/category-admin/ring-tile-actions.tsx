'use client';

import { useTransition } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Pencil, Trash2 } from 'lucide-react';
import DeleteDialog from '@/components/shared/delete-dialog';
import { useI18n } from '@/components/i18n-provider';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { reorderRings } from '@/lib/actions/category.actions';
import { deleteProduct } from '@/lib/actions/product.actions';

interface RingTileActionsProps {
  productId: string;
  name: string;
  /** The rings of the category on show, in their order; the arrows move this one among them. */
  ringIds: string[];
}

const ACTION_CLASS = 'size-8 rounded-full border-primary/40 bg-background/70 backdrop-blur-md';

/** Admin buttons on a ring in the store's banner: move it left or right, edit it, or delete it after asking. */
const RingTileActions = ({ productId, name, ringIds }: RingTileActionsProps) => {
  const { t } = useI18n();
  const { toast } = useToast();
  const [isMoving, startMoving] = useTransition();
  const index = ringIds.indexOf(productId);

  const move = (offset: number) => {
    const order = [...ringIds];
    [order[index], order[index + offset]] = [order[index + offset], order[index]];
    startMoving(async () => {
      const result = await reorderRings(order);
      if (!result.success) toast({ variant: 'destructive', description: result.message });
    });
  };

  return (
    <>
      <div className='absolute left-2 top-2 z-10 flex gap-1.5'>
        {index > 0 && (
          <Button size='icon' variant='outline' className={ACTION_CLASS} aria-label={t('RING_MOVE_EARLIER', { name })} disabled={isMoving} onClick={() => move(-1)}>
            <ArrowLeft />
          </Button>
        )}
        {index >= 0 && index < ringIds.length - 1 && (
          <Button size='icon' variant='outline' className={ACTION_CLASS} aria-label={t('RING_MOVE_LATER', { name })} disabled={isMoving} onClick={() => move(1)}>
            <ArrowRight />
          </Button>
        )}
      </div>
      <div className='absolute right-2 top-2 z-10 flex gap-1.5'>
        <Button size='icon' variant='outline' className={ACTION_CLASS} aria-label={t('RING_EDIT', { name })} asChild>
          <Link href={`/admin/products/${productId}`}>
            <Pencil />
          </Link>
        </Button>
        <DeleteDialog
          id={productId}
          action={deleteProduct}
          description={t('RING_DELETE_TEXT', { name })}
          trigger={
            <Button size='icon' variant='outline' className={ACTION_CLASS} aria-label={t('DELETE_DIALOG_CONFIRM')}>
              <Trash2 />
            </Button>
          }
        />
      </div>
    </>
  );
};

export default RingTileActions;
