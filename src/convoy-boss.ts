import type { Boss, BossShot } from './boss.ts';

export const CONVOY_CIRCLES = [
  { x: 0, y: 0.15, radius: 1.2 },
  { x: -1.7, y: 0.25, radius: 0.8 }, { x: 1.7, y: 0.25, radius: 0.8 },
  { x: -3, y: -0.3, radius: 0.65 }, { x: 3, y: -0.3, radius: 0.65 },
] as const;

export function convoyBossFrame(boss: Boss): number { return boss.hp <= boss.maxHp / 2 ? 1 : 0; }
function charge(boss: Boss) {
  boss.mode = 'charging';
  boss.timer = boss.phase === 1 ? 0.95 : 0.7;
  boss.attackSpeed = boss.phase === 1 ? 5 : 6;
  boss.restDuration = boss.phase === 1 ? 1.3 : 1;
  boss.shots = 0;
}
function rest(boss: Boss) {
  boss.mode = 'resting';
  boss.timer += boss.restDuration;
  boss.restStartX = boss.x;
  boss.restTarget = [-2.5, 0, 2.5][boss.moveIndex++ % 3]!;
  boss.attack = boss.attack === 'crossfire' ? 'barrage' : boss.attack === 'barrage' ? 'pulse' : 'crossfire';
}
export function updateConvoyBoss(boss: Boss, dt: number, player: { x: number; y: number }): BossShot[] {
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
    const distance = Math.min(dt, Math.max(0, boss.timer)) * Math.abs(boss.restTarget - boss.restStartX) / boss.restDuration;
    boss.x += Math.sign(boss.restTarget - boss.x) * Math.min(Math.abs(boss.restTarget - boss.x), distance);
  }
  boss.timer -= dt;
  while (boss.timer <= 1e-9) {
    if (boss.mode === 'transitioning') { charge(boss); break; }
    if (boss.mode === 'resting') {
      if (boss.phase === 1 && boss.hp <= boss.maxHp / 2) {
        boss.phase = 2;
        boss.mode = 'transitioning';
        boss.timer += 0.9;
      } else charge(boss);
      break;
    }
    if (boss.mode === 'charging') {
      boss.mode = 'firing';
      boss.targetX = player.x;
      boss.targetY = player.y;
    }
    if (boss.mode !== 'firing') break;
    if (boss.attack === 'crossfire') {
      for (const offset of [-3, 3]) {
        const x = boss.x + offset;
        const y = boss.y - 0.9;
        const dx = boss.targetX - x;
        const dy = boss.targetY - y;
        const length = Math.hypot(dx, dy);
        shots.push({ x, y, vx: length > 0 ? dx / length * boss.attackSpeed : 0,
          vy: length > 0 ? dy / length * boss.attackSpeed : -boss.attackSpeed });
      }
      if (++boss.shots === 3) rest(boss);
      else boss.timer += 0.22;
    } else if (boss.attack === 'barrage') {
      for (const offset of [-3, 3]) {
        for (const angle of [-18, 0, 18]) {
          const radians = (angle - Math.sign(offset) * 10) * Math.PI / 180;
          const speed = boss.attackSpeed - 0.3;
          shots.push({ x: boss.x + offset, y: boss.y - 0.9, vx: Math.sin(radians) * speed, vy: -Math.cos(radians) * speed });
        }
      }
      if (++boss.shots === 2) rest(boss);
      else boss.timer += 0.42;
    } else {
      for (let i = 0; i < 12; i++) {
        const radians = (i * 30 + (boss.moveIndex % 2) * 15) * Math.PI / 180;
        const speed = boss.attackSpeed - 0.8;
        shots.push({ x: boss.x, y: boss.y - 1.2, vx: Math.sin(radians) * speed, vy: -Math.cos(radians) * speed });
      }
      boss.shots = 1;
      rest(boss);
    }
  }
  return shots;
}
