import { prisma } from "@/lib/prisma";
import { Header } from "@/components/layout/header";
import { OrderList } from "@/components/orders/order-list";
import { Order } from "@/types/order";

type PrismaOrderRow = {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  status: string;
  paymentStatus: string;
  total: number;
  subtotal: number;
  shipping: number;
  tax: number;
  currency: string;
  notes: string | null;
  shippingAddress: unknown;
  billingAddress: unknown;
  createdAt: Date;
  updatedAt: Date;
  items: {
    id: string;
    orderId: string;
    name: string;
    sku: string | null;
    quantity: number;
    price: number;
    imageUrl: string | null;
  }[];
};

async function getOrders() {
  const raw = await prisma.order.findMany({
    include: { items: true },
    orderBy: { createdAt: "desc" },
  });
  const orders = raw as unknown as PrismaOrderRow[];
  return orders.map((o: PrismaOrderRow) => ({
    ...o,
    shippingAddress: o.shippingAddress as Record<string, string> | null,
    billingAddress: o.billingAddress as Record<string, string> | null,
    createdAt: o.createdAt.toISOString(),
    updatedAt: o.updatedAt.toISOString(),
    items: o.items.map((item) => ({ ...item })),
  }));
}

export default async function OrdersPage() {
  let orders: Order[] = [];
  try {
    orders = (await getOrders()) as unknown as Order[];
  } catch {
    orders = [];
  }

  return (
    <div>
      <Header title="Commandes" />
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight">Commandes</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gérez et suivez toutes vos commandes
          </p>
        </div>
        <OrderList initialOrders={orders} />
      </div>
    </div>
  );
}
