'use client';

import { useEffect } from 'react';

interface PrepareSharePreviewProps {
  src: string;
}

/** Requests the listing's link preview picture on opening, so it is stored by the time WhatsApp asks for it:
    someone sending fast otherwise gets a plain link, and a sent message's preview never changes. */
export default function PrepareSharePreview({ src }: PrepareSharePreviewProps) {
  useEffect(() => {
    new Image().src = src;
  }, [src]);
  return null;
}
