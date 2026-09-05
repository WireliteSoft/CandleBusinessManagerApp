export function registerSuperAdminRoutes(app, context) {
  const {
    masterPrisma,
    getAccountPrisma,
    parseOrThrow,
    toRowDates,
    deleteAccountDatabase,
    requireSuperAdmin,
    getSuperAdminTargetDb,
    getDbTableNames,
    getTableInfo,
    quoteIdentifier,
    isSafeIdentifier,
    findAccountIdByIdentifier,
    superAdminLoginInput,
    superAdminAccountTierInput,
    billingConfigInput,
    accountStateInput,
    banAppealMessageInput,
    banAppealEvidenceInput,
    banAppealStatusInput,
    superAdminDbRowUpdateInput,
    superAdminDbRowDeleteInput,
    SUPERADMIN_EMAIL,
    SUPERADMIN_PASSWORD,
    randomUUID,
    randomBytes,
  } = context;

app.post('/api/superadmin/login', async (req, res, next) => {
  try {
    const data = parseOrThrow(superAdminLoginInput, req.body);
    if (data.email.trim().toLowerCase() !== SUPERADMIN_EMAIL || data.password !== SUPERADMIN_PASSWORD) {
      const error = new Error('Invalid super admin credentials');
      error.status = 401;
      throw error;
    }

    const now = new Date().toISOString();
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 8).toISOString();
    await masterPrisma.$executeRaw`
      INSERT INTO "SuperAdminSession" ("id", "token", "expires_at", "created_at")
      VALUES (${randomUUID()}, ${token}, ${expiresAt}, ${now})
    `;
    res.json({ token, expires_at: expiresAt });
  } catch (e) {
    next(e);
  }
});

app.get('/api/superadmin/accounts', requireSuperAdmin, async (_req, res, next) => {
  try {
    const rows = await masterPrisma.$queryRaw`
      SELECT
        a."id",
        a."name",
        a."plan_tier",
        a."is_banned",
        a."ban_reason",
        a."access_disabled",
        a."disable_reason",
        a."created_at",
        (
          SELECT COUNT(*)
          FROM "BanAppealTicket" bt
          WHERE bt."account_id" = a."id"
            AND bt."status" IN ('open', 'in_review')
        ) as "active_appeal_count"
      FROM "Account" a
      ORDER BY "created_at" DESC
    `;
    res.json(
      rows.map((row) => {
        const normalized = toRowDates(row);
        return {
          ...normalized,
          active_appeal_count: Number(normalized.active_appeal_count || 0),
        };
      })
    );
  } catch (e) {
    next(e);
  }
});

app.get('/api/superadmin/accounts/:id/users', requireSuperAdmin, async (req, res, next) => {
  try {
    const users = await masterPrisma.$queryRaw`
      SELECT
        u."id",
        u."email",
        u."username"
      FROM "AccountUser" u
      WHERE u."account_id" = ${req.params.id}
      ORDER BY u."created_at" DESC
    `;

    const withLastIp = await Promise.all(
      users.map(async (user) => {
        const eventRows = await masterPrisma.$queryRaw`
          SELECT "ip_address"
          FROM "AuthEvent"
          WHERE "account_user_id" = ${user.id}
            AND "event_type" = 'login'
          ORDER BY "created_at" DESC
          LIMIT 1
        `;
        return {
          email: user.email || user.username || '',
          username: user.username || user.email || '',
          ip_address: eventRows[0]?.ip_address || '-',
        };
      })
    );

    res.json(withLastIp);
  } catch (e) {
    next(e);
  }
});

app.get('/api/superadmin/billing-config', requireSuperAdmin, async (_req, res, next) => {
  try {
    const rows = await masterPrisma.$queryRaw`
      SELECT
        "id",
        "standard_monthly_usd",
        "standard_yearly_usd",
        "pro_monthly_usd",
        "pro_yearly_usd",
        "elite_monthly_usd",
        "elite_yearly_usd",
        "currency",
        "updated_at",
        "created_at"
      FROM "BillingConfig"
      WHERE "id" = 'default'
      LIMIT 1
    `;
    const row = rows[0];
    if (!row) {
      const error = new Error('Billing config not found');
      error.status = 404;
      throw error;
    }
    res.json(toRowDates(row));
  } catch (e) {
    next(e);
  }
});

app.post('/api/superadmin/billing-config', requireSuperAdmin, async (req, res, next) => {
  try {
    const data = parseOrThrow(billingConfigInput, req.body);
    const now = new Date().toISOString();
    await masterPrisma.$executeRaw`
      UPDATE "BillingConfig"
      SET
        "standard_monthly_usd" = ${data.standard_monthly_usd},
        "standard_yearly_usd" = ${data.standard_yearly_usd},
        "pro_monthly_usd" = ${data.pro_monthly_usd},
        "pro_yearly_usd" = ${data.pro_yearly_usd},
        "elite_monthly_usd" = ${data.elite_monthly_usd},
        "elite_yearly_usd" = ${data.elite_yearly_usd},
        "currency" = ${data.currency.toUpperCase()},
        "updated_at" = ${now}
      WHERE "id" = 'default'
    `;
    const rows = await masterPrisma.$queryRaw`
      SELECT
        "id",
        "standard_monthly_usd",
        "standard_yearly_usd",
        "pro_monthly_usd",
        "pro_yearly_usd",
        "elite_monthly_usd",
        "elite_yearly_usd",
        "currency",
        "updated_at",
        "created_at"
      FROM "BillingConfig"
      WHERE "id" = 'default'
      LIMIT 1
    `;
    res.json(toRowDates(rows[0]));
  } catch (e) {
    next(e);
  }
});

app.post('/api/superadmin/accounts/:id/ban', requireSuperAdmin, async (req, res, next) => {
  try {
    const data = parseOrThrow(accountStateInput, req.body);
    if (data.value && !data.reason) {
      const error = new Error('A ban reason is required');
      error.status = 400;
      throw error;
    }
    const evidenceImages = Array.isArray(data.evidence_images_data)
      ? data.evidence_images_data.filter((item) => Boolean(String(item || '').trim()))
      : [];
    const legacySingle = String(data.evidence_image_data || '').trim();
    const mergedImages = evidenceImages.length
      ? evidenceImages
      : legacySingle
        ? [legacySingle]
        : [];
    await masterPrisma.$executeRaw`
      UPDATE "Account"
      SET
        "is_banned" = ${data.value ? 1 : 0},
        "ban_reason" = ${data.value ? data.reason : ''},
        "ban_evidence_note" = ${data.value ? data.evidence_note || '' : ''},
        "ban_evidence_image_data" = ${data.value ? mergedImages[0] || '' : ''},
        "ban_evidence_images_data" = ${data.value ? JSON.stringify(mergedImages) : '[]'}
      WHERE "id" = ${req.params.id}
    `;
    res.status(204).send();
  } catch (e) {
    next(e);
  }
});

app.post('/api/superadmin/accounts/:id/disable', requireSuperAdmin, async (req, res, next) => {
  try {
    const data = parseOrThrow(accountStateInput, req.body);
    if (data.value && !data.reason) {
      const error = new Error('A disable reason is required');
      error.status = 400;
      throw error;
    }
    await masterPrisma.$executeRaw`
      UPDATE "Account"
      SET
        "access_disabled" = ${data.value ? 1 : 0},
        "disable_reason" = ${data.value ? data.reason : ''}
      WHERE "id" = ${req.params.id}
    `;
    res.status(204).send();
  } catch (e) {
    next(e);
  }
});

app.post('/api/superadmin/accounts/:id/tier', requireSuperAdmin, async (req, res, next) => {
  try {
    const data = parseOrThrow(superAdminAccountTierInput, req.body);
    await masterPrisma.$executeRaw`
      UPDATE "Account"
      SET "plan_tier" = ${data.tier}
      WHERE "id" = ${req.params.id}
    `;
    const rows = await masterPrisma.$queryRaw`
      SELECT
        "id",
        "name",
        "plan_tier",
        "is_banned",
        "ban_reason",
        "access_disabled",
        "disable_reason",
        "created_at"
      FROM "Account"
      WHERE "id" = ${req.params.id}
      LIMIT 1
    `;
    const row = rows[0];
    if (!row) {
      const error = new Error('Account not found');
      error.status = 404;
      throw error;
    }
    res.json(toRowDates(row));
  } catch (e) {
    next(e);
  }
});

app.get('/api/superadmin/accounts/:id/appeal-history', requireSuperAdmin, async (req, res, next) => {
  try {
    const rows = await masterPrisma.$queryRaw`
      SELECT
        h."id",
        h."ticket_id",
        h."ban_reason",
        h."appeal_status",
        h."completed_at",
        t."account_identifier",
        t."name",
        t."reason" as "appeal_reason",
        t."details" as "appeal_details"
      FROM "BanAppealHistory" h
      JOIN "BanAppealTicket" t ON t."id" = h."ticket_id"
      WHERE h."account_id" = ${req.params.id}
      ORDER BY h."completed_at" DESC, h."created_at" DESC
    `;
    res.json(rows.map((row) => toRowDates(row)));
  } catch (e) {
    next(e);
  }
});

app.get('/api/superadmin/appeals/count', requireSuperAdmin, async (_req, res, next) => {
  try {
    const rows = await masterPrisma.$queryRaw`
      SELECT COUNT(*) as "count"
      FROM "BanAppealTicket"
      WHERE "status" IN ('open', 'in_review')
    `;
    res.json({ count: Number(rows[0]?.count || 0) });
  } catch (e) {
    next(e);
  }
});

app.get('/api/superadmin/appeals', requireSuperAdmin, async (req, res, next) => {
  try {
    const accountId = String(req.query.account_id || '').trim();
    if (!accountId) {
      res.json([]);
      return;
    }
    const rows = await masterPrisma.$queryRaw`
      SELECT
        t."id",
        t."account_id",
        t."account_identifier",
        t."email",
        t."name",
        t."reason",
        t."details",
        t."status",
        t."created_at",
        t."updated_at",
        a."ban_reason",
        a."ban_evidence_note",
        a."ban_evidence_image_data",
        a."ban_evidence_images_data"
      FROM "BanAppealTicket" t
      LEFT JOIN "Account" a ON a."id" = t."account_id"
      WHERE t."account_id" = ${accountId}
      ORDER BY t."updated_at" DESC, t."created_at" DESC
    `;
    res.json(
      rows.map((row) => {
        const normalized = toRowDates(row);
        return {
          ...normalized,
          ban_evidence_images_data: (() => {
            try {
              const parsed = JSON.parse(String(normalized.ban_evidence_images_data || '[]'));
              return Array.isArray(parsed) ? parsed : [];
            } catch {
              return [];
            }
          })(),
        };
      })
    );
  } catch (e) {
    next(e);
  }
});

app.get('/api/superadmin/appeals/:id/messages', requireSuperAdmin, async (req, res, next) => {
  try {
    const ticketRows = await masterPrisma.$queryRaw`
      SELECT
        t."id",
        t."account_id",
        t."account_identifier",
        t."email",
        t."name",
        t."reason",
        t."details",
        t."status",
        t."created_at",
        t."updated_at",
        a."ban_reason",
        a."ban_evidence_note",
        a."ban_evidence_image_data",
        a."ban_evidence_images_data"
      FROM "BanAppealTicket" t
      LEFT JOIN "Account" a ON a."id" = t."account_id"
      WHERE t."id" = ${req.params.id}
      LIMIT 1
    `;
    const ticket = ticketRows[0];
    if (!ticket) {
      const error = new Error('Appeal ticket not found');
      error.status = 404;
      throw error;
    }
    const messages = await masterPrisma.$queryRaw`
      SELECT "id", "sender_type", "sender_name", "message", "created_at"
      FROM "BanAppealMessage"
      WHERE "ticket_id" = ${req.params.id}
      ORDER BY "created_at" ASC
    `;
    const normalizedTicket = toRowDates(ticket);
    res.json({
      ticket: {
        ...normalizedTicket,
        ban_evidence_images_data: (() => {
          try {
            const parsed = JSON.parse(String(normalizedTicket.ban_evidence_images_data || '[]'));
            return Array.isArray(parsed) ? parsed : [];
          } catch {
            return [];
          }
        })(),
      },
      messages: messages.map((row) => toRowDates(row)),
    });
  } catch (e) {
    next(e);
  }
});

app.post('/api/superadmin/appeals/:id/messages', requireSuperAdmin, async (req, res, next) => {
  try {
    const data = parseOrThrow(banAppealMessageInput, req.body);
    const ticketRows = await masterPrisma.$queryRaw`
      SELECT "id", "status"
      FROM "BanAppealTicket"
      WHERE "id" = ${req.params.id}
      LIMIT 1
    `;
    const ticket = ticketRows[0];
    if (!ticket) {
      const error = new Error('Appeal ticket not found');
      error.status = 404;
      throw error;
    }
    if (String(ticket.status) === 'resolved' || String(ticket.status) === 'rejected') {
      const error = new Error('This appeal is closed');
      error.status = 400;
      throw error;
    }
    const id = randomUUID();
    const now = new Date().toISOString();
    await masterPrisma.$executeRaw`
      INSERT INTO "BanAppealMessage" ("id", "ticket_id", "sender_type", "sender_name", "message", "created_at")
      VALUES (${id}, ${req.params.id}, ${'admin'}, ${'Admin'}, ${data.message}, ${now})
    `;
    await masterPrisma.$executeRaw`
      UPDATE "BanAppealTicket"
      SET "updated_at" = ${now}
      WHERE "id" = ${req.params.id}
    `;
    res.status(201).json({ ok: true, id, created_at: now });
  } catch (e) {
    next(e);
  }
});

app.post('/api/superadmin/appeals/:id/status', requireSuperAdmin, async (req, res, next) => {
  try {
    const data = parseOrThrow(banAppealStatusInput, req.body);
    const ticketRows = await masterPrisma.$queryRaw`
      SELECT "id", "account_id", "reason"
      FROM "BanAppealTicket"
      WHERE "id" = ${req.params.id}
      LIMIT 1
    `;
    const ticket = ticketRows[0];
    if (!ticket) {
      const error = new Error('Appeal ticket not found');
      error.status = 404;
      throw error;
    }
    const now = new Date().toISOString();
    await masterPrisma.$executeRaw`
      UPDATE "BanAppealTicket"
      SET "status" = ${data.status}, "updated_at" = ${now}
      WHERE "id" = ${req.params.id}
    `;
    if ((data.status === 'resolved' || data.status === 'rejected') && ticket.account_id) {
      await masterPrisma.$executeRaw`
        INSERT INTO "BanAppealHistory" (
          "id",
          "ticket_id",
          "account_id",
          "ban_reason",
          "appeal_status",
          "completed_at",
          "created_at",
          "updated_at"
        ) VALUES (
          ${randomUUID()},
          ${req.params.id},
          ${ticket.account_id},
          ${String(ticket.reason || '')},
          ${data.status},
          ${now},
          ${now},
          ${now}
        )
        ON CONFLICT("ticket_id") DO UPDATE SET
          "ban_reason" = ${String(ticket.reason || '')},
          "appeal_status" = ${data.status},
          "completed_at" = ${now},
          "updated_at" = ${now}
      `;
      if (data.status === 'resolved') {
        await masterPrisma.$executeRaw`
          UPDATE "Account"
          SET
            "is_banned" = 0,
            "ban_reason" = '',
            "ban_evidence_note" = '',
            "ban_evidence_image_data" = '',
            "ban_evidence_images_data" = '[]',
            "access_disabled" = 0,
            "disable_reason" = ''
          WHERE "id" = ${ticket.account_id}
        `;
      }
    }
    res.status(204).send();
  } catch (e) {
    next(e);
  }
});

app.get('/api/superadmin/db/tables', requireSuperAdmin, async (req, res, next) => {
  try {
    const { db } = await getSuperAdminTargetDb(req.query.account_id);
    const tables = await getDbTableNames(db);
    res.json({ tables });
  } catch (e) {
    next(e);
  }
});

app.get('/api/superadmin/db/table', requireSuperAdmin, async (req, res, next) => {
  try {
    const table = String(req.query.table || '').trim();
    if (!table) {
      const error = new Error('Table is required');
      error.status = 400;
      throw error;
    }
    if (!isSafeIdentifier(table)) {
      const error = new Error('Invalid table name');
      error.status = 400;
      throw error;
    }
    const limit = Math.max(1, Math.min(500, Number(req.query.limit || 100)));
    const { db, source, accountId } = await getSuperAdminTargetDb(req.query.account_id);
    const { columns, pkColumns } = await getTableInfo(db, table);
    const safeTable = quoteIdentifier(table);
    const rows = await db.$queryRawUnsafe(`SELECT * FROM ${safeTable} LIMIT ${limit}`);
    res.json({
      source,
      account_id: accountId || null,
      table,
      columns,
      pk_columns: pkColumns,
      rows: rows.map((row) => toRowDates(row)),
      limit,
      offset: 0,
    });
  } catch (e) {
    next(e);
  }
});

app.put('/api/superadmin/db/table/:table/row', requireSuperAdmin, async (req, res, next) => {
  try {
    const table = String(req.params.table || '').trim();
    if (!isSafeIdentifier(table)) {
      const error = new Error('Invalid table name');
      error.status = 400;
      throw error;
    }
    const data = parseOrThrow(superAdminDbRowUpdateInput, req.body);
    const { db } = await getSuperAdminTargetDb(req.query.account_id);
    const { columns, pkColumns } = await getTableInfo(db, table);
    if (pkColumns.length === 0) {
      const error = new Error('This table has no primary key');
      error.status = 400;
      throw error;
    }
    const safeTable = quoteIdentifier(table);
    const valueEntries = Object.entries(data.values).filter(([key]) => columns.includes(key) && !pkColumns.includes(key));
    if (valueEntries.length === 0) {
      const error = new Error('No editable columns supplied');
      error.status = 400;
      throw error;
    }
    const pkEntries = pkColumns.map((key) => [key, data.pk[key]]);
    const setClause = valueEntries.map(([key]) => `${quoteIdentifier(key)} = ?`).join(', ');
    const whereClause = pkEntries.map(([key]) => `${quoteIdentifier(key)} = ?`).join(' AND ');
    const params = [...valueEntries.map(([, value]) => value), ...pkEntries.map(([, value]) => value)];
    await db.$executeRawUnsafe(`UPDATE ${safeTable} SET ${setClause} WHERE ${whereClause}`, ...params);
    res.status(204).send();
  } catch (e) {
    next(e);
  }
});

app.delete('/api/superadmin/db/table/:table/row', requireSuperAdmin, async (req, res, next) => {
  try {
    const table = String(req.params.table || '').trim();
    if (!isSafeIdentifier(table)) {
      const error = new Error('Invalid table name');
      error.status = 400;
      throw error;
    }
    const data = parseOrThrow(superAdminDbRowDeleteInput, req.body);
    const { db } = await getSuperAdminTargetDb(req.query.account_id);
    const { pkColumns } = await getTableInfo(db, table);
    if (pkColumns.length === 0) {
      const error = new Error('This table has no primary key');
      error.status = 400;
      throw error;
    }
    const pkEntries = pkColumns.map((key) => [key, data.pk[key]]);
    const safeTable = quoteIdentifier(table);
    const whereClause = pkEntries.map(([key]) => `${quoteIdentifier(key)} = ?`).join(' AND ');
    const params = pkEntries.map(([, value]) => value);
    await db.$executeRawUnsafe(`DELETE FROM ${safeTable} WHERE ${whereClause}`, ...params);
    res.status(204).send();
  } catch (e) {
    next(e);
  }
});

app.delete('/api/superadmin/accounts/:id', requireSuperAdmin, async (req, res, next) => {
  try {
    await masterPrisma.$executeRaw`
      DELETE FROM "AuthSession"
      WHERE "account_user_id" IN (
        SELECT "id" FROM "AccountUser" WHERE "account_id" = ${req.params.id}
      )
    `;
    await masterPrisma.$executeRaw`
      DELETE FROM "AuthEvent"
      WHERE "account_id" = ${req.params.id}
         OR "account_user_id" IN (
           SELECT "id" FROM "AccountUser" WHERE "account_id" = ${req.params.id}
         )
    `;
    await masterPrisma.$executeRaw`
      DELETE FROM "AccountJoinRequest"
      WHERE "account_id" = ${req.params.id}
    `;
    await masterPrisma.$executeRaw`
      DELETE FROM "AccountUser"
      WHERE "account_id" = ${req.params.id}
    `;
    await masterPrisma.$executeRaw`
      DELETE FROM "Account"
      WHERE "id" = ${req.params.id}
    `;
    await deleteAccountDatabase(req.params.id);
    res.status(204).send();
  } catch (e) {
    next(e);
  }
});


}

