import type { MovingCircle } from './collision.ts';
import type { PickupKind } from './bonuses.ts';

export type EnemyKind = 'scout' | 'gunner' | 'interceptor' | 'spreader' | 'pulsar' | 'airship' | 'weaver' | 'striker' | 'wraith' | 'bastion' | 'rotor';
export const ENEMY_TYPES = {
  wraith: { hp: 4, radius: 1.05, speed: 5.2, score: 450, interval: 0.9, volleys: 3, stopY: 7, clip: 'wraithShip' },
  bastion: { hp: 7, radius: 0.95, speed: 3.6, score: 600, interval: 1, volleys: 4, stopY: 7.5, clip: 'bastionShip' },
  rotor: { hp: 3, radius: 0.8, speed: 4.2, score: 350, interval: 1.1, volleys: 3, stopY: 6.5, clip: 'rotorShip' },
  weaver: { hp: 2, radius: 0.7, speed: 3.5, score: 250, interval: 1.2, volleys: 3, stopY: 7, clip: 'weaverShip' },
  striker: { hp: 4, radius: 0.85, speed: 3.5, score: 450, interval: 1.4, volleys: 3, stopY: 7, clip: 'strikerShip' },
  airship: { hp: 16, radius: 1.65, speed: 2, score: 1000, interval: 1.8, volleys: 3, stopY: 6, clip: 'airship' },
  scout: { hp: 1, radius: 0.6, speed: 4, score: 100, interval: 0.8, volleys: 0, stopY: 7, clip: 'scoutShip' },
  gunner: { hp: 2, radius: 0.75, speed: 4, score: 250, interval: 0.8, volleys: 3, stopY: 7, clip: 'gunnerShip' },
  interceptor: { hp: 1, radius: 0.65, speed: 4.5, score: 150, interval: 1.5, volleys: 2, stopY: 7, clip: 'interceptorShip' },
  spreader: { hp: 3, radius: 0.85, speed: 3.5, score: 300, interval: 1.25, volleys: 2, stopY: 6.5, clip: 'spreaderShip' },
  pulsar: { hp: 3, radius: 0.9, speed: 3, score: 400, interval: 1.6, volleys: 2, stopY: 8, clip: 'pulsarShip' },
} as const;
export const BASTION_PART_OFFSET = 1.05;
export type EnemyPart = { frame: 0 | 1; offsetY: number; hp: number; hitLeft: number };
export type EnemyCircle = MovingCircle & { part?: EnemyPart };
export type Enemy = MovingCircle & {
  id: number; speed: number; drop?: PickupKind; kind: EnemyKind; hp: number;
  phase: 'entering' | 'charging' | 'leaving'; shotLeft: number; shots: number; hitLeft: number;
  originX?: number; age?: number; parts?: EnemyPart[];
};
export type EnemyShot = { x: number; y: number; vx: number; vy: number };

export function createEnemy(id: number, kind: EnemyKind, x: number, y: number, drop?: PickupKind): Enemy {
  const type = ENEMY_TYPES[kind];
  return { id, kind, x, y, previousX: x, previousY: y, originX: x, age: 0, drop,
    radius: type.radius, speed: type.speed, hp: type.hp,
    phase: 'entering', shotLeft: type.interval, shots: 0, hitLeft: 0,
    ...(kind === 'bastion' ? { parts: [
      { frame: 0 as const, offsetY: BASTION_PART_OFFSET, hp: 4, hitLeft: 0 },
      { frame: 1 as const, offsetY: -BASTION_PART_OFFSET, hp: 3, hitLeft: 0 },
    ] } : {}) };
}

// Vzducholoď sdílí zdraví celého trupu; Bastion má samostatně zničitelné díly.
export function enemyCircles(enemy: Enemy): EnemyCircle[] {
  if (enemy.kind === 'bastion') return (enemy.parts ?? []).filter(part => part.hp > 0).map(part => ({
    x: enemy.x, y: enemy.y + part.offsetY, previousX: enemy.previousX,
    previousY: enemy.previousY + part.offsetY, radius: enemy.radius, part,
  }));
  if (enemy.kind !== 'airship') return [enemy];
  return [{ y: -2, radius: 1.05 }, { y: 0, radius: 1.65 }, { y: 2, radius: 1.25 }].map(part => ({
    x: enemy.x, y: enemy.y + part.y, previousX: enemy.previousX,
    previousY: enemy.previousY + part.y, radius: part.radius,
  }));
}
export function enemyExtent(enemy: Enemy): number {
  if (enemy.kind === 'bastion') return Math.max(...enemyCircles(enemy).map(circle => circle.y - enemy.y + circle.radius), 0);
  return enemy.kind === 'airship' ? 3.5 : enemy.radius;
}
export function bastionMuzzleY(enemy: Enemy): number {
  const front = enemy.parts?.find(part => part.frame === 1 && part.hp > 0);
  const surviving = front ?? enemy.parts?.find(part => part.hp > 0);
  return enemy.y + (surviving?.offsetY ?? 0) - 0.8;
}
export function enemySpritePose(enemy: Enemy): number {
  if (enemy.kind === 'airship') return enemy.hp < ENEMY_TYPES.airship.hp ? 1 : 0;
  if (enemy.kind === 'weaver') return 1;
  if (enemy.kind === 'bastion') return 0;
  if (enemy.kind === 'wraith' || enemy.kind === 'rotor') return 0;
  return Math.abs(enemy.x - enemy.previousX) < 0.002 ? 1 : enemy.x > enemy.previousX ? 2 : 0;
}

export function enemyCanCharge(enemy: Enemy): boolean {
  return (enemy.kind === 'interceptor' || enemy.kind === 'weaver' || enemy.kind === 'wraith')
    ? enemy.y + enemy.radius <= 12 && enemy.y - enemy.radius >= -10 && enemy.shots < ENEMY_TYPES[enemy.kind].volleys
    : enemy.phase === 'charging' && enemy.kind !== 'scout';
}

// Vrací požadavek na útok. Samotný výstřel se vyřeší až po kolizích.
export function updateEnemy(enemy: Enemy, dt: number): boolean {
  enemy.previousX = enemy.x;
  enemy.previousY = enemy.y;
  enemy.hitLeft = Math.max(0, enemy.hitLeft - dt);
  enemy.parts?.forEach(part => { part.hitLeft = Math.max(0, part.hitLeft - dt); });
  enemy.originX ??= enemy.x;
  enemy.age = (enemy.age ?? 0) + dt;
  const type = ENEMY_TYPES[enemy.kind];
  if (enemy.kind === 'scout' || enemy.kind === 'interceptor' || enemy.kind === 'weaver' || enemy.kind === 'wraith' || enemy.phase === 'leaving') {
    enemy.y -= enemy.speed * dt;
    if (enemy.kind === 'interceptor' || enemy.kind === 'weaver' || enemy.kind === 'wraith') {
      enemy.x = Math.max(-7.5, Math.min(7.5, enemy.originX + Math.sin(enemy.age * (enemy.kind === 'wraith' ? 2.4 : 1.8)) * (enemy.kind === 'wraith' ? 1.7 : 1.5)));
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
  if (enemy.kind === 'wraith') {
    const dx = player.x - x, dy = player.y - y;
    const aim = Math.hypot(dx, dy) > 0 ? Math.atan2(dx, -dy) : 0;
    shots = [-10, 0, 10].map(angle => ({ x, y, vx: Math.sin(aim + angle * Math.PI / 180) * 7,
      vy: -Math.cos(aim + angle * Math.PI / 180) * 7 }));
  } else if (enemy.kind === 'bastion') {
    shots = [-40, -20, 0, 20, 40].map(angle => {
      const radians = (angle + (enemy.shots % 2 ? 10 : 0)) * Math.PI / 180;
      return { x, y: bastionMuzzleY(enemy), vx: Math.sin(radians) * 6.3, vy: -Math.cos(radians) * 6.3 };
    });
  } else if (enemy.kind === 'rotor') {
    shots = Array.from({ length: 6 }, (_, i) => {
      const angle = (i * 60 + enemy.shots * 30) * Math.PI / 180;
      return { x, y: enemy.y, vx: Math.sin(angle) * 5.5, vy: -Math.cos(angle) * 5.5 };
    });
  } else if (enemy.kind === 'airship') {
    shots = [-1.8, 1.8].map(offset => {
      const from = { x: x + offset, y: enemy.y - 0.8 };
      const dx = player.x - from.x;
      const dy = player.y - from.y;
      const length = Math.hypot(dx, dy);
      return { ...from, vx: length > 0 ? dx / length * 5 : 0, vy: length > 0 ? dy / length * 5 : -5 };
    });
  } else if (enemy.kind === 'gunner' || enemy.kind === 'weaver') {
    const dx = player.x - x;
    const dy = player.y - y;
    const length = Math.hypot(dx, dy);
    shots = [{ x, y, vx: length > 0 ? dx / length * 6 : 0, vy: length > 0 ? dy / length * 6 : -6 }];
  } else if (enemy.kind === 'interceptor') {
    shots = [-0.3, 0.3].map(offset => ({ x: x + offset, y, vx: 0, vy: -7 }));
  } else if (enemy.kind === 'striker') {
    shots = [-0.55, 0.55].flatMap(offset => [-16, 16].map(angle => ({ x: x + offset, y,
      vx: Math.sin(angle * Math.PI / 180) * 6, vy: -Math.cos(angle * Math.PI / 180) * 6 })));
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
  if (enemy.kind !== 'interceptor' && enemy.kind !== 'weaver' && enemy.kind !== 'wraith' && enemy.shots >= type.volleys) enemy.phase = 'leaving';
  return shots;
}
