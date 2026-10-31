// Vývojový režim nikdy nesmí přeskočit úroveň v produkčním sestavení.
export function startAtBoss(development: boolean, mode: string): boolean {
  return development && mode === 'boss';
}

export function startLevel(development: boolean, mode: string): 0 | 1 {
  return development && mode === 'level2' ? 1 : 0;
}
