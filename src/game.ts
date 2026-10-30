import { circlesOverlap, sweepHit } from './collision.ts';
import type { MovingCircle } from './collision.ts';
import { LEVEL_DURATION, LEVEL_EVENTS } from './level.ts';
import type { EnemyKind } from './level.ts';

export const WORLD_WIDTH = 18;
export const WORLD_HEIGHT = 24;
export type Body = MovingCircle & { id: number; speed: number };
export type Enemy = Body & {
  kind: EnemyKind; hp: number; phase: 'entering' | 'charging' | 'leaving';
  shotLeft: number; shots: number; hitLeft: number;
};
export type Bullet = Body & { owner: 'player' | 'enemy'; vx: number; vy: number };
export type Input = { x: number; y: number; fire: boolean };
export type Effect = { id: number; x: number; y: number; age: number };
export type GameState = {
  status: 'playing' | 'paused' | 'gameOver' | 'victory';
  score: number; lives: number; time: number;
  nextEvent: number; invulnerabilityLeft: number; cooldown: number;
  nextId: number; tilt: number;
  player: Body; enemies: Enemy[]; bullets: Bullet[]; effects: Effect[];
};

export function createGame(): GameState {
  return {
    status: 'playing', score: 0, lives: 3, time: 0,
    nextEvent: 0, invulnerabilityLeft: 0, cooldown: 0, nextId: 1, tilt: 0,
    player: { id: 0, x: 0, y: -7, previousX: 0, previousY: -7, radius: 0.45, speed: 9 },
    enemies: [], bullets: [], effects: [],
  };
}
export function restartGame(state: GameState): void { Object.assign(state, createGame()); }
export function pauseGame(state: GameState): void { if (state.status === 'playing') state.status = 'paused'; }
export function resumeGame(state: GameState): void { if (state.status === 'paused') state.status = 'playing'; }

function remember(body: Body): void { body.previousX = body.x; body.previousY = body.y; }

export function aimVelocity(from: { x: number; y: number }, target: { x: number; y: number }, speed: number) {
  const dx = target.x - from.x;
  const dy = target.y - from.y;
  const length = Math.hypot(dx, dy);
  return length > 0 ? { vx: dx / length * speed, vy: dy / length * speed } : { vx: 0, vy: -speed };
}
function makeBullet(state: GameState, x: number, y: number, owner: Bullet['owner'], vx: number, vy: number): Bullet {
  return { id: state.nextId++, x, y, previousX: x, previousY: y,
    radius: owner === 'player' ? 0.09 : 0.22, owner, vx, vy, speed: Math.hypot(vx, vy) };
}

export function updateGame(state: GameState, input: Input, elapsed: number): void {
  if (state.status !== 'playing') return;
  const dt = Math.max(0, Math.min(elapsed, 0.05));
  if (dt === 0) return;
  state.time += dt;
  state.effects = state.effects.filter(effect => (effect.age += dt) < 0.35);
  state.invulnerabilityLeft = Math.max(0, state.invulnerabilityLeft - dt);
  state.cooldown = Math.max(0, state.cooldown - dt);
  const length = Math.hypot(input.x, input.y);
  const x = length > 1 ? input.x / length : input.x;
  const y = length > 1 ? input.y / length : input.y;
  const player = state.player;
  remember(player);
  player.x = Math.max(-8, Math.min(8, player.x + x * player.speed * dt));
  player.y = Math.max(-10.5, Math.min(10.5, player.y + y * player.speed * dt));
  state.tilt += (-x * 0.35 - state.tilt) * (1 - Math.exp(-10 * dt));
  if (input.fire && state.cooldown === 0) {
    state.bullets.push(makeBullet(state, player.x, player.y + 1.1, 'player', 0, 22));
    state.cooldown = 0.14;
  }
  while (state.nextEvent < LEVEL_EVENTS.length && LEVEL_EVENTS[state.nextEvent]!.at <= state.time) {
    const event = LEVEL_EVENTS[state.nextEvent++]!;
    state.enemies.push({ id: state.nextId++, x: event.x, y: event.y,
      previousX: event.x, previousY: event.y, radius: event.kind === 'gunner' ? 0.75 : 0.6,
      kind: event.kind, hp: event.kind === 'gunner' ? 2 : 1, speed: 4,
      phase: 'entering', shotLeft: 0.8, shots: 0, hitLeft: 0 });
  }
  const pendingShots: Enemy[] = [];
  for (const enemy of state.enemies) {
    remember(enemy);
    enemy.hitLeft = Math.max(0, enemy.hitLeft - dt);
    if (enemy.kind === 'scout' || enemy.phase === 'leaving') enemy.y -= enemy.speed * dt;
    else if (enemy.phase === 'entering') {
      enemy.y = Math.max(7, enemy.y - enemy.speed * dt);
      if (enemy.y === 7) enemy.phase = 'charging';
    } else {
      enemy.shotLeft -= dt;
      if (enemy.shotLeft <= 0) pendingShots.push(enemy);
    }
  }
  for (const bullet of state.bullets) {
    remember(bullet);
    bullet.x += bullet.vx * dt;
    bullet.y += bullet.vy * dt;
  }
  const deadEnemies = new Set<number>();
  const deadBullets = new Set<number>();
  const hits: { time: number; bullet: Bullet; enemy: Enemy }[] = [];
  for (const bullet of state.bullets) {
    if (bullet.owner !== 'player') continue;
    for (const enemy of state.enemies) {
      const time = sweepHit(bullet, enemy);
      if (time !== null) hits.push({ time, bullet, enemy });
    }
  }
  const explode = (x: number, y: number) => state.effects.push({ id: state.nextId++, x, y, age: 0 });
  hits.sort((a, b) => a.time - b.time || a.bullet.id - b.bullet.id || a.enemy.id - b.enemy.id);
  for (const { bullet, enemy, time } of hits) {
    if (deadBullets.has(bullet.id) || deadEnemies.has(enemy.id)) continue;
    deadBullets.add(bullet.id);
    enemy.hp--;
    enemy.hitLeft = 0.12;
    if (enemy.hp > 0) continue;
    deadEnemies.add(enemy.id);
    state.score += enemy.kind === 'gunner' ? 250 : 100;
    explode(enemy.previousX + (enemy.x - enemy.previousX) * time,
      enemy.previousY + (enemy.y - enemy.previousY) * time);
  }
  const damagePlayer = () => {
    if (state.invulnerabilityLeft > 0) return;
    state.lives--;
    state.invulnerabilityLeft = 1;
  };
  // Všechny dotýkající se střely se spotřebují, i během ochrany hráče.
  const threats = state.bullets.filter(bullet => bullet.owner === 'enemy')
    .map(bullet => ({ bullet, time: sweepHit(bullet, player) }))
    .filter(hit => hit.time !== null).sort((a, b) => a.time! - b.time!);
  for (const { bullet } of threats) { deadBullets.add(bullet.id); damagePlayer(); }
  for (const enemy of state.enemies) {
    if (state.invulnerabilityLeft > 0) break;
    if (!deadEnemies.has(enemy.id) && circlesOverlap(player, enemy)) {
      deadEnemies.add(enemy.id);
      damagePlayer();
      explode(enemy.x, enemy.y);
    }
  }
  state.enemies = state.enemies.filter(enemy => !deadEnemies.has(enemy.id) && enemy.y + enemy.radius >= -12);
  state.bullets = state.bullets.filter(bullet => !deadBullets.has(bullet.id) &&
    Math.abs(bullet.x) <= WORLD_WIDTH / 2 + 1 && Math.abs(bullet.y) <= WORLD_HEIGHT / 2 + 1);
  // Přeživší střelec vystřelí až po kolizích. Projektil se pohne příští krok.
  for (const enemy of pendingShots) {
    if (deadEnemies.has(enemy.id) || state.lives === 0) continue;
    const muzzle = { x: enemy.x, y: enemy.y - 0.8 };
    const { vx, vy } = aimVelocity(muzzle, player, 6);
    state.bullets.push(makeBullet(state, muzzle.x, muzzle.y, 'enemy', vx, vy));
    enemy.shots++;
    enemy.shotLeft = 0.8;
    if (enemy.shots === 3) enemy.phase = 'leaving';
  }
  if (state.lives === 0) state.status = 'gameOver';
  else if (state.time >= LEVEL_DURATION && state.nextEvent === LEVEL_EVENTS.length &&
    state.enemies.length === 0 && !state.bullets.some(bullet => bullet.owner === 'enemy')) state.status = 'victory';
}
