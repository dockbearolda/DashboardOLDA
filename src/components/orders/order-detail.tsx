"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Package,
  CreditCard,
  ExternalLink,
  Edit2,
  Check,
  X,
  QrCode,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { OrderStatusBadge, PaymentStatusBadge } from "./status-badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Order, OrderStatus, PaymentStatus } from "@/types/order";
import { OrderTasks } from "./order-tasks";
import { toast } from "sonner";

interface OrderDetailProps {
  order: Order;
}

export function OrderDetail({ order: initialOrder }: OrderDetailProps) {
  const router = useRouter();
  const [order, setOrder] = useState(initialOrder);
  const [editingStatus, setEditingStatus] = useState(false);
  const [editingPayment, setEditingPayment] = useState(false);
  const [newStatus, setNewStatus] = useState<OrderStatus>(order.status);
  const [newPayment, setNewPayment] = useState<PaymentStatus>(order.paymentStatus);
  const [saving, setSaving] = useState(false);

  const saveStatus = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus, paymentStatus: newPayment }),
      });
      const data = await res.json();
      setOrder(data.order);
      setEditingStatus(false);
      setEditingPayment(false);
      toast.success("Statut mis à jour avec succès");
    } catch {
      toast.error("Erreur lors de la mise à jour");
    } finally {
      setSaving(false);
    }
  };

  const shippingAddr = order.shippingAddress as Record<string, string> | null;

  const extra = shippingAddr && typeof shippingAddr === "object" && "_source" in shippingAddr
    ? (shippingAddr as Record<string, any>)
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="max-w-4xl mx-auto space-y-4"
    >
      {/* Back button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => router.back()}
        className="rounded-xl"
      >
        <ArrowLeft className="h-4 w-4" />
      </Button>

      {/* HEADER — Récapitulatif */}
      <Card className="bg-white border-0 shadow-sm">
        <CardContent className="p-6 flex items-start justify-between gap-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
              Récapitulatif de commande
            </p>
            <h1 className="text-2xl font-bold font-mono mb-1">#{order.orderNumber}</h1>
            <p className="text-sm text-muted-foreground">{formatDate(order.createdAt)}</p>
          </div>
          <div className="text-center">
            <QRCodeSVG value={order.id} size={100} level="H" includeMargin={false} />
          </div>
        </CardContent>
      </Card>

      {/* VISUELS TECHNIQUES — 2 colonnes égales */}
      {order.items.some(i => i.imageUrl) && (
        <Card className="bg-white border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Visuels techniques</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {order.items.filter(i => i.name.includes("Avant") || i.name.includes("Front")).map(item => (
                <div key={item.id} className="text-center">
                  <p className="text-xs font-medium mb-2 text-muted-foreground">Face Avant</p>
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt="Face avant" className="w-full rounded-lg border border-border" />
                  ) : (
                    <div className="aspect-square bg-muted rounded-lg flex items-center justify-center">
                      <Package className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                </div>
              ))}
              {order.items.filter(i => i.name.includes("Arrière") || i.name.includes("Back")).map(item => (
                <div key={item.id} className="text-center">
                  <p className="text-xs font-medium mb-2 text-muted-foreground">Dos</p>
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt="Dos" className="w-full rounded-lg border border-border" />
                  ) : (
                    <div className="aspect-square bg-muted rounded-lg flex items-center justify-center">
                      <Package className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* CLIENT */}
      <Card className="bg-white border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Client</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="flex justify-between items-center text-sm border-b border-gray-100 py-3 px-6">
            <span className="text-muted-foreground">Nom</span>
            <span className="font-medium">{order.customerName}</span>
          </div>
          {order.customerPhone && (
            <div className="flex justify-between items-center text-sm border-b border-gray-100 py-3 px-6">
              <span className="text-muted-foreground">Téléphone</span>
              <a href={`tel:${order.customerPhone}`} className="font-medium hover:text-foreground">
                {order.customerPhone}
              </a>
            </div>
          )}
          {extra?.deadline && (
            <div className="flex justify-between items-center text-sm py-3 px-6">
              <span className="text-muted-foreground">Deadline</span>
              <span className="font-medium">{extra.deadline}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* PRODUIT */}
      {order.category === "t-shirt" && (
        <Card className="bg-white border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Produit</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {extra?.reference && (
              <div className="flex justify-between items-center text-sm border-b border-gray-100 py-3 px-6">
                <span className="text-muted-foreground">Référence</span>
                <span className="font-medium font-mono">{extra.reference}</span>
              </div>
            )}
            {extra?.coteLogoAr && (
              <div className="flex justify-between items-center text-sm py-3 px-6">
                <span className="text-muted-foreground">Taille DTF Arrière</span>
                <span className="font-medium">{extra.coteLogoAr}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* LOGOS */}
      {(extra?.logoAvant || extra?.logoArriere) && (
        <Card className="bg-white border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Logos</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {extra.logoAvant && (
              <div className="flex justify-between items-center text-sm border-b border-gray-100 py-3 px-6">
                <span className="text-muted-foreground">Logo Avant</span>
                <span className="font-medium font-mono">{extra.logoAvant}</span>
              </div>
            )}
            {extra.logoArriere && (
              <div className="flex justify-between items-center text-sm py-3 px-6">
                <span className="text-muted-foreground">Logo Arrière</span>
                <span className="font-medium font-mono">{extra.logoArriere}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* NOTES */}
      {order.notes && (
        <Card className="bg-white border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{order.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* PAIEMENT */}
      <Card className="bg-white border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Paiement</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {order.items.map((item, idx) => (
            <div key={item.id} className={`flex justify-between items-center text-sm py-3 px-6 ${idx < order.items.length - 1 ? "border-b border-gray-100" : ""}`}>
              <span className="text-muted-foreground">{item.name}</span>
              <span>{formatCurrency(item.price * item.quantity, order.currency)}</span>
            </div>
          ))}
          <div className="flex justify-between items-center text-sm font-bold border-t border-gray-200 py-3 px-6">
            <span>Total</span>
            <span>{formatCurrency(order.total, order.currency)}</span>
          </div>
          <div className="flex justify-between items-center text-sm border-b border-gray-100 py-3 px-6">
            <span className="text-muted-foreground">Statut</span>
            <PaymentStatusBadge status={order.paymentStatus} />
          </div>
        </CardContent>
      </Card>

      {/* GESTION STATUTS */}
      <Card className="bg-white border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Gérer les statuts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
              Statut commande
            </label>
            <Select value={newStatus} onValueChange={(v) => { setNewStatus(v as OrderStatus); setEditingStatus(true); }}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
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
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
              Statut paiement
            </label>
            <Select value={newPayment} onValueChange={(v) => { setNewPayment(v as PaymentStatus); setEditingPayment(true); }}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PENDING">En attente</SelectItem>
                <SelectItem value="PAID">Payé</SelectItem>
                <SelectItem value="FAILED">Échoué</SelectItem>
                <SelectItem value="REFUNDED">Remboursé</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {(editingStatus || editingPayment) && (
            <div className="flex gap-2">
              <Button size="sm" onClick={saveStatus} disabled={saving} className="flex-1">
                <Check className="h-3.5 w-3.5" />
                Enregistrer
              </Button>
              <Button size="sm" variant="outline" onClick={() => {
                setNewStatus(order.status);
                setNewPayment(order.paymentStatus);
                setEditingStatus(false);
                setEditingPayment(false);
              }}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
