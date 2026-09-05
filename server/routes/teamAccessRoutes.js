export function registerTeamAccessRoutes(app, context) {
  const {
    masterPrisma,
    parseOrThrow,
    toRowDates,
    getRolePermissionMap,
    normalizeRoleName,
    generateJoinCode,
    hashPassword,
    teamRoleCreateInput,
    teamRolePermissionsInput,
    authCreateUserInput,
    TEAM_FEATURE_KEYS,
    randomUUID,
  } = context;

app.get('/api/auth/permissions', async (req, res, next) => {
  try {
    const auth = req.auth;
    if (!auth || auth.blocked) {
      const error = new Error('Unauthorized');
      error.status = 401;
      throw error;
    }
    const permissions = await getRolePermissionMap(auth.account_id, auth.role);
    res.json({
      role: normalizeRoleName(auth.role),
      permissions,
    });
  } catch (e) {
    next(e);
  }
});

app.get('/api/auth/roles', async (req, res, next) => {
  try {
    const auth = req.auth;
    if (!auth || (auth.role !== 'owner' && auth.role !== 'admin')) {
      const error = new Error('Forbidden');
      error.status = 403;
      throw error;
    }
    const roleRows = await masterPrisma.$queryRaw`
      SELECT "name", "created_at", "updated_at"
      FROM "AccountRole"
      WHERE "account_id" = ${auth.account_id}
      ORDER BY "name" ASC
    `;
    const roleNames = ['owner', 'admin', 'member', ...roleRows.map((row) => row.name)];
    const uniqueNames = roleNames.filter((name, idx) => roleNames.indexOf(name) === idx);
    const roles = await Promise.all(
      uniqueNames.map(async (name) => ({
        name,
        built_in: name === 'owner' || name === 'admin' || name === 'member',
        permissions: await getRolePermissionMap(auth.account_id, name),
      }))
    );
    res.json(roles);
  } catch (e) {
    next(e);
  }
});

app.post('/api/auth/roles', async (req, res, next) => {
  try {
    const auth = req.auth;
    if (!auth || (auth.role !== 'owner' && auth.role !== 'admin')) {
      const error = new Error('Forbidden');
      error.status = 403;
      throw error;
    }
    const data = parseOrThrow(teamRoleCreateInput, req.body);
    const roleName = normalizeRoleName(data.name);
    if (roleName === 'owner' || roleName === 'admin' || roleName === 'member') {
      const error = new Error('Role name is reserved');
      error.status = 400;
      throw error;
    }
    const now = new Date().toISOString();
    await masterPrisma.$executeRaw`
      INSERT INTO "AccountRole" ("id", "account_id", "name", "created_at", "updated_at")
      VALUES (${randomUUID()}, ${auth.account_id}, ${roleName}, ${now}, ${now})
    `;
    for (const featureKey of TEAM_FEATURE_KEYS) {
      await masterPrisma.$executeRaw`
        INSERT INTO "AccountRolePermission" (
          "id", "account_id", "role_name", "feature_key", "enabled", "created_at", "updated_at"
        ) VALUES (
          ${randomUUID()}, ${auth.account_id}, ${roleName}, ${featureKey}, ${1}, ${now}, ${now}
        )
      `;
    }
    const rows = await masterPrisma.$queryRaw`
      SELECT "name", "created_at", "updated_at"
      FROM "AccountRole"
      WHERE "account_id" = ${auth.account_id}
        AND "name" = ${roleName}
      LIMIT 1
    `;
    res.status(201).json(toRowDates(rows[0]));
  } catch (e) {
    next(e);
  }
});

app.put('/api/auth/roles/:name/permissions', async (req, res, next) => {
  try {
    const auth = req.auth;
    if (!auth || (auth.role !== 'owner' && auth.role !== 'admin')) {
      const error = new Error('Forbidden');
      error.status = 403;
      throw error;
    }
    const roleName = normalizeRoleName(req.params.name);
    const data = parseOrThrow(teamRolePermissionsInput, req.body);
    const existsRows =
      roleName === 'owner' || roleName === 'admin' || roleName === 'member'
        ? [{ ok: 1 }]
        : await masterPrisma.$queryRaw`
            SELECT "id"
            FROM "AccountRole"
            WHERE "account_id" = ${auth.account_id}
              AND "name" = ${roleName}
            LIMIT 1
          `;
    if (!existsRows[0]) {
      const error = new Error('Role not found');
      error.status = 404;
      throw error;
    }
    const now = new Date().toISOString();
    await masterPrisma.$executeRaw`
      DELETE FROM "AccountRolePermission"
      WHERE "account_id" = ${auth.account_id}
        AND "role_name" = ${roleName}
    `;
    for (const key of TEAM_FEATURE_KEYS) {
      const enabled = Boolean(data.permissions[key]);
      await masterPrisma.$executeRaw`
        INSERT INTO "AccountRolePermission" (
          "id", "account_id", "role_name", "feature_key", "enabled", "created_at", "updated_at"
        ) VALUES (
          ${randomUUID()}, ${auth.account_id}, ${roleName}, ${key}, ${enabled ? 1 : 0}, ${now}, ${now}
        )
      `;
    }
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

app.delete('/api/auth/roles/:name', async (req, res, next) => {
  try {
    const auth = req.auth;
    if (!auth || (auth.role !== 'owner' && auth.role !== 'admin')) {
      const error = new Error('Forbidden');
      error.status = 403;
      throw error;
    }
    const roleName = normalizeRoleName(req.params.name);
    if (roleName === 'owner' || roleName === 'admin' || roleName === 'member') {
      const error = new Error('Built-in role cannot be deleted');
      error.status = 400;
      throw error;
    }
    const usedRows = await masterPrisma.$queryRaw`
      SELECT "id"
      FROM "AccountUser"
      WHERE "account_id" = ${auth.account_id}
        AND lower("role") = ${roleName}
      LIMIT 1
    `;
    if (usedRows[0]) {
      const error = new Error('Role is assigned to one or more users');
      error.status = 400;
      throw error;
    }
    await masterPrisma.$executeRaw`
      DELETE FROM "AccountRolePermission"
      WHERE "account_id" = ${auth.account_id}
        AND "role_name" = ${roleName}
    `;
    await masterPrisma.$executeRaw`
      DELETE FROM "AccountRole"
      WHERE "account_id" = ${auth.account_id}
        AND "name" = ${roleName}
    `;
    res.status(204).send();
  } catch (e) {
    next(e);
  }
});

app.post('/api/auth/logout', async (req, res, next) => {
  try {
    const header = String(req.headers.authorization || '');
    const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
    if (token) {
      await masterPrisma.$executeRaw`DELETE FROM "AuthSession" WHERE "token" = ${token}`;
    }
    res.status(204).send();
  } catch (e) {
    next(e);
  }
});

app.post('/api/auth/join-code/regenerate', async (req, res, next) => {
  try {
    const auth = req.auth;
    if (!auth || (auth.role !== 'owner' && auth.role !== 'admin')) {
      const error = new Error('Forbidden');
      error.status = 403;
      throw error;
    }
    const nextCode = generateJoinCode();
    await masterPrisma.$executeRaw`
      UPDATE "Account"
      SET "join_code" = ${nextCode}
      WHERE "id" = ${auth.account_id}
    `;
    res.json({ join_code: nextCode });
  } catch (e) {
    next(e);
  }
});

app.get('/api/auth/join-requests', async (req, res, next) => {
  try {
    const auth = req.auth;
    if (!auth || (auth.role !== 'owner' && auth.role !== 'admin')) {
      const error = new Error('Forbidden');
      error.status = 403;
      throw error;
    }
    const rows = await masterPrisma.$queryRaw`
      SELECT
        "id",
        "account_id",
        "name",
        "email",
        "username",
        "requested_role",
        "status",
        "created_at",
        "updated_at"
      FROM "AccountJoinRequest"
      WHERE "account_id" = ${auth.account_id}
      ORDER BY "created_at" DESC
    `;
    res.json(rows.map(toRowDates));
  } catch (e) {
    next(e);
  }
});

app.post('/api/auth/join-requests/:id/approve', async (req, res, next) => {
  try {
    const auth = req.auth;
    if (!auth || (auth.role !== 'owner' && auth.role !== 'admin')) {
      const error = new Error('Forbidden');
      error.status = 403;
      throw error;
    }
    const rows = await masterPrisma.$queryRaw`
      SELECT * FROM "AccountJoinRequest"
      WHERE "id" = ${req.params.id}
        AND "account_id" = ${auth.account_id}
      LIMIT 1
    `;
    const requestRow = rows[0];
    if (!requestRow || requestRow.status !== 'pending') {
      const error = new Error('Pending join request not found');
      error.status = 404;
      throw error;
    }

    const existingUserRows = await masterPrisma.$queryRaw`
      SELECT "id" FROM "AccountUser"
      WHERE "account_id" = ${auth.account_id}
        AND (lower("username") = lower(${requestRow.username}) OR lower("email") = lower(${requestRow.email}))
      LIMIT 1
    `;
    if (existingUserRows[0]) {
      const error = new Error('Username already exists in this account');
      error.status = 409;
      throw error;
    }

    const userId = randomUUID();
    const now = new Date().toISOString();
    await masterPrisma.$executeRaw`
      INSERT INTO "AccountUser" (
        "id", "account_id", "name", "email", "username", "password_hash", "role", "active", "created_at", "updated_at"
      ) VALUES (
        ${userId}, ${auth.account_id}, ${requestRow.name}, ${requestRow.email}, ${requestRow.username}, ${requestRow.password_hash}, ${requestRow.requested_role}, ${1}, ${now}, ${now}
      )
    `;
    await masterPrisma.$executeRaw`
      UPDATE "AccountJoinRequest"
      SET
        "status" = ${'approved'},
        "reviewed_by_user_id" = ${auth.user_id},
        "updated_at" = ${now}
      WHERE "id" = ${requestRow.id}
    `;
    res.status(204).send();
  } catch (e) {
    next(e);
  }
});

app.post('/api/auth/join-requests/:id/reject', async (req, res, next) => {
  try {
    const auth = req.auth;
    if (!auth || (auth.role !== 'owner' && auth.role !== 'admin')) {
      const error = new Error('Forbidden');
      error.status = 403;
      throw error;
    }
    const now = new Date().toISOString();
    const result = await masterPrisma.$executeRaw`
      UPDATE "AccountJoinRequest"
      SET
        "status" = ${'rejected'},
        "reviewed_by_user_id" = ${auth.user_id},
        "updated_at" = ${now}
      WHERE "id" = ${req.params.id}
        AND "account_id" = ${auth.account_id}
        AND "status" = 'pending'
    `;
    if (!Number(result)) {
      const error = new Error('Pending join request not found');
      error.status = 404;
      throw error;
    }
    res.status(204).send();
  } catch (e) {
    next(e);
  }
});

app.get('/api/auth/users', async (req, res, next) => {
  try {
    const auth = req.auth;
    const rows = await masterPrisma.$queryRaw`
      SELECT
        "id",
        "name",
        "email",
        "username",
        "role",
        "active",
        "created_at",
        "updated_at"
      FROM "AccountUser"
      WHERE "account_id" = ${auth.account_id}
      ORDER BY "created_at" ASC
    `;
    res.json(rows.map(toRowDates));
  } catch (e) {
    next(e);
  }
});

app.post('/api/auth/users', async (req, res, next) => {
  try {
    const auth = req.auth;
    if (!auth || (auth.role !== 'owner' && auth.role !== 'admin')) {
      const error = new Error('Forbidden');
      error.status = 403;
      throw error;
    }

    const data = parseOrThrow(authCreateUserInput, req.body);
    const normalizedRole = normalizeRoleName(data.role || 'member');
    const email = data.email.trim().toLowerCase();
    const username = email;
    const existingRows = await masterPrisma.$queryRaw`
      SELECT "id" FROM "AccountUser"
      WHERE "account_id" = ${auth.account_id}
        AND (lower("username") = lower(${username}) OR lower("email") = lower(${email}))
      LIMIT 1
    `;
    if (existingRows[0]) {
      const error = new Error('Username already exists in this account');
      error.status = 409;
      throw error;
    }

    const id = randomUUID();
    const now = new Date().toISOString();
    await masterPrisma.$executeRaw`
      INSERT INTO "AccountUser" (
        "id", "account_id", "name", "email", "username", "password_hash", "role", "active", "created_at", "updated_at"
      ) VALUES (
        ${id}, ${auth.account_id}, ${data.name}, ${email}, ${username}, ${hashPassword(data.password)}, ${normalizedRole}, ${1}, ${now}, ${now}
      )
    `;
    const rows = await masterPrisma.$queryRaw`
      SELECT "id", "name", "email", "username", "role", "active", "created_at", "updated_at"
      FROM "AccountUser"
      WHERE "id" = ${id}
      LIMIT 1
    `;
    res.status(201).json(toRowDates(rows[0]));
  } catch (e) {
    next(e);
  }
});

app.delete('/api/auth/users/:id', async (req, res, next) => {
  try {
    const auth = req.auth;
    if (!auth || (auth.role !== 'owner' && auth.role !== 'admin')) {
      const error = new Error('Forbidden');
      error.status = 403;
      throw error;
    }
    if (req.params.id === auth.user_id) {
      const error = new Error('Cannot delete your own account');
      error.status = 400;
      throw error;
    }

    await masterPrisma.$executeRaw`
      DELETE FROM "AuthSession"
      WHERE "account_user_id" = ${req.params.id}
    `;
    await masterPrisma.$executeRaw`
      DELETE FROM "AccountUser"
      WHERE "id" = ${req.params.id}
        AND "account_id" = ${auth.account_id}
    `;
    res.status(204).send();
  } catch (e) {
    next(e);
  }
});
}
