import { canBeMain, isAiPicture, movePicture, pictureCounterpart } from '@/lib/marketplace/pictures';

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

describe('movePicture', () => {
  const photos = ['a', 'b', 'c', 'd'];
  const videoWithoutStill = 'clip.mp4';

  it('moves a picture to any place, the first one making it the main picture', () => {
    expect(movePicture(photos, 3, 1)).toEqual(['a', 'd', 'b', 'c']);
    expect(movePicture(photos, 1, 0)).toEqual(['b', 'a', 'c', 'd']);
    expect(movePicture(photos, 0, 1)).toEqual(['b', 'a', 'c', 'd']);
  });

  it('keeps the same list for a place that does not exist', () => {
    expect(movePicture(photos, 0, -1)).toBe(photos);
    expect(movePicture(photos, 3, 4)).toBe(photos);
  });

  it('never puts a video without a still frame first', () => {
    expect(canBeMain(videoWithoutStill)).toBe(false);
    expect(canBeMain('clip.mp4#video=still.jpg')).toBe(true);
    expect(movePicture(['a', videoWithoutStill], 1, 0)).toEqual(['a', videoWithoutStill]);
    expect(movePicture(['a', videoWithoutStill, 'c'], 0, 1)).toEqual(['a', videoWithoutStill, 'c']);
  });

  it('still moves the others when an older listing already starts with a video without a still frame', () => {
    expect(movePicture([videoWithoutStill, 'b', 'c'], 2, 1)).toEqual([videoWithoutStill, 'c', 'b']);
    expect(movePicture([videoWithoutStill, 'b'], 1, 0)).toEqual(['b', videoWithoutStill]);
  });

  it('moves a picture several places at once', () => {
    expect(movePicture(photos, 0, 3)).toEqual(['b', 'c', 'd', 'a']);
    expect(movePicture(photos, 2, 2)).toBe(photos);
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
