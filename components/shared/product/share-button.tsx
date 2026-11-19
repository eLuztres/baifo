'use client';

import { useState } from 'react';
import { Share2 } from 'lucide-react';
import { useI18n } from '@/components/i18n-provider';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { getShownPicture } from '@/components/shared/product/shown-picture';
import { withLang, type Locale } from '@/lib/i18n-core';
import { cn } from '@/lib/utils';
import { pictureOf } from '@/lib/video';
import PhotoLanguageChoice, { choiceHint, useShopLanguages } from './photo-language-choice';

interface ShareButtonProps {
  /** The product's or service's name, shown in the share sheet. */
  title: string;
  /** What to share, e.g. "/explore?seleccion=magma"; missing: this page. */
  path?: string;
  /** A full button saying "Share", for where sharing is one of the main things to do. */
  isLabeled?: boolean;
  /** A listing's gallery: Share first asks which picture the link shows and in which language (only when there is a choice). */
  photos?: string[];
  /** The link preview picture for each of `photos`. */
  previewPaths?: string[];
  className?: string;
}

/** Shares the page through the phone's share sheet (WhatsApp, …), or copies its link where there is none (most desktops). */
export default function ShareButton({ title, path, isLabeled, photos, previewPaths, className }: ShareButtonProps) {
  const { t, locale } = useI18n();
  const { toast } = useToast();
  const languages = useShopLanguages();
  const [picture, setPicture] = useState(0);
  const [lang, setLang] = useState<Locale>(locale);
  const [isChoosing, setIsChoosing] = useState(false);
  const gallery = photos ?? [];
  // Gallery positions with a picture to preview: a video without a still frame can't be one.
  const choosable = gallery.flatMap((src, index) => (pictureOf(src) ? [index] : []));
  const hasChoice = !!photos && (choosable.length > 1 || languages.length > 1);

  // Made as soon as it is chosen, it is ready when WhatsApp asks for it (the first picture's already is, see PrepareSharePreview).
  const choosePicture = (index: number) => {
    setPicture(index);
    const preview = previewPaths?.[index];
    if (index > 0 && preview) new Image().src = preview;
  };

  // Every opening starts from what is on screen: the picture shown and the page's language.
  const openChoice = (isOpen: boolean) => {
    setIsChoosing(isOpen);
    if (!isOpen) return;
    const shown = getShownPicture();
    choosePicture(choosable.includes(shown) ? shown : (choosable[0] ?? 0));
    setLang(locale);
  };

  const share = async (sharedPicture: number, sharedLang: Locale) => {
    const pagePath = path ?? window.location.pathname;
    // Without the query (e.g. the filters someone came through): they mean nothing to the person it is sent to.
    // The picture and language stay: the link opens, and previews, as it was shared.
    const sharedPath = sharedPicture > 0 ? `${pagePath}?foto=${sharedPicture}` : pagePath;
    const url = `${window.location.origin}${withLang(sharedPath, sharedLang)}`;
    if (navigator.share) {
      // Closing the share sheet rejects too; that is not an error.
      await navigator.share({ title, url }).catch(() => {});
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      toast({ description: t('SHARE_COPIED') });
    } catch {
      toast({ variant: 'destructive', description: t('SHARE_FAILED') });
    }
  };

  // Nothing to choose: the first picture there is, in the page's language.
  const shareAtOnce = () => share(choosable[0] ?? 0, locale);

  const shareChoice = () => {
    setIsChoosing(false);
    share(picture, lang);
  };

  const button = isLabeled ? (
    <Button type='button' variant='outline' onClick={hasChoice ? undefined : shareAtOnce} className={cn('h-11 rounded-full', className)}>
      <Share2 /> {t('SHARE')}
    </Button>
  ) : (
    <Button
      type='button'
      variant='ghost'
      size='icon'
      onClick={hasChoice ? undefined : shareAtOnce}
      aria-label={t('SHARE')}
      title={t('SHARE')}
      className={cn('size-10 shrink-0 rounded-full text-muted-foreground hover:text-primary', className)}
    >
      <Share2 className='size-5' />
    </Button>
  );

  if (!hasChoice) return button;

  return (
    <Dialog open={isChoosing} onOpenChange={openChoice}>
      <DialogTrigger asChild>{button}</DialogTrigger>
      <DialogContent className='w-[calc(100%-2rem)] max-w-md rounded-3xl p-4 sm:p-6'>
        <DialogHeader>
          <DialogTitle className='px-8 font-display text-2xl sm:pl-0'>{t('SHARE_CHOOSE_TITLE')}</DialogTitle>
          <DialogDescription>{t(choiceHint(choosable.length > 1, languages.length > 1))}</DialogDescription>
        </DialogHeader>
        <div className='flex flex-col gap-4'>
          <PhotoLanguageChoice
            photos={choosable.map((index) => gallery[index])}
            photo={choosable.indexOf(picture)}
            onPhotoChange={(index) => choosePicture(choosable[index])}
            lang={lang}
            onLangChange={setLang}
          />
          <Button type='button' size='lg' autoFocus onClick={shareChoice} className='h-12 w-full rounded-full text-base font-bold'>
            <Share2 className='size-5' /> {t('SHARE')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
