export type UpgradeKind = 'weapon' | 'shield' | 'hull';
export type Upgrades = Record<UpgradeKind, number>;
export const UPGRADE_ORDER: readonly UpgradeKind[] = ['weapon', 'shield', 'hull'];
export const UPGRADE_INFO = {
  weapon: { name: 'Výzbroj', costs: [5000, 10000, 15000, 20000], descriptions: ['Přidá druhé dělo', 'Přidá třetí dělo', 'Přidá čtvrté dělo', 'Přidá páté dělo'] },
  shield: { name: 'Generátor štítu', costs: [4000, 8000], descriptions: ['Kapacita štítu 6 → 9', 'Kapacita štítu 9 → 12'] },
  hull: { name: 'Pancéřování', costs: [5000, 10000], descriptions: ['Maximální životy 3 → 4', 'Maximální životy 4 → 5'] },
} as const;
export const freshUpgrades = (): Upgrades => ({ weapon: 0, shield: 0, hull: 0 });
export function upgradeCost(upgrades: Upgrades, kind: UpgradeKind): number | null {
  return UPGRADE_INFO[kind].costs[upgrades[kind]] ?? null;
}
export const maxShield = (upgrades: Upgrades): number => 6 + upgrades.shield * 3;
export const maxLives = (upgrades: Upgrades): number => 3 + upgrades.hull;
export const MAX_PLAYER_GUNS = 5;
export const weaponCooldown = (): number => 0.22;
export const weaponGunCount = (level: number, enhanced = false): number =>
  Math.min(MAX_PLAYER_GUNS, Math.max(1, level + 1) + (enhanced ? 1 : 0));
export const weaponName = (upgrades: Upgrades): string => {
  const count = weaponGunCount(upgrades.weapon);
  return `${count} ${count === 1 ? 'dělo' : count < 5 ? 'děla' : 'děl'}`;
};
