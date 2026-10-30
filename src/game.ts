import { clipDuration } from './sprite-clips.ts';
import type { EffectKind } from './sprite-clips.ts';
import { createBoss, updateBoss, bossCircles } from './boss.ts';
import type { Boss } from './boss.ts';
import { circlesOverlap, sweepHit } from './collision.ts';
import type { MovingCircle } from './collision.ts';
import { LEVEL_DURATION, LEVEL_EVENTS, GROUND_TARGETS } from './level.ts';
import type { EnemyKind } from './level.ts';

export const WORLD_WIDTH = 18;
export const WORLD_HEIGHT = 24;
export type Body = MovingCircle & { id: number; speed: number };
export type Enemy = Body & {
  kind: EnemyKind; hp: number; phase: 'entering' | 'charging' | 'leaving';
  shotLeft: number; shots: number; hitLeft: number;
};
export const SCROLL_SPEED = 4;
export const TURRET_EXTENT = 1.2;
export type GroundTarget = Body & {
  kind: 'turret'; levelY: number; hp: number; shotLeft: number; hitLeft: number;
};
export type Wreck = { id: number; x: number; levelY: number; y: number };
export type Bullet = Body & { owner: 'player' | 'enemy'; vx: number; vy: number };
export type Input = { x: number; y: number; fire: boolean };
export type Effect = { id: number; x: number; y: number; age: number; kind: EffectKind; scale: number };
export type GameState = {
  missionStage: 'waves' | 'warning' | 'boss' | 'bossDestroyed';
  stageTimer: number; boss: Boss | null;
  status: 'playing' | 'paused' | 'gameOver' | 'victory';
  score: number; lives: number; time: number; scrollDistance: number; nextGround: number;
  nextEvent: number; invulnerabilityLeft: number; cooldown: number;
  nextId: number; tilt: number;
  player: Body; groundTargets: GroundTarget[]; wrecks: Wreck[]; enemies: Enemy[]; bullets: Bullet[]; effects: Effect[];
};

export function createGame(startAtBoss = false): GameState {
  return {
    missionStage: startAtBoss ? 'warning' : 'waves', stageTimer: startAtBoss ? 1.5 : 0, boss: null,
    status: 'playing', score: 0, lives: 3, time: startAtBoss ? LEVEL_DURATION : 0,
    scrollDistance: startAtBoss ? LEVEL_DURATION * SCROLL_SPEED : 0, nextGround: startAtBoss ? GROUND_TARGETS.length : 0,
    nextEvent: startAtBoss ? LEVEL_EVENTS.length : 0, invulnerabilityLeft: 0, cooldown: 0, nextId: 1, tilt: 0,
    player: { id: 0, x: 0, y: -7, previousX: 0, previousY: -7, radius: 0.45, speed: 9 },
    groundTargets: [], wrecks: [], enemies: [], bullets: [], effects: [],
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
  if (state.status === 'paused') return;
  const dt = Math.max(0, Math.min(elapsed, 0.05));
  if (dt === 0) return;
  // Po výsledku doběhnou pouze již vytvořené efekty, herní svět stojí.
  state.effects = state.effects.filter(effect => (effect.age += dt) < clipDuration(effect.kind));
  if (state.status !== 'playing') return;
  if (state.lives <= 0) { state.status = 'gameOver'; return; }
  state.time += dt;
  if (state.missionStage === 'warning') {
    state.stageTimer -= dt;
    if (state.stageTimer <= 0) {
      state.missionStage = 'boss';
      state.boss = createBoss(state.nextId++);
    }
  }
  const previousDistance = state.scrollDistance;
  state.scrollDistance += SCROLL_SPEED * dt;
  while (state.nextGround < GROUND_TARGETS.length &&
    GROUND_TARGETS[state.nextGround]!.levelY - state.scrollDistance <= 13) {
    const target = GROUND_TARGETS[state.nextGround++]!;
    state.groundTargets.push({ id: state.nextId++, kind: 'turret', x: target.x,
      levelY: target.levelY, y: target.levelY - previousDistance,
      previousX: target.x, previousY: target.levelY - previousDistance,
      radius: 0.7, speed: SCROLL_SPEED, hp: 2, shotLeft: 1.5, hitLeft: 0 });
  }
  const pendingGround: GroundTarget[] = [];
  for (const target of state.groundTargets) {
    remember(target);
    target.y = target.levelY - state.scrollDistance;
    target.hitLeft = Math.max(0, target.hitLeft - dt);
    if (target.y + TURRET_EXTENT <= 12 && target.y - TURRET_EXTENT >= -12) {
      target.shotLeft -= dt;
      if (target.shotLeft <= 0) pendingGround.push(target);
    }
  }
  state.wrecks = state.wrecks.filter(wreck => {
    wreck.y = wreck.levelY - state.scrollDistance;
    return wreck.y >= -13;
  });
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
  if (state.missionStage === 'bossDestroyed') {
    const previous = state.stageTimer;
    state.stageTimer = Math.max(0, previous - dt);
    if (Math.floor(previous / 0.15) !== Math.floor(state.stageTimer / 0.15) && state.boss) {
      const offset = Math.floor(previous / 0.15) % 3 - 1;
      state.effects.push({ id: state.nextId++, x: state.boss.x + offset * 1.5, y: state.boss.y + offset * 0.5, age: 0, kind: 'explosion', scale: 1.2 });
    }
    if (state.stageTimer === 0) state.status = 'victory';
    return;
  }
  const pendingBossShots = state.boss ? updateBoss(state.boss, dt, player) : [];
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
  const hits: { time: number; bullet: Bullet; enemy: Enemy | GroundTarget | Boss }[] = [];
  for (const bullet of state.bullets) {
    if (bullet.owner !== 'player') continue;
    for (const enemy of [...state.enemies, ...state.groundTargets]) {
      const time = sweepHit(bullet, enemy);
      if (time !== null) hits.push({ time, bullet, enemy });
    }
  }
  if (state.boss && state.boss.mode !== 'destroyed') {
    for (const bullet of state.bullets) {
      if (bullet.owner !== 'player') continue;
      const times = bossCircles(state.boss).map(circle => sweepHit(bullet, circle))
        .filter((time): time is number => time !== null);
      if (times.length) hits.push({ time: Math.min(...times), bullet, enemy: state.boss });
    }
  }
  const effect = (kind: EffectKind, x: number, y: number, scale = 1) =>
    state.effects.push({ id: state.nextId++, x, y, age: 0, kind, scale });
  const explode = (x: number, y: number) => effect('explosion', x, y);
  const hitPosition = (body: Body, time: number) => ({
    x: body.previousX + (body.x - body.previousX) * time,
    y: body.previousY + (body.y - body.previousY) * time,
  });
  hits.sort((a, b) => a.time - b.time || a.bullet.id - b.bullet.id || a.enemy.id - b.enemy.id);
  for (const { bullet, enemy, time } of hits) {
    if (deadBullets.has(bullet.id) || deadEnemies.has(enemy.id)) continue;
    deadBullets.add(bullet.id);
    const contact = hitPosition(bullet, time);
    if (enemy.kind === 'boss' && enemy.mode === 'entering') {
      effect('shield', contact.x, contact.y);
      continue;
    }
    enemy.hp--;
    enemy.hitLeft = 0.12;
    if (enemy.hp > 0) {
      effect('impact', contact.x, contact.y);
      continue;
    }
    deadEnemies.add(enemy.id);
    if (enemy.kind === 'boss') {
      enemy.hp = 0;
      enemy.mode = 'destroyed';
      state.missionStage = 'bossDestroyed';
      state.stageTimer = 1;
      state.bullets = state.bullets.filter(bullet => bullet.owner === 'player');
    }
    if (enemy.kind === 'turret') state.wrecks.push({ id: enemy.id, x: enemy.x, levelY: enemy.levelY, y: enemy.y });
    state.score += enemy.kind === 'boss' ? 2000 : enemy.kind === 'turret' ? 200 : enemy.kind === 'gunner' ? 250 : 100;
    explode(enemy.previousX + (enemy.x - enemy.previousX) * time,
      enemy.previousY + (enemy.y - enemy.previousY) * time);
  }
  const damagePlayer = () => {
    if (state.invulnerabilityLeft > 0) return;
    state.lives--;
    effect(state.lives === 0 ? 'explosion' : 'impact', player.x, player.y, state.lives === 0 ? 1 : 1.5);
    state.invulnerabilityLeft = 1;
  };
  // Všechny dotýkající se střely se spotřebují, i během ochrany hráče.
  const threats = state.bullets.filter(bullet => bullet.owner === 'enemy')
    .map(bullet => ({ bullet, time: sweepHit(bullet, player) }))
    .filter(hit => hit.time !== null).sort((a, b) => a.time! - b.time!);
  for (const { bullet, time } of threats) {
    deadBullets.add(bullet.id);
    if (state.invulnerabilityLeft > 0) {
      const contact = hitPosition(bullet, time!);
      effect('shield', contact.x, contact.y);
    } else damagePlayer();
  }
  for (const enemy of state.enemies) {
    if (state.invulnerabilityLeft > 0) break;
    if (!deadEnemies.has(enemy.id) && circlesOverlap(player, enemy)) {
      deadEnemies.add(enemy.id);
      damagePlayer();
      explode(enemy.x, enemy.y);
    }
  }
  if (state.boss && state.boss.mode !== 'entering' && state.boss.mode !== 'destroyed' &&
    bossCircles(state.boss).some(circle => circlesOverlap(player, circle))) damagePlayer();
  state.groundTargets = state.groundTargets.filter(target => !deadEnemies.has(target.id) && target.y + TURRET_EXTENT >= -12);
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
  for (const target of pendingGround) {
    if (deadEnemies.has(target.id) || state.lives === 0) continue;
    const { vx, vy } = aimVelocity(target, player, 6);
    // Ústí hlavně je 1,05 jednotky od středu. Zblízka nepřeskočíme hráče.
    const muzzleOffset = Math.min(1.05, Math.hypot(player.x - target.x, player.y - target.y));
    state.bullets.push(makeBullet(state, target.x + vx / 6 * muzzleOffset,
      target.y + vy / 6 * muzzleOffset, 'enemy', vx, vy));
    target.shotLeft = 1.5;
  }
  if (state.boss?.mode !== 'destroyed' && state.lives > 0) {
    for (const shot of pendingBossShots) state.bullets.push(makeBullet(state, shot.x, shot.y, 'enemy', shot.vx, shot.vy));
  }
  if (state.lives === 0) state.status = 'gameOver';
  else if (state.missionStage === 'waves' && state.time >= LEVEL_DURATION && state.nextEvent === LEVEL_EVENTS.length &&
    state.enemies.length === 0 && state.nextGround === GROUND_TARGETS.length &&
    state.groundTargets.length === 0 && !state.bullets.some(bullet => bullet.owner === 'enemy')) {
    state.missionStage = 'warning';
    state.stageTimer = 1.5;
  }
}
