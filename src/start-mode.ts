// Vývojový režim nikdy nesmí přeskočit úroveň v produkčním sestavení.
export function startAtBoss(development: boolean, mode: string): boolean {
  return development && mode === 'boss';
}
