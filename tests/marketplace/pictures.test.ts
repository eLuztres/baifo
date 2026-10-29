import { isAiPicture, pictureCounterpart } from '@/lib/marketplace/pictures';

const listing = { rawImages: ['raw-0', 'raw-1', 'raw-2'], aiImages: ['ai-0', '', 'ai-2'] };

describe('pictureCounterpart', () => {
  it('finds the original of an AI picture and the AI picture of an original', () => {
    expect(pictureCounterpart(listing, 'ai-2')).toEqual({ isAi: true, other: 'raw-2' });
    expect(pictureCounterpart(listing, 'raw-0')).toEqual({ isAi: false, other: 'ai-0' });
  });

  it('has nothing for a photo the AI made no picture of, or an unknown one', () => {
    expect(pictureCounterpart(listing, 'raw-1')).toBeUndefined();
    expect(pictureCounterpart(listing, 'uploaded-later')).toBeUndefined();
  });
});

describe('isAiPicture', () => {
  it('marks only the AI pictures of a listing that has pairs', () => {
    const paired = { ...listing, images: ['ai-0', 'raw-1', 'raw-2'], usesAi: true };
    expect(isAiPicture(paired, 'ai-0', 0)).toBe(true);
    expect(isAiPicture(paired, 'raw-1', 1)).toBe(false);
    expect(isAiPicture(paired, 'raw-2', 2)).toBe(false);
  });

  it('marks the cover of an older AI listing without pairs', () => {
    const older = { rawImages: ['raw-0'], aiImages: [], images: ['cover', 'raw-0'], usesAi: true };
    expect(isAiPicture(older, 'cover', 0)).toBe(true);
    expect(isAiPicture(older, 'raw-0', 1)).toBe(false);
  });

  it('never marks a photo of a listing made without AI', () => {
    const noAi = { rawImages: ['raw-0', 'raw-1'], aiImages: [], images: ['raw-0', 'raw-1'], usesAi: false };
    expect(isAiPicture(noAi, 'raw-0', 0)).toBe(false);
    expect(isAiPicture(noAi, 'raw-1', 1)).toBe(false);
  });
});
