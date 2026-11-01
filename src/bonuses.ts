import { maxLives, weaponGunCount } from './upgrades.ts';
import type { Upgrades } from './upgrades.ts';
import { sweepHit } from './collision.ts';
import type { MovingCircle } from './collision.ts';

export const SPREAD_DURATION = 12;
export const FULL_REPAIR_SCORE = 150;
export const PICKUP_SCALE = 0.75;
export type PickupKind = 'spread' | 'repair';
export type Pickup = MovingCircle & { id: number; kind: PickupKind; speed: number };
export type BonusState = {
  player: MovingCircle; lives: number; upgrades: Upgrades; score: number; pickups: Pickup[];
  weaponLeft: number; bonusNotice: PickupKind | 'repairScore' | null; noticeLeft: number;
};

export function createPickup(id: number, kind: PickupKind, x: number, y: number): Pickup {
  return { id, kind, x, y, previousX: x, previousY: y, radius: 0.55 * PICKUP_SCALE, speed: 2.5 };
}

// Existující předměty se sbírají před střelbou a poškozením v tomto kroku.
// Nový drop se vytvoří později při zničení cíle a pohne se až příští krok.
export function updateBonuses(state: BonusState, dt: number): Pickup[] {
  state.weaponLeft = Math.max(0, state.weaponLeft - dt);
  state.noticeLeft = Math.max(0, state.noticeLeft - dt);
  if (state.noticeLeft === 0) state.bonusNotice = null;
  const collected: Pickup[] = [];
  state.pickups = state.pickups.filter(pickup => {
    pickup.previousX = pickup.x;
    pickup.previousY = pickup.y;
    pickup.y -= pickup.speed * dt;
    if (sweepHit(pickup, state.player) !== null) {
      collected.push(pickup);
      state.bonusNotice = pickup.kind;
      if (pickup.kind === 'spread') state.weaponLeft = SPREAD_DURATION;
      else if (state.lives < maxLives(state.upgrades)) state.lives++;
      else { state.score += FULL_REPAIR_SCORE; state.bonusNotice = 'repairScore'; }
      state.noticeLeft = 2;
      return false;
    }
    return pickup.y + pickup.radius >= -12;
  });
  return collected;
}

// Všechna děla leží v jedné řadě a pálí rovnoběžně dopředu.
export function playerVolley(enhanced: boolean, weaponLevel = 0): { offsetX: number; vx: number; vy: number }[] {
  const count = weaponGunCount(weaponLevel, enhanced);
  return Array.from({ length: count }, (_, i) => ({ offsetX: (i - (count - 1) / 2) * 0.32, vx: 0, vy: 22 }));
}
