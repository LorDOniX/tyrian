import type { GroundWeapon } from './ground-weapons.ts';
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
  if (index === 3) {
    if (time >= getLevel(3).duration) return 'Dokonči souboj';
    if (time >= 42) return '3 / 3 · Poslední obranná linie';
    if (time >= 21) return '2 / 3 · Rotační past';
    return '1 / 3 · Hlídky slévárny';
  }
  if (index === 2) {
    if (time >= getLevel(2).duration) return 'Dokonči souboj';
    if (time >= 36) return '3 / 3 · Obrana pevnosti';
    if (time >= 18) return '2 / 3 · Křížová palba';
    return '1 / 3 · Průlom';
  }
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

export type LevelIndex = 0 | 1 | 2 | 3;
export type LevelDefinition = Readonly<{
  name: string; duration: number; events: readonly SpawnEvent[];
  groundTargets: readonly Readonly<{ x: number; levelY: number; weapon?: GroundWeapon }>[]; boss: boolean; bossVariant?: BossVariant;
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
const fortress: SpawnEvent[] = [];
const wave = (at: number, kind: EnemyKind, xs: number[], drop?: PickupKind) => {
  xs.forEach(x => fortress.push({ at, kind, x, y: kind === 'airship' ? 18 : 13, drop }));
};
wave(1, 'weaver', [-5, 0, 5]);
wave(5, 'striker', [-4, 4], 'spread');
wave(9, 'interceptor', [-5, 0, 5]);
wave(13, 'weaver', [-5, 0, 5], 'repair');
wave(18, 'striker', [-5, 0, 5]);
wave(22, 'pulsar', [-4, 4]);
wave(25, 'weaver', [-6, -2, 2, 6]);
wave(29, 'airship', [0], 'spread');
wave(33, 'striker', [-5, 5]);
wave(37, 'weaver', [-5, 0, 5], 'repair');
wave(41, 'striker', [-4, 4]);
wave(45, 'interceptor', [-5, 0, 5]);
wave(48, 'pulsar', [0]);
wave(6, 'rockSmall', [-5, 5]);
wave(17, 'rockLarge', [0]);
wave(26, 'rockSmall', [-6, 2]);
wave(35, 'rockLarge', [-4, 4]);
wave(46, 'rockSmall', [-3, 3]);
const foundry: SpawnEvent[] = [];
const foundryWave = (at: number, kind: EnemyKind, xs: number[], drop?: PickupKind) => {
  xs.forEach(x => foundry.push({ at, kind, x, y: 14, drop }));
};
foundryWave(1, 'wraith', [-5, 0, 5]);
foundryWave(5, 'bastion', [-4, 4], 'spread');
foundryWave(9, 'rotor', [-5, 0, 5]);
foundryWave(13, 'wraith', [-5, -1.5, 2, 5.5]);
foundryWave(17, 'bastion', [0], 'repair');
foundryWave(21, 'rotor', [-5, 5]);
foundryWave(23, 'wraith', [-4, 0, 4]);
foundryWave(27, 'bastion', [-4, 4]);
foundryWave(30, 'rotor', [-5, 0, 5]);
foundryWave(34, 'wraith', [-5, -1.5, 2, 5.5]);
foundryWave(38, 'bastion', [0], 'spread');
foundryWave(42, 'rotor', [-5, 5]);
foundryWave(45, 'wraith', [-5, 0, 5]);
foundryWave(49, 'bastion', [-4, 4]);
foundryWave(53, 'rotor', [0], 'repair');
foundryWave(57, 'wraith', [-5, 0, 5]);
foundryWave(3, 'rockSmall', [-6, 2]);
foundryWave(11, 'rockLarge', [0]);
foundryWave(19, 'rockSmall', [-3, 3]);
foundryWave(28, 'rockLarge', [-5, 5]);
foundryWave(35, 'rockSmall', [-6, 0, 6]);
foundryWave(43, 'rockLarge', [0]);
foundryWave(51, 'rockSmall', [-5, 5]);
foundryWave(59, 'rockLarge', [-3, 3]);
export const LEVELS: readonly LevelDefinition[] = Object.freeze([
  Object.freeze({ name: 'Základna', duration: LEVEL_DURATION, events: LEVEL_EVENTS, groundTargets: GROUND_TARGETS, boss: true, bossVariant: 'commander' }),
  Object.freeze({ name: 'Vzdušný konvoj', duration: 48,
    events: Object.freeze(convoy.sort((a, b) => a.at - b.at).map(event => Object.freeze(event))),
    groundTargets: Object.freeze([]), boss: true, bossVariant: 'convoy' }),
  Object.freeze({ name: 'Ocelová pevnost', duration: 56,
    events: Object.freeze(fortress.sort((a, b) => a.at - b.at).map(event => Object.freeze(event))),
    groundTargets: Object.freeze([{ x: -5, levelY: 65 }, { x: 5, levelY: 101, weapon: 'twinGold' as const },
      { x: 5, levelY: 137 }, { x: -5, levelY: 169, weapon: 'twinSteel' as const }, { x: 0, levelY: 193 }]),
    boss: true, bossVariant: 'fortress' }),
  Object.freeze({ name: 'Slévárna stínů', duration: 64,
    events: Object.freeze(foundry.sort((a, b) => a.at - b.at).map(event => Object.freeze(event))),
    groundTargets: Object.freeze([{ x: 4, levelY: 33, weapon: 'twinSteel' as const },
      { x: -5, levelY: 49 }, { x: -2, levelY: 65, weapon: 'twinGold' as const }, { x: 5, levelY: 85 },
      { x: -5, levelY: 113, weapon: 'twinSteel' as const }, { x: -4, levelY: 137 }, { x: 4, levelY: 169 },
      { x: 5, levelY: 201, weapon: 'twinGold' as const }, { x: 0, levelY: 225 }]),
    boss: true, bossVariant: 'dreadnought' }),
]);
export function getLevel(index: LevelIndex): LevelDefinition { return LEVELS[index]!; }

export function hasNextLevel(index: LevelIndex): boolean { return index + 1 < LEVELS.length; }
