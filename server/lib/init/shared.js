export async function runStatements(db, statements) {
  for (const statement of statements) {
    await db.$executeRawUnsafe(statement);
  }
}

export async function runOptionalStatements(db, statements) {
  for (const statement of statements) {
    try {
      await db.$executeRawUnsafe(statement);
    } catch {
      // Statement is for legacy upgrades and may already be applied.
    }
  }
}
