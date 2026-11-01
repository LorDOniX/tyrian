// Vývojový režim nikdy nesmí přeskočit úroveň v produkčním sestavení.
export function startAtBoss(development: boolean, mode: string): boolean {
  return development && (mode === 'boss' || mode === 'boss2');
}

export function startLevel(development: boolean, mode: string): 0 | 1 {
  return development && (mode === 'level2' || mode === 'boss2') ? 1 : 0;
}
