export function registerBatchLogRoutes(app, context) {
  const {
    prisma,
    parseOrThrow,
    normalizeBatchLogRow,
    batchLogCreateInput,
    batchLogUpdateInput,
    randomUUID,
  } = context;

  app.get('/api/batch-logs', async (_req, res, next) => {
    try {
      const rows = await prisma.$queryRaw`
        SELECT * FROM "BatchLog" ORDER BY "batch_date" DESC, "created_at" DESC
      `;
      res.json(rows.map(normalizeBatchLogRow));
    } catch (e) {
      next(e);
    }
  });

  app.get('/api/batch-logs/:id', async (req, res, next) => {
    try {
      const rows = await prisma.$queryRaw`SELECT * FROM "BatchLog" WHERE "id" = ${req.params.id}`;
      const row = rows[0];
      if (!row) {
        const error = new Error('Batch log not found');
        error.status = 404;
        throw error;
      }
      res.json(normalizeBatchLogRow(row));
    } catch (e) {
      next(e);
    }
  });

  app.post('/api/batch-logs', async (req, res, next) => {
    try {
      const data = parseOrThrow(batchLogCreateInput, req.body);
      const id = randomUUID();
      const now = new Date().toISOString();

      await prisma.$executeRaw`
        INSERT INTO "BatchLog" (
          "id",
          "batch_date",
          "batch_name",
          "candles_amount",
          "wax_type",
          "container_type",
          "container_size",
          "wax_weight_oz",
          "fragrance_load",
          "fragrance_oil",
          "wick_type",
          "wick_size",
          "wick_count",
          "vessel",
          "pour_temp_f",
          "room_temp_f",
          "room_humidity",
          "pricing_wax_cost",
          "pricing_wax_weight_lb",
          "pricing_fragrance_used_oz",
          "pricing_fragrance_cost_used",
          "pricing_fill_per_candle_oz",
          "pricing_jar_cost_each",
          "pricing_wick_cost_each",
          "pricing_label_cost_each",
          "pricing_other_cost_each",
          "pricing_labor_overhead_each",
          "pricing_material_cost_per_candle",
          "pricing_total_cost_per_candle",
          "pricing_wholesale_suggestion",
          "pricing_retail_suggestion",
          "pricing_premium_suggestion",
          "pricing_cogs_source",
          "pricing_price_source",
          "notes",
          "outcome",
          "created_at",
          "updated_at"
        ) VALUES (
          ${id},
          ${data.batch_date},
          ${data.batch_name},
          ${data.candles_amount},
          ${data.wax_type},
          ${data.container_type},
          ${data.container_size},
          ${data.wax_weight_oz},
          ${data.fragrance_load},
          ${data.fragrance_oil},
          ${data.wick_type},
          ${data.wick_size},
          ${data.wick_count},
          ${data.vessel},
          ${data.pour_temp_f},
          ${data.room_temp_f},
          ${data.room_humidity},
          ${data.pricing_wax_cost},
          ${data.pricing_wax_weight_lb},
          ${data.pricing_fragrance_used_oz},
          ${data.pricing_fragrance_cost_used},
          ${data.pricing_fill_per_candle_oz},
          ${data.pricing_jar_cost_each},
          ${data.pricing_wick_cost_each},
          ${data.pricing_label_cost_each},
          ${data.pricing_other_cost_each},
          ${data.pricing_labor_overhead_each},
          ${data.pricing_material_cost_per_candle},
          ${data.pricing_total_cost_per_candle},
          ${data.pricing_wholesale_suggestion},
          ${data.pricing_retail_suggestion},
          ${data.pricing_premium_suggestion},
          ${data.pricing_cogs_source},
          ${data.pricing_price_source},
          ${data.notes},
          ${data.outcome},
          ${now},
          ${now}
        )
      `;

      const rows = await prisma.$queryRaw`SELECT * FROM "BatchLog" WHERE "id" = ${id}`;
      res.status(201).json(normalizeBatchLogRow(rows[0]));
    } catch (e) {
      next(e);
    }
  });

  app.put('/api/batch-logs/:id', async (req, res, next) => {
    try {
      const data = parseOrThrow(batchLogUpdateInput, req.body);
      const existingRows = await prisma.$queryRaw`SELECT * FROM "BatchLog" WHERE "id" = ${req.params.id}`;
      const existing = existingRows[0];
      if (!existing) {
        const error = new Error('Batch log not found');
        error.status = 404;
        throw error;
      }

      const merged = {
        ...existing,
        ...data,
        updated_at: new Date().toISOString(),
      };

      await prisma.$executeRaw`
        UPDATE "BatchLog"
        SET
          "batch_date" = ${merged.batch_date},
          "batch_name" = ${merged.batch_name},
          "candles_amount" = ${merged.candles_amount},
          "wax_type" = ${merged.wax_type},
          "container_type" = ${merged.container_type},
          "container_size" = ${merged.container_size},
          "wax_weight_oz" = ${merged.wax_weight_oz},
          "fragrance_load" = ${merged.fragrance_load},
          "fragrance_oil" = ${merged.fragrance_oil},
          "wick_type" = ${merged.wick_type},
          "wick_size" = ${merged.wick_size},
          "wick_count" = ${merged.wick_count},
          "vessel" = ${merged.vessel},
          "pour_temp_f" = ${merged.pour_temp_f},
          "room_temp_f" = ${merged.room_temp_f},
          "room_humidity" = ${merged.room_humidity},
          "pricing_wax_cost" = ${merged.pricing_wax_cost},
          "pricing_wax_weight_lb" = ${merged.pricing_wax_weight_lb},
          "pricing_fragrance_used_oz" = ${merged.pricing_fragrance_used_oz},
          "pricing_fragrance_cost_used" = ${merged.pricing_fragrance_cost_used},
          "pricing_fill_per_candle_oz" = ${merged.pricing_fill_per_candle_oz},
          "pricing_jar_cost_each" = ${merged.pricing_jar_cost_each},
          "pricing_wick_cost_each" = ${merged.pricing_wick_cost_each},
          "pricing_label_cost_each" = ${merged.pricing_label_cost_each},
          "pricing_other_cost_each" = ${merged.pricing_other_cost_each},
          "pricing_labor_overhead_each" = ${merged.pricing_labor_overhead_each},
          "pricing_material_cost_per_candle" = ${merged.pricing_material_cost_per_candle},
          "pricing_total_cost_per_candle" = ${merged.pricing_total_cost_per_candle},
          "pricing_wholesale_suggestion" = ${merged.pricing_wholesale_suggestion},
          "pricing_retail_suggestion" = ${merged.pricing_retail_suggestion},
          "pricing_premium_suggestion" = ${merged.pricing_premium_suggestion},
          "pricing_cogs_source" = ${merged.pricing_cogs_source},
          "pricing_price_source" = ${merged.pricing_price_source},
          "notes" = ${merged.notes},
          "outcome" = ${merged.outcome},
          "updated_at" = ${merged.updated_at}
        WHERE "id" = ${req.params.id}
      `;

      const rows = await prisma.$queryRaw`SELECT * FROM "BatchLog" WHERE "id" = ${req.params.id}`;
      res.json(normalizeBatchLogRow(rows[0]));
    } catch (e) {
      next(e);
    }
  });

  app.delete('/api/batch-logs/:id', async (req, res, next) => {
    try {
      await prisma.$executeRaw`DELETE FROM "BatchLog" WHERE "id" = ${req.params.id}`;
      res.status(204).send();
    } catch (e) {
      next(e);
    }
  });
}
