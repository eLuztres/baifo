import type { Prisma } from '@prisma/client';
import { prisma } from '@/db/prisma';
import type { ReplyButton } from '@/lib/whatsapp-cloud/client';

// Spanish numbers never start with 34000, so these can't belong to a real phone.
export const SIMULATED_PREFIX = '34000';

/** The simulated seller and admin of /admin/simulator. */
export const SIMULATED_SELLER = '34000000001';
export const SIMULATED_ADMIN = '34000000000';

export const isSimulatedNumber = (waId: string) => waId.startsWith(SIMULATED_PREFIX);

/** A photo in the simulator is already uploaded, so its "media id" is the URL itself. */
export const SIMULATED_MEDIA_PREFIX = 'url:';

export interface SimulatedLine {
  waId: string;
  direction: 'in' | 'out';
  text?: string;
  image?: string;
  buttons?: ReplyButton[];
}

export async function recordSimulated({ waId, direction, text = '', image, buttons }: SimulatedLine) {
  await prisma.simulatedMessage.create({
    data: { waId, direction, text, image, buttons: buttons as unknown as Prisma.InputJsonValue },
  });
}

/** A Cloud API message body as the simulator shows it: text, picture and buttons. */
export function toSimulatedLine(to: string, message: Record<string, unknown>): SimulatedLine {
  const line: SimulatedLine = { waId: to, direction: 'out' };
  if (message.type === 'text') line.text = (message.text as { body: string }).body;
  if (message.type === 'image') {
    const image = message.image as { link: string; caption?: string };
    Object.assign(line, { image: image.link, text: image.caption });
  }
  if (message.type === 'interactive') {
    const interactive = message.interactive as {
      header?: { image: { link: string } };
      body: { text: string };
      action: { buttons: { reply: ReplyButton }[] };
    };
    Object.assign(line, {
      text: interactive.body.text,
      image: interactive.header?.image.link,
      buttons: interactive.action.buttons.map((button) => button.reply),
    });
  }
  if (message.type === 'template') line.text = `[template ${(message.template as { name: string }).name}]`;
  return line;
}

export function getSimulatedThread(waId: string) {
  return prisma.simulatedMessage.findMany({ where: { waId }, orderBy: { createdAt: 'asc' } });
}

/** Clears the simulator: its messages, its seller and everything the seller listed. */
export async function resetSimulator() {
  const seller = await prisma.seller.findUnique({ where: { waId: SIMULATED_SELLER }, include: { submissions: true } });
  const productIds = seller?.submissions.flatMap((submission) => (submission.productId ? [submission.productId] : [])) ?? [];
  await prisma.$transaction([
    prisma.simulatedMessage.deleteMany({ where: { waId: { startsWith: SIMULATED_PREFIX } } }),
    prisma.product.deleteMany({ where: { id: { in: productIds } } }),
    prisma.seller.deleteMany({ where: { waId: SIMULATED_SELLER } }),
  ]);
}
