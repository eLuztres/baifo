import { createPicture, enhancePhoto } from '@/lib/marketplace/ai';
import { editImage, generateImage } from '@/lib/studio/openai.mjs';

jest.mock('@/db/prisma', () => ({ prisma: {} }));
jest.mock('@/lib/studio/openai.mjs', () => ({ draftText: jest.fn(), editImage: jest.fn(), generateImage: jest.fn(), onUsage: jest.fn() }));
jest.mock('@/lib/studio/prompts.mjs', () => ({ seedOf: () => 0 }));

const promptOf = (mock: unknown) => (mock as jest.Mock).mock.calls[0][0] as string;
const TEXT = { title: 'Bicicleta', description: 'Roja, de paseo.' };

describe("the admin's own words for the AI picture", () => {
  beforeEach(() => jest.clearAllMocks());

  it('leaves the prompt as it always was without them', async () => {
    await createPicture(TEXT, 'PRODUCT', '  ');
    await enhancePhoto(Buffer.from('photo'), 'PRODUCT', null);

    expect(promptOf(generateImage)).not.toContain('on top of that');
    expect(promptOf(editImage)).not.toContain('on top of that');
  });

  it("puts them after the shop's prompt, which still keeps the item identical", async () => {
    await enhancePhoto(Buffer.from('photo'), 'PRODUCT', 'on a wooden table at sunset');

    const prompt = promptOf(editImage);
    expect(prompt.indexOf('The item must stay IDENTICAL')).toBeLessThan(prompt.indexOf('on a wooden table at sunset'));
    expect(prompt).toMatch(/Whatever they ask, the item and every person stay identical/);
  });

  it('adds them to a picture made from words alone', async () => {
    await createPicture(TEXT, 'EVENT', 'a beach at night');

    expect(promptOf(generateImage)).toMatch(/never a recognisable face[\s\S]*a beach at night/);
  });
});
