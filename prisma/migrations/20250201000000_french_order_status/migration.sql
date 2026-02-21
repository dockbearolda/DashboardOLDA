-- Convert OrderStatus from generic English values to business-specific French values.
-- English → French mapping:
--   PENDING    → COMMANDE_A_TRAITER
--   PROCESSING → COMMANDE_A_PREPARER
--   SHIPPED / DELIVERED / CANCELLED / REFUNDED → ARCHIVES

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

-- Migrate existing rows (DB may have 0 rows, but handle any existing data safely)
UPDATE "orders" SET "status" = 'COMMANDE_A_TRAITER'  WHERE "status"::text = 'PENDING';
UPDATE "orders" SET "status" = 'COMMANDE_A_PREPARER' WHERE "status"::text = 'PROCESSING';
UPDATE "orders" SET "status" = 'ARCHIVES'            WHERE "status"::text IN ('SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED');

-- Swap the column type
ALTER TABLE "orders" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "orders" ALTER COLUMN "status" TYPE "OrderStatus_new" USING ("status"::text::"OrderStatus_new");
ALTER TABLE "orders" ALTER COLUMN "status" SET DEFAULT 'COMMANDE_A_TRAITER';

-- Replace the old enum type
DROP TYPE "OrderStatus";
ALTER TYPE "OrderStatus_new" RENAME TO "OrderStatus";
