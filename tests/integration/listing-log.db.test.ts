/**
 * @jest-environment node
 *
 * The listing history against a real Postgres: the writes the app makes (alone, in batch and
 * interactive transactions, rolled back) still work, and each leaves the right point in the history.
 * Runs only with LISTING_LOG_DB=1 (it writes to the database in .env): `LISTING_LOG_DB=1 npx jest tests/integration`.
 */
import { loadEnvConfig } from '@next/env';
import { prisma } from '@/db/prisma';
import { runAsListingActor } from '@/lib/listing-log';

// The client connects on its first query, so a skipped run never opens one.
loadEnvConfig(process.cwd());

const run = process.env.LISTING_LOG_DB === '1' ? describe : describe.skip;
const TEST_PHONE = '990000000001';
const ACTOR = { type: 'admin' as const, name: 'Integration test' };

run('listing history on the real database', () => {
  // Awaited inside: a Prisma query only starts when awaited, and must start inside the actor's scope.
  const asAdmin = <T,>(work: () => Promise<T>) => runAsListingActor(ACTOR, async () => await work());
  let sellerId = '';

  const eventsOf = (submissionId: string) => prisma.listingEvent.findMany({ where: { submissionId }, orderBy: { createdAt: 'asc' } });
  /** The history is written after the write returns: waits until it has `count` points. */
  async function waitForEvents(submissionId: string, count: number) {
    for (let attempt = 0; attempt < 60; attempt++) {
      const events = await eventsOf(submissionId);
      if (events.length >= count) return events;
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
    return eventsOf(submissionId);
  }
  const newListing = (title: string) =>
    asAdmin(() =>
      prisma.submission.create({
        data: { sellerId, title, description: 'Prueba', images: ['https://example.ufs.sh/f/a.jpg', 'https://example.ufs.sh/f/b.jpg'] },
      })
    );

  beforeAll(async () => {
    const seller = await prisma.seller.upsert({ where: { waId: TEST_PHONE }, create: { waId: TEST_PHONE }, update: {} });
    sellerId = seller.id;
  });

  afterAll(async () => {
    const listings = await prisma.submission.findMany({ where: { sellerId }, select: { id: true } });
    const ids = listings.map((listing) => listing.id);
    // Lets the last recordings finish before their rows go.
    await new Promise((resolve) => setTimeout(resolve, 1500));
    await prisma.submission.deleteMany({ where: { sellerId } });
    await new Promise((resolve) => setTimeout(resolve, 1500));
    const events = await prisma.listingEvent.findMany({ where: { actorName: ACTOR.name }, select: { submissionId: true } });
    await prisma.listingEvent.deleteMany({ where: { submissionId: { in: [...ids, ...events.map((event) => event.submissionId)] } } });
    await prisma.seller.delete({ where: { id: sellerId } });
    await prisma.$disconnect();
  });

  it('writes down a new listing with its pictures, by who made it', async () => {
    const listing = await newListing('Silla de prueba');

    const [created] = await waitForEvents(listing.id, 1);
    expect(created).toMatchObject({ action: 'created', title: 'Silla de prueba', actorType: 'admin', actorName: ACTOR.name });
    expect((created.snapshot as { images: string[] }).images).toEqual(['https://example.ufs.sh/f/a.jpg', 'https://example.ufs.sh/f/b.jpg']);
  });

  it('keeps the pictures when the text changes, and notes what changed', async () => {
    const listing = await newListing('Mesa de prueba');
    await waitForEvents(listing.id, 1);

    await asAdmin(() => prisma.submission.update({ where: { id: listing.id }, data: { title: 'Mesa de madera' } }));

    const events = await waitForEvents(listing.id, 2);
    expect(events[1]).toMatchObject({ action: 'edited', changes: { title: ['Mesa de prueba', 'Mesa de madera'] } });
    const saved = await prisma.submission.findUniqueOrThrow({ where: { id: listing.id } });
    expect(saved.images).toEqual(listing.images);
  });

  it('works inside a batch transaction ("1 mes más")', async () => {
    const listing = await newListing('Lámpara de prueba');
    await waitForEvents(listing.id, 1);
    const expiresAt = new Date('2030-01-31T23:59:00Z');

    await asAdmin(() => prisma.$transaction([prisma.submission.update({ where: { id: listing.id }, data: { expiresAt, remindedAt: null } })]));

    expect((await prisma.submission.findUniqueOrThrow({ where: { id: listing.id } })).expiresAt).toEqual(expiresAt);
    const events = await waitForEvents(listing.id, 2);
    expect(events[1].action).toBe('edited');
    expect(Object.keys(events[1].changes as object)).toEqual(['expiresAt']);
  });

  it('works inside an interactive transaction (going online)', async () => {
    const listing = await newListing('Bici de prueba');
    await waitForEvents(listing.id, 1);

    await asAdmin(() =>
      prisma.$transaction(async (tx) => {
        await tx.submission.updateMany({ where: { id: listing.id, status: 'COLLECTING' }, data: { status: 'LIVE' } });
      })
    );

    expect((await prisma.submission.findUniqueOrThrow({ where: { id: listing.id } })).status).toBe('LIVE');
    const events = await waitForEvents(listing.id, 2);
    expect(events[1]).toMatchObject({ action: 'status', changes: { status: ['COLLECTING', 'LIVE'] } });
  });

  it('leaves no point for a change that was rolled back, and the listing as it was', async () => {
    const listing = await newListing('Sofá de prueba');
    await waitForEvents(listing.id, 1);

    await expect(
      asAdmin(() =>
        prisma.$transaction(async (tx) => {
          await tx.submission.update({ where: { id: listing.id }, data: { title: 'No debe quedar' } });
          throw new Error('rolled back');
        })
      )
    ).rejects.toThrow('rolled back');

    // Longer than the recording waits for a commit (20 × 250 ms).
    await new Promise((resolve) => setTimeout(resolve, 6000));
    expect((await prisma.submission.findUniqueOrThrow({ where: { id: listing.id } })).title).toBe('Sofá de prueba');
    expect(await eventsOf(listing.id)).toHaveLength(1);
  }, 15_000);

  it('keeps the history of a listing deleted in a batch transaction', async () => {
    const listing = await newListing('Espejo de prueba');
    await waitForEvents(listing.id, 1);

    await asAdmin(() => prisma.$transaction([prisma.submission.delete({ where: { id: listing.id } })]));

    expect(await prisma.submission.findUnique({ where: { id: listing.id } })).toBeNull();
    const events = await waitForEvents(listing.id, 2);
    expect(events[1]).toMatchObject({ action: 'deleted', title: 'Espejo de prueba' });
    expect((events[1].snapshot as { images: string[] }).images).toEqual(listing.images);
  });

  it('a señalador who is deleted leaves their listings, without them', async () => {
    const scout = await prisma.scout.create({ data: { name: 'Señalador de prueba', code: `prueba-${Date.now()}` } });
    const listing = await newListing('Cuadro de prueba');
    await asAdmin(() => prisma.submission.update({ where: { id: listing.id }, data: { scoutId: scout.id } }));

    await prisma.scout.delete({ where: { id: scout.id } });

    const saved = await prisma.submission.findUniqueOrThrow({ where: { id: listing.id } });
    expect(saved.scoutId).toBeNull();
    expect(saved.images).toEqual(listing.images);
  });

  it('does not slow a save down noticeably', async () => {
    const listing = await newListing('Reloj de prueba');
    await waitForEvents(listing.id, 1);

    const start = Date.now();
    await asAdmin(() => prisma.submission.update({ where: { id: listing.id }, data: { description: 'Más rápido' } }));
    expect(Date.now() - start).toBeLessThan(1500);
  });
});
