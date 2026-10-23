import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/components/i18n-provider';
import { useToast } from '@/hooks/use-toast';

export interface RegenerationProgress {
  done: number;
  count: number;
  failed: number;
}

interface RegenerationResult {
  success: boolean;
}

const regenerateRing = (productId: string): Promise<RegenerationResult> =>
  fetch('/api/studio/regenerate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ productId }),
  })
    .then((response) => response.json())
    .catch(() => ({ success: false }));

/** Redoes the AI photos of rings in their category's scene, one ring after another, with progress. */
export function useRingRegeneration() {
  const [progress, setProgress] = useState<RegenerationProgress | null>(null);
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useI18n();

  // One ring at a time: each takes a minute or two of AI work, and the store fills in ring by ring.
  const regenerate = async (ringIds: string[]) => {
    let failed = 0;
    setProgress({ done: 0, count: ringIds.length, failed });
    for (const [index, productId] of ringIds.entries()) {
      if (!(await regenerateRing(productId)).success) failed++;
      setProgress({ done: index + 1, count: ringIds.length, failed });
      router.refresh();
    }
    setProgress(null);
    toast(
      failed > 0
        ? { variant: 'destructive', description: t('CATEGORY_REGENERATE_FAILED', { count: failed }) }
        : { description: t('CATEGORY_REGENERATE_DONE', { count: ringIds.length }) }
    );
  };

  return { progress, regenerate };
}
