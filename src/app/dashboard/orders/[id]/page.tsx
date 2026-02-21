import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Header } from "@/components/layout/header";
import { OrderDetail } from "@/components/orders/order-detail";
import { Order } from "@/types/order";

interface Props {
  params: Promise<{ id: string }>;
}

type PrismaOrderFull = {
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

async function getOrder(id: string) {
  const raw = await prisma.order.findUnique({
    where: { id },
    include: { items: true },
  });
  if (!raw) return null;
  const order = raw as unknown as PrismaOrderFull;
  return {
    ...order,
    shippingAddress: order.shippingAddress as Record<string, string> | null,
    billingAddress: order.billingAddress as Record<string, string> | null,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
    items: order.items.map((item) => ({ ...item })),
  };
}

export default async function OrderDetailPage({ params }: Props) {
  const { id } = await params;
  let order;
  try {
    order = await getOrder(id);
  } catch {
    notFound();
  }

  if (!order) notFound();

  return (
    <div>
      <Header title={`Commande #${order!.orderNumber}`} />
      <div className="p-6">
        <OrderDetail order={order as unknown as Order} />
      </div>
    </div>
  );
}
