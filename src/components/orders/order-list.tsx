"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Filter, RefreshCw, Package, ArrowUpDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { OrderStatusBadge, PaymentStatusBadge } from "./status-badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Order, OrderStatus, PaymentStatus } from "@/types/order";

interface OrderListProps {
  initialOrders: Order[];
}

export function OrderList({ initialOrders }: OrderListProps) {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "ALL">("ALL");
  const [paymentFilter, setPaymentFilter] = useState<PaymentStatus | "ALL">("ALL");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch("/api/orders");
      const data = await res.json();
      setOrders(data.orders);
    } catch {
      /* ignore */
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(refresh, 30000);
    return () => clearInterval(interval);
  }, [refresh]);

  const filtered = orders
    .filter((o) => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        o.orderNumber.toLowerCase().includes(q) ||
        o.customerName.toLowerCase().includes(q) ||
        o.customerEmail.toLowerCase().includes(q);
      const matchStatus = statusFilter === "ALL" || o.status === statusFilter;
      const matchPayment = paymentFilter === "ALL" || o.paymentStatus === paymentFilter;
      return matchSearch && matchStatus && matchPayment;
    })
    .sort((a, b) => {
      const da = new Date(a.createdAt).getTime();
      const db = new Date(b.createdAt).getTime();
      return sortDir === "desc" ? db - da : da - db;
    });

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Rechercher commande, client, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as OrderStatus | "ALL")}
          >
            <SelectTrigger className="w-[160px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tous les statuts</SelectItem>
              <SelectItem value="COMMANDE_A_TRAITER">À traiter</SelectItem>
              <SelectItem value="COMMANDE_EN_ATTENTE">En attente</SelectItem>
              <SelectItem value="COMMANDE_A_PREPARER">À préparer</SelectItem>
              <SelectItem value="MAQUETTE_A_FAIRE">Maquette à faire</SelectItem>
              <SelectItem value="PRT_A_FAIRE">PRT à faire</SelectItem>
              <SelectItem value="EN_ATTENTE_VALIDATION">Validation en attente</SelectItem>
              <SelectItem value="EN_COURS_IMPRESSION">En impression</SelectItem>
              <SelectItem value="PRESSAGE_A_FAIRE">Pressage à faire</SelectItem>
              <SelectItem value="CLIENT_A_CONTACTER">Client à contacter</SelectItem>
              <SelectItem value="CLIENT_PREVENU">Client prévenu</SelectItem>
              <SelectItem value="ARCHIVES">Archivé</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={paymentFilter}
            onValueChange={(v) => setPaymentFilter(v as PaymentStatus | "ALL")}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Paiement" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tous paiements</SelectItem>
              <SelectItem value="PAID">Payé</SelectItem>
              <SelectItem value="PENDING">En attente</SelectItem>
              <SelectItem value="FAILED">Échoué</SelectItem>
              <SelectItem value="REFUNDED">Remboursé</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="icon"
            onClick={() => setSortDir(sortDir === "desc" ? "asc" : "desc")}
            title="Trier par date"
          >
            <ArrowUpDown className="h-4 w-4" />
          </Button>

          <Button
            variant="outline"
            size="icon"
            onClick={refresh}
            disabled={isRefreshing}
            title="Actualiser"
          >
            <RefreshCw
              className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
            />
          </Button>
        </div>
      </div>

      {/* Results count */}
      <p className="text-sm text-muted-foreground">
        {filtered.length} commande{filtered.length !== 1 ? "s" : ""}
      </p>

      {/* Order cards */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Package className="h-12 w-12 mb-4 opacity-20" />
          <p className="text-sm font-medium">Aucune commande trouvée</p>
          <p className="text-xs mt-1">Essayez de modifier vos filtres</p>
        </div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence initial={false}>
            {filtered.map((order, i) => (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ delay: i * 0.03, duration: 0.2 }}
                onClick={() => router.push(`/dashboard/orders/${order.id}`)}
                className="group flex items-center gap-4 rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm p-4 cursor-pointer hover:border-border hover:bg-card hover:shadow-sm transition-all duration-200 active:scale-[0.995]"
              >
                {/* Order number */}
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted/60 group-hover:bg-muted transition-colors">
                  <Package className="h-5 w-5 text-muted-foreground" />
                </div>

                {/* Main info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold font-mono">
                      #{order.orderNumber}
                    </span>
                    <OrderStatusBadge status={order.status} />
                    <PaymentStatusBadge status={order.paymentStatus} />
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5 truncate">
                    {order.customerName} · {order.customerEmail}
                  </p>
                </div>

                {/* Items count */}
                <div className="hidden sm:block text-center">
                  <p className="text-sm font-medium">{order.items.length}</p>
                  <p className="text-xs text-muted-foreground">article{order.items.length > 1 ? "s" : ""}</p>
                </div>

                {/* Amount */}
                <div className="text-right">
                  <p className="text-sm font-semibold tabular-nums">
                    {formatCurrency(order.total, order.currency)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatDate(order.createdAt)}
                  </p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
