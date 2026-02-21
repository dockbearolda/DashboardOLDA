/**
 * Startup schema migration: convert OrderStatus from English to French values.
 * Runs BEFORE `prisma db push` so the enum is already correct and db push
 * detects zero drift.
 *
 * Idempotent: skips entirely if French values are already present.
 *
 * Key fix: do NOT run separate UPDATE statements before the ALTER TABLE —
 * the column is still type OrderStatus (English), so setting French values
 * would fail. Instead, use a CASE expression directly in the USING clause
 * of ALTER TABLE to convert data and type atomically in one step.
 */
import pg from "pg";

const { Client } = pg;

const client = new Client({ connectionString: process.env.DATABASE_URL });

try {
  await client.connect();

  await client.query(`
    DO $$
    BEGIN
      -- Only run if OrderStatus still has the old English value 'PENDING'
      IF EXISTS (
        SELECT 1 FROM pg_enum e
        JOIN pg_type t ON t.oid = e.enumtypid
        WHERE t.typname = 'OrderStatus' AND e.enumlabel = 'PENDING'
      ) THEN
        DROP TYPE IF EXISTS "OrderStatus_new";

        CREATE TYPE "OrderStatus_new" AS ENUM (
          'COMMANDE_A_TRAITER',
          'COMMANDE_EN_ATTENTE',
          'COMMANDE_A_PREPARER',
          'MAQUETTE_A_FAIRE',
          'PRT_A_FAIRE',
          'EN_ATTENTE_VALIDATION',
          'EN_COURS_IMPRESSION',
          'PRESSAGE_A_FAIRE',
          'CLIENT_A_CONTACTER',
          'CLIENT_PREVENU',
          'ARCHIVES'
        );

        ALTER TABLE "orders" ALTER COLUMN "status" DROP DEFAULT;

        -- Convert data and type atomically via USING — never touch the column
        -- with English-enum values before this point.
        ALTER TABLE "orders" ALTER COLUMN "status"
          TYPE "OrderStatus_new"
          USING (CASE "status"::text
            WHEN 'PENDING'    THEN 'COMMANDE_A_TRAITER'
            WHEN 'PROCESSING' THEN 'COMMANDE_A_PREPARER'
            WHEN 'SHIPPED'    THEN 'ARCHIVES'
            WHEN 'DELIVERED'  THEN 'ARCHIVES'
            WHEN 'CANCELLED'  THEN 'ARCHIVES'
            WHEN 'REFUNDED'   THEN 'ARCHIVES'
            ELSE                   'COMMANDE_A_TRAITER'
          END::"OrderStatus_new");

        ALTER TABLE "orders" ALTER COLUMN "status" SET DEFAULT 'COMMANDE_A_TRAITER';

        DROP TYPE "OrderStatus";
        ALTER TYPE "OrderStatus_new" RENAME TO "OrderStatus";

        RAISE NOTICE 'OrderStatus migrated to French values';
      END IF;
    END $$;
  `);

  console.log("[startup] Schema ready");
} catch (err) {
  console.error("[startup] Fatal:", err.message);
  process.exit(1);
} finally {
  await client.end().catch(() => {});
}
