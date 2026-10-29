'use server';

import { z } from 'zod';
import { getSession, isAdmin } from '@/lib/auth-guard';
import { recordConsent } from './listing-payment';
import { publishPaidByAdmin, renewPaidByAdmin } from './publish';

// Server actions are public endpoints: every one checks for an admin itself.
const NOT_ALLOWED = { success: false, message: 'Solo para administradores' } as const;

const idSchema = z.string().uuid();

const paidSchema = z.object({
  plan: z.enum(['normal', 'big']),
  method: z.enum(['bizum', 'cash']),
  amount: z
    .string()
    .regex(/^\d{1,6}([.,]\d{1,2})?$/)
    .transform((value) => Number(value.replace(',', '.')).toFixed(2)),
});

export type ListingPaidInput = z.input<typeof paidSchema>;

/** "Pagado": the fee came by Bizum or in cash; it is booked and the listing goes online. */
export async function markListingPaid(id: string, input: ListingPaidInput) {
  if (!(await isAdmin()) || !idSchema.safeParse(id).success) return NOT_ALLOWED;
  const parsed = paidSchema.safeParse(input);
  if (!parsed.success) return { success: false, message: 'Revisa el importe' };
  const { plan, method, amount } = parsed.data;
  const admin = (await getSession())?.user;
  const outcome = await publishPaidByAdmin(id, plan, { method, amount, recordedBy: admin?.email ?? admin?.name ?? undefined });
  if (outcome === 'no-consent') return { success: false, message: 'Falta su permiso para mostrar su número' };
  if (outcome === 'not-waiting') return { success: false, message: 'Este anuncio ya no está esperando el pago' };
  return { success: true, message: 'Pago apuntado y anuncio online' };
}

const renewalSchema = paidSchema.omit({ plan: true });

export type RenewalPaidInput = z.input<typeof renewalSchema>;

/** "Renovación pagada": the fee for another period came by Bizum or in cash; it is booked and the listing stays online. */
export async function markRenewalPaid(id: string, input: RenewalPaidInput) {
  if (!(await isAdmin()) || !idSchema.safeParse(id).success) return NOT_ALLOWED;
  const parsed = renewalSchema.safeParse(input);
  if (!parsed.success) return { success: false, message: 'Revisa el importe' };
  const admin = (await getSession())?.user;
  const outcome = await renewPaidByAdmin(id, { ...parsed.data, recordedBy: admin?.email ?? admin?.name ?? undefined });
  if (outcome === 'not-renewable') return { success: false, message: 'Este anuncio no se puede renovar, o ya está renovado' };
  return { success: true, message: 'Pago apuntado y anuncio renovado' };
}

/** The person answered "SÍ" on WhatsApp to showing their number (e.g. paying cash without opening their page). */
export async function recordWhatsAppConsent(id: string) {
  if (!(await isAdmin()) || !idSchema.safeParse(id).success) return NOT_ALLOWED;
  const { count } = await recordConsent({ id, status: { in: ['IN_REVIEW', 'AWAITING_PAYMENT'] } }, 'whatsapp-reply');
  return count > 0 ? { success: true, message: 'Permiso apuntado' } : { success: false, message: 'Ya tenía su permiso, o el anuncio ya no está abierto' };
}
