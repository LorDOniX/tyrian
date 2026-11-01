// Herní názvy popisují vzhled; každý trup sdílí stejné herní vlastnosti.
const source = 'tyrian.shp.007D3C.png';
const poses = (y: number, x = 0) => Array.from({ length: 5 }, (_, i) => ({ source, x: x + i * 24, y, width: 24, height: 28 }));
const clip = (start: number, y: number) => ({ start, fps: 1, loop: true, size: 2.4, width: 1, referenceCell: 32, frames: poses(y) });
export const PLAYER_SHIP_CLIPS = {
  playerSilver: clip(60, 56),
  playerCarrot: clip(65, 84),
  playerArmored: clip(70, 112),
  playerCrescent: clip(75, 140),
  playerGold: clip(80, 168),
  playerFork: { ...clip(85, 196), frames: [...poses(0, 96), ...poses(196), ...poses(28, 96)] },
  playerDelta: { start: 100, fps: 1, loop: true, size: 1.6, width: 2, referenceCell: 32,
    frames: [{ source, x: 120, y: 154, width: 48, height: 28 }] },
} as const;
export type PlayerShipId = keyof typeof PLAYER_SHIP_CLIPS;
export const PLAYER_SHIPS: readonly { id: PlayerShipId; name: string }[] = [
  { id: 'playerSilver', name: 'Stříbrná' },
  { id: 'playerCarrot', name: 'Mrkev' },
  { id: 'playerArmored', name: 'Obrněná' },
  { id: 'playerCrescent', name: 'Půlměsíc' },
  { id: 'playerGold', name: 'Zlatá' },
  { id: 'playerFork', name: 'Vidlice' },
  { id: 'playerDelta', name: 'Delta' },
];
export const DEFAULT_PLAYER_SHIP: PlayerShipId = PLAYER_SHIPS[0]!.id;

// Náklon hry je opačný ke směru pohybu; nulový náklon = prostřední snímek.
export function playerShipPose(id: PlayerShipId, tilt: number): number {
  const count = PLAYER_SHIP_CLIPS[id].frames.length;
  const center = (count - 1) / 2;
  return Math.round(center - Math.max(-1, Math.min(1, tilt / 0.35)) * center);
}
