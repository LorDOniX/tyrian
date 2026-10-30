export const SEGMENT_LENGTH = 16;
export const SEGMENT_COUNT = 3;

// Dolní hrana prvního segmentu je vždy pod dolním okrajem záběru.
export function segmentLayout(distance: number) {
  const first = Math.floor((distance - 12) / SEGMENT_LENGTH);
  return Array.from({ length: SEGMENT_COUNT }, (_, offset) => {
    const index = first + offset;
    return { index, y: (index + 0.5) * SEGMENT_LENGTH - distance };
  });
}
