'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { MercadilloIcon } from '@/components/shared/mercadillo-row';
import { openPartnerPanel } from '@/lib/actions/partner.actions';
import { PARTNER_PANEL_PATH } from '@/lib/partner-paths';

interface OpenPanelProps {
  token: string;
  name: string;
  icon: string | null;
}

/** Opens the panel in this browser and moves on to it, so the secret leaves the address bar. */
export default function OpenPanel({ token, name, icon }: OpenPanelProps) {
  const router = useRouter();
  // Strict mode runs effects twice: open it once.
  const isOpening = useRef(false);

  useEffect(() => {
    if (isOpening.current) return;
    isOpening.current = true;
    // Whatever happens, the panel says how it went (an old link: that it no longer works).
    openPartnerPanel(token)
      .catch(() => undefined)
      .finally(() => {
        router.replace(PARTNER_PANEL_PATH);
        router.refresh();
      });
  }, [token, router]);

  return (
    <div className='flex flex-col items-center gap-4 py-16 text-center'>
      <MercadilloIcon src={icon} sizes='6rem' className='size-24 shadow-xl shadow-primary/20' />
      {name && <p className='font-display text-3xl'>{name}</p>}
      <Loader2 className='size-6 animate-spin text-primary' aria-hidden />
    </div>
  );
}
