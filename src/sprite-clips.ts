// Výřezy zdrojů jsou v pixelech od levého horního rohu, indexované od nuly.
// Zdrojová buňka 12 × 14 se ukládá doprostřed atlasové buňky 16 × 16.
export const ATLAS = { width: 256, height: 32, cell: 16, columns: 16 } as const;
const fx = 'newsh6.shp.000000.png';
const weapons = 'newsh(.shp.000000.png';
const row = (source: string, y: number, columns: number[]) =>
  columns.map(x => ({ source, x: x * 12, y: y * 14, width: 12, height: 14 }));

export const SPRITE_CLIPS = {
  explosion: { start: 0, fps: 30, loop: false, size: 2.8, width: 1,
    frames: row(fx, 6, [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18]) },
  impact: { start: 13, fps: 35, loop: false, size: 1.15, width: 1,
    frames: row(fx, 5, [6, 7, 8, 9, 10]) },
  playerShot: { start: 18, fps: 12, loop: true, size: 1, width: 0.35,
    frames: row(weapons, 13, [17]) },
  enemyShot: { start: 19, fps: 10, loop: true, size: 0.85, width: 1,
    frames: row(weapons, 8, [15, 16]) },
  spreadPickup: { start: 26, fps: 8, loop: true, size: 1.8, width: 1,
    frames: row('tyrian.shp.01673F.png', 0, [12, 13, 14]) },
  repairPickup: { start: 29, fps: 8, loop: true, size: 1.8, width: 1,
    frames: row('tyrian.shp.01673F.png', 1, [12, 13, 14]) },
  shield: { start: 21, fps: 30, loop: false, size: 1.2, width: 1,
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

export function frameUV(index: number) {
  const column = index % ATLAS.columns;
  const row = Math.floor(index / ATLAS.columns);
  return {
    left: column * ATLAS.cell / ATLAS.width,
    right: (column + 1) * ATLAS.cell / ATLAS.width,
    bottom: 1 - (row + 1) * ATLAS.cell / ATLAS.height,
    top: 1 - row * ATLAS.cell / ATLAS.height,
  };
}
