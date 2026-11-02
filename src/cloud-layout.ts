// Pozice závisí pouze na herním posunu: pauza mraky zastaví, restart je vrátí.
const CLOUDS = [
  { x: -5, y: -8, width: 10, height: 5 },
  { x: 5, y: 1, width: 11, height: 6 },
  { x: -4, y: 12, width: 12, height: 6 },
  { x: 5, y: 22, width: 10, height: 5 },
] as const;
export function cloudLayout(distance: number) {
  return CLOUDS.map(cloud => ({ ...cloud,
    y: ((cloud.y + 18 - distance * 1.12) % 42 + 42) % 42 - 18,
  }));
}
