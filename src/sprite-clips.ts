import { PLAYER_SHIP_CLIPS } from './player-ships.ts';

// Výřezy zdrojů jsou v pixelech od levého horního rohu, indexované od nuly.
// Malé snímky mají buňky 32 × 32, velké trupy vlastní obdélníkové oblasti.
export const ATLAS = { width: 512, height: 512, cell: 32, columns: 16 } as const;
const fx = 'newsh6.shp.000000.png';
const weapons = 'newsh(.shp.000000.png';
const row = (source: string, y: number, columns: number[]) =>
  columns.map(x => ({ source, x: x * 12, y: y * 14, width: 12, height: 14 }));

const shipFrames = (y: number) => [0, 48, 96].map(x => ({
  source: 'newsh$.shp.000000.png', x, y, width: 24, height: 28,
}));

export const SPRITE_CLIPS = {
  ...PLAYER_SHIP_CLIPS,
  weaverShip: { start: 53, fps: 1, loop: true, size: 2.3, width: 1, referenceCell: 32, frames: shipFrames(84) },
  strikerShip: { start: 56, fps: 1, loop: true, size: 2.6, width: 1, referenceCell: 32, frames: shipFrames(112) },
  fortressBoss: { start: 59, fps: 1, loop: true, size: 6.4, width: 208 / 144, referenceCell: 32,
    frames: [{ source: 'newsho.shp.000000.png', x: 0, y: 0, width: 192, height: 140 }] },
  convoyBoss: { start: 49, fps: 1, loop: true, size: 3.2, width: 2.5, referenceCell: 32,
    frames: [0, 84].map(y => ({ source: 'newsht.shp.000000.png', x: 0, y, width: 144, height: 56 })) },
  convoyLeftGun: { start: 51, fps: 1, loop: true, size: 1.6, width: 1, referenceCell: 32,
    frames: [{ source: 'newsht.shp.000000.png', x: 24, y: 56, width: 24, height: 28 }] },
  convoyRightGun: { start: 52, fps: 1, loop: true, size: 1.6, width: 1, referenceCell: 32,
    frames: [{ source: 'newsht.shp.000000.png', x: 120, y: 56, width: 24, height: 28 }] },
  airship: { start: 47, fps: 1, loop: true, size: 8, width: 0.8, referenceCell: 32,
    frames: [0, 96].map(x => ({ source: 'newshi.shp.000000.png', x, y: 0, width: 96, height: 140 })) },
  scoutShip: { start: 32, fps: 1, loop: true, size: 2, width: 1, referenceCell: 32, frames: shipFrames(0) },
  gunnerShip: { start: 35, fps: 1, loop: true, size: 2.3, width: 1, referenceCell: 32, frames: shipFrames(28) },
  interceptorShip: { start: 38, fps: 1, loop: true, size: 2.1, width: 1, referenceCell: 32, frames: shipFrames(140) },
  spreaderShip: { start: 41, fps: 1, loop: true, size: 2.5, width: 1, referenceCell: 32, frames: shipFrames(56) },
  pulsarShip: { start: 44, fps: 1, loop: true, size: 2.7, width: 1, referenceCell: 32, frames: shipFrames(168) },
  explosion: { start: 0, fps: 30, loop: false, size: 2.8, width: 1, referenceCell: 16,
    frames: row(fx, 6, [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18]) },
  impact: { start: 13, fps: 35, loop: false, size: 1.15, width: 1, referenceCell: 16,
    frames: row(fx, 5, [6, 7, 8, 9, 10]) },
  playerShot: { start: 18, fps: 12, loop: true, size: 0.75, width: 0.28, referenceCell: 16,
    frames: row(weapons, 13, [17]) },
  enemyShot: { start: 19, fps: 10, loop: true, size: 0.85, width: 1, referenceCell: 16,
    frames: row(weapons, 8, [15, 16]) },
  spreadPickup: { start: 26, fps: 8, loop: true, size: 1.8, width: 1, referenceCell: 16,
    frames: row('tyrian.shp.01673F.png', 0, [13, 14, 15]) },
  repairPickup: { start: 29, fps: 8, loop: true, size: 1.8, width: 1, referenceCell: 16,
    frames: row('tyrian.shp.01673F.png', 1, [12, 13, 14]) },
  shield: { start: 21, fps: 30, loop: false, size: 1.2, width: 1, referenceCell: 16,
    frames: row(weapons, 11, [15, 16, 17, 16, 15]) },
} as const;
export type SpriteClip = keyof typeof SPRITE_CLIPS;
export type EffectKind = 'explosion' | 'impact' | 'shield';

export function clipDuration(name: SpriteClip): number {
  const clip = SPRITE_CLIPS[name];
  return clip.frames.length / clip.fps;
}

// Jednorázová animace po posledním snímku zanikne; smyčka se vrací na začátek.
export function spriteFrame(name: SpriteClip, age: number): number | null {
  const clip = SPRITE_CLIPS[name];
  const frame = Math.floor(Math.max(0, age) * clip.fps + 1e-9);
  if (!clip.loop && frame >= clip.frames.length) return null;
  return clip.start + frame % clip.frames.length;
}

// Velké trupy mají vlastní obdélníky pod řadami malých snímků.
export function atlasRegion(index: number) {
  // Nové malé lodě vyplňují tři volné spodní řady atlasu.
  if (index >= 60 && index <= 100) return { x: (index - 60) % 16 * 32,
    y: 416 + Math.floor((index - 60) / 16) * 32, width: index === 100 ? 64 : 32, height: 32 };
  if (index === 59) return { x: 256, y: 256, width: 208, height: 144 };
  if (index === 49 || index === 50) return { x: 256, y: 128 + (index - 49) * 64, width: 160, height: 64 };
  if (index === 47 || index === 48) return { x: (index - 47) * 128, y: 128, width: 128, height: 160 };
  return { x: index % ATLAS.columns * ATLAS.cell, y: Math.floor(index / ATLAS.columns) * ATLAS.cell,
    width: ATLAS.cell, height: ATLAS.cell };
}
export function frameUV(index: number) {
  const region = atlasRegion(index);
  return {
    left: region.x / ATLAS.width,
    right: (region.x + region.width) / ATLAS.width,
    bottom: 1 - (region.y + region.height) / ATLAS.height,
    top: 1 - region.y / ATLAS.height,
  };
}
