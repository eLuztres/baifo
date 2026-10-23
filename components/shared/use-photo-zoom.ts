import { PointerEvent, WheelEvent, useRef, useState } from 'react';

interface Zoom {
  scale: number;
  x: number;
  y: number;
}

interface Point {
  x: number;
  y: number;
}

const NO_ZOOM: Zoom = { scale: 1, x: 0, y: 0 };
const MAX_SCALE = 5;
const TAP_SCALE = 2.5;
// How fast the wheel zooms: one notch (100) is about a fifth bigger.
const WHEEL_SPEED = 0.002;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

/** Zoom and pan for a full-screen photo: wheel, double-click, pinch, and drag while zoomed in. */
export function usePhotoZoom() {
  const [zoom, setZoom] = useState(NO_ZOOM);
  const frameRef = useRef<HTMLDivElement>(null);
  const pointers = useRef(new Map<number, Point>());
  const pinch = useRef<{ distance: number; scale: number } | null>(null);
  const lastDrag = useRef<Point | null>(null);

  // The photo never moves so far that its edge leaves the frame.
  const keepInFrame = ({ scale, x, y }: Zoom): Zoom => {
    const frame = frameRef.current?.getBoundingClientRect();
    if (!frame || scale <= 1) return NO_ZOOM;
    const maxX = ((scale - 1) * frame.width) / 2;
    const maxY = ((scale - 1) * frame.height) / 2;
    return { scale, x: clamp(x, -maxX, maxX), y: clamp(y, -maxY, maxY) };
  };

  // Positions are measured from the frame's center, where the photo scales from.
  const fromCenter = (clientX: number, clientY: number): Point => {
    const frame = frameRef.current?.getBoundingClientRect();
    return frame ? { x: clientX - frame.left - frame.width / 2, y: clientY - frame.top - frame.height / 2 } : { x: 0, y: 0 };
  };

  // The spot under the cursor or fingers stays where it is while the photo grows around it.
  const zoomAt = (point: Point, scale: (current: number) => number) =>
    setZoom((current) => {
      const next = clamp(scale(current.scale), 1, MAX_SCALE);
      const ratio = next / current.scale;
      return keepInFrame({ scale: next, x: point.x - (point.x - current.x) * ratio, y: point.y - (point.y - current.y) * ratio });
    });

  const handlers = {
    onWheel: (event: WheelEvent) =>
      zoomAt(fromCenter(event.clientX, event.clientY), (scale) => scale * Math.exp(-event.deltaY * WHEEL_SPEED)),
    onDoubleClick: (event: { clientX: number; clientY: number }) =>
      zoomAt(fromCenter(event.clientX, event.clientY), (scale) => (scale > 1 ? 1 : TAP_SCALE)),
    onPointerDown: (event: PointerEvent) => {
      pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
      const [a, b] = [...pointers.current.values()];
      if (b) pinch.current = { distance: distance(a, b), scale: zoom.scale };
      lastDrag.current = b ? null : { x: event.clientX, y: event.clientY };
    },
    onPointerMove: (event: PointerEvent) => {
      if (!pointers.current.has(event.pointerId)) return;
      pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
      const [a, b] = [...pointers.current.values()];
      if (b && pinch.current) {
        const start = pinch.current;
        zoomAt(fromCenter((a.x + b.x) / 2, (a.y + b.y) / 2), () => (start.scale * distance(a, b)) / start.distance);
      } else if (lastDrag.current && zoom.scale > 1) {
        const dx = event.clientX - lastDrag.current.x;
        const dy = event.clientY - lastDrag.current.y;
        lastDrag.current = { x: event.clientX, y: event.clientY };
        setZoom((current) => keepInFrame({ ...current, x: current.x + dx, y: current.y + dy }));
      }
    },
    onPointerUp: (event: PointerEvent) => {
      pointers.current.delete(event.pointerId);
      if (pointers.current.size < 2) pinch.current = null;
      lastDrag.current = null;
    },
  };

  return {
    frameRef,
    isZoomed: zoom.scale > 1,
    style: { transform: `translate(${zoom.x}px, ${zoom.y}px) scale(${zoom.scale})` },
    handlers: { ...handlers, onPointerCancel: handlers.onPointerUp },
    /** Zooms in on the center, or back out. */
    toggle: () => zoomAt({ x: 0, y: 0 }, (scale) => (scale > 1 ? 1 : TAP_SCALE)),
    reset: () => setZoom(NO_ZOOM),
  };
}
