import { pictureCounterpart } from '@/lib/marketplace/pictures';

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
