import type { Boss, BossShot } from './boss.ts';

// Silueta newsho: široký trup a dvě úzké hlavně směřující dolů.
export const FORTRESS_CIRCLES = [
  { x: 0, y: 0.6, radius: 1.7 },
  { x: -2.7, y: 0.9, radius: 1.25 }, { x: 2.7, y: 0.9, radius: 1.25 },
  { x: -2.13, y: -1.9, radius: 0.45 }, { x: 2.13, y: -1.9, radius: 0.45 },
] as const;
function charge(boss: Boss) {
  boss.mode = 'charging';
  boss.timer = boss.phase === 1 ? 1 : 0.75;
  boss.attackSpeed = boss.phase === 1 ? 5 : 6;
  boss.restDuration = boss.phase === 1 ? 1.4 : 1.1;
  boss.shots = 0;
}
function rest(boss: Boss) {
  boss.mode = 'resting';
  boss.timer += boss.restDuration;
  boss.restStartX = boss.x;
  boss.restTarget = [-2, 0, 2][boss.moveIndex++ % 3]!;
  boss.attack = boss.attack === 'sweep' ? 'curtain' : boss.attack === 'curtain' ? 'spiral' : 'sweep';
}
export function updateFortressBoss(boss: Boss, dt: number, player: { x: number; y: number }): BossShot[] {
  boss.previousX = boss.x;
  boss.previousY = boss.y;
  boss.hitLeft = Math.max(0, boss.hitLeft - dt);
  const shots: BossShot[] = [];
  if (boss.mode === 'destroyed') return shots;
  if (boss.mode === 'entering') {
    boss.y = Math.max(6, boss.y - boss.speed * dt);
    if (boss.y === 6) charge(boss);
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
        boss.timer += 1;
      } else charge(boss);
      break;
    }
    if (boss.mode === 'charging') boss.mode = 'firing';
    if (boss.mode !== 'firing') break;
    if (boss.attack === 'sweep') {
      // Každá dvojice zamíří znovu; už vypálené projektily drží směr.
      for (const offset of [-2.13, 2.13]) {
        const x = boss.x + offset;
        const y = boss.y - 2.5;
        const dx = player.x - x, dy = player.y - y;
        const length = Math.hypot(dx, dy);
        shots.push({ x, y, vx: length ? dx / length * boss.attackSpeed : 0,
          vy: length ? dy / length * boss.attackSpeed : -boss.attackSpeed });
      }
      if (++boss.shots >= (boss.phase === 1 ? 4 : 6)) rest(boss);
      else boss.timer += 0.28;
    } else if (boss.attack === 'curtain') {
      // Vějíř má mezery; druhá salva je pootočená o půl rozteče.
      for (const offset of [-2.13, 2.13]) {
        for (const angle of [-36, -12, 12, 36]) {
          const radians = (angle + (boss.shots % 2 ? 12 : 0)) * Math.PI / 180;
          shots.push({ x: boss.x + offset, y: boss.y - 2.5,
            vx: Math.sin(radians) * boss.attackSpeed, vy: -Math.cos(radians) * boss.attackSpeed });
        }
      }
      if (++boss.shots >= (boss.phase === 1 ? 2 : 3)) rest(boss);
      else boss.timer += 0.55;
    } else {
      for (let i = 0; i < 10; i++) {
        const radians = (i * 36 + boss.shots * 12) * Math.PI / 180;
        shots.push({ x: boss.x, y: boss.y - 0.7,
          vx: Math.sin(radians) * (boss.attackSpeed - 1), vy: -Math.cos(radians) * (boss.attackSpeed - 1) });
      }
      if (++boss.shots >= (boss.phase === 1 ? 3 : 4)) rest(boss);
      else boss.timer += 0.35;
    }
  }
  return shots;
}
