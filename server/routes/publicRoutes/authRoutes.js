export function registerPublicAuthRoutes(app, context) {
  const {
    masterPrisma,
    getAccountPrisma,
    parseOrThrow,
    getClientIp,
    hashPassword,
    generateJoinCode,
    verifyPassword,
    authRegisterInput,
    authLoginInput,
    authRequestAccessInput,
    randomUUID,
    randomBytes,
  } = context;

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.get('/api/auth/bootstrap-status', async (_req, res, next) => {
    try {
      const rows = await masterPrisma.$queryRaw`
        SELECT COUNT(*) as count FROM "Account"
      `;
      const count = Number(rows?.[0]?.count ?? 0);
      res.json({ has_accounts: count > 0 });
    } catch (e) {
      next(e);
    }
  });

  app.post('/api/auth/register', async (req, res, next) => {
    try {
      const data = parseOrThrow(authRegisterInput, req.body);
      if (data.password !== data.password_confirm) {
        const error = new Error('Password confirmation does not match');
        error.status = 400;
        throw error;
      }

      const accountName = data.name.trim();
      const email = data.email.trim().toLowerCase();

      const existingAccountRows = await masterPrisma.$queryRaw`
        SELECT "id" FROM "Account" WHERE lower("name") = lower(${accountName}) LIMIT 1
      `;
      if (existingAccountRows[0]) {
        const error = new Error('Account name already exists');
        error.status = 409;
        throw error;
      }
      const existingEmailRows = await masterPrisma.$queryRaw`
        SELECT u."id"
        FROM "AccountUser" u
        JOIN "Account" a ON a."id" = u."account_id"
        WHERE lower(u."email") = lower(${email})
        LIMIT 1
      `;
      if (existingEmailRows[0]) {
        const error = new Error('Email already in use');
        error.status = 409;
        throw error;
      }

      const accountId = randomUUID();
      const userId = randomUUID();
      const now = new Date().toISOString();
      const joinCode = generateJoinCode();
      const username = email;

      await masterPrisma.$executeRaw`
        INSERT INTO "Account" ("id", "name", "join_code", "created_at")
        VALUES (${accountId}, ${accountName}, ${joinCode}, ${now})
      `;

      await masterPrisma.$executeRaw`
        INSERT INTO "AccountUser" (
          "id", "account_id", "name", "email", "username", "password_hash", "role", "active", "created_at", "updated_at"
        ) VALUES (
          ${userId}, ${accountId}, ${data.name}, ${email}, ${username}, ${hashPassword(data.password)}, ${'owner'}, ${1}, ${now}, ${now}
        )
      `;

      await getAccountPrisma(accountId);

      const token = randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString();
      const sessionId = randomUUID();
      await masterPrisma.$executeRaw`
        INSERT INTO "AuthSession" ("id", "account_user_id", "token", "expires_at", "created_at")
        VALUES (${sessionId}, ${userId}, ${token}, ${expiresAt}, ${now})
      `;
      await masterPrisma.$executeRaw`
        INSERT INTO "AuthEvent" (
          "id", "account_id", "account_user_id", "email", "event_type", "ip_address", "created_at"
        ) VALUES (
          ${randomUUID()}, ${accountId}, ${userId}, ${email}, ${'register'}, ${getClientIp(req)}, ${now}
        )
      `;

      res.status(201).json({
        token,
        user: {
          user_id: userId,
          account_id: accountId,
          account_name: accountName,
          plan_tier: 'free',
          join_code: joinCode,
          username: data.name,
          email,
          role: 'owner',
          expires_at: expiresAt,
        },
      });
    } catch (e) {
      next(e);
    }
  });

  app.post('/api/auth/login', async (req, res, next) => {
    try {
      const data = parseOrThrow(authLoginInput, req.body);
      const identifier = data.identifier.trim();
      const identifierLower = identifier.toLowerCase();
      const rows = await masterPrisma.$queryRaw`
        SELECT
          u."id" as user_id,
          u."account_id",
          u."name",
          u."email",
          u."username",
          u."password_hash",
          u."role",
          u."active",
          a."name" as account_name,
          a."plan_tier" as plan_tier,
          a."join_code" as join_code,
          a."is_banned" as is_banned,
          a."access_disabled" as access_disabled,
          a."ban_reason" as ban_reason,
          a."disable_reason" as disable_reason
        FROM "AccountUser" u
        JOIN "Account" a ON a."id" = u."account_id"
        WHERE (
            lower(u."email") = ${identifierLower}
            OR (lower(a."name") = ${identifierLower} AND u."role" = 'owner')
          )
        LIMIT 1
      `;
      const row = rows[0];
      if (!row || !Boolean(row.active) || !verifyPassword(data.password, row.password_hash)) {
        const error = new Error('Invalid email/account name or password');
        error.status = 401;
        throw error;
      }
      if (Boolean(row.is_banned)) {
        const error = new Error(
          row.ban_reason ? `Account is banned: ${row.ban_reason}` : 'Account is banned'
        );
        error.status = 403;
        throw error;
      }
      if (Boolean(row.access_disabled)) {
        const error = new Error(
          row.disable_reason
            ? `Account access is disabled: ${row.disable_reason}`
            : 'Account access is disabled'
        );
        error.status = 403;
        throw error;
      }

      await getAccountPrisma(row.account_id);

      const now = new Date().toISOString();
      const token = randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString();
      const sessionId = randomUUID();
      await masterPrisma.$executeRaw`
        INSERT INTO "AuthSession" ("id", "account_user_id", "token", "expires_at", "created_at")
        VALUES (${sessionId}, ${row.user_id}, ${token}, ${expiresAt}, ${now})
      `;
      await masterPrisma.$executeRaw`
        INSERT INTO "AuthEvent" (
          "id", "account_id", "account_user_id", "email", "event_type", "ip_address", "created_at"
        ) VALUES (
          ${randomUUID()}, ${row.account_id}, ${row.user_id}, ${row.email || ''}, ${'login'}, ${getClientIp(req)}, ${now}
        )
      `;

      res.json({
        token,
        user: {
          user_id: row.user_id,
          account_id: row.account_id,
          account_name: row.account_name,
          plan_tier: row.plan_tier || 'free',
          join_code: row.join_code || '',
          username: row.name || row.username,
          email: row.email || '',
          role: row.role,
          expires_at: expiresAt,
        },
      });
    } catch (e) {
      next(e);
    }
  });

  app.post('/api/auth/request-access', async (req, res, next) => {
    try {
      const data = parseOrThrow(authRequestAccessInput, req.body);
      if (data.password !== data.password_confirm) {
        const error = new Error('Password confirmation does not match');
        error.status = 400;
        throw error;
      }
      const email = data.email.trim().toLowerCase();
      const username = email;
      const accountRows = await masterPrisma.$queryRaw`
        SELECT "id", "join_code", "is_banned", "access_disabled", "ban_reason", "disable_reason" FROM "Account"
        WHERE lower("name") = lower(${data.account_name})
        LIMIT 1
      `;
      const account = accountRows[0];
      if (!account) {
        const error = new Error('Account not found');
        error.status = 404;
        throw error;
      }
      if (
        String(account.join_code || '').toUpperCase() !==
        String(data.join_code).trim().toUpperCase()
      ) {
        const error = new Error('Invalid join code');
        error.status = 401;
        throw error;
      }
      if (Boolean(account.is_banned) || Boolean(account.access_disabled)) {
        const reason = Boolean(account.is_banned)
          ? account.ban_reason
            ? `Account is banned: ${account.ban_reason}`
            : 'Account is banned'
          : account.disable_reason
            ? `Account access is disabled: ${account.disable_reason}`
            : 'Account access is disabled';
        const error = new Error(reason);
        error.status = 403;
        throw error;
      }

      const existingUserRows = await masterPrisma.$queryRaw`
        SELECT "id" FROM "AccountUser"
        WHERE "account_id" = ${account.id}
          AND (lower("username") = lower(${username}) OR lower("email") = lower(${email}))
        LIMIT 1
      `;
      if (existingUserRows[0]) {
        const error = new Error('Username already exists in this account');
        error.status = 409;
        throw error;
      }

      const existingPendingRows = await masterPrisma.$queryRaw`
        SELECT "id" FROM "AccountJoinRequest"
        WHERE "account_id" = ${account.id}
          AND (lower("username") = lower(${username}) OR lower("email") = lower(${email}))
          AND "status" = 'pending'
        LIMIT 1
      `;
      if (existingPendingRows[0]) {
        const error = new Error('A pending request already exists for this username');
        error.status = 409;
        throw error;
      }

      const now = new Date().toISOString();
      const requestId = randomUUID();
      await masterPrisma.$executeRaw`
        INSERT INTO "AccountJoinRequest" (
          "id",
          "account_id",
          "name",
          "email",
          "username",
          "password_hash",
          "requested_role",
          "status",
          "created_at",
          "updated_at"
        ) VALUES (
          ${requestId},
          ${account.id},
          ${data.name},
          ${email},
          ${username},
          ${hashPassword(data.password)},
          ${'member'},
          ${'pending'},
          ${now},
          ${now}
        )
      `;
      await masterPrisma.$executeRaw`
        INSERT INTO "AuthEvent" (
          "id", "account_id", "account_user_id", "email", "event_type", "ip_address", "created_at"
        ) VALUES (
          ${randomUUID()}, ${account.id}, ${null}, ${email}, ${'join_request'}, ${getClientIp(req)}, ${now}
        )
      `;
      res.status(201).json({
        ok: true,
        message: 'Request sent. An account admin must approve it before you can sign in.',
      });
    } catch (e) {
      next(e);
    }
  });
}
