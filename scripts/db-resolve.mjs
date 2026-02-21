/**
 * Startup script: mark the failed Prisma migration as rolled-back directly in
 * _prisma_migrations, bypassing the Prisma CLI (which itself blocks on P3009).
 *
 * After this script, `prisma migrate deploy` can safely re-run the migration.
 */
import pg from "pg";

const { Client } = pg;

const client = new Client({ connectionString: process.env.DATABASE_URL });

try {
  await client.connect();

  const result = await client.query(`
    UPDATE _prisma_migrations
    SET    rolled_back_at = NOW()
    WHERE  migration_name = '20250201000000_french_order_status'
      AND  finished_at    IS NULL
      AND  rolled_back_at IS NULL
  `);

  if (result.rowCount > 0) {
    console.log("[db-resolve] migration marked as rolled-back, will be re-applied by migrate deploy");
  } else {
    console.log("[db-resolve] no failed migration found — nothing to resolve");
  }
} catch (err) {
  // Non-fatal: if the table doesn't exist yet (fresh DB), migrate deploy handles it
  console.warn("[db-resolve] skipped:", err.message);
} finally {
  await client.end().catch(() => {});
}
