/**
 * Startup script: resolve the failed Prisma migration directly via SQL,
 * bypassing the Prisma CLI entirely (which blocks on P3009 before resolving).
 *
 * Strategy:
 *  1. If _prisma_migrations table doesn't exist → fresh DB, nothing to resolve.
 *  2. If migration is already finished → nothing to resolve.
 *  3. If DB already has French enum values (from a previous db push) →
 *     mark the migration as "applied" (finished_at = NOW()).
 *  4. If DB still has English enum values →
 *     run the idempotent SQL, then mark as applied.
 *
 * After this script exits 0, `prisma migrate deploy` sees no failed migration
 * and exits immediately (everything already applied).
 */
import pg from "pg";

const { Client } = pg;

const MIGRATION_NAME = "20250201000000_french_order_status";

const FRENCH_ENUM_SQL = `
  DO $$
  BEGIN
    IF EXISTS (
      SELECT 1 FROM pg_enum e
      JOIN pg_type t ON t.oid = e.enumtypid
      WHERE t.typname = 'OrderStatus' AND e.enumlabel = 'PENDING'
    ) THEN
      DROP TYPE IF EXISTS "OrderStatus_new";
      CREATE TYPE "OrderStatus_new" AS ENUM (
        'COMMANDE_A_TRAITER','COMMANDE_EN_ATTENTE','COMMANDE_A_PREPARER',
        'MAQUETTE_A_FAIRE','PRT_A_FAIRE','EN_ATTENTE_VALIDATION',
        'EN_COURS_IMPRESSION','PRESSAGE_A_FAIRE','CLIENT_A_CONTACTER',
        'CLIENT_PREVENU','ARCHIVES'
      );
      UPDATE "orders" SET "status" = 'COMMANDE_A_TRAITER'  WHERE "status"::text = 'PENDING';
      UPDATE "orders" SET "status" = 'COMMANDE_A_PREPARER' WHERE "status"::text = 'PROCESSING';
      UPDATE "orders" SET "status" = 'ARCHIVES'            WHERE "status"::text IN ('SHIPPED','DELIVERED','CANCELLED','REFUNDED');
      ALTER TABLE "orders" ALTER COLUMN "status" DROP DEFAULT;
      ALTER TABLE "orders" ALTER COLUMN "status" TYPE "OrderStatus_new" USING ("status"::text::"OrderStatus_new");
      ALTER TABLE "orders" ALTER COLUMN "status" SET DEFAULT 'COMMANDE_A_TRAITER';
      DROP TYPE "OrderStatus";
      ALTER TYPE "OrderStatus_new" RENAME TO "OrderStatus";
    END IF;
  END $$;
`;

const client = new Client({ connectionString: process.env.DATABASE_URL });

try {
  await client.connect();

  // 1. Check if _prisma_migrations exists (fresh DB has no table yet)
  const { rows: tableCheck } = await client.query(`
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = '_prisma_migrations'
  `);

  if (tableCheck.length === 0) {
    console.log("[db-resolve] Fresh DB — prisma migrate deploy will handle setup");
    process.exit(0);
  }

  // 2. Fetch the migration row
  const { rows } = await client.query(
    `SELECT finished_at, rolled_back_at FROM _prisma_migrations WHERE migration_name = $1`,
    [MIGRATION_NAME]
  );

  if (rows.length === 0 || rows[0].finished_at !== null) {
    // Not in the table, or already successfully finished — nothing to do
    console.log("[db-resolve] Migration already applied or not yet started — skipping");
    process.exit(0);
  }

  // 3. Migration is stuck (failed or rolled-back): fix the schema then mark applied
  console.log("[db-resolve] Found stuck migration — applying idempotent fix...");

  await client.query(FRENCH_ENUM_SQL);

  // Mark the migration as successfully applied
  const { rowCount } = await client.query(`
    UPDATE _prisma_migrations
    SET finished_at          = NOW(),
        applied_steps_count  = 1,
        logs                 = NULL,
        rolled_back_at       = NULL
    WHERE migration_name = $1
  `, [MIGRATION_NAME]);

  console.log(`[db-resolve] Migration marked as applied (${rowCount} row updated)`);
} catch (err) {
  // Non-fatal: if something goes wrong here, let prisma migrate deploy attempt it
  console.warn("[db-resolve] Warning:", err.message);
} finally {
  await client.end().catch(() => {});
}
