import { EmailService, type EmailUser } from '../email/email-service';

function fakeClient() {
  return {
    emails: { send: jest.fn(async () => ({ data: { id: 'email_1' }, error: null })) },
    batch: {
      send: jest.fn(async (payload: unknown[]) => ({
        data: { data: payload.map((_, i) => ({ id: `batch_${i}` })) },
        error: null,
      })),
    },
  };
}

const silentLogger = { info: jest.fn(), error: jest.fn() };

function createService(overrides: Partial<ConstructorParameters<typeof EmailService>[0]> = {}) {
  const client = fakeClient();
  const service = new EmailService({
    from: 'My Shop <hello@example.com>',
    // The service only uses `emails.send` and `batch.send`.
    client: client as unknown as ConstructorParameters<typeof EmailService>[0]['client'],
    logger: silentLogger,
    ...overrides,
  });
  return { service, client };
}

test('sends one email with a formatted recipient and default sender', async () => {
  const { service, client } = createService();

  const result = await service.send({
    to: { email: 'ana@example.com', name: 'Ana' },
    subject: 'Hello',
    text: 'Hi there',
  });

  expect(result).toEqual({ success: true, id: 'email_1' });
  expect(client.emails.send).toHaveBeenCalledWith(
    expect.objectContaining({
      from: 'My Shop <hello@example.com>',
      to: ['Ana <ana@example.com>'],
      subject: 'Hello',
      text: 'Hi there',
    })
  );
});

test('returns a failure instead of throwing when Resend errors', async () => {
  const { service, client } = createService();
  client.emails.send.mockResolvedValueOnce({
    data: null,
    error: { message: 'Invalid API key' },
  } as never);

  const result = await service.send({ to: 'ana@example.com', subject: 'Hi', text: 'x' });

  expect(result).toEqual({ success: false, error: 'Invalid API key' });
  expect(silentLogger.error).toHaveBeenCalled();
});

test('rejects messages without content or recipient', async () => {
  const { service, client } = createService();

  expect((await service.send({ to: [], subject: 'Hi', text: 'x' })).success).toBe(false);
  expect((await service.send({ to: 'a@example.com', subject: 'Hi' })).success).toBe(false);
  expect(client.emails.send).not.toHaveBeenCalled();
});

test('dry-run mode logs instead of sending when there is no API key', async () => {
  const service = new EmailService({ from: 'x@example.com', logger: silentLogger });

  const result = await service.send({ to: 'ana@example.com', subject: 'Hi', text: 'x' });

  expect(service.isDryRun).toBe(true);
  expect(result).toEqual({ success: true, id: 'dry-run' });
  expect(silentLogger.info).toHaveBeenCalledWith(expect.stringContaining('dry-run'));
});

test('sendToUsers personalises each message and batches in chunks of 100', async () => {
  const { service, client } = createService();
  const users: EmailUser[] = Array.from({ length: 150 }, (_, i) => ({
    email: `user${i}@example.com`,
    name: `User ${i}`,
  }));

  const results = await service.sendToUsers(users, (user) => ({
    subject: 'News',
    text: `Hi ${user.name}`,
  }));

  expect(results).toHaveLength(150);
  expect(results.every((r) => r.success)).toBe(true);
  expect(client.batch.send).toHaveBeenCalledTimes(2);
  const firstBatch = (client.batch.send.mock.calls[0] as unknown[][])[0] as { to: string[]; text: string }[];
  expect(firstBatch).toHaveLength(100);
  expect(firstBatch[3]).toMatchObject({ to: ['User 3 <user3@example.com>'], text: 'Hi User 3' });
});

test('sendToUser looks the user up by id', async () => {
  const findUser = jest.fn(async (id: string) =>
    id === 'u1' ? { email: 'ana@example.com', name: 'Ana' } : null
  );
  const { service, client } = createService({ findUser });

  const ok = await service.sendToUser('u1', (user) => ({ subject: 'Hi', text: `Hi ${user.name}` }));
  const missing = await service.sendToUser('nope', () => ({ subject: 'Hi', text: 'x' }));

  expect(ok.success).toBe(true);
  expect(client.emails.send).toHaveBeenCalledWith(
    expect.objectContaining({ to: ['Ana <ana@example.com>'], text: 'Hi Ana' })
  );
  expect(missing).toEqual({ success: false, error: 'User nope not found' });
});

test('the notification template renders branded HTML', async () => {
  const { createElement } = await import('react');
  // React's renderer directly: @react-email's `render` needs --experimental-vm-modules in Jest.
  const { renderToStaticMarkup } = await import('react-dom/server');
  const { default: NotificationEmail } = await import('../email/templates/notification-email');
  const { getTranslator } = await import('../lib/i18n');
  // The logo comes from the shop's config, so the test follows it instead of a fixed file name.
  const { BRAND } = await import('../lib/brand');

  const html = renderToStaticMarkup(
    createElement(NotificationEmail, {
      heading: 'Your order is on its way',
      name: 'Ana',
      paragraphs: ['It was shipped today.'],
      action: { label: 'View order', url: 'https://example.com/order/1' },
      lang: 'en',
    })
  );

  expect(html).toContain('Your order is on its way');
  expect(html).toContain(getTranslator('en')('WELCOME_GREETING', { name: 'Ana' }));
  expect(html).toContain('https://example.com/order/1');
  expect(html).toContain(BRAND.logo);
});

test.each(['en', 'es', 'de', 'fr', 'it'] as const)(
  'the welcome email renders in %s with the shop name and a shop link',
  async (locale) => {
    const { createElement } = await import('react');
    const { renderToStaticMarkup } = await import('react-dom/server');
    const { default: WelcomeEmail } = await import('../email/templates/welcome-email');
    const { getTranslator } = await import('../lib/i18n');
    const t = getTranslator(locale);

    const html = renderToStaticMarkup(createElement(WelcomeEmail, { name: 'Ana', locale }));

    expect(html).toContain(`lang="${locale}"`);
    const { APP_NAME } = await import('../lib/constants');
    expect(html).toContain(t('WELCOME_HEADING', { shop: APP_NAME }));
    expect(html).toContain(t('WELCOME_CTA'));
    expect(html).toContain('/store');
  }
);

test('uses the default reply-to unless a message sets its own', async () => {
  const { service, client } = createService({ replyTo: 'My Shop <shop@example.com>' });

  await service.send({ to: 'ana@example.com', subject: 'Hi', text: 'x' });
  await service.send({ to: 'ana@example.com', subject: 'Hi', text: 'x', replyTo: 'orders@example.com' });

  expect(client.emails.send).toHaveBeenNthCalledWith(
    1,
    expect.objectContaining({ replyTo: ['My Shop <shop@example.com>'] })
  );
  expect(client.emails.send).toHaveBeenNthCalledWith(
    2,
    expect.objectContaining({ replyTo: ['orders@example.com'] })
  );
});

test('passes inline attachments through, so cid: images show', async () => {
  const { service, client } = createService();
  const attachment = { filename: 'qr.png', content: Buffer.from('png'), contentType: 'image/png', inlineContentId: 'qr' };

  await service.send({ to: 'ana@example.com', subject: 'Hi', html: '<img src="cid:qr">', attachments: [attachment] });

  expect(client.emails.send).toHaveBeenCalledWith(expect.objectContaining({ attachments: [attachment] }));
});
