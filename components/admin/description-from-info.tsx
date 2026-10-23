'use client';

import { useState } from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import { useI18n } from '@/components/i18n-provider';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { draftRingText } from '@/lib/actions/studio.actions';
import InfoPhotoUpload from './studio/info-photo-upload';

interface DescriptionFromInfoProps {
  productImage?: string;
  onDescription: (description: string) => void;
}

/** Info photo (the maker's note or label) that the AI reads, together with the product picture, to write the description. */
const DescriptionFromInfo = ({ productImage, onDescription }: DescriptionFromInfoProps) => {
  const { t } = useI18n();
  const { toast } = useToast();
  const [infoUrl, setInfoUrl] = useState<string>();
  const [isWriting, setIsWriting] = useState(false);

  const writeDescription = async (info?: string) => {
    if (!productImage) return toast({ variant: 'destructive', description: t('STUDIO_NEED_PHOTO') });
    setIsWriting(true);
    const result = await draftRingText(productImage, undefined, info);
    setIsWriting(false);
    if (!result.success) return toast({ variant: 'destructive', description: result.message });
    onDescription(result.description ?? '');
  };

  const handleUpload = (url: string) => {
    setInfoUrl(url);
    writeDescription(url);
  };

  return (
    <div className='space-y-2 rounded-lg border border-border p-3'>
      <p className='text-sm font-medium'>{t('STUDIO_INFO_PHOTO')}</p>
      <p className='text-xs text-muted-foreground'>{t('STUDIO_INFO_HINT')}</p>
      <div className='flex flex-wrap items-center gap-3'>
        <InfoPhotoUpload url={infoUrl} onUpload={handleUpload} onRemove={() => setInfoUrl(undefined)} />
        <Button type='button' variant='outline' disabled={isWriting} onClick={() => writeDescription(infoUrl)}>
          {isWriting ? <Loader2 className='animate-spin' /> : <Sparkles />}
          {isWriting ? t('STUDIO_WRITING') : t('STUDIO_WRITE_TEXT')}
        </Button>
      </div>
    </div>
  );
};

export default DescriptionFromInfo;
