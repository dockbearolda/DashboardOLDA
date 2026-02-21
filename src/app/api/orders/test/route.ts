import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST /api/orders/test — create a test order from the dashboard (no secret needed)
// Uses raw SQL to bypass stale Prisma client enum defaults.
export async function POST() {
  const orderNumber = `TEST-${Date.now()}`;
  const id = `c${Date.now()}${Math.random().toString(36).slice(2, 9)}`;

  try {
    await prisma.$executeRaw`
      INSERT INTO orders (
        id, "orderNumber", "customerName", "customerEmail", "customerPhone",
        status, "paymentStatus", total, subtotal, shipping, tax, currency,
        "shippingAddress", "updatedAt"
      ) VALUES (
        ${id},
        ${orderNumber},
        'Marie Dupont',
        'marie.dupont@example.com',
        '+33 6 12 34 56 78',
        'COMMANDE_A_TRAITER'::"OrderStatus",
        'PAID'::"PaymentStatus",
        149.99,
        129.99,
        9.9,
        10.1,
        'EUR',
        '{"street":"15 Rue de la Paix","city":"Paris","postalCode":"75001","country":"France"}'::jsonb,
        NOW()
      )
    `;

    await prisma.$executeRaw`
      INSERT INTO order_items (id, "orderId", name, sku, quantity, price)
      VALUES
        (${id + '_1'}, ${id}, 'Bougie Signature Ambre', 'BSIG-AMB-001', 2, 49.99),
        (${id + '_2'}, ${id}, 'Diffuseur Luxe Bois',    'DLUX-BOIS-01', 1, 30.01)
    `;

    const rows = await prisma.$queryRaw<Record<string, unknown>[]>`
      SELECT o.*, COALESCE(json_agg(
        json_build_object('id', i.id, 'name', i.name, 'quantity', i.quantity, 'price', i.price)
        ORDER BY i.id
      ) FILTER (WHERE i.id IS NOT NULL), '[]') AS items
      FROM orders o
      LEFT JOIN order_items i ON i."orderId" = o.id
      WHERE o.id = ${id}
      GROUP BY o.id
    `;
    const order = rows[0];

    return NextResponse.json(
      {
        success: true,
        order: {
          ...order,
          createdAt: order.createdAt instanceof Date ? (order.createdAt as Date).toISOString() : order.createdAt,
          updatedAt: order.updatedAt instanceof Date ? (order.updatedAt as Date).toISOString() : order.updatedAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/orders/test error:", error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: "Failed to create test order", detail: message }, { status: 500 });
  }
}
