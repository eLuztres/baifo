import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import WhatsappSimulator from '@/components/marketplace/whatsapp-simulator';
import { requireAdmin } from '@/lib/auth-guard';
import { getLocale } from '@/lib/i18n-server';
import { adminTexts } from '@/lib/marketplace/admin-texts';
import { getSimulatorState } from '@/lib/marketplace/simulator.actions';

export const metadata: Metadata = { title: 'Simulador de WhatsApp' };

// The simulated messages start the same AI work as real ones, inside the action's time.
export const maxDuration = 300;

export default async function SimulatorPage() {
  await requireAdmin();
  const [state, locale] = await Promise.all([getSimulatorState(), getLocale()]);
  if (!state) redirect('/admin/unauthorized');
  const texts = adminTexts(locale);
  return (
    <div className='space-y-6'>
      <h1 className='h2-bold'>{texts.simulator}</h1>
      <WhatsappSimulator initial={state} texts={texts} />
    </div>
  );
}
