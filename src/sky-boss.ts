import type { Boss, BossShot } from './boss.ts';

// Kruhy sledují souvislý trup a dvě křídla rudého letounu.
export const SKY_CIRCLES = [
  { x: 0, y: 0, radius: 1.8 },
  { x: 0, y: -1.9, radius: 0.9 },
  { x: -2.2, y: 0.5, radius: 1.1 }, { x: 2.2, y: 0.5, radius: 1.1 },
] as const;
function charge(boss: Boss) {
  boss.mode = 'charging';
  boss.timer = boss.phase === 1 ? 0.85 : 0.6;
  boss.attackSpeed = boss.phase === 1 ? 6.8 : 7.8;
  boss.restDuration = boss.phase === 1 ? 1 : 0.75;
  boss.shots = 0;
}
function rest(boss: Boss) {
  boss.mode = 'resting';
  boss.timer += boss.restDuration;
  boss.restStartX = boss.x;
  boss.restTarget = [-3.5, 3.5, 0][boss.moveIndex++ % 3]!;
  boss.attack = boss.attack === 'pincer' ? 'lattice' : boss.attack === 'lattice' ? 'helix' : 'pincer';
}
export function updateSkyBoss(boss: Boss, dt: number, player: { x: number; y: number }): BossShot[] {
  boss.previousX = boss.x;
  boss.previousY = boss.y;
  boss.hitLeft = Math.max(0, boss.hitLeft - dt);
  const shots: BossShot[] = [];
  if (boss.mode === 'destroyed') return shots;
  if (boss.mode === 'entering') {
    boss.y = Math.max(6.5, boss.y - boss.speed * dt);
    if (boss.y === 6.5) charge(boss);
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
        boss.timer += 0.8;
      } else charge(boss);
      break;
    }
    if (boss.mode === 'charging') {
      boss.mode = 'firing';
      boss.targetX = player.x;
      boss.targetY = player.y;
    }
    if (boss.mode !== 'firing') break;
    if (boss.attack === 'pincer') {
      for (const offset of [-2.2, 2.2]) {
        const x = boss.x + offset, y = boss.y - 0.9;
        const dx = boss.targetX - x, dy = boss.targetY - y;
        const aim = Math.hypot(dx, dy) > 0 ? Math.atan2(dx, -dy) : 0;
        // Střídání sevře původní polohu hráče, ale dál ho nepronásleduje.
        const angle = aim + Math.sign(offset) * (boss.shots % 2 ? 7 : -7) * Math.PI / 180;
        shots.push({ x, y, vx: Math.sin(angle) * boss.attackSpeed, vy: -Math.cos(angle) * boss.attackSpeed });
      }
      if (++boss.shots >= (boss.phase === 1 ? 3 : 5)) rest(boss);
      else boss.timer += 0.2;
    } else if (boss.attack === 'lattice') {
      for (const angle of [-54, -36, -18, 0, 18, 36, 54]) {
        const radians = (angle + (boss.shots % 2 ? 9 : 0)) * Math.PI / 180;
        shots.push({ x: boss.x, y: boss.y - 2,
          vx: Math.sin(radians) * boss.attackSpeed, vy: -Math.cos(radians) * boss.attackSpeed });
      }
      if (++boss.shots >= (boss.phase === 1 ? 2 : 3)) rest(boss);
      else boss.timer += 0.38;
    } else {
      const count = boss.phase === 1 ? 8 : 10;
      for (let i = 0; i < count; i++) {
        const radians = (i * 360 / count + boss.shots * 23) * Math.PI / 180;
        const speed = boss.attackSpeed - 1.2;
        shots.push({ x: boss.x, y: boss.y - 1.5,
          vx: Math.sin(radians) * speed, vy: -Math.cos(radians) * speed });
      }
      if (++boss.shots >= (boss.phase === 1 ? 3 : 4)) rest(boss);
      else boss.timer += 0.26;
    }
  }
  return shots;
}
