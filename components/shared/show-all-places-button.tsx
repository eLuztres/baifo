'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, MapPin } from 'lucide-react';
import { savePlaces } from '@/components/shared/header/place-picker';
import { Button } from '@/components/ui/button';

interface ShowAllPlacesButtonProps {
  /** Every live place. */
  slugs: string[];
  label: string;
}

/** When the visitor's places have nothing, one tap opens the whole island (and remembers it, like the picker). */
export default function ShowAllPlacesButton({ slugs, label }: ShowAllPlacesButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  return (
    <Button
      className='rounded-full'
      disabled={isPending}
      onClick={() => {
        savePlaces(slugs);
        startTransition(() => router.refresh());
      }}
    >
      {isPending ? <Loader2 className='animate-spin' /> : <MapPin />} {label}
    </Button>
  );
}
