'use client';

import { useEffect } from 'react';

/** iPhone Safari ignores user-scalable=no; its own gesture events are the only way to stop a pinch from zooming the shop. */
export default function NoPinchZoom() {
  useEffect(() => {
    const preventZoom = (event: Event) => event.preventDefault();
    document.addEventListener('gesturestart', preventZoom);
    document.addEventListener('gesturechange', preventZoom);
    return () => {
      document.removeEventListener('gesturestart', preventZoom);
      document.removeEventListener('gesturechange', preventZoom);
    };
  }, []);

  return null;
}
