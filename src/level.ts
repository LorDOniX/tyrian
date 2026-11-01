import type { BossVariant } from './boss.ts';
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

export function levelPart(time: number, index: LevelIndex = 0): string {
  if (index === 1) {
    if (time >= getLevel(1).duration) return 'Dokonči souboj';
    if (time >= 32) return '3 / 3 · Těžký konvoj';
    if (time >= 16) return '2 / 3 · Doprovod';
    return '1 / 3 · První vzducholoď';
  }
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

export type LevelIndex = 0 | 1;
export type LevelDefinition = Readonly<{
  name: string; duration: number; events: readonly SpawnEvent[];
  groundTargets: readonly Readonly<{ x: number; levelY: number }>[]; boss: boolean; bossVariant?: BossVariant;
}>;
const convoy: SpawnEvent[] = [];
const escort = (at: number, kind: EnemyKind, xs: number[], drop?: PickupKind) => {
  xs.forEach(x => convoy.push({ at, kind, x, y: kind === 'airship' ? 18 : 13, drop }));
};
escort(1, 'airship', [0], 'spread');
escort(4, 'scout', [-6, 6]);
escort(8, 'interceptor', [-5, 5]);
escort(12, 'scout', [-4, 0, 4], 'repair');
escort(16, 'airship', [-3.5], 'spread');
escort(19, 'gunner', [5]);
escort(23, 'spreader', [-5, 5]);
escort(27, 'interceptor', [-5, 0, 5]);
escort(30, 'scout', [-4, 0, 4], 'repair');
escort(34, 'airship', [-3.5, 3.5]);
escort(38, 'pulsar', [0]);
escort(41, 'interceptor', [-5, 5]);
export const LEVELS: readonly LevelDefinition[] = Object.freeze([
  Object.freeze({ name: 'Základna', duration: LEVEL_DURATION, events: LEVEL_EVENTS, groundTargets: GROUND_TARGETS, boss: true, bossVariant: 'commander' }),
  Object.freeze({ name: 'Vzdušný konvoj', duration: 48,
    events: Object.freeze(convoy.sort((a, b) => a.at - b.at).map(event => Object.freeze(event))),
    groundTargets: Object.freeze([]), boss: true, bossVariant: 'convoy' }),
]);
export function getLevel(index: LevelIndex): LevelDefinition { return LEVELS[index]!; }
