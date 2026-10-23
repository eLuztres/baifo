interface Point {
  x: number;
  y: number;
}

interface Frond {
  control: Point;
  end: Point;
}

const CROWN: Point = { x: 30, y: -86 };
const LEAFLETS_PER_SIDE = 11;
const MAX_LEAFLET = 8;
const LEAFLET_SWEEP = 1.3;
const LEAFLET_DROOP = 0.9;

// Relative to the crown: few long fronds that arch out and hang down, the way coconut palms look on a beach.
const FRONDS: Frond[] = [
  { control: { x: 30, y: -16 }, end: { x: 58, y: 22 } },
  { control: { x: 26, y: -24 }, end: { x: 50, y: -10 } },
  { control: { x: 6, y: -30 }, end: { x: 16, y: -34 } },
  { control: { x: -20, y: -24 }, end: { x: -44, y: -12 } },
  { control: { x: -30, y: -14 }, end: { x: -52, y: 24 } },
  { control: { x: 12, y: -6 }, end: { x: 22, y: 30 } },
  { control: { x: -12, y: -6 }, end: { x: -20, y: 30 } },
];

const round = (value: number) => Math.round(value * 10) / 10;

const bezier = (start: Point, control: Point, end: Point, t: number): Point => ({
  x: (1 - t) ** 2 * start.x + 2 * (1 - t) * t * control.x + t ** 2 * end.x,
  y: (1 - t) ** 2 * start.y + 2 * (1 - t) * t * control.y + t ** 2 * end.y,
});

/** One frond as strokes: the midrib plus leaflets on both sides that are longest in the middle and droop. */
function frondPath({ control, end }: Frond) {
  const c = { x: CROWN.x + control.x, y: CROWN.y + control.y };
  const e = { x: CROWN.x + end.x, y: CROWN.y + end.y };
  let path = `M${CROWN.x} ${CROWN.y} Q${c.x} ${c.y} ${e.x} ${e.y}`;

  for (let step = 1; step <= LEAFLETS_PER_SIDE; step++) {
    const t = step / (LEAFLETS_PER_SIDE + 1);
    const point = bezier(CROWN, c, e, t);
    const ahead = bezier(CROWN, c, e, t + 0.01);
    const length = Math.hypot(ahead.x - point.x, ahead.y - point.y);
    const tangent = { x: (ahead.x - point.x) / length, y: (ahead.y - point.y) / length };
    const leaflet = MAX_LEAFLET * Math.sin(Math.PI * t);

    for (const side of [1, -1]) {
      const x = tangent.x * LEAFLET_SWEEP - tangent.y * side;
      const y = tangent.y * LEAFLET_SWEEP + tangent.x * side + LEAFLET_DROOP;
      const size = Math.hypot(x, y);
      path += ` M${round(point.x)} ${round(point.y)} l${round((x / size) * leaflet)} ${round((y / size) * leaflet)}`;
    }
  }
  return path;
}

const FROND_PATHS = FRONDS.map(frondPath);

/** A Caribbean coconut palm: a slim curved trunk, feathery fronds and coconuts under the crown. Its base is at 0 0. */
export default function PalmSilhouette() {
  return (
    <>
      <path d='M-3.5 0 C-2 -34 8 -64 29 -87 L32 -85 C13 -62 4 -33 3.5 0 Z' strokeWidth='0.5' />
      {FROND_PATHS.map((d) => (
        <path key={d} d={d} fill='none' strokeWidth='1.3' strokeLinecap='round' />
      ))}
      <circle cx='28' cy='-83' r='2.6' />
      <circle cx='32.5' cy='-82' r='2.6' />
      <circle cx='30' cy='-79.5' r='2.4' />
    </>
  );
}
