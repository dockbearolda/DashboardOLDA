/**
 * Startup schema migration: convert OrderStatus from English to French values.
 * Runs BEFORE `prisma db push` so the enum is already correct and db push
 * detects zero drift (no --accept-data-loss needed, no data loss possible).
 *
 * Idempotent: skips entirely if French values are already present.
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

        UPDATE "orders" SET "status" = 'COMMANDE_A_TRAITER'  WHERE "status"::text = 'PENDING';
        UPDATE "orders" SET "status" = 'COMMANDE_A_PREPARER' WHERE "status"::text = 'PROCESSING';
        UPDATE "orders" SET "status" = 'ARCHIVES'            WHERE "status"::text IN ('SHIPPED','DELIVERED','CANCELLED','REFUNDED');

        ALTER TABLE "orders" ALTER COLUMN "status" DROP DEFAULT;
        ALTER TABLE "orders" ALTER COLUMN "status"
          TYPE "OrderStatus_new" USING ("status"::text::"OrderStatus_new");
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
