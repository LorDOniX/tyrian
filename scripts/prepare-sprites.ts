import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { ATLAS, SPRITE_CLIPS, atlasRegion } from '../src/sprite-clips.ts';
import { keyedFrame, TYRIAN_BACKGROUND } from './sprite-pixels.ts';
import type { SourceImage } from './sprite-pixels.ts';

// Volitelný nástroj pro obnovu atlasu. Běžné dev/build používají hotový PNG.
function ffmpeg(args: string[], input?: Uint8Array): Buffer {
  const result = spawnSync('ffmpeg', ['-loglevel', 'error', ...args], { input, maxBuffer: 8 * 1024 * 1024 });
  if (result.error || result.status !== 0) throw new Error(`Příprava atlasu vyžaduje FFmpeg: ${result.error?.message ?? result.stderr.toString()}`);
  return result.stdout;
}
const cache = new Map<string, SourceImage>();
const atlas = new Uint8Array(ATLAS.width * ATLAS.height * 4);
for (const [name, clip] of Object.entries(SPRITE_CLIPS)) {
  for (const [offset, rect] of clip.frames.entries()) {
    let image = cache.get(rect.source);
    if (!image) {
      const source = fileURLToPath(new URL(`../Remastered Tyrian Graphics/${encodeURIComponent(rect.source)}`, import.meta.url));
      image = { width: 228, height: 224, data: ffmpeg(['-i', source, '-f', 'rawvideo', '-pix_fmt', 'rgba', 'pipe:1']) };
      if (image.data.length !== image.width * image.height * 4) throw new Error(`Neočekávaný rozměr ${rect.source}`);
      cache.set(rect.source, image);
      console.log(`${rect.source}: klíč RGB ${TYRIAN_BACKGROUND.join(', ')}`);
    }
    const pixels = keyedFrame(image, rect, TYRIAN_BACKGROUND);
    if (!pixels.some((value, i) => i % 4 === 3 && value > 0)) throw new Error(`Prázdný snímek ${name} #${offset}`);
    const index = clip.start + offset;
    const region = atlasRegion(index);
    if (rect.width + 4 > region.width || rect.height + 2 > region.height ||
      region.x + region.width > ATLAS.width || region.y + region.height > ATLAS.height) throw new Error(`Snímek ${name} se nevejde do atlasu.`);
    const left = region.x + (region.width - rect.width) / 2;
    const top = region.y + (region.height - rect.height) / 2;
    for (let y = 0; y < rect.height; y++) {
      atlas.set(pixels.subarray(y * rect.width * 4, (y + 1) * rect.width * 4), ((top + y) * ATLAS.width + left) * 4);
    }
  }
  console.log(`${name}: ${clip.frames.length} snímků`);
}
const png = ffmpeg(['-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${ATLAS.width}x${ATLAS.height}`, '-i', 'pipe:0',
  '-frames:v', '1', '-f', 'image2pipe', '-vcodec', 'png', 'pipe:1'], atlas);
const destination = new URL('../src/assets/tyrian-fx.png', import.meta.url);
mkdirSync(new URL('.', destination), { recursive: true });
writeFileSync(destination, png);
console.log(`Zapsáno ${fileURLToPath(destination)} (${png.length} B)`);
