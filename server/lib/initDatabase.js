import { setupCoreTables } from './init/coreTables.js';
import { setupAccountTables } from './init/accountTables.js';
import { applyLegacyUpgrades } from './init/legacyUpgrades.js';

export async function initDatabase(db) {
  await db.$executeRawUnsafe('PRAGMA foreign_keys = ON;');
  await setupCoreTables(db);
  await setupAccountTables(db);
  await applyLegacyUpgrades(db);
}
