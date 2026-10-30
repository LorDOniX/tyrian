export type EnemyKind = 'scout' | 'gunner';
export type SpawnEvent = Readonly<{ at: number; kind: EnemyKind; x: number; y: number }>;
export const LEVEL_DURATION = 55;

// Časy a formace jsou data; restart přehrává stejnou úroveň.
const events: SpawnEvent[] = [];
const formation = (at: number, xs: number[]) => {
  xs.forEach(x => events.push({ at, kind: 'scout', x, y: 13 }));
};
formation(1, [-4, 0, 4]);
formation(8, [-6, -2, 2, 6]);
for (const at of [16, 23, 30]) {
  events.push({ at, kind: 'gunner', x: -5, y: 13 }, { at: at + 2, kind: 'gunner', x: 5, y: 13 });
}
for (const at of [36, 43, 50]) {
  formation(at, [-6, 0, 6]);
  events.push({ at: at + 1, kind: 'gunner', x: -3, y: 13 },
    { at: at + 2, kind: 'gunner', x: 3, y: 13 });
}
export const LEVEL_EVENTS: readonly SpawnEvent[] = Object.freeze(
  events.sort((a, b) => a.at - b.at).map(event => Object.freeze(event)),
);

export function levelPart(time: number): string {
  if (time >= LEVEL_DURATION) return 'Dokonči souboj';
  if (time >= 35) return '3 / 3 · Společný útok';
  if (time >= 15) return '2 / 3 · Střelci';
  return '1 / 3 · Formace';
}

export const GROUND_TARGETS: readonly Readonly<{ x: number; levelY: number }>[] = Object.freeze([
  Object.freeze({ x: -4, levelY: 49 }),  // vstup přibližně v 9. sekundě
  Object.freeze({ x: 4, levelY: 117 }),  // 26. sekunda
  Object.freeze({ x: 0, levelY: 185 }),  // 43. sekunda
]);
