import type { MovingCircle } from './collision.ts';
import type { PickupKind } from './bonuses.ts';

export type EnemyKind = 'scout' | 'gunner' | 'interceptor' | 'spreader' | 'pulsar';
export const ENEMY_TYPES = {
  scout: { hp: 1, radius: 0.6, speed: 4, score: 100, interval: 0.8, volleys: 0, stopY: 7, clip: 'scoutShip' },
  gunner: { hp: 2, radius: 0.75, speed: 4, score: 250, interval: 0.8, volleys: 3, stopY: 7, clip: 'gunnerShip' },
  interceptor: { hp: 1, radius: 0.65, speed: 4.5, score: 150, interval: 1.5, volleys: 2, stopY: 7, clip: 'interceptorShip' },
  spreader: { hp: 3, radius: 0.85, speed: 3.5, score: 300, interval: 1.25, volleys: 2, stopY: 6.5, clip: 'spreaderShip' },
  pulsar: { hp: 3, radius: 0.9, speed: 3, score: 400, interval: 1.6, volleys: 2, stopY: 8, clip: 'pulsarShip' },
} as const;
export type Enemy = MovingCircle & {
  id: number; speed: number; drop?: PickupKind; kind: EnemyKind; hp: number;
  phase: 'entering' | 'charging' | 'leaving'; shotLeft: number; shots: number; hitLeft: number;
  originX?: number; age?: number;
};
export type EnemyShot = { x: number; y: number; vx: number; vy: number };

export function createEnemy(id: number, kind: EnemyKind, x: number, y: number, drop?: PickupKind): Enemy {
  const type = ENEMY_TYPES[kind];
  return { id, kind, x, y, previousX: x, previousY: y, originX: x, age: 0, drop,
    radius: type.radius, speed: type.speed, hp: type.hp,
    phase: 'entering', shotLeft: type.interval, shots: 0, hitLeft: 0 };
}

export function enemyCanCharge(enemy: Enemy): boolean {
  return enemy.kind === 'interceptor'
    ? enemy.y + enemy.radius <= 12 && enemy.y - enemy.radius >= -10 && enemy.shots < ENEMY_TYPES.interceptor.volleys
    : enemy.phase === 'charging' && enemy.kind !== 'scout';
}

// Vrací požadavek na útok. Samotný výstřel se vyřeší až po kolizích.
export function updateEnemy(enemy: Enemy, dt: number): boolean {
  enemy.previousX = enemy.x;
  enemy.previousY = enemy.y;
  enemy.hitLeft = Math.max(0, enemy.hitLeft - dt);
  enemy.originX ??= enemy.x;
  enemy.age = (enemy.age ?? 0) + dt;
  const type = ENEMY_TYPES[enemy.kind];
  if (enemy.kind === 'scout' || enemy.kind === 'interceptor' || enemy.phase === 'leaving') {
    enemy.y -= enemy.speed * dt;
    if (enemy.kind === 'interceptor') {
      enemy.x = Math.max(-7.5, Math.min(7.5, enemy.originX + Math.sin(enemy.age * 1.8) * 1.5));
      if (enemyCanCharge(enemy)) {
        enemy.shotLeft -= dt;
        return enemy.shotLeft <= 0;
      }
    }
    return false;
  }
  if (enemy.phase === 'entering') {
    enemy.y = Math.max(type.stopY, enemy.y - enemy.speed * dt);
    if (enemy.y === type.stopY) enemy.phase = 'charging';
  } else {
    enemy.shotLeft -= dt;
    return enemy.shotLeft <= 0;
  }
  return false;
}

export function enemyVolley(enemy: Enemy, player: { x: number; y: number }): EnemyShot[] {
  const type = ENEMY_TYPES[enemy.kind];
  if (!enemyCanCharge(enemy) || enemy.shots >= type.volleys || enemy.shotLeft > 1e-9) return [];
  const x = enemy.x;
  const y = enemy.y - 0.8;
  let shots: EnemyShot[];
  if (enemy.kind === 'gunner') {
    const dx = player.x - x;
    const dy = player.y - y;
    const length = Math.hypot(dx, dy);
    shots = [{ x, y, vx: length > 0 ? dx / length * 6 : 0, vy: length > 0 ? dy / length * 6 : -6 }];
  } else if (enemy.kind === 'interceptor') {
    shots = [-0.3, 0.3].map(offset => ({ x: x + offset, y, vx: 0, vy: -7 }));
  } else if (enemy.kind === 'spreader') {
    shots = [-24, 0, 24].map(angle => ({ x, y,
      vx: Math.sin(angle * Math.PI / 180) * 5.5, vy: -Math.cos(angle * Math.PI / 180) * 5.5 }));
  } else if (enemy.kind === 'pulsar') {
    shots = Array.from({ length: 8 }, (_, i) => {
      const angle = i * Math.PI / 4;
      const dx = Math.sin(angle);
      const dy = -Math.cos(angle);
      return { x: x + dx * 0.8, y: enemy.y + dy * 0.8, vx: dx * 4.5, vy: dy * 4.5 };
    });
  } else return [];
  enemy.shots++;
  enemy.shotLeft = type.interval;
  if (enemy.kind !== 'interceptor' && enemy.shots >= type.volleys) enemy.phase = 'leaving';
  return shots;
}
