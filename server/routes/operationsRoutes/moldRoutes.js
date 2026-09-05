export function registerMoldRoutes(app, context) {
  const { prisma, parseOrThrow, normalizeMoldRow, moldCreateInput, moldUpdateInput, randomUUID } =
    context;

  app.get('/api/molds', async (_req, res, next) => {
    try {
      const rows = await prisma.$queryRaw`
        SELECT * FROM "Mold" ORDER BY "name" ASC, "created_at" DESC
      `;
      res.json(rows.map(normalizeMoldRow));
    } catch (e) {
      next(e);
    }
  });

  app.post('/api/molds', async (req, res, next) => {
    try {
      const data = parseOrThrow(moldCreateInput, req.body);
      const id = randomUUID();
      const now = new Date().toISOString();

      await prisma.$executeRaw`
        INSERT INTO "Mold" (
          "id",
          "name",
          "weight_oz",
          "image_data",
          "created_at",
          "updated_at"
        ) VALUES (
          ${id},
          ${data.name},
          ${data.weight_oz},
          ${data.image_data},
          ${now},
          ${now}
        )
      `;

      const rows = await prisma.$queryRaw`SELECT * FROM "Mold" WHERE "id" = ${id}`;
      res.status(201).json(normalizeMoldRow(rows[0]));
    } catch (e) {
      next(e);
    }
  });

  app.put('/api/molds/:id', async (req, res, next) => {
    try {
      const data = parseOrThrow(moldUpdateInput, req.body);
      const existingRows = await prisma.$queryRaw`SELECT * FROM "Mold" WHERE "id" = ${req.params.id}`;
      const existing = existingRows[0];
      if (!existing) {
        const error = new Error('Mold not found');
        error.status = 404;
        throw error;
      }

      const merged = {
        ...existing,
        ...data,
        updated_at: new Date().toISOString(),
      };

      await prisma.$executeRaw`
        UPDATE "Mold"
        SET
          "name" = ${merged.name},
          "weight_oz" = ${merged.weight_oz},
          "image_data" = ${merged.image_data},
          "updated_at" = ${merged.updated_at}
        WHERE "id" = ${req.params.id}
      `;

      const rows = await prisma.$queryRaw`SELECT * FROM "Mold" WHERE "id" = ${req.params.id}`;
      res.json(normalizeMoldRow(rows[0]));
    } catch (e) {
      next(e);
    }
  });

  app.delete('/api/molds/:id', async (req, res, next) => {
    try {
      await prisma.$executeRaw`DELETE FROM "Mold" WHERE "id" = ${req.params.id}`;
      res.status(204).send();
    } catch (e) {
      next(e);
    }
  });
}
