import { sweepHit } from './collision.ts';
import type { MovingCircle } from './collision.ts';

export const MAX_LIVES = 3;
export const SPREAD_DURATION = 12;
export const FULL_REPAIR_SCORE = 150;
export type PickupKind = 'spread' | 'repair';
export type Pickup = MovingCircle & { id: number; kind: PickupKind; speed: number };
export type BonusState = {
  player: MovingCircle; lives: number; score: number; pickups: Pickup[];
  weaponLeft: number; bonusNotice: PickupKind | 'repairScore' | null; noticeLeft: number;
};

export function createPickup(id: number, kind: PickupKind, x: number, y: number): Pickup {
  return { id, kind, x, y, previousX: x, previousY: y, radius: 0.55, speed: 2.5 };
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
      else if (state.lives < MAX_LIVES) state.lives++;
      else { state.score += FULL_REPAIR_SCORE; state.bonusNotice = 'repairScore'; }
      state.noticeLeft = 2;
      return false;
    }
    return pickup.y + pickup.radius >= -12;
  });
  return collected;
}

export function playerVolley(enhanced: boolean): { offsetX: number; vx: number; vy: number }[] {
  return (enhanced ? [-12, 0, 12] : [0]).map(degrees => {
    const angle = degrees * Math.PI / 180;
    return { offsetX: Math.sign(degrees) * 0.25, vx: Math.sin(angle) * 22, vy: Math.cos(angle) * 22 };
  });
}
