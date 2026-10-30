import type { PickupKind } from './bonuses.ts';
import type { EnemyKind } from './enemies.ts';
export type { EnemyKind } from './enemies.ts';
export type SpawnEvent = Readonly<{ at: number; kind: EnemyKind; x: number; y: number; drop?: PickupKind }>;
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
// Nové typy přicházejí postupně, poslední část kombinuje jejich útoky.
const squad = (at: number, kind: EnemyKind, xs: number[]) => {
  xs.forEach(x => events.push({ at, kind, x, y: 13 }));
};
squad(4, 'interceptor', [-5, 5]);
squad(11, 'scout', [-4, 0, 4]);
squad(14, 'spreader', [0]);
squad(20, 'interceptor', [-5, 0, 5]);
squad(27, 'spreader', [-4, 4]);
squad(34, 'pulsar', [0]);
squad(39, 'interceptor', [-5, 0, 5]);
squad(41, 'spreader', [-4, 4]);
squad(46, 'interceptor', [-5, 0, 5]);
squad(48, 'pulsar', [-4, 4]);
export const LEVEL_EVENTS: readonly SpawnEvent[] = Object.freeze(
  events.sort((a, b) => a.at - b.at).map(event => {
    const drop: PickupKind | undefined =
      (event.at === 1 && event.x === 0) || (event.at === 23 && event.x === -5) || (event.at === 50 && event.x === 0)
        ? 'spread' : (event.at === 8 && event.x === -2) || (event.at === 36 && event.x === 0) ? 'repair' : undefined;
    return Object.freeze({ ...event, drop });
  }),
);

export function levelPart(time: number): string {
  if (time >= LEVEL_DURATION) return 'Dokonči souboj';
  if (time >= 35) return '3 / 3 · Útočná flotila';
  if (time >= 15) return '2 / 3 · Salvy a vějíře';
  return '1 / 3 · Formace';
}

export const GROUND_TARGETS: readonly Readonly<{ x: number; levelY: number }>[] = Object.freeze([
  Object.freeze({ x: -4, levelY: 49 }),  // vstup přibližně v 9. sekundě
  Object.freeze({ x: 4, levelY: 117 }),  // 26. sekunda
  Object.freeze({ x: 0, levelY: 185 }),  // 43. sekunda
]);
