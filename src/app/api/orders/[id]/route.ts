import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { OldaExtraData, OrderStatus, PaymentStatus } from "@/types/order";

interface Params {
  params: Promise<{ id: string }>;
}

// ── Helper: lire et sérialiser une commande avec ses items ───────────────────
async function fetchOrderRow(id: string) {
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
  if (rows.length === 0) return null;
  const o = rows[0];
  return {
    ...o,
    createdAt: o.createdAt instanceof Date ? (o.createdAt as Date).toISOString() : o.createdAt,
    updatedAt: o.updatedAt instanceof Date ? (o.updatedAt as Date).toISOString() : o.updatedAt,
  };
}

// GET /api/orders/[id]
export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  try {
    const order = await fetchOrderRow(id);
    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
    return NextResponse.json({ order });
  } catch (error) {
    console.error("GET /api/orders/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH /api/orders/[id] — mise à jour partielle
// Gère : status, paymentStatus, notes, customerName, customerPhone,
//        shippingAddressPatch (merge JSONB des champs OldaExtraData)
export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params;

  let body: {
    status?: OrderStatus;
    paymentStatus?: PaymentStatus;
    notes?: string;
    customerName?: string;
    customerPhone?: string;
    shippingAddressPatch?: Partial<OldaExtraData>;
  };
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
    // ── Mise à jour des champs scalaires ──────────────────────────────────────
    const count = await prisma.$executeRaw`
      UPDATE orders SET
        status           = COALESCE(${body.status          ?? null}::"OrderStatus",    status),
        "paymentStatus"  = COALESCE(${body.paymentStatus   ?? null}::"PaymentStatus",  "paymentStatus"),
        notes            = COALESCE(${body.notes           ?? null},                   notes),
        "customerName"   = COALESCE(${body.customerName    ?? null},                   "customerName"),
        "customerPhone"  = COALESCE(${body.customerPhone   ?? null},                   "customerPhone"),
        "updatedAt"      = NOW()
      WHERE id = ${id}
    `;

    if (count === 0) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // ── Merge JSONB shippingAddress si un patch est fourni ────────────────────
    if (body.shippingAddressPatch && Object.keys(body.shippingAddressPatch).length > 0) {
      const patch = JSON.stringify(body.shippingAddressPatch);
      await prisma.$executeRaw`
        UPDATE orders SET
          "shippingAddress" = COALESCE("shippingAddress", '{}'::jsonb) || ${patch}::jsonb,
          "updatedAt"       = NOW()
        WHERE id = ${id}
      `;
    }

    const order = await fetchOrderRow(id);
    return NextResponse.json({ success: true, order });
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
