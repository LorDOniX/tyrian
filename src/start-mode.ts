// Vývojový režim nikdy nesmí přeskočit úroveň v produkčním sestavení.
export function startAtBoss(development: boolean, mode: string): boolean {
  return development && (mode === 'boss' || mode === 'boss2' || mode === 'boss3' || mode === 'boss4');
}

export function startLevel(development: boolean, mode: string): 0 | 1 | 2 | 3 {
  if (development && (mode === 'level4' || mode === 'boss4')) return 3;
  if (development && (mode === 'level3' || mode === 'boss3')) return 2;
  return development && (mode === 'level2' || mode === 'boss2') ? 1 : 0;
}
