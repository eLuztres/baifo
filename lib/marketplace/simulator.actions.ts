'use server';

import { after } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/db/prisma';
import { isAdmin } from '@/lib/auth-guard';
import type { InboundMessage } from '@/lib/whatsapp-cloud/webhook';
import { handleInbound } from './inbound';
import {
  SIMULATED_ADMIN,
  SIMULATED_MEDIA_PREFIX,
  SIMULATED_SELLER,
  getSimulatedThread,
  recordSimulated,
  resetSimulator,
} from './simulator';

const photoUrlSchema = z.string().refine((value) => {
  if (!URL.canParse(value)) return false;
  const { protocol, hostname } = new URL(value);
  return protocol === 'https:' && (hostname === 'utfs.io' || hostname.endsWith('.ufs.sh'));
});

const simulatedInputSchema = z.object({
  as: z.enum(['seller', 'admin']),
  text: z.string().max(2000).optional(),
  photos: z.array(photoUrlSchema).max(8).optional(),
  button: z.object({ id: z.string().max(256), title: z.string().max(40) }).optional(),
});

export type SimulatedInput = z.input<typeof simulatedInputSchema>;

/** Plays one WhatsApp message from the simulated seller or admin through Baifo's real message handling. */
export async function sendSimulated(input: SimulatedInput) {
  if (!(await isAdmin())) return { success: false };
  const parsed = simulatedInputSchema.safeParse(input);
  if (!parsed.success) return { success: false };
  const { as, text, photos = [], button } = parsed.data;
  const from = as === 'seller' ? SIMULATED_SELLER : SIMULATED_ADMIN;
  const base = { from, profileName: as === 'seller' ? 'Vendedor de prueba' : 'Admin' };

  // WhatsApp sends every photo of an album as its own message, the caption on the first one.
  const messages: InboundMessage[] = [
    ...photos.map((url, index) => ({
      ...base,
      id: `sim-${Date.now()}-${index}`,
      type: 'image' as const,
      mediaId: `${SIMULATED_MEDIA_PREFIX}${url}`,
      text: index === 0 ? text : undefined,
    })),
    ...(photos.length === 0 && text ? [{ ...base, id: `sim-${Date.now()}`, type: 'text' as const, text }] : []),
    ...(button ? [{ ...base, id: `sim-${Date.now()}-b`, type: 'button' as const, buttonId: button.id, text: button.title }] : []),
  ];
  for (const message of messages) {
    await recordSimulated({ waId: from, direction: 'in', text: message.text, image: message.mediaId?.slice(SIMULATED_MEDIA_PREFIX.length) });
  }
  // The AI work can take a minute: it continues after the reply, the page polls for the result.
  after(async () => {
    for (const message of messages) await handleInbound(message).catch((error) => console.error('Simulator message failed', error));
  });
  return { success: true };
}

export interface SimulatorState {
  seller: SimulatedMessageView[];
  admin: SimulatedMessageView[];
  isWorking: boolean;
}

export interface SimulatedMessageView {
  id: string;
  direction: string;
  text: string;
  image: string | null;
  buttons: { id: string; title: string }[];
  createdAt: string;
}

const toView = (message: Awaited<ReturnType<typeof getSimulatedThread>>[number]): SimulatedMessageView => ({
  id: message.id,
  direction: message.direction,
  text: message.text,
  image: message.image,
  buttons: (message.buttons as SimulatedMessageView['buttons'] | null) ?? [],
  createdAt: message.createdAt.toISOString(),
});

export async function getSimulatorState(): Promise<SimulatorState | null> {
  if (!(await isAdmin())) return null;
  const [seller, admin, working] = await Promise.all([
    getSimulatedThread(SIMULATED_SELLER),
    getSimulatedThread(SIMULATED_ADMIN),
    prisma.submission.count({ where: { status: 'PROCESSING', seller: { waId: SIMULATED_SELLER } } }),
  ]);
  return { seller: seller.map(toView), admin: admin.map(toView), isWorking: working > 0 };
}

export async function resetSimulatorAction() {
  if (!(await isAdmin())) return { success: false };
  await resetSimulator();
  return { success: true };
}
