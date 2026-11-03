/** @jest-environment jsdom */
import { fireEvent, screen } from '@testing-library/react';
import VideoSoundButton from '@/components/shared/product/video-sound-button';
import { renderWithI18n, t } from '../utils/render-with-i18n';

const makeVideo = (isOnScreen = true) => {
  const video = document.createElement('video');
  video.muted = true;
  video.play = jest.fn().mockRejectedValue(Object.assign(new Error('blocked'), { name: 'NotAllowedError' }));
  video.getClientRects = () => (isOnScreen ? [{}] : []) as unknown as DOMRectList;
  return video;
};

describe('VideoSoundButton', () => {
  it('stays away when the video is in the gallery hidden on this screen size', () => {
    const video = makeVideo(false);
    renderWithI18n(<VideoSoundButton getVideo={() => video} />);

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(video.play).not.toHaveBeenCalled();
  });

  it('says how to turn the sound on when the browser refused it, and turns it on with a tap', async () => {
    const video = makeVideo();
    renderWithI18n(<VideoSoundButton getVideo={() => video} />);

    const button = await screen.findByRole('button', { name: t('VIDEO_SOUND_ON') });
    expect(button).toHaveTextContent(t('VIDEO_SOUND_ON'));

    video.play = jest.fn().mockResolvedValue(undefined);
    fireEvent.click(button);

    expect(video.muted).toBe(false);
    expect(video.play).toHaveBeenCalled();
  });

  it('turns the sound off again, and leaves the video muted when it goes away', () => {
    const video = makeVideo();
    video.play = jest.fn().mockResolvedValue(undefined);
    const { unmount } = renderWithI18n(<VideoSoundButton getVideo={() => video} />);

    fireEvent.volumeChange(video);
    const button = screen.getByRole('button', { name: t('VIDEO_SOUND_OFF') });
    fireEvent.click(button);
    expect(video.muted).toBe(true);

    video.muted = false;
    unmount();
    expect(video.muted).toBe(true);
  });
});
