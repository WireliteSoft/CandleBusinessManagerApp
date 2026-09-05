export interface D1Result {
  success: boolean;
  meta: Record<string, unknown>;
}

/**
 * Keep every database call parameterized while routes are migrated from Prisma.
 */
export class D1Repository {
  constructor(private readonly db: D1Database) {}

  first<T extends object>(query: string, values: unknown[] = []): Promise<T | null> {
    return this.db.prepare(query).bind(...values).first<T>();
  }

  async all<T extends object>(query: string, values: unknown[] = []): Promise<T[]> {
    const result = await this.db.prepare(query).bind(...values).all<T>();
    return result.results;
  }

  run(query: string, values: unknown[] = []): Promise<D1Result> {
    return this.db.prepare(query).bind(...values).run();
  }

  batch(statements: Array<{ query: string; values?: unknown[] }>): Promise<unknown[]> {
    return this.db.batch(
      statements.map(({ query, values = [] }) => this.db.prepare(query).bind(...values)),
    );
  }
}

export function createD1Repository(db: D1Database | undefined): D1Repository {
  if (!db) {
    throw new Error('D1 binding "DB" is not configured for this Worker environment.');
  }

  return new D1Repository(db);
}
