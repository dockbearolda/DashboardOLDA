import { Badge } from "@/components/ui/badge";
import { OrderStatus, PaymentStatus } from "@/types/order";
import {
  Clock,
  Loader2,
  Printer,
  CheckCircle2,
  XCircle,
  RotateCcw,
  CreditCard,
  AlertCircle,
  Eye,
  Phone,
  Archive,
  Paintbrush,
  Timer,
} from "lucide-react";

const orderStatusConfig: Record<
  OrderStatus,
  {
    label: string;
    variant: "warning" | "info" | "purple" | "success" | "destructive" | "default";
    icon: React.ComponentType<{ className?: string }>;
  }
> = {
  COMMANDE_A_TRAITER:    { label: "À traiter",          variant: "warning",     icon: Clock },
  COMMANDE_EN_ATTENTE:   { label: "En attente",          variant: "default",     icon: Timer },
  COMMANDE_A_PREPARER:   { label: "À préparer",          variant: "info",        icon: Loader2 },
  MAQUETTE_A_FAIRE:      { label: "Maquette à faire",    variant: "purple",      icon: Paintbrush },
  PRT_A_FAIRE:           { label: "PRT à faire",         variant: "info",        icon: Loader2 },
  EN_ATTENTE_VALIDATION: { label: "Validation en attente", variant: "warning",   icon: Eye },
  EN_COURS_IMPRESSION:   { label: "En impression",       variant: "info",        icon: Printer },
  PRESSAGE_A_FAIRE:      { label: "Pressage à faire",    variant: "info",        icon: Loader2 },
  CLIENT_A_CONTACTER:    { label: "Client à contacter",  variant: "warning",     icon: Phone },
  CLIENT_PREVENU:        { label: "Client prévenu",      variant: "success",     icon: CheckCircle2 },
  ARCHIVES:              { label: "Archivé",             variant: "default",     icon: Archive },
};

const paymentStatusConfig: Record<
  PaymentStatus,
  {
    label: string;
    variant: "warning" | "success" | "destructive" | "default";
    icon: React.ComponentType<{ className?: string }>;
  }
> = {
  PENDING:  { label: "En attente", variant: "warning",     icon: Clock },
  PAID:     { label: "Payé",       variant: "success",     icon: CreditCard },
  FAILED:   { label: "Échoué",     variant: "destructive", icon: AlertCircle },
  REFUNDED: { label: "Remboursé",  variant: "default",     icon: RotateCcw },
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const config = orderStatusConfig[status] ?? { label: status, variant: "default" as const, icon: Clock };
  const Icon = config.icon;
  return (
    <Badge variant={config.variant} className="gap-1.5">
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  const config = paymentStatusConfig[status] ?? { label: status, variant: "default" as const, icon: Clock };
  const Icon = config.icon;
  return (
    <Badge variant={config.variant} className="gap-1.5">
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}
