import * as THREE from 'three';
import atlasUrl from './assets/tyrian-fx.png?url';
import { ATLAS, SPRITE_CLIPS, frameUV, spriteFrame } from './sprite-clips.ts';
import type { SpriteClip } from './sprite-clips.ts';

// Jeden atlas, jeden materiál a předem sdílená geometrie pro každý snímek.
export async function createSpriteEffects() {
  const texture = await new THREE.TextureLoader().loadAsync(atlasUrl);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true,
    alphaTest: 0.01, depthTest: false, depthWrite: false, toneMapped: false });
  const geometries = new Map<number, THREE.PlaneGeometry>();
  for (const clip of Object.values(SPRITE_CLIPS)) {
    for (let offset = 0; offset < clip.frames.length; offset++) {
      const index = clip.start + offset;
      const geometry = new THREE.PlaneGeometry(1, 1);
      const uv = geometry.getAttribute('uv');
      const frame = frameUV(index);
      for (let i = 0; i < uv.count; i++) {
        uv.setXY(i, frame.left + uv.getX(i) * (frame.right - frame.left),
          frame.bottom + uv.getY(i) * (frame.top - frame.bottom));
      }
      geometries.set(index, geometry);
    }
  }
  function create(clip: SpriteClip) {
    return new THREE.Mesh(geometries.get(SPRITE_CLIPS[clip].start)!, material);
  }
  function animate(model: THREE.Object3D, clip: SpriteClip, age: number, scale = 1) {
    const index = spriteFrame(clip, age);
    model.visible = index !== null;
    if (index === null || !(model instanceof THREE.Mesh)) return;
    model.geometry = geometries.get(index)!;
    const size = SPRITE_CLIPS[clip].size * scale * ATLAS.cell / SPRITE_CLIPS[clip].referenceCell;
    model.scale.set(size * SPRITE_CLIPS[clip].width, size, 1);
  }
  function dispose() {
    geometries.forEach(geometry => geometry.dispose());
    material.dispose();
    texture.dispose();
  }
  return { create, animate, dispose };
}
