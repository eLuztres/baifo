/** @jest-environment jsdom */
import { useState } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { useDragOrder } from '@/hooks/use-drag-order';
import { movePicture } from '@/lib/marketplace/pictures';

interface RowProps {
  initial: string[];
  onOpen?: (photo: string) => void;
}

function Row({ initial, onOpen = () => {} }: RowProps) {
  const [photos, setPhotos] = useState(initial);
  const drag = useDragOrder((from, to) => {
    const moved = movePicture(photos, from, to);
    if (moved === photos) return false;
    setPhotos(moved);
    return true;
  });
  return (
    <ul ref={drag.listRef}>
      {photos.map((photo, index) => (
        <li key={`${index}-${photo}`} {...drag.itemProps(index)}>
          <button type='button' {...drag.handleProps(index)} onClick={() => onOpen(photo)}>
            {photo}
          </button>
        </li>
      ))}
    </ul>
  );
}

const order = () => screen.getAllByRole('button').map((button) => button.textContent);

beforeAll(() => {
  // Items 100px wide, side by side: centers at 50, 150, 250, 350.
  jest.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
    const index = [...(this.parentElement?.children ?? [])].indexOf(this);
    return { left: index * 100, width: 100, top: 0, height: 100, right: index * 100 + 100, bottom: 100, x: 0, y: 0, toJSON: () => ({}) };
  });
  HTMLElement.prototype.setPointerCapture = jest.fn();
  // jsdom has no PointerEvent: without it the events lose their coordinates and pointer id.
  class TestPointerEvent extends MouseEvent {
    pointerId: number;
    pointerType: string;
    constructor(type: string, init: PointerEventInit = {}) {
      super(type, init);
      this.pointerId = init.pointerId ?? 0;
      this.pointerType = init.pointerType ?? 'mouse';
    }
  }
  window.PointerEvent ??= TestPointerEvent as typeof PointerEvent;
});

describe('useDragOrder', () => {
  it('moves the focused photo with the arrow keys, and focus follows it', () => {
    render(<Row initial={['a', 'b', 'c', 'd']} />);
    const photo = screen.getByRole('button', { name: 'd' });
    fireEvent.keyDown(photo, { key: 'ArrowLeft' });
    fireEvent.keyDown(screen.getByRole('button', { name: 'd' }), { key: 'ArrowLeft' });
    expect(order()).toEqual(['a', 'd', 'b', 'c']);
    expect(screen.getByRole('button', { name: 'd' })).toHaveFocus();
  });

  it('keeps the order when a move is refused, like a video without a still frame going first', () => {
    render(<Row initial={['a', 'clip.mp4']} />);
    fireEvent.keyDown(screen.getByRole('button', { name: 'clip.mp4' }), { key: 'ArrowLeft' });
    expect(order()).toEqual(['a', 'clip.mp4']);
  });

  it('drops a photo dragged with the mouse at the place under the pointer, without opening it', () => {
    const onOpen = jest.fn();
    render(<Row initial={['a', 'b', 'c', 'd']} onOpen={onOpen} />);
    const photo = screen.getByRole('button', { name: 'd' });
    fireEvent.pointerDown(photo, { pointerId: 1, button: 0, clientX: 350, clientY: 50, pointerType: 'mouse' });
    fireEvent.pointerMove(photo, { pointerId: 1, clientX: 200, clientY: 50, pointerType: 'mouse' });
    fireEvent.pointerMove(photo, { pointerId: 1, clientX: 120, clientY: 50, pointerType: 'mouse' });
    fireEvent.pointerUp(photo, { pointerId: 1, clientX: 120, clientY: 50, pointerType: 'mouse' });
    fireEvent.click(photo);
    expect(order()).toEqual(['a', 'd', 'b', 'c']);
    expect(onOpen).not.toHaveBeenCalled();
  });

  it('drags a touched photo only after the finger rests a moment', () => {
    jest.useFakeTimers();
    render(<Row initial={['a', 'b', 'c', 'd']} />);
    const photo = screen.getByRole('button', { name: 'd' });
    fireEvent.pointerDown(photo, { pointerId: 2, button: 0, clientX: 350, clientY: 50, pointerType: 'touch' });
    act(() => jest.advanceTimersByTime(300));
    fireEvent.pointerMove(photo, { pointerId: 2, clientX: 120, clientY: 50, pointerType: 'touch' });
    fireEvent.pointerUp(photo, { pointerId: 2, clientX: 120, clientY: 50, pointerType: 'touch' });
    expect(order()).toEqual(['a', 'd', 'b', 'c']);
    jest.useRealTimers();
  });

  it('leaves a quick swipe to scrolling: nothing moves', () => {
    jest.useFakeTimers();
    render(<Row initial={['a', 'b', 'c', 'd']} />);
    const photo = screen.getByRole('button', { name: 'd' });
    fireEvent.pointerDown(photo, { pointerId: 3, button: 0, clientX: 350, clientY: 50, pointerType: 'touch' });
    fireEvent.pointerMove(photo, { pointerId: 3, clientX: 200, clientY: 50, pointerType: 'touch' });
    act(() => jest.advanceTimersByTime(300));
    fireEvent.pointerMove(photo, { pointerId: 3, clientX: 120, clientY: 50, pointerType: 'touch' });
    fireEvent.pointerUp(photo, { pointerId: 3, clientX: 120, clientY: 50, pointerType: 'touch' });
    expect(order()).toEqual(['a', 'b', 'c', 'd']);
    jest.useRealTimers();
  });

  it('springs a dragged video without a still frame back from first place', () => {
    render(<Row initial={['a', 'b', 'clip.mp4']} />);
    const video = screen.getByRole('button', { name: 'clip.mp4' });
    fireEvent.pointerDown(video, { pointerId: 4, button: 0, clientX: 250, clientY: 50, pointerType: 'mouse' });
    fireEvent.pointerMove(video, { pointerId: 4, clientX: 20, clientY: 50, pointerType: 'mouse' });
    fireEvent.pointerUp(video, { pointerId: 4, clientX: 20, clientY: 50, pointerType: 'mouse' });
    expect(order()).toEqual(['a', 'b', 'clip.mp4']);
    expect(video.closest('li')?.style.transform).toBe('');
  });

  it('still opens a photo on a plain click', () => {
    const onOpen = jest.fn();
    render(<Row initial={['a', 'b']} onOpen={onOpen} />);
    fireEvent.click(screen.getByRole('button', { name: 'b' }));
    expect(onOpen).toHaveBeenCalledWith('b');
  });
});
