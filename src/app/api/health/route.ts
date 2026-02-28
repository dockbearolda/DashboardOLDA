import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/health
 *
 * Railway health check — doit TOUJOURS retourner HTTP 200 si le serveur est vivant.
 * L'état de la base de données est retourné dans le body JSON, pas via le code HTTP.
 * Retourner 503 ici bloquerait Railway en "Creating containers" indéfiniment.
 */
export async function GET() {
  const dbUrl = process.env.DATABASE_URL;

  // Serveur vivant mais DB non configurée
  if (!dbUrl) {
    return NextResponse.json({
      status: "degraded",
      server: "ok",
      database: "not configured",
      problem: "DATABASE_URL is not set",
      fix: "Railway → Service Next.js → Variables → Add DATABASE_URL referencing your PostgreSQL service",
    });
    // HTTP 200 intentionnel — le serveur tourne, c'est ce que Railway vérifie
  }

  const masked = dbUrl.replace(/:\/\/([^:]+):([^@]+)@/, "://$1:***@");

  try {
    await prisma.$queryRaw`SELECT 1`;
    const orderCount = await prisma.order.count();

    const enumRows = await prisma.$queryRaw<{ typname: string; enumlabel: string }[]>`
      SELECT t.typname, e.enumlabel
      FROM pg_enum e
      JOIN pg_type t ON e.enumtypid = t.oid
      WHERE t.typname IN ('OrderStatus', 'PaymentStatus')
      ORDER BY t.typname, e.enumsortorder
    `;
    const dbEnums: Record<string, string[]> = {};
    for (const row of enumRows) {
      if (!dbEnums[row.typname]) dbEnums[row.typname] = [];
      dbEnums[row.typname].push(row.enumlabel);
    }

    return NextResponse.json({
      status: "ok",
      server: "ok",
      database: "connected",
      databaseUrl: masked,
      orders: orderCount,
      dbEnums,
      webhookSecret: process.env.WEBHOOK_SECRET ? "set" : "not set (all requests allowed)",
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    const isTableMissing =
      message.includes("does not exist") || message.includes("relation");

    // HTTP 200 intentionnel — le serveur Node tourne.
    // Si la DB n'est pas prête, Railway réessaiera automatiquement les requêtes.
    return NextResponse.json({
      status: "degraded",
      server: "ok",
      database: "connection failed",
      databaseUrl: masked,
      problem: isTableMissing
        ? "Tables not created — migrations have not run yet"
        : message,
      fix: isTableMissing
        ? "Run: npx prisma migrate deploy"
        : "Check that DATABASE_URL points to the correct PostgreSQL service",
    });
  }
}
