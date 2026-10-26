// iPhone Safari only shows a <video> full screen through its own webkit method and event.
interface WebkitVideo extends HTMLVideoElement {
  webkitEnterFullscreen?: () => void;
}

/** Plays a video full screen with sound, from where it is; back on the page it plays muted again. False where the browser can't. */
export function playFullScreen(video: HTMLVideoElement): boolean {
  const webkitVideo = video as WebkitVideo;
  const goQuiet = () => {
    video.muted = true;
    video.controls = false;
    video.play().catch(() => undefined);
  };

  if (video.requestFullscreen) {
    const onChange = () => {
      if (document.fullscreenElement) return;
      document.removeEventListener('fullscreenchange', onChange);
      goQuiet();
    };
    document.addEventListener('fullscreenchange', onChange);
    video.requestFullscreen().catch(() => {
      document.removeEventListener('fullscreenchange', onChange);
      goQuiet();
    });
  } else if (webkitVideo.webkitEnterFullscreen) {
    video.addEventListener('webkitendfullscreen', goQuiet, { once: true });
    webkitVideo.webkitEnterFullscreen();
  } else {
    return false;
  }

  // The tap that opened full screen lets the browser play with sound.
  video.muted = false;
  video.controls = true;
  video.play().catch(() => undefined);
  return true;
}
