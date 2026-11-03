// iPhone Safari only shows a <video> full screen through its own webkit method and event.
interface WebkitVideo extends HTMLVideoElement {
  webkitEnterFullscreen?: () => void;
}

/** Plays with sound; where the browser refuses that (no tap yet), plays muted instead of stopping. */
export function playWithSound(video: HTMLVideoElement) {
  video.muted = false;
  // Old browsers return nothing from play() and requestFullscreen().
  video.play()?.catch((error: Error) => {
    if (error.name !== 'NotAllowedError') return;
    video.muted = true;
    video.play()?.catch(() => undefined);
  });
}

/** After a tap: plays with sound, full screen where the browser allows it, else right there on the page. */
export function playFullScreen(video: HTMLVideoElement) {
  const webkitVideo = video as WebkitVideo;
  // First, so a full screen that is refused or fails still leaves the sound on.
  playWithSound(video);
  // Leaving full screen can pause it.
  const keepPlaying = () => video.play()?.catch(() => undefined);

  if (video.requestFullscreen) {
    const onChange = () => {
      if (document.fullscreenElement) return;
      document.removeEventListener('fullscreenchange', onChange);
      keepPlaying();
    };
    document.addEventListener('fullscreenchange', onChange);
    video.requestFullscreen()?.catch(() => document.removeEventListener('fullscreenchange', onChange));
  } else if (webkitVideo.webkitEnterFullscreen) {
    video.addEventListener('webkitendfullscreen', keepPlaying, { once: true });
    // Throws on a video that hasn't loaded enough yet, e.g. on a slow connection.
    try {
      webkitVideo.webkitEnterFullscreen();
    } catch {
      video.removeEventListener('webkitendfullscreen', keepPlaying);
    }
  }
}
