export type SourceImage = { width: number; height: number; data: Uint8Array };

// Odstraní pouze přesnou barvu pozadí. Černé obrysy i jiné zelené odstíny zůstanou.
export function keyedFrame(image: SourceImage, rect: { x: number; y: number; width: number; height: number }, key: readonly number[]) {
  if (rect.x < 0 || rect.y < 0 || rect.x + rect.width > image.width || rect.y + rect.height > image.height) {
    throw new Error('Výřez je mimo zdrojový obrázek.');
  }
  const pixels = new Uint8Array(rect.width * rect.height * 4);
  for (let y = 0; y < rect.height; y++) {
    for (let x = 0; x < rect.width; x++) {
      const from = ((rect.y + y) * image.width + rect.x + x) * 4;
      const to = (y * rect.width + x) * 4;
      const background = image.data[from] === key[0] && image.data[from + 1] === key[1] && image.data[from + 2] === key[2];
      if (!background) pixels.set(image.data.subarray(from, from + 4), to);
    }
  }
  return pixels;
}
