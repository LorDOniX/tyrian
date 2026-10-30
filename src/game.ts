import { circlesOverlap, sweepHit } from './collision.ts';
import type { MovingCircle } from './collision.ts';

export const WORLD_WIDTH = 18;
export const WORLD_HEIGHT = 24;
export type Body = MovingCircle & { id: number; speed: number };
export type Input = { x: number; y: number; fire: boolean };
export type Effect = { id: number; x: number; y: number; age: number };
export type GameState = {
  status: 'playing' | 'paused' | 'gameOver';
  score: number; lives: number; time: number;
  invulnerabilityLeft: number; spawnLeft: number; cooldown: number;
  nextId: number; tilt: number;
  player: Body; enemies: Body[]; bullets: Body[]; effects: Effect[];
};

export function createGame(): GameState {
  return {
    status: 'playing', score: 0, lives: 3, time: 0,
    invulnerabilityLeft: 0, spawnLeft: 1.2, cooldown: 0, nextId: 1, tilt: 0,
    player: { id: 0, x: 0, y: -7, previousX: 0, previousY: -7, radius: 0.45, speed: 9 },
    enemies: [], bullets: [], effects: [],
  };
}

export function restartGame(state: GameState): void {
  Object.assign(state, createGame());
}

export function pauseGame(state: GameState): void {
  if (state.status === 'playing') state.status = 'paused';
}

export function resumeGame(state: GameState): void {
  if (state.status === 'paused') state.status = 'playing';
}

function remember(body: Body): void {
  body.previousX = body.x;
  body.previousY = body.y;
}

export function updateGame(state: GameState, input: Input, elapsed: number, random = Math.random): void {
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
    state.bullets.push({ id: state.nextId++, x: player.x, y: player.y + 1.1,
      previousX: player.x, previousY: player.y + 1.1, radius: 0.09, speed: 22 });
    state.cooldown = 0.14;
  }
  state.spawnLeft -= dt;
  if (state.spawnLeft <= 0) {
    const x = random() * 14 - 7;
    state.enemies.push({ id: state.nextId++, x, y: 13, previousX: x,
      previousY: 13, radius: 0.6, speed: 4 });
    state.spawnLeft += 1.2;
  }
  for (const enemy of state.enemies) { remember(enemy); enemy.y -= enemy.speed * dt; }
  for (const bullet of state.bullets) { remember(bullet); bullet.y += bullet.speed * dt; }

  const deadEnemies = new Set<number>();
  const deadBullets = new Set<number>();
  // Časové pořadí zásahů zamezí závislosti na pořadí polí střel a nepřátel.
  const hits: { time: number; bullet: Body; enemy: Body }[] = [];
  for (const bullet of state.bullets) {
    for (const enemy of state.enemies) {
      const time = sweepHit(bullet, enemy);
      if (time !== null) hits.push({ time, bullet, enemy });
    }
  }
  const explode = (x: number, y: number) => {
    state.effects.push({ id: state.nextId++, x, y, age: 0 });
  };
  hits.sort((a, b) => a.time - b.time || a.bullet.id - b.bullet.id || a.enemy.id - b.enemy.id);
  for (const { bullet, enemy, time } of hits) {
    if (deadBullets.has(bullet.id) || deadEnemies.has(enemy.id)) continue;
    deadBullets.add(bullet.id);
    deadEnemies.add(enemy.id);
    state.score += 100;
    explode(enemy.previousX + (enemy.x - enemy.previousX) * time,
      enemy.previousY + (enemy.y - enemy.previousY) * time);
  }
  for (const enemy of state.enemies) {
    if (state.invulnerabilityLeft > 0) break;
    if (!deadEnemies.has(enemy.id) && circlesOverlap(player, enemy)) {
      deadEnemies.add(enemy.id);
      state.lives--;
      state.invulnerabilityLeft = 1;
      explode(enemy.x, enemy.y);
    }
  }
  state.enemies = state.enemies.filter(enemy => !deadEnemies.has(enemy.id) && enemy.y + enemy.radius >= -12);
  state.bullets = state.bullets.filter(bullet => !deadBullets.has(bullet.id) && bullet.y < 13);
  if (state.lives === 0) state.status = 'gameOver';
}
