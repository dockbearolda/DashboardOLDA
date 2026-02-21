import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { OrderStatus, PaymentStatus } from "@/types/order";

interface Params {
  params: Promise<{ id: string }>;
}

// GET /api/orders/[id]
export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = await params;

  try {
    const rows = await prisma.$queryRaw<Record<string, unknown>[]>`
      SELECT o.*, COALESCE(json_agg(
        json_build_object(
          'id', i.id, 'orderId', i."orderId", 'name', i.name,
          'sku', i.sku, 'quantity', i.quantity, 'price', i.price, 'imageUrl', i."imageUrl"
        ) ORDER BY i.id
      ) FILTER (WHERE i.id IS NOT NULL), '[]') AS items
      FROM orders o
      LEFT JOIN order_items i ON i."orderId" = o.id
      WHERE o.id = ${id}
      GROUP BY o.id
    `;

    if (rows.length === 0) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const order = rows[0];
    return NextResponse.json({
      order: {
        ...order,
        createdAt: order.createdAt instanceof Date ? (order.createdAt as Date).toISOString() : order.createdAt,
        updatedAt: order.updatedAt instanceof Date ? (order.updatedAt as Date).toISOString() : order.updatedAt,
      },
    });
  } catch (error) {
    console.error("GET /api/orders/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH /api/orders/[id] — update status
// Uses raw SQL to bypass stale Prisma enum types (French vs English mismatch).
export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params;

  let body: { status?: OrderStatus; paymentStatus?: PaymentStatus; notes?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const validOrderStatuses: OrderStatus[] = [
    "COMMANDE_A_TRAITER", "COMMANDE_EN_ATTENTE", "COMMANDE_A_PREPARER",
    "MAQUETTE_A_FAIRE", "PRT_A_FAIRE", "EN_ATTENTE_VALIDATION",
    "EN_COURS_IMPRESSION", "PRESSAGE_A_FAIRE", "CLIENT_A_CONTACTER",
    "CLIENT_PREVENU", "ARCHIVES",
  ];
  const validPaymentStatuses: PaymentStatus[] = ["PENDING", "PAID", "FAILED", "REFUNDED"];

  if (body.status && !validOrderStatuses.includes(body.status)) {
    return NextResponse.json({ error: "Invalid order status" }, { status: 422 });
  }

  if (body.paymentStatus && !validPaymentStatuses.includes(body.paymentStatus)) {
    return NextResponse.json({ error: "Invalid payment status" }, { status: 422 });
  }

  try {
    const count = await prisma.$executeRaw`
      UPDATE orders SET
        status = COALESCE(${body.status ?? null}::"OrderStatus", status),
        "paymentStatus" = COALESCE(${body.paymentStatus ?? null}::"PaymentStatus", "paymentStatus"),
        notes = COALESCE(${body.notes ?? null}, notes),
        "updatedAt" = NOW()
      WHERE id = ${id}
    `;

    if (count === 0) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const rows = await prisma.$queryRaw<Record<string, unknown>[]>`
      SELECT o.*, COALESCE(json_agg(
        json_build_object(
          'id', i.id, 'orderId', i."orderId", 'name', i.name,
          'sku', i.sku, 'quantity', i.quantity, 'price', i.price, 'imageUrl', i."imageUrl"
        ) ORDER BY i.id
      ) FILTER (WHERE i.id IS NOT NULL), '[]') AS items
      FROM orders o
      LEFT JOIN order_items i ON i."orderId" = o.id
      WHERE o.id = ${id}
      GROUP BY o.id
    `;

    const order = rows[0];
    return NextResponse.json({
      success: true,
      order: {
        ...order,
        createdAt: order.createdAt instanceof Date ? (order.createdAt as Date).toISOString() : order.createdAt,
        updatedAt: order.updatedAt instanceof Date ? (order.updatedAt as Date).toISOString() : order.updatedAt,
      },
    });
  } catch (error) {
    console.error("PATCH /api/orders/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/orders/[id]
export async function DELETE(_request: NextRequest, { params }: Params) {
  const { id } = await params;

  try {
    const count = await prisma.$executeRaw`DELETE FROM orders WHERE id = ${id}`;
    if (count === 0) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/orders/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
