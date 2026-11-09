import { listingLogQuery, runAsListingActor } from '@/lib/listing-log';

const mockGetSession = jest.fn();
const mockHeaders = jest.fn();
jest.mock('@/lib/auth-guard', () => ({ getSession: () => mockGetSession() }));
jest.mock('next/headers', () => ({ headers: () => mockHeaders() }));
jest.mock('next/server', () => ({ after: jest.fn() }));

type Row = Record<string, unknown> & { id: string; updatedAt: Date };

/** A tiny stand-in for the database: rows by id, what findMany sees, and the events written. */
function fakeDatabase(initial: Row[] = []) {
  const rows = new Map(initial.map((row) => [row.id, row]));
  const events: Record<string, unknown>[] = [];
  // Rows a transaction changed but hasn't committed: readers outside it still see the old ones.
  const pending = new Map<string, Row | null>();
  const visible = (id: string) => rows.get(id);
  const client = {
    submission: {
      findMany: jest.fn(async ({ where }: { where?: { id?: string | { in: string[] } } }) => {
        const ids = typeof where?.id === 'string' ? [where.id] : where?.id?.in ?? [...rows.keys()];
        return ids.map(visible).filter(Boolean);
      }),
    },
    listingEvent: {
      create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => events.push(data)),
      findFirst: jest.fn(async ({ where }: { where: { submissionId: string } }) => events.findLast((event) => event.submissionId === where.submissionId) ?? null),
    },
  };
  Object.assign(client.submission, { findUnique: jest.fn(async ({ where }: { where: { id: string } }) => visible(where.id) ?? null) });
  return {
    client,
    events,
    write: (row: Row) => rows.set(row.id, row),
    remove: (id: string) => rows.delete(id),
    stage: (id: string, row: Row | null) => pending.set(id, row),
    commit: () => {
      for (const [id, row] of pending) {
        if (row) rows.set(id, row);
        else rows.delete(id);
      }
      pending.clear();
    },
  };
}

const at = (minute: number) => new Date(Date.UTC(2026, 10, 6, 10, minute));
const listing = (fields: Partial<Row> = {}): Row => ({
  id: 'listing-1',
  title: 'Cerámica de Pedro',
  status: 'COLLECTING',
  price: '15.00',
  images: ['https://x.ufs.sh/f/cup.jpg'],
  paidAt: null,
  payToken: 'secret-token',
  updatedAt: at(0),
  createdAt: at(0),
  tags: [{ names: { es: 'Cerámica' } }],
  place: null,
  mercadillos: [],
  scout: null,
  seller: { waId: '34600111222' },
  ...fields,
});

/** Runs one write through the log, the way the database client does, and waits for its event. */
async function logged(database: ReturnType<typeof fakeDatabase>, operation: string, args: unknown, apply: () => unknown) {
  const handler = listingLogQuery(database.client as never);
  const result = await handler({ operation, args, query: async () => apply() });
  await flush();
  return result;
}

// The event is written in the background, after the write returned.
const flush = () => new Promise((resolve) => setTimeout(resolve, 20));

beforeEach(() => {
  jest.useRealTimers();
  mockGetSession.mockResolvedValue({ user: { id: 'admin-1', name: 'Jose', role: 'admin' } });
  mockHeaders.mockResolvedValue(new Headers());
});

describe('listing log', () => {
  it('writes "created" with the whole listing, by the signed-in admin', async () => {
    const database = fakeDatabase();
    const created = listing();
    await logged(database, 'create', { data: {} }, () => (database.write(created), created));

    expect(database.events).toEqual([
      expect.objectContaining({ submissionId: 'listing-1', action: 'created', title: 'Cerámica de Pedro', actorType: 'admin', actorName: 'Jose', actorId: 'admin-1', changes: {} }),
    ]);
    const snapshot = database.events[0].snapshot as Record<string, unknown>;
    expect(snapshot).toMatchObject({ title: 'Cerámica de Pedro', price: '15.00', images: ['https://x.ufs.sh/f/cup.jpg'], tags: [{ es: 'Cerámica' }], sellerPhone: '34600111222' });
  });

  it('keeps the secret link part and bookkeeping out of the snapshot', async () => {
    const database = fakeDatabase();
    const created = listing();
    await logged(database, 'create', { data: {} }, () => (database.write(created), created));

    const snapshot = database.events[0].snapshot as Record<string, unknown>;
    expect(snapshot).not.toHaveProperty('payToken');
    expect(snapshot).not.toHaveProperty('updatedAt');
  });

  it('writes "edited" with only what changed, before and after, and the whole listing after', async () => {
    const database = fakeDatabase([listing()]);
    await logged(database, 'update', { where: { id: 'listing-1' } }, () =>
      database.write(listing({ price: '18.00', images: ['https://x.ufs.sh/f/cup.jpg', 'https://x.ufs.sh/f/bowl.jpg'], updatedAt: at(7) }))
    );

    expect(database.events).toHaveLength(1);
    expect(database.events[0]).toMatchObject({
      action: 'edited',
      changes: { price: ['15.00', '18.00'], images: [['https://x.ufs.sh/f/cup.jpg'], ['https://x.ufs.sh/f/cup.jpg', 'https://x.ufs.sh/f/bowl.jpg']] },
      snapshot: expect.objectContaining({ price: '18.00', title: 'Cerámica de Pedro' }),
    });
  });

  it('names a status change, a payment and a new señalador as their own points', async () => {
    const database = fakeDatabase([listing()]);
    await logged(database, 'update', { where: { id: 'listing-1' } }, () => database.write(listing({ paidAt: at(15), updatedAt: at(15) })));
    await logged(database, 'update', { where: { id: 'listing-1' } }, () => database.write(listing({ paidAt: at(15), status: 'LIVE', updatedAt: at(16) })));
    await logged(database, 'update', { where: { id: 'listing-1' } }, () =>
      database.write(listing({ paidAt: at(15), status: 'LIVE', scoutId: 'scout-ana', scout: { name: 'Ana' }, updatedAt: at(17) }))
    );

    expect(database.events.map((event) => event.action)).toEqual(['paid', 'status', 'scout']);
    expect(database.events[1].changes).toEqual({ status: ['COLLECTING', 'LIVE'] });
    expect(database.events[2].changes).toMatchObject({ scout: [null, 'Ana'] });
  });

  it('never writes the same change twice when one save is several writes', async () => {
    const database = fakeDatabase([listing()]);
    const handler = listingLogQuery(database.client as never);
    // Like the editor's save: the etiquetas first, then the fields, both before the first recording reads.
    await handler({ operation: 'update', args: { where: { id: 'listing-1' } }, query: async () => database.write(listing({ tags: [{ names: { es: 'Barro' } }], updatedAt: at(20) })) });
    await handler({
      operation: 'update',
      args: { where: { id: 'listing-1' } },
      query: async () => database.write(listing({ tags: [{ names: { es: 'Barro' } }], scoutId: 'scout-ana', scout: { name: 'Ana' }, updatedAt: at(21) })),
    });
    await flush();

    // However the reads fall between the writes, each change is written once.
    const changed = database.events.flatMap((event) => Object.keys(event.changes as object).filter((key) => !key.endsWith('Id')));
    expect(changed.sort()).toEqual(['scout', 'tags']);
    expect(database.events.at(-1)?.snapshot).toMatchObject({ tags: [{ es: 'Barro' }], scout: 'Ana' });
  });

  it('starts from the last point written, not from an older read', async () => {
    const database = fakeDatabase([listing()]);
    await logged(database, 'update', { where: { id: 'listing-1' } }, () => database.write(listing({ price: '18.00', updatedAt: at(7) })));
    await logged(database, 'update', { where: { id: 'listing-1' } }, () => database.write(listing({ price: '20.00', updatedAt: at(8) })));

    expect(database.events.map((event) => event.changes)).toEqual([{ price: ['15.00', '18.00'] }, { price: ['18.00', '20.00'] }]);
  });

  it('writes no point for a change of ids only (a new productId on the way online)', async () => {
    const database = fakeDatabase([listing({ status: 'LIVE', productId: 'product-1' })]);
    await logged(database, 'update', { where: { id: 'listing-1' } }, () => database.write(listing({ status: 'LIVE', productId: 'product-2', updatedAt: at(30) })));
    expect(database.events).toEqual([]);

    await logged(database, 'update', { where: { id: 'listing-1' } }, () => database.write(listing({ status: 'SOLD', productId: 'product-2', updatedAt: at(31) })));
    expect(database.events).toEqual([expect.objectContaining({ action: 'status', changes: { status: ['LIVE', 'SOLD'] } })]);
  });

  it('writes nothing when a save changed nothing that shows', async () => {
    const database = fakeDatabase([listing()]);
    await logged(database, 'update', { where: { id: 'listing-1' } }, () => database.write(listing({ attempts: 3, lastError: 'AI busy', updatedAt: at(3) })));

    expect(database.events).toEqual([]);
  });

  it('writes "deleted" with the listing as it was, so its history outlives it', async () => {
    const database = fakeDatabase([listing({ status: 'LIVE', price: '18.00' })]);
    await logged(database, 'delete', { where: { id: 'listing-1' } }, () => database.remove('listing-1'));

    expect(database.events).toEqual([expect.objectContaining({ action: 'deleted', title: 'Cerámica de Pedro', snapshot: expect.objectContaining({ status: 'LIVE', price: '18.00' }) })]);
  });

  it('writes one event per listing an updateMany or deleteMany changed', async () => {
    const database = fakeDatabase([listing(), listing({ id: 'listing-2', title: 'Tabla de surf' })]);
    await logged(database, 'updateMany', { where: {} }, () => {
      database.write(listing({ status: 'EXPIRED', updatedAt: at(9) }));
      database.write(listing({ id: 'listing-2', title: 'Tabla de surf', status: 'EXPIRED', updatedAt: at(9) }));
    });
    await logged(database, 'deleteMany', { where: {} }, () => {
      database.remove('listing-1');
      database.remove('listing-2');
    });

    expect(database.events.map((event) => [event.submissionId, event.action])).toEqual([
      ['listing-1', 'status'],
      ['listing-2', 'status'],
      ['listing-1', 'deleted'],
      ['listing-2', 'deleted'],
    ]);
  });

  it('waits for a transaction to commit before writing what changed', async () => {
    const database = fakeDatabase([listing()]);
    const handler = listingLogQuery(database.client as never);
    await handler({ operation: 'update', args: { where: { id: 'listing-1' } }, query: async () => database.stage('listing-1', listing({ status: 'LIVE', updatedAt: at(16) })) });
    await flush();
    expect(database.events).toEqual([]);

    database.commit();
    await new Promise((resolve) => setTimeout(resolve, 400));
    expect(database.events).toEqual([expect.objectContaining({ action: 'status', changes: { status: ['COLLECTING', 'LIVE'] } })]);
  });

  it('writes nothing for a transaction that was rolled back', async () => {
    jest.useFakeTimers();
    const database = fakeDatabase([listing()]);
    const handler = listingLogQuery(database.client as never);
    await handler({ operation: 'update', args: { where: { id: 'listing-1' } }, query: async () => database.stage('listing-1', listing({ status: 'LIVE', updatedAt: at(16) })) });
    // Never committed: it gives up after a few seconds.
    await jest.advanceTimersByTimeAsync(10_000);

    expect(database.events).toEqual([]);
    expect(database.client.submission.findMany.mock.calls.length).toBeGreaterThan(2);
  });

  it('never breaks the write when the log fails', async () => {
    const database = fakeDatabase([listing()]);
    database.client.listingEvent.create.mockRejectedValue(new Error('log table gone'));
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    const result = await logged(database, 'update', { where: { id: 'listing-1' } }, () => (database.write(listing({ price: '20.00', updatedAt: at(5) })), 'saved'));

    expect(result).toBe('saved');
    expect(consoleError).toHaveBeenCalledWith('Listing log failed', expect.any(Error));
    consoleError.mockRestore();
  });

  it('leaves reads alone', async () => {
    const database = fakeDatabase([listing()]);
    const query = jest.fn(async () => 'rows');
    await listingLogQuery(database.client as never)({ operation: 'findMany', args: {}, query });

    expect(query).toHaveBeenCalled();
    expect(database.client.submission.findMany).not.toHaveBeenCalled();
  });

  describe('who did it', () => {
    const editOnce = async () => {
      const database = fakeDatabase([listing()]);
      await logged(database, 'update', { where: { id: 'listing-1' } }, () => database.write(listing({ price: '19.00', updatedAt: at(4) })));
      return database.events[0];
    };

    it('is the person when they change it on their own /publicar page', async () => {
      mockGetSession.mockResolvedValue(null);
      mockHeaders.mockResolvedValue(new Headers({ referer: 'https://baifo.es/publicar/abc-123' }));

      expect(await editOnce()).toMatchObject({ actorType: 'owner', actorName: null });
    });

    it('is the one set around the work, e.g. WhatsApp', async () => {
      const event = await runAsListingActor({ type: 'whatsapp' }, editOnce);

      expect(event).toMatchObject({ actorType: 'whatsapp' });
      expect(mockGetSession).not.toHaveBeenCalled();
    });

    it('is the shop itself outside a request (AI, daily jobs)', async () => {
      mockGetSession.mockRejectedValue(new Error('headers() outside a request'));

      expect(await editOnce()).toMatchObject({ actorType: 'system' });
    });
  });
});
