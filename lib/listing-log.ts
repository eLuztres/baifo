import { AsyncLocalStorage } from 'node:async_hooks';
import type { Prisma, PrismaClient } from '@prisma/client';

export type ListingActorType = 'admin' | 'owner' | 'whatsapp' | 'system';

export interface ListingActor {
  type: ListingActorType;
  name?: string;
  id?: string;
}

export const LISTING_EVENT_ACTIONS = ['created', 'edited', 'status', 'paid', 'scout', 'deleted'] as const;
export type ListingEventAction = (typeof LISTING_EVENT_ACTIONS)[number];

const actorStore = new AsyncLocalStorage<ListingActor>();

/** Runs `work` with every listing change in it written down as done by `actor` (WhatsApp webhook, cron).
 * `work` must await its queries: a Prisma query only starts when awaited, which must happen inside. */
export const runAsListingActor = <T>(actor: ListingActor, work: () => T) => actorStore.run(actor, work);

/** Who is changing a listing: the one set around the work, else the signed-in admin, else the owner on their /publicar page. */
async function currentActor(): Promise<ListingActor> {
  const stored = actorStore.getStore();
  if (stored) return stored;
  try {
    // Imported here: auth imports the database client, which imports this file.
    const { getSession } = await import('@/lib/auth-guard');
    const session = await getSession();
    if (session?.user) return { type: session.user.role === 'admin' ? 'admin' : 'owner', name: session.user.name, id: session.user.id };
    const { headers } = await import('next/headers');
    if ((await headers()).get('referer')?.includes('/publicar/')) return { type: 'owner' };
  } catch {
    // Outside a request (scripts, after the response): no one to ask.
  }
  return { type: 'system' };
}

// The secret link part and bookkeeping that changes on every write stay out; textVersions repeats the texts.
const HIDDEN_FIELDS = new Set(['payToken', 'updatedAt', 'attempts', 'lastError', 'mediaIds', 'textVersions', 'remindedAt']);

const SNAPSHOT_INCLUDE = {
  tags: { select: { names: true } },
  place: { select: { slug: true } },
  mercadillo: { select: { slug: true } },
  scout: { select: { name: true } },
  seller: { select: { waId: true } },
} satisfies Prisma.SubmissionInclude;

type SnapshotRow = Prisma.SubmissionGetPayload<{ include: typeof SNAPSHOT_INCLUDE }>;
type Snapshot = Record<string, unknown>;

const plain = (value: unknown): unknown =>
  value instanceof Date ? value.toISOString() : value !== null && typeof value === 'object' && 'toFixed' in value ? String(value) : value;

/** The whole listing as plain JSON, its relations as names. */
function toSnapshot(row: SnapshotRow): Snapshot {
  const { tags, place, mercadillo, scout, seller, ...fields } = row;
  const snapshot: Snapshot = Object.fromEntries(Object.entries(fields).filter(([key]) => !HIDDEN_FIELDS.has(key)).map(([key, value]) => [key, plain(value)]));
  return {
    ...snapshot,
    tags: tags.map((tag) => tag.names),
    place: place?.slug ?? null,
    mercadillo: mercadillo?.slug ?? null,
    scout: scout?.name ?? null,
    sellerPhone: seller.waId,
  };
}

function diff(before: Snapshot, after: Snapshot) {
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  return Object.fromEntries(
    [...keys].filter((key) => JSON.stringify(before[key]) !== JSON.stringify(after[key])).map((key) => [key, [before[key] ?? null, after[key] ?? null]])
  );
}

/** What kind of point in the listing's life this is; ids only (scoutId) say the same as their names. */
function actionOf(changes: Record<string, unknown>): ListingEventAction {
  if ('status' in changes) return 'status';
  if ('paidAt' in changes) return 'paid';
  const keys = Object.keys(changes).filter((key) => !key.endsWith('Id'));
  return keys.length === 1 && keys[0] === 'scout' ? 'scout' : 'edited';
}

const WRITES = new Set(['create', 'update', 'upsert', 'delete', 'updateMany', 'deleteMany']);
const RETRIES = 20;
const RETRY_MS = 250;
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// One recording at a time per listing, so two writes of one save compare against each other, not both against the start.
const queues = new Map<string, Promise<unknown>>();
function inOrder(id: string, work: () => Promise<unknown>) {
  const next = (queues.get(id) ?? Promise.resolve()).then(work, work);
  queues.set(id, next);
  const forget = () => queues.get(id) === next && queues.delete(id);
  next.then(forget, forget);
  return next;
}

/** Waits for a transaction around the write to commit; a rolled back one leaves nothing. */
async function waitForCommit(client: PrismaClient, before: SnapshotRow[], ids: string[], isDelete: boolean) {
  const beforeById = new Map(before.map((row) => [row.id, row]));
  for (let attempt = 0; attempt < RETRIES; attempt++) {
    const rows = await client.submission.findMany({ where: { id: { in: ids } }, select: { id: true, updatedAt: true } });
    const isCommitted = isDelete
      ? rows.length === 0
      : ids.every((id) => {
          const row = rows.find((candidate) => candidate.id === id);
          const old = beforeById.get(id);
          return row && (!old || row.updatedAt.getTime() !== old.updatedAt.getTime());
        });
    if (isCommitted) return true;
    await wait(RETRY_MS);
  }
  return false;
}

/** One point in the listing's life: what changed since the last one written down (or since before the write). */
async function recordListing(client: PrismaClient, actor: ListingActor, id: string, old: SnapshotRow | undefined) {
  const [row, last] = await Promise.all([
    client.submission.findUnique({ where: { id }, include: SNAPSHOT_INCLUDE }),
    client.listingEvent.findFirst({ where: { submissionId: id }, orderBy: { createdAt: 'desc' }, select: { action: true, snapshot: true } }),
  ]);
  const event = (() => {
    if (!row) return last?.action === 'deleted' || !old ? null : { action: 'deleted', title: old.title, snapshot: toSnapshot(old), changes: {} };
    const snapshot = toSnapshot(row);
    if (!old && !last) return { action: 'created', title: row.title, snapshot, changes: {} };
    const changes = diff((last?.snapshot as Snapshot | undefined) ?? toSnapshot(old!), snapshot);
    // Only ids (e.g. a new productId on the way online): it shows with the next real change.
    return Object.keys(changes).every((key) => key.endsWith('Id')) ? null : { action: actionOf(changes), title: row.title, snapshot, changes };
  })();
  if (!event) return;
  await client.listingEvent.create({
    data: {
      submissionId: id,
      ...event,
      snapshot: event.snapshot as Prisma.InputJsonValue,
      changes: event.changes as Prisma.InputJsonValue,
      actorType: actor.type,
      actorName: actor.name ?? null,
      actorId: actor.id ?? null,
    },
  });
}

/** Writes one event per listing the write changed, once it is committed. */
async function recordWrite(client: PrismaClient, actor: ListingActor, before: SnapshotRow[], ids: string[], isDelete: boolean) {
  if (!(await waitForCommit(client, before, ids, isDelete))) return;
  const beforeById = new Map(before.map((row) => [row.id, row]));
  await Promise.all(ids.map((id) => inOrder(id, () => recordListing(client, actor, id, beforeById.get(id)))));
}

/** Keeps the history of every listing: each create, change and delete of a Submission, whoever makes it. */
export const listingLogQuery =
  (client: PrismaClient) =>
  async ({ operation, args, query }: { operation: string; args: unknown; query: (args: unknown) => Promise<unknown> }) => {
    if (!WRITES.has(operation)) return query(args);
    const where = (args as { where?: Prisma.SubmissionWhereInput }).where;
    const actor = await currentActor();
    const before = operation === 'create' ? [] : await client.submission.findMany({ where, include: SNAPSHOT_INCLUDE }).catch(() => []);
    const result = await query(args);
    const createdId = (operation === 'create' || operation === 'upsert') && result && typeof result === 'object' && 'id' in result ? String(result.id) : null;
    const ids = [...new Set([...before.map((row) => row.id), ...(createdId ? [createdId] : [])])];
    // Not awaited: inside a transaction the change is only visible once it commits, after this returns.
    if (ids.length > 0) {
      const recording = recordWrite(client, actor, before, ids, operation.startsWith('delete')).catch((error) => console.error('Listing log failed', error));
      keepAlive(recording);
    }
    return result;
  };

/** Lets the response go out without cutting the recording short. */
function keepAlive(promise: Promise<unknown>) {
  import('next/server')
    .then(({ after }) => after(() => promise))
    .catch(() => {});
}
