export async function sendStoreEmail(db, randomId, { eventType, recipient, subject, text }) {
  const id = randomId();
  const now = new Date().toISOString();
  const smtpHost = String(process.env.SMTP_HOST || '').trim();
  const smtpFrom = String(process.env.SMTP_FROM || '').trim();
  await db.$executeRaw`
    INSERT INTO "StoreEmailEvent" ("id", "event_type", "recipient", "subject", "body", "status", "created_at", "updated_at")
    VALUES (${id}, ${eventType}, ${recipient}, ${subject}, ${text}, ${smtpHost && smtpFrom ? 'pending' : 'pending_config'}, ${now}, ${now})
  `;
  if (!smtpHost || !smtpFrom || !recipient) return;
  try {
    const nodemailer = await import('nodemailer');
    const transport = nodemailer.default.createTransport({ host: smtpHost, port: Number(process.env.SMTP_PORT || 587), secure: String(process.env.SMTP_SECURE || '').toLowerCase() === 'true', auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS || '' } : undefined });
    await transport.sendMail({ from: smtpFrom, to: recipient, subject, text });
    await db.$executeRaw`UPDATE "StoreEmailEvent" SET "status" = 'sent', "sent_at" = ${new Date().toISOString()}, "updated_at" = ${new Date().toISOString()} WHERE "id" = ${id}`;
  } catch (error) {
    await db.$executeRaw`UPDATE "StoreEmailEvent" SET "status" = 'failed', "error_message" = ${error instanceof Error ? error.message.slice(0, 500) : 'Email delivery failed'}, "updated_at" = ${new Date().toISOString()} WHERE "id" = ${id}`;
  }
}
