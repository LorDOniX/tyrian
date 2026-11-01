export type UpgradeKind = 'weapon' | 'shield' | 'hull';
export type Upgrades = Record<UpgradeKind, number>;
export const UPGRADE_ORDER: readonly UpgradeKind[] = ['weapon', 'shield', 'hull'];
export const UPGRADE_INFO = {
  weapon: { name: 'Výzbroj', costs: [2500, 5000], descriptions: ['Dvojice paprsků a rychlejší palba', 'Trvalá trojstřela a nejrychlejší palba'] },
  shield: { name: 'Generátor štítu', costs: [2000, 4000], descriptions: ['Kapacita štítu 6 → 9', 'Kapacita štítu 9 → 12'] },
  hull: { name: 'Pancéřování', costs: [2500, 5000], descriptions: ['Maximální životy 3 → 4', 'Maximální životy 4 → 5'] },
} as const;
export const freshUpgrades = (): Upgrades => ({ weapon: 0, shield: 0, hull: 0 });
export function upgradeCost(upgrades: Upgrades, kind: UpgradeKind): number | null {
  return UPGRADE_INFO[kind].costs[upgrades[kind]] ?? null;
}
export const maxShield = (upgrades: Upgrades): number => 6 + upgrades.shield * 3;
export const maxLives = (upgrades: Upgrades): number => 3 + upgrades.hull;
export const weaponCooldown = (upgrades: Upgrades): number => [0.22, 0.18, 0.14][upgrades.weapon]!;
export const weaponName = (upgrades: Upgrades): string => ['Lehký paprsek', 'Dvojitý paprsek', 'Trojstřela'][upgrades.weapon]!;
