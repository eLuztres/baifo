'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Eye, EyeOff, Loader2, Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button, buttonVariants } from '@/components/ui/button';
import type { ListingType } from '@/lib/constants';
import { manageListing, type ListingAction } from '@/lib/marketplace/checkout.actions';
import type { PublishPageTexts } from '@/lib/marketplace/page-texts';

interface ListingActionsProps {
  token: string;
  texts: PublishPageTexts;
  type: ListingType;
  isHidden: boolean;
}

/** On the person's private page: their listing's few buttons, sold (a product or event), hide or show, delete. */
export default function ListingActions({ token, texts, type, isHidden }: ListingActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState('');
  const isEvent = type === 'EVENT';
  const canSell = !isHidden && (type === 'PRODUCT' || isEvent);

  const run = (action: ListingAction) =>
    startTransition(async () => {
      setError('');
      const result = await manageListing(token, action);
      if (!result.success) return setError(result.isTooMany ? texts.closeTooMany : texts.error);
      // The page comes back in its new state; a deleted listing has no page left, so the link says it went well.
      if (action === 'delete') router.replace('?borrado=1');
      else router.refresh();
    });

  const confirmButton = (label: string, description: string, action: ListingAction, icon?: React.ReactNode) => (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant='outline' className='h-12 w-full rounded-full' disabled={isPending}>
          {icon} {label}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{label}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{texts.manageCancel}</AlertDialogCancel>
          <AlertDialogAction className={buttonVariants({ variant: 'destructive' })} onClick={() => run(action)}>
            {label}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return (
    <div className='space-y-3'>
      {isHidden && <p className='rounded-3xl border border-border bg-muted p-5 sm:p-6'>{texts.manageHidden}</p>}
      {canSell && confirmButton(isEvent ? texts.closeCancel : texts.closeSold, texts.manageSoldConfirm, 'sold', <CheckCircle2 />)}
      <Button variant='outline' className='h-12 w-full rounded-full' disabled={isPending} onClick={() => run(isHidden ? 'show' : 'hide')}>
        {isPending ? <Loader2 className='animate-spin' /> : isHidden ? <Eye /> : <EyeOff />} {isHidden ? texts.manageShow : texts.manageHide}
      </Button>
      {confirmButton(texts.manageDelete, texts.manageDeleteConfirm, 'delete', <Trash2 />)}
      {error && (
        <p role='alert' className='text-sm font-medium text-destructive'>
          {error}
        </p>
      )}
    </div>
  );
}
