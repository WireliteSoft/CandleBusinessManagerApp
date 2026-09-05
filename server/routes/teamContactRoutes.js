export function registerTeamContactRoutes(app, context) {
  const {
    prisma,
    masterPrisma,
    parseOrThrow,
    toRowDates,
    getRolePermissionMap,
    contactMessageReadInput,
    contactMessageWorkflowInput,
    randomUUID,
  } = context;

app.get('/api/teams/contact-messages', async (req, res, next) => {
  try {
    const auth = req.auth;
    if (!auth || auth.blocked) {
      const error = new Error('Unauthorized');
      error.status = 401;
      throw error;
    }
    const permissions = await getRolePermissionMap(auth.account_id, auth.role);
    if (!(permissions.teams_contacts ?? true)) {
      const error = new Error('Forbidden');
      error.status = 403;
      throw error;
    }
    const bucketRaw = String(req.query.bucket || '').trim().toLowerCase();
    const statusRaw = String(req.query.status || '').trim().toLowerCase();
    const allowedStatuses = new Set([
      'new',
      'custom_request',
      'in_progress',
      'awaiting_payment',
      'order_shipped',
      'completed',
      'closed',
    ]);
    let rows = [];
    if (allowedStatuses.has(statusRaw)) {
      rows = await prisma.$queryRaw`
        SELECT
          "id",
          "name",
          "email",
          "street_address",
          "city",
          "state",
          "zip",
          "phone",
          "message",
          "ip_address",
          "is_read",
        "read_at",
        "workflow_status",
        "priority_level",
        "admin_notes",
        "created_at"
      FROM "StoreContactMessage"
      WHERE "workflow_status" = ${statusRaw}
        ORDER BY "created_at" DESC
      `;
    } else if (bucketRaw === 'new' || bucketRaw === 'old') {
      const isReadFilter = bucketRaw === 'old' ? 1 : 0;
      rows = await prisma.$queryRaw`
        SELECT
          "id",
          "name",
          "email",
          "street_address",
          "city",
          "state",
          "zip",
          "phone",
          "message",
          "ip_address",
          "is_read",
          "read_at",
          "workflow_status",
          "priority_level",
          "admin_notes",
          "created_at"
        FROM "StoreContactMessage"
        WHERE "is_read" = ${isReadFilter}
        ORDER BY "created_at" DESC
      `;
    } else {
      rows = await prisma.$queryRaw`
        SELECT
          "id",
          "name",
          "email",
          "street_address",
          "city",
          "state",
          "zip",
          "phone",
          "message",
          "ip_address",
          "is_read",
          "read_at",
          "workflow_status",
          "priority_level",
          "admin_notes",
          "created_at"
        FROM "StoreContactMessage"
        ORDER BY "created_at" DESC
      `;
    }
    res.json(toRowDates(rows));
  } catch (e) {
    next(e);
  }
});

app.get('/api/teams/contact-messages/counts', async (req, res, next) => {
  try {
    const auth = req.auth;
    if (!auth || auth.blocked) {
      const error = new Error('Unauthorized');
      error.status = 401;
      throw error;
    }
    const permissions = await getRolePermissionMap(auth.account_id, auth.role);
    if (!(permissions.teams_contacts ?? true)) {
      const error = new Error('Forbidden');
      error.status = 403;
      throw error;
    }
    const rows = await prisma.$queryRaw`
      SELECT
        "workflow_status",
        COUNT(*) as "count",
        SUM(CASE WHEN "priority_level" = 'urgent' THEN 1 ELSE 0 END) as "urgent_count"
      FROM "StoreContactMessage"
      GROUP BY "workflow_status"
    `;
    const counts = {
      new: { total: 0, urgent: 0 },
      custom_request: { total: 0, urgent: 0 },
      in_progress: { total: 0, urgent: 0 },
      awaiting_payment: { total: 0, urgent: 0 },
      order_shipped: { total: 0, urgent: 0 },
      completed: { total: 0, urgent: 0 },
      closed: { total: 0, urgent: 0 },
    };
    for (const row of rows) {
      const key = String(row.workflow_status || '');
      const value = Number(row.count || 0);
      const urgentValue = Number(row.urgent_count || 0);
      if (Object.prototype.hasOwnProperty.call(counts, key)) {
        counts[key] = { total: value, urgent: urgentValue };
      }
    }
    res.json(counts);
  } catch (e) {
    next(e);
  }
});

app.put('/api/teams/contact-messages/:id/read', async (req, res, next) => {
  try {
    const auth = req.auth;
    if (!auth || auth.blocked) {
      const error = new Error('Unauthorized');
      error.status = 401;
      throw error;
    }
    const permissions = await getRolePermissionMap(auth.account_id, auth.role);
    if (!(permissions.teams_contacts_edit ?? permissions.teams_contacts ?? true)) {
      const error = new Error('View-only role: edit access denied');
      error.status = 403;
      throw error;
    }
    const id = String(req.params.id || '').trim();
    if (!id) {
      const error = new Error('Invalid message id');
      error.status = 400;
      throw error;
    }
    const data = parseOrThrow(contactMessageReadInput, req.body);
    const readAt = data.is_read ? new Date().toISOString() : null;
    await prisma.$executeRaw`
      UPDATE "StoreContactMessage"
      SET
        "is_read" = ${data.is_read ? 1 : 0},
        "read_at" = ${readAt}
      WHERE "id" = ${id}
    `;
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

app.put('/api/teams/contact-messages/:id/workflow', async (req, res, next) => {
  try {
    const auth = req.auth;
    if (!auth || auth.blocked) {
      const error = new Error('Unauthorized');
      error.status = 401;
      throw error;
    }
    const permissions = await getRolePermissionMap(auth.account_id, auth.role);
    if (!(permissions.teams_contacts_edit ?? permissions.teams_contacts ?? true)) {
      const error = new Error('View-only role: edit access denied');
      error.status = 403;
      throw error;
    }
    const id = String(req.params.id || '').trim();
    if (!id) {
      const error = new Error('Invalid message id');
      error.status = 400;
      throw error;
    }
    const data = parseOrThrow(contactMessageWorkflowInput, req.body);
    const effectivePriority =
      data.workflow_status === 'completed' || data.workflow_status === 'closed'
        ? 'none'
        : data.priority_level;
    await prisma.$executeRaw`
      UPDATE "StoreContactMessage"
      SET
        "workflow_status" = ${data.workflow_status},
        "priority_level" = ${effectivePriority},
        "admin_notes" = ${String(data.admin_notes || '')}
      WHERE "id" = ${id}
    `;
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

app.delete('/api/teams/contact-messages/:id', async (req, res, next) => {
  try {
    const auth = req.auth;
    if (!auth || auth.blocked) {
      const error = new Error('Unauthorized');
      error.status = 401;
      throw error;
    }
    const permissions = await getRolePermissionMap(auth.account_id, auth.role);
    if (!(permissions.teams_contacts_edit ?? permissions.teams_contacts ?? true)) {
      const error = new Error('View-only role: edit access denied');
      error.status = 403;
      throw error;
    }
    const id = String(req.params.id || '').trim();
    if (!id) {
      const error = new Error('Invalid message id');
      error.status = 400;
      throw error;
    }
    await prisma.$executeRaw`
      DELETE FROM "StoreContactMessage"
      WHERE "id" = ${id}
    `;
    res.status(204).send();
  } catch (e) {
    next(e);
  }
});

app.post('/api/teams/contact-messages/:id/ban-ip', async (req, res, next) => {
  try {
    const auth = req.auth;
    if (!auth || auth.blocked) {
      const error = new Error('Unauthorized');
      error.status = 401;
      throw error;
    }
    const permissions = await getRolePermissionMap(auth.account_id, auth.role);
    if (!(permissions.teams_contacts_edit ?? permissions.teams_contacts ?? true)) {
      const error = new Error('View-only role: edit access denied');
      error.status = 403;
      throw error;
    }
    const id = String(req.params.id || '').trim();
    if (!id) {
      const error = new Error('Invalid message id');
      error.status = 400;
      throw error;
    }
    const row = await prisma.$queryRaw`
      SELECT "ip_address"
      FROM "StoreContactMessage"
      WHERE "id" = ${id}
      LIMIT 1
    `;
    const ipAddress = String(row[0]?.ip_address || '').trim().toLowerCase();
    if (!ipAddress) {
      const error = new Error('No IP address found for this message');
      error.status = 400;
      throw error;
    }
    const reason =
      typeof req.body?.reason === 'string' && req.body.reason.trim()
        ? req.body.reason.trim().slice(0, 300)
        : 'Spam contact message';
    const now = new Date().toISOString();
    await masterPrisma.$executeRaw`
      INSERT INTO "IpBan" (
        "id",
        "ip_address",
        "reason",
        "active",
        "created_by_account_id",
        "created_by_user_id",
        "created_at",
        "updated_at"
      ) VALUES (
        ${randomUUID()},
        ${ipAddress},
        ${reason},
        ${1},
        ${auth.account_id},
        ${auth.user_id},
        ${now},
        ${now}
      )
      ON CONFLICT("ip_address")
      DO UPDATE SET
        "active" = ${1},
        "reason" = ${reason},
        "created_by_account_id" = ${auth.account_id},
        "created_by_user_id" = ${auth.user_id},
        "updated_at" = ${now}
    `;
    res.json({ ok: true, ip_address: ipAddress });
  } catch (e) {
    next(e);
  }
});
}
