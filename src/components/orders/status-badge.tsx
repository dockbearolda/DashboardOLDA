import { Badge } from "@/components/ui/badge";
import { OrderStatus, PaymentStatus } from "@/types/order";
import {
  Clock,
  Loader2,
  Truck,
  CheckCircle2,
  XCircle,
  RotateCcw,
  CreditCard,
  AlertCircle,
} from "lucide-react";

const orderStatusConfig: Record<
  OrderStatus,
  {
    label: string;
    variant: "warning" | "info" | "purple" | "success" | "destructive" | "default";
    icon: React.ComponentType<{ className?: string }>;
  }
> = {
  PENDING: { label: "En attente", variant: "warning", icon: Clock },
  PROCESSING: { label: "En cours", variant: "info", icon: Loader2 },
  SHIPPED: { label: "Expédié", variant: "purple", icon: Truck },
  DELIVERED: { label: "Livré", variant: "success", icon: CheckCircle2 },
  CANCELLED: { label: "Annulé", variant: "destructive", icon: XCircle },
  REFUNDED: { label: "Remboursé", variant: "default", icon: RotateCcw },
};

const paymentStatusConfig: Record<
  PaymentStatus,
  {
    label: string;
    variant: "warning" | "success" | "destructive" | "default";
    icon: React.ComponentType<{ className?: string }>;
  }
> = {
  PENDING: { label: "En attente", variant: "warning", icon: Clock },
  PAID: { label: "Payé", variant: "success", icon: CreditCard },
  FAILED: { label: "Échoué", variant: "destructive", icon: AlertCircle },
  REFUNDED: { label: "Remboursé", variant: "default", icon: RotateCcw },
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const config = orderStatusConfig[status];
  const Icon = config.icon;
  return (
    <Badge variant={config.variant} className="gap-1.5">
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  const config = paymentStatusConfig[status];
  const Icon = config.icon;
  return (
    <Badge variant={config.variant} className="gap-1.5">
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}
