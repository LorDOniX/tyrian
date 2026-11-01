import { updateFortressBoss, FORTRESS_CIRCLES } from './fortress-boss.ts';
import { updateConvoyBoss, CONVOY_CIRCLES } from './convoy-boss.ts';
import type { MovingCircle } from './collision.ts';

export type BossVariant = 'commander' | 'convoy' | 'fortress';
export type Boss = MovingCircle & {
  id: number; kind: 'boss'; variant: BossVariant; speed: number; hp: number; maxHp: number; hitLeft: number;
  phase: 1 | 2; mode: 'entering' | 'charging' | 'firing' | 'resting' | 'transitioning' | 'destroyed';
  attack: 'aimed' | 'fan' | 'crossfire' | 'barrage' | 'pulse' | 'sweep' | 'curtain' | 'spiral'; timer: number; shots: number;
  aimX: number; aimY: number; targetX: number; targetY: number; attackSpeed: number; restDuration: number;
  restTarget: number; restStartX: number; moveIndex: number;
};
export type BossShot = { x: number; y: number; vx: number; vy: number };
export const BOSS_CIRCLES = [
  { x: 0, y: 0, radius: 1.25 },
  { x: -1.65, y: -0.15, radius: 0.95 },
  { x: 1.65, y: -0.15, radius: 0.95 },
] as const;

export function createBoss(id: number, variant: BossVariant = 'commander'): Boss {
  return { id, kind: 'boss', variant, x: 0, y: 15, previousX: 0, previousY: 15, radius: 1.25,
    speed: variant === 'convoy' ? 2.5 : 3, hp: variant === 'fortress' ? 110 : variant === 'convoy' ? 80 : 60, maxHp: variant === 'fortress' ? 110 : variant === 'convoy' ? 80 : 60, hitLeft: 0, phase: 1, mode: 'entering',
    attack: variant === 'fortress' ? 'sweep' : variant === 'convoy' ? 'crossfire' : 'aimed', timer: 0, shots: 0, aimX: 0, aimY: -1, targetX: 0, targetY: -7,
    attackSpeed: 5, restDuration: 1.2, restTarget: -3, restStartX: 0, moveIndex: 0 };
}

export function bossCircles(boss: Boss): MovingCircle[] {
  return (boss.variant === 'fortress' ? FORTRESS_CIRCLES : boss.variant === 'convoy' ? CONVOY_CIRCLES : BOSS_CIRCLES).map(circle => ({
    x: boss.x + circle.x, y: boss.y + circle.y, radius: circle.radius,
    previousX: boss.previousX + circle.x, previousY: boss.previousY + circle.y,
  }));
}
function charge(boss: Boss) {
  boss.mode = 'charging';
  boss.timer = boss.phase === 1 ? 0.8 : 0.6;
  boss.attackSpeed = boss.phase === 1 ? 5 : 6;
  boss.restDuration = boss.phase === 1 ? 1.2 : 0.9;
  boss.shots = 0;
}
function rest(boss: Boss) {
  boss.mode = 'resting';
  boss.timer += boss.restDuration;
  boss.restStartX = boss.x;
  boss.restTarget = [-3, 0, 3][boss.moveIndex++ % 3]!;
  boss.attack = boss.attack === 'aimed' ? 'fan' : 'aimed';
}

// Vrátí požadavky na střely. Hra je vytvoří až po vyřešení zásahů bosse.
export function updateBoss(boss: Boss, dt: number, player: { x: number; y: number }): BossShot[] {
  if (boss.variant === 'fortress') return updateFortressBoss(boss, dt, player);
  if (boss.variant === 'convoy') return updateConvoyBoss(boss, dt, player);
  boss.previousX = boss.x;
  boss.previousY = boss.y;
  boss.hitLeft = Math.max(0, boss.hitLeft - dt);
  const shots: BossShot[] = [];
  if (boss.mode === 'destroyed') return shots;
  if (boss.mode === 'entering') {
    boss.y = Math.max(7, boss.y - boss.speed * dt);
    if (boss.y === 7) charge(boss);
    return shots;
  }
  if (boss.mode === 'resting') {
    const move = Math.min(dt, Math.max(0, boss.timer)) * Math.abs(boss.restTarget - boss.restStartX) / boss.restDuration;
    boss.x += Math.sign(boss.restTarget - boss.x) * Math.min(Math.abs(boss.restTarget - boss.x), move);
  }
  boss.timer -= dt;
  while (boss.timer <= 1e-9) {
    if (boss.mode === 'transitioning') {
      charge(boss);
      break;
    }
    if (boss.mode === 'resting') {
      if (boss.phase === 1 && boss.hp <= boss.maxHp / 2) {
        boss.phase = 2;
        boss.mode = 'transitioning';
        boss.timer += 0.8;
      } else charge(boss);
      break;
    }
    if (boss.mode === 'charging') {
      boss.mode = 'firing';
      const dx = player.x - (boss.x - 1.65);
      const dy = player.y - (boss.y - 1.1);
      const length = Math.hypot(dx, dy);
      boss.aimX = length > 0 ? dx / length : 0;
      boss.aimY = length > 0 ? dy / length : -1;
    }
    if (boss.mode === 'firing' && boss.attack === 'aimed') {
      shots.push({ x: boss.x - 1.65, y: boss.y - 1.1,
        vx: boss.aimX * boss.attackSpeed, vy: boss.aimY * boss.attackSpeed });
      if (++boss.shots === 3) rest(boss);
      else boss.timer += 0.18;
    } else if (boss.mode === 'firing') {
      for (const angle of [-40, -20, 0, 20, 40]) {
        const radians = angle * Math.PI / 180;
        shots.push({ x: boss.x, y: boss.y - 1.3,
          vx: Math.sin(radians) * boss.attackSpeed, vy: -Math.cos(radians) * boss.attackSpeed });
      }
      boss.shots = 5;
      rest(boss);
    }
  }
  return shots;
}
