'use client';
import { type ReactNode, useState, useTransition } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useI18n } from '@/components/i18n-provider';
import { translateMessage } from '@/lib/i18n-core';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface DeleteDialogProps {
  id: string;
  action: (id: string) => Promise<{ success: boolean; message: string }>;
  /** Says what deleting does, instead of the general warning. */
  description?: string;
  /** Replaces the default "Delete" button that opens the dialog. */
  trigger?: ReactNode;
}

const DeleteDialog = ({ id, action, description, trigger }: DeleteDialogProps) => {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const { t } = useI18n();

  const handleDeleteClick = () => {
    startTransition(async () => {
      const res = await action(id);

      if (!res.success) {
        toast({
          variant: 'destructive',
          description: translateMessage(t, res.message),
        });
      } else {
        setOpen(false);
        toast({
          description: translateMessage(t, res.message),
        });
      }
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        {trigger ?? (
          <Button size='sm' variant='destructive' className='ml-2'>
            {t('DELETE_DIALOG_CONFIRM')}
          </Button>
        )}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('DELETE_DIALOG_TITLE')}</AlertDialogTitle>
          <AlertDialogDescription>
            {description ?? t('DELETE_DIALOG_TEXT')}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t('DELETE_DIALOG_CANCEL')}</AlertDialogCancel>
          <Button
            variant='destructive'
            size='sm'
            disabled={isPending}
            onClick={handleDeleteClick}
          >
            {isPending ? t('DELETE_DIALOG_PENDING') : t('DELETE_DIALOG_CONFIRM')}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeleteDialog;
