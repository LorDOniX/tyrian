export type GroundWeapon = 'single' | 'twinSteel' | 'twinGold';
export const GROUND_WEAPONS = {
  single: { clip: 'groundCannon', anchorY: 0.375, muzzles: [0] },
  twinSteel: { clip: 'twinSteelCannon', anchorY: 0.3125, muzzles: [-0.22, 0.22] },
  twinGold: { clip: 'twinGoldCannon', anchorY: 0, muzzles: [-0.22, 0.22] },
} as const;

// Obě hlavně míří společně; mění se pouze počáteční poloha střel, ne jejich směr.
export function groundVolley(from: { x: number; y: number }, target: { x: number; y: number }, weapon: GroundWeapon) {
  const dx = target.x - from.x, dy = target.y - from.y;
  const distance = Math.hypot(dx, dy);
  const nx = distance > 0 ? dx / distance : 0;
  const ny = distance > 0 ? dy / distance : -1;
  const forward = Math.min(1.05, distance);
  return GROUND_WEAPONS[weapon].muzzles.map(offset => ({
    x: from.x + nx * forward - ny * offset,
    y: from.y + ny * forward + nx * offset,
    vx: nx * 6, vy: ny * 6,
  }));
}
