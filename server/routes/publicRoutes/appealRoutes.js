export function registerPublicAppealRoutes(app, context) {
  const {
    masterPrisma,
    parseOrThrow,
    toRowDates,
    getClientIp,
    findAccountIdByIdentifier,
    banAppealCreateInput,
    banAppealMessageInput,
    randomUUID,
    randomBytes,
  } = context;

  app.post('/api/appeals', async (req, res, next) => {
    try {
      const data = parseOrThrow(banAppealCreateInput, req.body);
      const now = new Date().toISOString();
      const id = randomUUID();
      const accessKey = randomBytes(24).toString('hex');
      const accountId = await findAccountIdByIdentifier(data.account_identifier);
      await masterPrisma.$executeRaw`
        INSERT INTO "BanAppealTicket" (
          "id",
          "account_id",
          "account_identifier",
          "email",
          "name",
          "reason",
          "details",
          "participant_key",
          "status",
          "created_at",
          "updated_at"
        ) VALUES (
          ${id},
          ${accountId},
          ${data.account_identifier},
          ${data.email || ''},
          ${data.name},
          ${data.reason},
          ${data.details},
          ${accessKey},
          ${'open'},
          ${now},
          ${now}
        )
      `;
      const initialMessageId = randomUUID();
      const initialMessage = `Appeal reason: ${data.reason}\n${data.details}`;
      await masterPrisma.$executeRaw`
        INSERT INTO "BanAppealMessage" ("id", "ticket_id", "sender_type", "sender_name", "message", "created_at")
        VALUES (${initialMessageId}, ${id}, ${'user'}, ${data.name || 'User'}, ${initialMessage}, ${now})
      `;
      res.status(201).json({ ok: true, ticket_id: id, access_key: accessKey });
    } catch (e) {
      next(e);
    }
  });

  app.get('/api/appeals/open', async (req, res, next) => {
    try {
      const identifier = String(req.query.identifier || '').trim().toLowerCase();
      if (!identifier) {
        const error = new Error('Identifier is required');
        error.status = 400;
        throw error;
      }
      const rows = await masterPrisma.$queryRaw`
        SELECT "id", "participant_key", "status"
        FROM "BanAppealTicket"
        WHERE lower("account_identifier") = ${identifier}
          AND "status" IN ('open', 'in_review')
        ORDER BY "updated_at" DESC, "created_at" DESC
        LIMIT 1
      `;
      const ticket = rows[0];
      if (!ticket) {
        res.json({ exists: false });
        return;
      }
      res.json({
        exists: true,
        ticket_id: ticket.id,
        access_key: ticket.participant_key,
        status: ticket.status,
      });
    } catch (e) {
      next(e);
    }
  });

  app.get('/api/appeals/:id', async (req, res, next) => {
    try {
      const accessKey = String(req.query.key || '');
      if (!accessKey) {
        const error = new Error('Appeal access key is required');
        error.status = 401;
        throw error;
      }
      const rows = await masterPrisma.$queryRaw`
        SELECT "id", "account_identifier", "email", "name", "reason", "details", "status", "created_at"
        FROM "BanAppealTicket"
        WHERE "id" = ${req.params.id} AND "participant_key" = ${accessKey}
        LIMIT 1
      `;
      const ticket = rows[0];
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
      res.json({
        ticket: toRowDates(ticket),
        messages: messages.map(toRowDates),
      });
    } catch (e) {
      next(e);
    }
  });

  app.post('/api/appeals/:id/messages', async (req, res, next) => {
    try {
      const accessKey = String(req.query.key || '');
      if (!accessKey) {
        const error = new Error('Appeal access key is required');
        error.status = 401;
        throw error;
      }
      const data = parseOrThrow(banAppealMessageInput, req.body);
      const ticketRows = await masterPrisma.$queryRaw`
        SELECT "id", "name", "status"
        FROM "BanAppealTicket"
        WHERE "id" = ${req.params.id} AND "participant_key" = ${accessKey}
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
        VALUES (${id}, ${req.params.id}, ${'user'}, ${ticket.name || 'User'}, ${data.message}, ${now})
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

  app.post('/api/appeals/:id/auto-login', async (req, res, next) => {
    try {
      const accessKey = String(req.query.key || '');
      if (!accessKey) {
        const error = new Error('Appeal access key is required');
        error.status = 401;
        throw error;
      }
      const ticketRows = await masterPrisma.$queryRaw`
        SELECT "id", "account_id", "account_identifier", "status"
        FROM "BanAppealTicket"
        WHERE "id" = ${req.params.id} AND "participant_key" = ${accessKey}
        LIMIT 1
      `;
      const ticket = ticketRows[0];
      if (!ticket) {
        const error = new Error('Appeal ticket not found');
        error.status = 404;
        throw error;
      }
      if (String(ticket.status) !== 'resolved') {
        const error = new Error('Appeal is not resolved yet');
        error.status = 400;
        throw error;
      }
      const accountId = ticket.account_id || (await findAccountIdByIdentifier(ticket.account_identifier));
      if (!accountId) {
        const error = new Error('Account for this appeal could not be found');
        error.status = 404;
        throw error;
      }
      if (!ticket.account_id) {
        await masterPrisma.$executeRaw`
          UPDATE "BanAppealTicket"
          SET "account_id" = ${accountId}
          WHERE "id" = ${req.params.id}
        `;
      }
      const accountRows = await masterPrisma.$queryRaw`
        SELECT "id", "name", "join_code", "plan_tier", "is_banned", "access_disabled"
        FROM "Account"
        WHERE "id" = ${accountId}
        LIMIT 1
      `;
      const account = accountRows[0];
      if (!account) {
        const error = new Error('Account not found');
        error.status = 404;
        throw error;
      }
      if (Boolean(account.is_banned) || Boolean(account.access_disabled)) {
        const error = new Error('Account is still blocked');
        error.status = 403;
        throw error;
      }
      const userRows = await masterPrisma.$queryRaw`
        SELECT "id", "name", "email", "username", "role", "active"
        FROM "AccountUser"
        WHERE "account_id" = ${accountId}
          AND "active" = 1
        ORDER BY CASE WHEN "role" = 'owner' THEN 0 ELSE 1 END, "created_at" ASC
        LIMIT 1
      `;
      const user = userRows[0];
      if (!user) {
        const error = new Error('No active user found for account');
        error.status = 404;
        throw error;
      }
      const now = new Date().toISOString();
      const token = randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString();
      await masterPrisma.$executeRaw`
        INSERT INTO "AuthSession" ("id", "account_user_id", "token", "expires_at", "created_at")
        VALUES (${randomUUID()}, ${user.id}, ${token}, ${expiresAt}, ${now})
      `;
      await masterPrisma.$executeRaw`
        INSERT INTO "AuthEvent" (
          "id", "account_id", "account_user_id", "email", "event_type", "ip_address", "created_at"
        ) VALUES (
          ${randomUUID()}, ${accountId}, ${user.id}, ${user.email || ''}, ${'appeal_auto_login'}, ${getClientIp(req)}, ${now}
        )
      `;
      res.json({
        token,
        user: {
          user_id: user.id,
          account_id: accountId,
          account_name: account.name,
          plan_tier: account.plan_tier || 'free',
          join_code: account.join_code || '',
          username: user.name || user.username,
          email: user.email || '',
          role: user.role,
          expires_at: expiresAt,
        },
      });
    } catch (e) {
      next(e);
    }
  });
}
